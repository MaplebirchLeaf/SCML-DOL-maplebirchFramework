// ./src/services/Modules.ts

import { ModuleState } from '../constants';
import type ModLoader from '../host/ModLoader';
import Diagnostics, { type ScopedLog } from '../infra/Diagnostics';
import Lifecycle from '../infra/Lifecycle';
import type IndexedDB from './IndexedDB';

export interface Module {
  log?: ScopedLog;
  dependencies?: string[];
  exposed?: boolean | 'window';
  preInit?(): void | Promise<void>;
  Init?(): void;
  loadInit?(): void;
  postInit?(): void;
}

interface ModuleRegistry {
  modules: Map<string, Module>;
  states: Map<string, ModuleState>;
  sources: Map<string, string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export interface DependencyInfo {
  protected: boolean;
  mounted: boolean;
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

export type DependencyGraph = Record<string, DependencyInfo>;
export interface ModulesMeta {
  core: readonly string[];
  protected: readonly string[];
}

export class Modules extends Lifecycle<string, Module> {
  public readonly registry: ModuleRegistry;

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
  public constructor(
    readonly owner: Record<string, unknown>,
    readonly meta: ModulesMeta,
    readonly idb: IndexedDB,
    modloader?: ModLoader
  ) {
    super(modloader);
    this.registry = {
      modules: this.items,
      states: new Map(),
      sources: new Map(),
      dependencies: new Map(),
      dependents: new Map()
    };
  }

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

  public register<T extends object>(name: string, module: T & Module, dependencies: string[] = []): boolean {
    if (this.has(name)) {
      this.write(`模块 ${name} 已注册`, 'WARN', 'modules');
      return false;
    }

    const core = this.owner;
    const source = this.sourceStack.at(-1) ?? '';
    const deps = [...new Set([...(module.dependencies ?? []), ...dependencies])];

    if (this.circular(name, deps)) {
      this.write(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR', 'modules');
      return false;
    }

    const descriptor = Object.getOwnPropertyDescriptor(module, 'log');
    if (descriptor ? !descriptor.writable : !Object.isExtensible(module)) {
      this.write(`模块 ${name} 注册失败: 无法附加诊断日志`, 'WARN', 'modules');
      return false;
    }

    const exposed = module.exposed === true;
    const windowExposed = module.exposed === 'window';
    const lifecycle = this.hasLifecycle(module);

    if (exposed) {
      if (core[name] != null) {
        this.write(`暴露模块 ${name} 挂载失败: 名称冲突`, 'WARN', 'modules');
        return false;
      }
      core[name] = module;
    }
    if (windowExposed) {
      if (typeof window === 'undefined') {
        this.write(`暴露模块 ${name} 挂载到 window 失败: window 不可用`, 'WARN', 'modules');
        return false;
      }
      if (name in window) {
        this.write(`暴露模块 ${name} 挂载到 window 失败: 名称冲突`, 'WARN', 'modules');
        return false;
      }
      (window as unknown as Record<string, unknown>)[name] = module;
    }

    const state = (exposed || windowExposed) && !lifecycle ? ModuleState.EXPOSED : ModuleState.REGISTERED;

    const log = this.scoped(`modules:${name}`);
    if (descriptor?.writable) (module as Module).log = log;
    else Object.defineProperty(module, 'log', { value: log, enumerable: false });
    if (this.meta.core.includes(name)) Object.seal(module);

    super.add(name, module);
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
    this.flush();
    if (this.initPhase.preInitCompleted && !this.sourceStack.length) this.queuePre();
    this.write(
      `${exposed || windowExposed ? '注册暴露模块' : '注册模块'}: ${name}` + (deps.length ? `, 依赖: [${deps.join(', ')}]` : ' (无依赖)') + (source ? ` (来源: ${source})` : ''),
      'DEBUG',
      'modules'
    );

    return true;
  }

  public override get(name: string): Module | undefined {
    if (this.registry.states.get(name) === ModuleState.DISABLED) return undefined;
    return super.get(name);
  }

  public get dependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {};
    const core = this.meta.core as readonly string[];
    const protectedModules = this.meta.protected as readonly string[];

    for (const [name, module] of this.registry.modules) {
      const state = this.registry.states.get(name);

      graph[name] = {
        protected: protectedModules.includes(name),
        mounted: core.includes(name),
        exposed: module.exposed === true || module.exposed === 'window',
        lifecycle: this.hasLifecycle(module),
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
    if (phase === 'pre') return this.prepare();

    if (!this.initPhase.preInitCompleted) {
      this.write(`模块 ${phase} 阶段执行失败: preInit 尚未完成`, 'ERROR', 'modules');
      return;
    }

    if (phase === 'init') {
      this.init();

      if (!this.initPhase.mainInitCompleted) {
        this.initPhase.mainInitCompleted = true;
        this.write('主初始化完成', 'DEBUG', 'modules');
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

  private async prepare(): Promise<void> {
    if (this.initPhase.preInitCompleted) return;
    if (this.preInitTask) return this.preInitTask;

    const task = (async () => {
      if (!this.disabledNames) {
        try {
          const record = (await this.idb.with(['settings'], 'readonly', tx => tx.objectStore('settings').get('Modules'))) as ModuleSettings | undefined;
          this.disabledNames = new Set(record?.value?.disabled?.map(module => module.name) ?? []);
        } catch (error) {
          this.write(`模块禁用设置读取失败: ${Diagnostics.message(error)}`, 'WARN', 'modules');
          this.disabledNames = new Set();
        }
      }

      this.disable();
      await this.pre();
      this.initPhase.preInitCompleted = true;
      this.write('预初始化完成', 'DEBUG', 'modules');
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
      .catch(error => this.write(`late module 预初始化失败: ${Diagnostics.message(error)}`, 'ERROR', 'modules', error));
  }

  private disable(): void {
    if (!this.disabledNames) return;
    const core = this.owner;
    const disabled = Modules.traverse(this.disabledNames, this.registry.dependents, new Set(this.meta.protected));
    for (const name of disabled) {
      const module = this.registry.modules.get(name);
      if (!module || this.registry.states.get(name) === ModuleState.DISABLED) continue;
      this.registry.states.set(name, ModuleState.DISABLED);
      this.preInitialized.delete(name);
      if (core[name] === module) delete core[name];
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)[name] === module) delete (window as unknown as Record<string, unknown>)[name];
      this.write(`模块 ${name} 被禁用，跳过初始化`, 'DEBUG', 'modules');
    }
  }

  private async pre(): Promise<void> {
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

          const result = await this.execute(module, 'preInit', `modules:${name}`);
          if (result.ok) {
            this.preInitialized.add(name);
          } else {
            this.registry.states.set(name, ModuleState.ERROR);
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

      const result = this.executeSync(module, 'Init', `modules:${name}`);
      if (result.ok) {
        this.registry.states.set(name, ModuleState.MOUNTED);
      } else {
        this.registry.states.set(name, ModuleState.ERROR);
      }
    }
  }

  private phase(phase: 'loadInit' | 'postInit', label: string): void {
    for (const name of this.topologicalOrder()) {
      if (this.registry.states.get(name) !== ModuleState.MOUNTED) continue;
      const module = this.registry.modules.get(name);
      if (!module) continue;
      this.executeSync(module, phase, `modules:${name}`);
    }
    this.write(`${label}完成`, 'DEBUG', 'modules');
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

  private flush(): void {
    const core = this.owner;
    const names = new Set(this.meta.core);
    let progressed = true;
    while (progressed) {
      progressed = false;

      for (const name of names) {
        const module = this.registry.modules.get(name);
        if (!module || core[name] === module || this.registry.states.get(name) === ModuleState.DISABLED) continue;
        const waiting = [...(this.registry.dependencies.get(name) ?? [])].some(dep => names.has(dep) && core[dep] == null);
        if (waiting || core[name] != null) continue;
        core[name] = module;
        progressed = true;
        this.write(`[${name}] 核心模块已挂载`, 'DEBUG', 'modules');
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

  private hasLifecycle(module: Module): boolean {
    return !!(module.preInit || module.Init || module.loadInit || module.postInit);
  }
}

export default Modules;
