// ./src/services/ModuleSystem.ts

import { ModuleState } from '../constants';
import type { MaplebirchCore } from '../core';

interface ModuleRegistry {
  modules: Map<string, any>;
  states: Map<string, string | number>;
  sources: Map<string, string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  allDependencies: Map<string, Set<string>>;
  waitingQueue: Map<string, Set<string>>;
}

interface InitPhase {
  preInitCompleted: boolean;
  mainInitCompleted: boolean;
}

class ModuleSystem {
  public readonly registry: ModuleRegistry = {
    modules: new Map(),
    states: new Map(),
    sources: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
    allDependencies: new Map(),
    waitingQueue: new Map()
  };

  public readonly initPhase: InitPhase = {
    preInitCompleted: false,
    mainInitCompleted: false
  };

  private sourceStack: string[] = [];
  private preInitialized = new Set<string>();
  private waiters = new Map<string, Array<() => void>>();
  private disabledNames: Set<string> | null = null;
  private circularCache = new Map<string, boolean>();

  public constructor(readonly core: MaplebirchCore) {}

  public async withSource<T>(source: string, callback: () => T | Promise<T>): Promise<T> {
    this.sourceStack.push(source);
    try {
      return await callback();
    } finally {
      this.sourceStack.pop();
    }
  }

  public register(name: string, module: any, dependencies: string[] = []): boolean {
    if (this.registry.modules.has(name)) {
      this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
      return false;
    }

    const source = this.sourceStack[this.sourceStack.length - 1] || '';
    const directDependencies = [...new Set([...(module.dependencies || []), ...(dependencies || [])])];
    const allDependencies = this.collectAllDependencies(directDependencies);
    const exposed = module?.exposed === true;
    const lifecycle = ['preInit', 'Init', 'loadInit', 'postInit'].some(method => typeof module?.[method] === 'function');
    const state = exposed && !lifecycle ? ModuleState.EXPOSED : ModuleState.REGISTERED;

    if (this.circularDependency(name, allDependencies)) {
      this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
      return false;
    }

    if (exposed) {
      if ((this.core as any)[name] != null) {
        this.core.logger.log(`暴露模块 ${name} 挂载失败: 名称冲突`, 'WARN');
        return false;
      }
      (this.core as any)[name] = module;
    }

    this.storeModule(name, module, directDependencies, allDependencies, source, state);
    if (state === ModuleState.REGISTERED && !exposed) this.handleEarlyMount(name, module, directDependencies);

    this.processWaitingQueue(name);
    if (state === ModuleState.REGISTERED && this.initPhase.preInitCompleted) {
      queueMicrotask(async () => {
        if (!this.preInitialized.has(name)) await this.moduleInit(name, true);
        if (this.initPhase.mainInitCompleted) await this.moduleInit(name, false);
      });
    }
    this.core.logger.log(
      `${exposed ? '注册暴露模块' : '注册模块'}: ${name}${directDependencies.length ? `, 依赖: [${directDependencies.join(', ')}]` : ' (无依赖)'}${source ? ` (来源: ${source})` : ''}`,
      'DEBUG'
    );
    if (allDependencies.size > directDependencies.length) this.core.logger.log(`传递依赖: [${[...allDependencies].join(', ')}]`, 'DEBUG');
    return true;
  }

  public get dependencyGraph() {
    const graph: any = {};
    const core = this.core.meta.core as readonly string[];
    const early = this.core.meta.early as readonly string[];
    const protectedModules = this.core.meta.protected as readonly string[];
    this.registry.modules.forEach((_, name) => {
      const state = this.registry.states.get(name);
      graph[name] = {
        protected: protectedModules.includes(name),
        mounted: core.includes(name),
        early: early.includes(name),
        exposed: this.registry.modules.get(name)?.exposed === true,
        lifecycle: ['preInit', 'Init', 'loadInit', 'postInit'].some(method => typeof this.registry.modules.get(name)?.[method] === 'function'),
        dependencies: Array.from(this.registry.dependencies.get(name) || []),
        dependents: Array.from(this.registry.dependents.get(name) || []),
        state: typeof state === 'number' ? ModuleState[state] || `UNKNOWN(${state})` : state || `UNKNOWN(${state})`,
        allDependencies: Array.from(this.registry.allDependencies.get(name) || []),
        source: this.registry.sources.get(name) || ''
      };
    });
    return graph;
  }

  public async init(phase: 'pre' | 'init' | 'load' | 'post'): Promise<void> {
    if (phase === 'pre') {
      if (this.initPhase.preInitCompleted) return;
      for (const name of this.TopologicalOrder()) await this.moduleInit(name, true);
      this.initPhase.preInitCompleted = true;
      this.core.logger.log('预初始化完成', 'DEBUG');
      return;
    }

    if (phase === 'init') {
      if (!this.initPhase.preInitCompleted) await this.init('pre');
      if (!this.initPhase.mainInitCompleted) {
        for (const name of this.TopologicalOrder()) await this.moduleInit(name, false);
        this.initPhase.mainInitCompleted = true;
        this.core.logger.log('主初始化完成', 'DEBUG');
      }
    }

    if (!this.initPhase.mainInitCompleted) return;
    if (phase === 'load') void this.phaseInit('loadInit', '存档初始化');
    void this.phaseInit('postInit', '后初始化');
  }

