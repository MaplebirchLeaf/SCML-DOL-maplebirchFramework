// ./src/services/ModuleSystem.ts

import { ModuleState } from '../constants';
import type { MaplebirchCore } from '../core';

interface Module {
  dependencies?: string[];
  exposed?: boolean;
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
  [key: string]: unknown;
}

interface ModuleRegistry {
  modules: Map<string, Module>;
  states: Map<string, string | number>;
  sources: Map<string, string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

interface DependencyInfo {
  protected: boolean;
  mounted: boolean;
  early: boolean;
  exposed: boolean;
  lifecycle: boolean;
  dependencies: string[];
  dependents: string[];
  allDependencies: string[];
  state: string;
  source: string;
}

interface ModuleSettings {
  value?: {
    disabled?: Array<{ name: string }>;
  };
}

type DependencyGraph = Record<string, DependencyInfo>;
type RuntimePhase = 'Init' | 'loadInit' | 'postInit';

class ModuleSystem {
  public readonly registry: ModuleRegistry = {
    modules: new Map(),
    states: new Map(),
    sources: new Map(),
    dependencies: new Map(),
    dependents: new Map()
  };

  public readonly initPhase = {
    preInitCompleted: false,
    mainInitCompleted: false
  };

  private readonly sourceStack: string[] = [];
  private readonly preInitialized = new Set<string>();

  private disabledNames: Set<string> | null = null;
  private preInitTask: Promise<void> | null = null;
  private late: Promise<void> = Promise.resolve();
  private preRunning = false;
  private preQueued = false;

  public constructor(readonly core: MaplebirchCore) {}

  public static traverse(roots: Iterable<string>, links: ReadonlyMap<string, Iterable<string>>, excluded: ReadonlySet<string> = new Set()): Set<string> {
    const visited = new Set<string>();
    const queue = [...roots];
    for (let index = 0; index < queue.length; index++) {
      const name = queue[index];
      if (visited.has(name) || excluded.has(name)) continue;
      visited.add(name);
      for (const next of links.get(name) ?? []) if (!visited.has(next)) queue.push(next);
    }
    return visited;
  }

  public async with<T>(source: string, callback: () => T | Promise<T>): Promise<T> {
    this.sourceStack.push(source);
    try {
      return await callback();
    } finally {
      this.sourceStack.pop();
      if (this.initPhase.preInitCompleted && !this.preRunning && !this.sourceStack.length) {
        this.queuePre();
        await this.late;
      }
    }
  }

  public register(name: string, module: Module, dependencies: string[] = []): boolean {
    if (this.registry.modules.has(name)) {
      this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
      return false;
    }

    const core = this.core as MaplebirchCore & Record<string, unknown>;
    const source = this.sourceStack.at(-1) ?? '';
    const deps = [...new Set([...(module.dependencies ?? []), ...dependencies])];

    if (this.circular(name, deps)) {
      this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
      return false;
    }

    const exposed = module.exposed === true;
    const lifecycle = this.lifecycle(module);

    if (exposed) {
      if (core[name] != null) {
        this.core.logger.log(`暴露模块 ${name} 挂载失败: 名称冲突`, 'WARN');
        return false;
      }
      core[name] = module;
    }

    const state = exposed && !lifecycle ? ModuleState.EXPOSED : ModuleState.REGISTERED;

    this.registry.modules.set(name, module);
    this.registry.states.set(name, state);
    this.registry.sources.set(name, source);
    this.registry.dependencies.set(name, new Set(deps));
    this.registry.dependents.set(name, this.registry.dependents.get(name) ?? new Set());

    for (const dep of deps) {
      const dependents = this.registry.dependents.get(dep) ?? new Set<string>();
      dependents.add(name);
      this.registry.dependents.set(dep, dependents);
    }

    this.disable();
    this.flushEarly();
    if (this.initPhase.preInitCompleted && !this.sourceStack.length) this.queuePre();
    this.core.logger.log(`${exposed ? '注册暴露模块' : '注册模块'}: ${name}` + (deps.length ? `, 依赖: [${deps.join(', ')}]` : ' (无依赖)') + (source ? ` (来源: ${source})` : ''), 'DEBUG');

    return true;
  }

  public get(name: string): Module | undefined {
    if (this.registry.states.get(name) === ModuleState.DISABLED) return undefined;
    return this.registry.modules.get(name);
  }

  public get dependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {};
    const core = this.core.meta.core as readonly string[];
    const early = this.core.meta.early as readonly string[];
    const protectedModules = this.core.meta.protected as readonly string[];

