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
  loadInitExecuted: boolean;
  postInitExecuted: boolean;
}

class ModuleSystem {
  readonly registry: ModuleRegistry = {
    modules: new Map(),
    states: new Map(),
    sources: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
    allDependencies: new Map(),
    waitingQueue: new Map()
  };

  readonly initPhase: InitPhase = {
    preInitCompleted: false,
    mainInitCompleted: false,
    loadInitExecuted: false,
    postInitExecuted: false
  };

  private sourceStack: string[] = [];
  private preInitialized = new Set<string>();
  private waiters = new Map<string, Array<() => void>>();
  private disabledNames: Set<string> | null = null;
  private circularCache = new Map<string, boolean>();

  constructor(readonly core: MaplebirchCore) {}

  async runWithSource<T>(source: string, callback: () => T | Promise<T>): Promise<T> {
    this.sourceStack.push(source);
    try {
      return await callback();
    } finally {
      this.sourceStack.pop();
    }
  }

  register(name: string, module: any, dependencies: string[] = []): boolean {
    if (this.registry.modules.has(name)) {
      this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
      return false;
    }

    const source = this.sourceStack[this.sourceStack.length - 1] || '';
    const directDependencies = [...new Set([...(module.dependencies || []), ...(dependencies || [])])];
    const allDependencies = this.collectAllDependencies(directDependencies);
    const state = module?.exposed === true ? ModuleState.EXPOSED : ModuleState.REGISTERED;

    if (this.hasCircularDependency(name, allDependencies)) {
      this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
      return false;
    }

    if (state === ModuleState.EXPOSED) {
      if ((this.core as any)[name] != null) {
        this.core.logger.log(`暴露模块 ${name} 挂载失败: 名称冲突`, 'WARN');
        return false;
      }
      (this.core as any)[name] = module;
    }
    this.storeModule(name, module, directDependencies, allDependencies, source, state);
    if (state === ModuleState.REGISTERED) this.handleEarlyMount(name, module, directDependencies);

    this.processWaitingQueue(name);
    this.core.logger.log(
      `${state === ModuleState.EXPOSED ? '注册暴露模块' : '注册模块'}: ${name}${directDependencies.length ? `, 依赖: [${directDependencies.join(', ')}]` : ' (无依赖)'}${source ? ` (来源: ${source})` : ''}`,
      'DEBUG'
    );
    if (allDependencies.size > directDependencies.length) this.core.logger.log(`传递依赖: [${[...allDependencies].join(', ')}]`, 'DEBUG');
    return true;
  }

  get dependencyGraph() {
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
        dependencies: Array.from(this.registry.dependencies.get(name) || []),
        dependents: Array.from(this.registry.dependents.get(name) || []),
        state: typeof state === 'number' ? ModuleState[state] || `UNKNOWN(${state})` : state || `UNKNOWN(${state})`,
        allDependencies: Array.from(this.registry.allDependencies.get(name) || []),
        source: this.registry.sources.get(name) || ''
      };
    });
    return graph;
  }

  async init(phase: 'pre' | 'init' | 'load' | 'post'): Promise<void> {
    if (phase === 'pre') {
      if (this.initPhase.preInitCompleted) return;
      for (const name of this.getTopologicalOrder()) await this.initModule(name, true);
      this.initPhase.preInitCompleted = true;
      this.core.logger.log('预初始化完成', 'INFO');
      return;
    }

    if (phase === 'init') {
      if (this.initPhase.mainInitCompleted) return;
      if (!this.initPhase.preInitCompleted) await this.init('pre');
      for (const name of this.getTopologicalOrder()) await this.initModule(name, false);
      this.initPhase.mainInitCompleted = true;
      this.core.logger.log('主初始化完成', 'INFO');
      return;
    }

    if (phase === 'load') {
      if (this.initPhase.loadInitExecuted || !this.initPhase.mainInitCompleted) return;
      await this.executePhaseInit('loadInit', '存档初始化');
      this.initPhase.loadInitExecuted = true;
      return;
    }

    if (this.initPhase.postInitExecuted || !this.initPhase.mainInitCompleted) return;
    await this.executePhaseInit('postInit', '后初始化');
    this.initPhase.postInitExecuted = true;
  }

  private async isModuleDisabled(name: string): Promise<boolean> {
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
    let retries = 0;

    const checkDeps = () => {
      const stillUnmet = unmetDeps.filter(dep => !(this.core as any)[dep]);
      if (stillUnmet.length === 0) {
        (this.core as any)[name] = module;
        this.core.logger.log(`[${name}] 模块已在依赖满足后挂载 (earlyMount)`, 'DEBUG');
        return;
      }
      if (retries++ < maxRetries) {
        setTimeout(checkDeps, 5);
        return;
      }
      this.core.logger.log(`[${name}] earlyMount 超时: 依赖未满足 [${stillUnmet.join(', ')}]`, 'WARN');
    };

    setTimeout(checkDeps, 0);
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
    if (pendingModules.length > 0) queueMicrotask(() => pendingModules.forEach(moduleName => void this.initModule(moduleName)));
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

  private async initModule(moduleName: string, isPreInit = false): Promise<boolean> {
    const module = this.registry.modules.get(moduleName);
    if (!module) return false;
    const state = this.registry.states.get(moduleName);
    if (state === ModuleState.EXPOSED) return true;
    if (state === ModuleState.DISABLED) return false;
    if (state === ModuleState.MOUNTED || state === ModuleState.ERROR) return state === ModuleState.MOUNTED;
    if (await this.isModuleDisabled(moduleName)) {
      this.core.logger.log(`模块 ${moduleName} 被禁用，跳过初始化`, 'DEBUG');
      this.registry.states.set(moduleName, ModuleState.DISABLED);
      this.resolveWaiters(moduleName);
      return false;
    }
    if (!(await this.checkDependencies(moduleName, isPreInit))) return false;
    try {
      await this.executeModuleInit(module, isPreInit ? 'preInit' : 'Init', moduleName);
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

  private async executeModuleInit(module: any, methodName: string, moduleName: string): Promise<void> {
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

  private async executePhaseInit(phase: string, logName: string): Promise<void> {
    for (const name of this.getTopologicalOrder()) {
      const module = this.registry.modules.get(name);
      if (this.registry.states.get(name) !== ModuleState.MOUNTED) continue;
      const phaseMethod = module[phase];
      if (typeof phaseMethod !== 'function') continue;
      try {
        const result = phaseMethod.call(module);
        if (result && typeof result.then === 'function') await result;
      } catch (error: any) {
        this.core.logger.log(`[${name}] ${logName}失败: ${error.message}`, 'ERROR');
      }
    }
    this.core.logger.log(`${logName}完成`, 'INFO');
  }

  private getTopologicalOrder(): string[] {
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

  private hasCircularDependency(moduleName: string, allDependencies: Set<string>): boolean {
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