  private async moduleDisabled(name: string): Promise<boolean> {
    if ((this.core.meta.protected as readonly string[]).includes(name)) return false;
    if (!this.disabledNames) {
      try {
        const Modules = await this.core.idb.withTransaction(['settings'], 'readonly', async (tx: any) => await tx.objectStore('settings').get('Modules'));
        this.disabledNames = new Set((Modules?.value?.disabled || []).map((m: any) => m.name));
      } catch {
        this.disabledNames = new Set();
      }
    }
    return this.disabledNames.has(name);
  }

  private handleEarlyMount(name: string, module: any, dependencies: string[]): void {
    const early = this.core.meta.early as readonly string[];
    if (!early.includes(name)) return;
    const earlyMount = new Set(early);
    const unmetDeps = dependencies.filter(dep => earlyMount.has(dep) && !(this.core as any)[dep]);
    if (unmetDeps.length === 0) {
      (this.core as any)[name] = module;
      this.core.logger.log(`[${name}] 模块已在注册时挂载 (earlyMount)`, 'DEBUG');
      return;
    }
    this.core.logger.log(`[${name}] 模块等待依赖挂载: [${unmetDeps.join(', ')}]`, 'DEBUG');
    this.scheduleEarlyMountCheck(name, module, unmetDeps);
  }

  private scheduleEarlyMountCheck(name: string, module: any, unmetDeps: string[]): void {
    const maxRetries = 10;
    const retryDelay = 5;
    const retry = (count = 0): void => {
      if ((this.core as any)[name] === module) return;
      const stillUnmet = unmetDeps.filter(dep => !(this.core as any)[dep]);
      if (stillUnmet.length === 0) {
        (this.core as any)[name] = module;
        this.core.logger.log(`[${name}] 模块已在依赖满足后挂载 (earlyMount)`, 'DEBUG');
        return;
      }
      if (count >= maxRetries) return;
      setTimeout(() => retry(count + 1), retryDelay);
    };
    retry();
  }

  private collectAllDependencies(directDependencies: string[]): Set<string> {
    const allDependencies = new Set<string>();
    const visited = new Set<string>();
    const collect = (depName: string) => {
      if (visited.has(depName)) return;
      visited.add(depName);
      allDependencies.add(depName);
      this.registry.dependencies.get(depName)?.forEach(collect);
    };
    directDependencies.forEach(collect);
    return allDependencies;
  }

  private storeModule(name: string, module: any, directDependencies: string[], allDependencies: Set<string>, source: string, state: string | number): void {
    this.registry.modules.set(name, module);
    this.registry.states.set(name, state);
    this.registry.sources.set(name, source);
    this.registry.dependencies.set(name, new Set(directDependencies));
    this.registry.allDependencies.set(name, allDependencies);
    if (!this.registry.dependents.has(name)) this.registry.dependents.set(name, new Set());
    directDependencies.forEach(dep => {
      if (!this.registry.dependents.has(dep)) this.registry.dependents.set(dep, new Set());
      this.registry.dependents.get(dep)!.add(name);
    });
    this.circularCache.clear();
  }

  private processWaitingQueue(name: string): void {
    const waitingModules = this.registry.waitingQueue.get(name);
    if (!waitingModules) return;
    const pendingModules = [...waitingModules].filter(moduleName => this.registry.states.get(moduleName) === ModuleState.REGISTERED);
    if (pendingModules.length > 0) queueMicrotask(() => pendingModules.forEach(moduleName => void this.moduleInit(moduleName)));
    this.registry.waitingQueue.delete(name);
  }

  private waitForModule(moduleName: string): Promise<void> {
    const state = this.registry.states.get(moduleName);
    if (state === ModuleState.EXPOSED || state === ModuleState.MOUNTED || state === ModuleState.ERROR || state === ModuleState.DISABLED || this.preInitialized.has(moduleName))
      return Promise.resolve();
    return new Promise(resolve => {
      const resolvers = this.waiters.get(moduleName) || [];
      if (resolvers.length === 0) this.waiters.set(moduleName, resolvers);
      resolvers.push(resolve);
    });
  }

  private resolveWaiters(moduleName: string): void {
    const resolvers = this.waiters.get(moduleName);
    if (!resolvers || resolvers.length === 0) return;
    resolvers.forEach(resolve => resolve());
    this.waiters.delete(moduleName);
  }

  private async checkDependencies(moduleName: string, isPreInit = false): Promise<boolean> {
    const allDependencies = this.registry.allDependencies.get(moduleName);
    if (!allDependencies || allDependencies.size === 0) return true;
    for (const dep of allDependencies) {
      if (!this.registry.modules.has(dep)) {
        this.addToWaitingQueue(dep, moduleName);
        return false;
      }
      const depState = this.registry.states.get(dep);
      if (depState === ModuleState.EXPOSED) continue;
      if (depState === ModuleState.DISABLED || depState === ModuleState.ERROR) return false;
      if (isPreInit) {
        if (!this.preInitialized.has(dep)) await this.waitForModule(dep);
        continue;
      }
      if (depState === ModuleState.MOUNTED) continue;
      await this.waitForModule(dep);
      const currentState = this.registry.states.get(dep);
      if (currentState === ModuleState.ERROR || currentState === ModuleState.DISABLED) return false;
    }
    return true;
  }