    for (const [name, module] of this.registry.modules) {
      const state = this.registry.states.get(name);

      graph[name] = {
        protected: protectedModules.includes(name),
        mounted: core.includes(name),
        early: early.includes(name),
        exposed: module.exposed === true,
        lifecycle: this.lifecycle(module),
        dependencies: [...(this.registry.dependencies.get(name) ?? [])],
        dependents: [...(this.registry.dependents.get(name) ?? [])],
        allDependencies: [...this.collect(name)],
        state: typeof state === 'number' ? String(ModuleState[state] ?? `UNKNOWN(${state})`) : (state ?? 'UNKNOWN'),
        source: this.registry.sources.get(name) ?? ''
      };
    }

    return graph;
  }

  public run(phase: 'pre'): Promise<void>;
  public run(phase: 'init' | 'load' | 'post'): void;
  public run(phase: 'pre' | 'init' | 'load' | 'post'): Promise<void> | void {
    if (phase === 'pre') return this.preInit();

    if (!this.initPhase.preInitCompleted) {
      this.core.logger.log(`模块 ${phase} 阶段执行失败: preInit 尚未完成`, 'ERROR');
      return;
    }

    if (phase === 'init') {
      this.init();

      if (!this.initPhase.mainInitCompleted) {
        this.initPhase.mainInitCompleted = true;
        this.core.logger.log('主初始化完成', 'DEBUG');
      }

      this.phase('postInit', '后初始化');
      return;
    }

    if (!this.initPhase.mainInitCompleted) return;

    if (phase === 'load') {
      this.phase('loadInit', '存档初始化');
      this.phase('postInit', '后初始化');
      return;
    }

    this.phase('postInit', '后初始化');
  }

  private async preInit(): Promise<void> {
    if (this.initPhase.preInitCompleted) return;
    if (this.preInitTask) return this.preInitTask;

    const task = (async () => {
      if (!this.disabledNames) {
        try {
          const record = (await this.core.idb.withTransaction(['settings'], 'readonly', tx => tx.objectStore('settings').get('Modules'))) as ModuleSettings | undefined;
          this.disabledNames = new Set(record?.value?.disabled?.map(module => module.name) ?? []);
        } catch {
          this.disabledNames = new Set();
        }
      }

      this.disable();
      await this.pre();
      this.initPhase.preInitCompleted = true;
      this.core.logger.log('预初始化完成', 'DEBUG');
    })();

    this.preInitTask = task;

    try {
      await task;
    } finally {
      if (this.preInitTask === task) this.preInitTask = null;
    }
  }

  private queuePre(): void {
    if (this.preRunning || this.preQueued) return;
    this.preQueued = true;
    this.late = this.late
      .then(async () => {
        this.preQueued = false;
        await this.pre();
      })
      .catch(error => this.core.logger.log(`late module 预初始化失败: ${this.error(error)}`, 'ERROR'));
  }

  private disable(): void {
    if (!this.disabledNames) return;
    const core = this.core as MaplebirchCore & Record<string, unknown>;
    const disabled = ModuleSystem.traverse(this.disabledNames, this.registry.dependents, new Set(this.core.meta.protected));
    for (const name of disabled) {
      const module = this.registry.modules.get(name);
      if (!module || this.registry.states.get(name) === ModuleState.DISABLED) continue;
      this.registry.states.set(name, ModuleState.DISABLED);
      this.preInitialized.delete(name);
      if (core[name] === module) delete core[name];
      this.core.logger.log(`模块 ${name} 被禁用，跳过初始化`, 'DEBUG');
    }
  }

  private async pre(): Promise<void> {
    const core = this.core as MaplebirchCore & Record<string, unknown>;
    const coreModules = this.core.meta.core as readonly string[];
    const earlyModules = this.core.meta.early as readonly string[];

    this.preRunning = true;
    try {
      let progressed = true;
      while (progressed) {
        progressed = false;

        for (const name of this.topologicalOrder()) {
          if (this.registry.states.get(name) !== ModuleState.REGISTERED || this.preInitialized.has(name)) continue;

          const module = this.registry.modules.get(name);
          if (!module) continue;

          if (!this.ready(name, true)) continue;

          try {
            await module.preInit?.call(module);
            if (coreModules.includes(name) && !earlyModules.includes(name)) core[name] = module;
            this.preInitialized.add(name);
          } catch (error) {
            this.registry.states.set(name, ModuleState.ERROR);
            this.core.logger.log(`[${name}] preInit 执行失败: ${this.error(error)}`, 'ERROR');
          }

          progressed = true;
        }
      }
    } finally {
      this.preRunning = false;
    }
  }