  private addToWaitingQueue(dependency: string, moduleName: string): void {
    const queue = this.registry.waitingQueue.get(dependency) || new Set();
    if (queue.size === 0) this.registry.waitingQueue.set(dependency, queue);
    queue.add(moduleName);
  }

  private async moduleInit(moduleName: string, isPreInit = false): Promise<boolean> {
    const module = this.registry.modules.get(moduleName);
    if (!module) return false;
    const state = this.registry.states.get(moduleName);
    if (state === ModuleState.EXPOSED) return true;
    if (state === ModuleState.DISABLED) return false;
    if (state === ModuleState.MOUNTED || state === ModuleState.ERROR) return state === ModuleState.MOUNTED;
    if (await this.moduleDisabled(moduleName)) {
      this.core.logger.log(`模块 ${moduleName} 被禁用，跳过初始化`, 'DEBUG');
      if (module?.exposed === true && (this.core as any)[moduleName] === module) delete (this.core as any)[moduleName];
      this.registry.states.set(moduleName, ModuleState.DISABLED);
      this.resolveWaiters(moduleName);
      return false;
    }
    if (!(await this.checkDependencies(moduleName, isPreInit))) return false;
    try {
      await this.moduleHook(module, isPreInit ? 'preInit' : 'Init', moduleName);
      if (isPreInit) {
        this.handlePreInitComplete(moduleName, module);
      } else {
        this.registry.states.set(moduleName, ModuleState.MOUNTED);
      }
      this.resolveWaiters(moduleName);
      return true;
    } catch {
      this.registry.states.set(moduleName, ModuleState.ERROR);
      this.resolveWaiters(moduleName);
      return false;
    }
  }

  private async moduleHook(module: any, methodName: string, moduleName: string): Promise<void> {
    const initMethod = module[methodName];
    if (typeof initMethod !== 'function') return;
    try {
      const result = initMethod.call(module);
      if (result && typeof result.then === 'function') await result;
    } catch (error: any) {
      this.core.logger.log(`[${moduleName}] ${methodName} 执行失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private handlePreInitComplete(moduleName: string, module: any): void {
    const core = this.core.meta.core as readonly string[];
    const early = this.core.meta.early as readonly string[];
    if (core.includes(moduleName) && !early.includes(moduleName)) (this.core as any)[moduleName] = module;
    this.preInitialized.add(moduleName);
  }

  private phaseInit(phase: string, logName: string): void {
    for (const name of this.TopologicalOrder()) {
      const module = this.registry.modules.get(name);
      if (this.registry.states.get(name) !== ModuleState.MOUNTED) continue;
      const phaseMethod = module[phase];
      if (typeof phaseMethod !== 'function') continue;
      try {
        phaseMethod.call(module);
      } catch (error: any) {
        this.core.logger.log(`[${name}] ${logName}失败: ${error.message}`, 'ERROR');
      }
    }
    this.core.logger.log(`${logName}完成`, 'DEBUG');
  }

  private TopologicalOrder(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];
    this.registry.modules.forEach((_, name) => {
      const deps = this.registry.dependencies.get(name);
      const validDeps = deps ? [...deps].filter(dep => this.registry.states.get(dep) !== ModuleState.EXPOSED) : [];
      inDegree.set(name, validDeps.length);
      if (validDeps.length === 0) queue.push(name);
    });

    for (let idx = 0; idx < queue.length; idx++) {
      const current = queue[idx];
      result.push(current);
      const dependents = this.registry.dependents.get(current);
      if (!dependents) continue;
      dependents.forEach(dependent => {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) queue.push(dependent);
      });
    }
    return result;
  }

  private circularDependency(moduleName: string, allDependencies: Set<string>): boolean {
    if (this.circularCache.has(moduleName)) return this.circularCache.get(moduleName)!;
    const hasCircular = this.detectCircularDependency(moduleName, [...allDependencies]);
    this.circularCache.set(moduleName, hasCircular);
    return hasCircular;
  }

  private detectCircularDependency(startName: string, dependencies: string[]): boolean {
    const graph = new Map<string, string[]>();
    this.registry.modules.forEach((_, name) => graph.set(name, [...(this.registry.dependencies.get(name) || [])]));
    if (!graph.has(startName)) graph.set(startName, dependencies);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      recursionStack.add(node);
      const neighbors = graph.get(node) || [];
      if (neighbors.some(neighbor => hasCycle(neighbor))) return true;
      recursionStack.delete(node);
      return false;
    };
    const result = hasCycle(startName);
    if (result) this.core.logger.log(`循环依赖检测到: ${startName}`, 'ERROR');
    return result;
  }
}

export default ModuleSystem;