  private init(): void {
    for (const name of this.topologicalOrder()) {
      if (this.registry.states.get(name) !== ModuleState.REGISTERED) continue;
      if (!this.preInitialized.has(name) || !this.ready(name, false)) continue;

      const module = this.registry.modules.get(name);
      if (!module) continue;

      try {
        this.callHook(name, module, 'Init');
        this.registry.states.set(name, ModuleState.MOUNTED);
      } catch (error) {
        this.registry.states.set(name, ModuleState.ERROR);
        this.core.logger.log(`[${name}] Init 执行失败: ${this.error(error)}`, 'ERROR');
      }
    }
  }

  private phase(phase: 'loadInit' | 'postInit', label: string): void {
    for (const name of this.topologicalOrder()) {
      if (this.registry.states.get(name) !== ModuleState.MOUNTED) continue;
      const module = this.registry.modules.get(name);
      if (!module) continue;
      try {
        this.callHook(name, module, phase);
      } catch (error) {
        this.core.logger.log(`[${name}] ${label}失败: ${this.error(error)}`, 'ERROR');
      }
    }
    this.core.logger.log(`${label}完成`, 'DEBUG');
  }

  private callHook(name: string, module: Module, phase: RuntimePhase): void {
    const hook = module[phase];
    if (typeof hook !== 'function') return;
    const result: unknown = hook.call(module);
    if (!this.promiseLike(result)) return;
    void Promise.resolve(result).catch(error => this.core.logger.log(`[${name}] ${phase} 异步任务失败: ${this.error(error)}`, 'ERROR'));
    throw new Error(`${phase} 必须同步执行，不能返回 Promise`);
  }

  private ready(name: string, preInit: boolean): boolean {
    for (const dep of this.registry.dependencies.get(name) ?? []) {
      if (!this.registry.modules.has(dep)) return false;
      const state = this.registry.states.get(dep);
      if (state === ModuleState.EXPOSED) continue;
      if (state === ModuleState.ERROR || state === ModuleState.DISABLED) return false;
      if (preInit) {
        if (!this.preInitialized.has(dep)) return false;
      } else if (state !== ModuleState.MOUNTED) {
        return false;
      }
    }
    return true;
  }

  private flushEarly(): void {
    const core = this.core as MaplebirchCore & Record<string, unknown>;
    const early = new Set(this.core.meta.early as readonly string[]);
    let progressed = true;
    while (progressed) {
      progressed = false;

      for (const name of early) {
        const module = this.registry.modules.get(name);
        if (!module || core[name] === module || this.registry.states.get(name) === ModuleState.DISABLED) continue;
        const waiting = [...(this.registry.dependencies.get(name) ?? [])].some(dep => early.has(dep) && core[dep] == null);
        if (waiting || core[name] != null) continue;
        core[name] = module;
        progressed = true;
        this.core.logger.log(`[${name}] 模块已提前挂载 (earlyMount)`, 'DEBUG');
      }
    }
  }

  private topologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];
    for (const name of this.registry.modules.keys()) {
      const deps = [...(this.registry.dependencies.get(name) ?? [])].filter(dep => this.registry.states.get(dep) !== ModuleState.EXPOSED);
      inDegree.set(name, deps.length);
      if (!deps.length) queue.push(name);
    }

    for (let i = 0; i < queue.length; i++) {
      const name = queue[i];
      result.push(name);
      if (this.registry.states.get(name) === ModuleState.EXPOSED) continue;
      for (const dependent of this.registry.dependents.get(name) ?? []) {
        const degree = (inDegree.get(dependent) ?? 0) - 1;
        inDegree.set(dependent, degree);
        if (!degree) queue.push(dependent);
      }
    }

    return result;
  }

  private collect(name: string): Set<string> {
    const result = new Set<string>();

    const collect = (current: string): void => {
      for (const dep of this.registry.dependencies.get(current) ?? []) {
        if (result.has(dep)) continue;
        result.add(dep);
        collect(dep);
      }
    };

    collect(name);
    return result;
  }

  private circular(name: string, dependencies: string[]): boolean {
    const visited = new Set<string>();
    const active = new Set<string>();
    const visit = (current: string): boolean => {
      if (active.has(current)) return true;
      if (visited.has(current)) return false;
      active.add(current);
      const deps = current === name ? dependencies : [...(this.registry.dependencies.get(current) ?? [])];
      for (const dep of deps) if (visit(dep)) return true;
      active.delete(current);
      visited.add(current);
      return false;
    };
    return visit(name);
  }

  private lifecycle(module: Module): boolean {
    return !!(module.preInit || module.Init || module.loadInit || module.postInit);
  }

  private promiseLike(value: unknown): value is PromiseLike<unknown> {
    return value != null && typeof (value as PromiseLike<unknown>).then === 'function';
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export default ModuleSystem;
