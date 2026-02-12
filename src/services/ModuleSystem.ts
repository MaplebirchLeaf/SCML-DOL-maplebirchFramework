// ./src/services/ModuleSystem.ts

import { ModuleState } from '../constants';
import { MaplebirchCore } from '../core';

interface Registry {
  modules: Map<string, any>;
  states: Map<string, number | string>;
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
  allDependencies: Map<string, Set<string>>;
  waitingQueue: Map<string, Set<string>>;
  source: Map<string, string>;
}

interface InitPhase {
  preInitCompleted: boolean;
  mainInitCompleted: boolean;
  loadInitExecuted: boolean;
  postInitExecuted: boolean;
  expectedCount: number;
  registeredCount: number;
  allRegisteredTriggered: boolean;
}

class ModuleSystem {
  readonly registry: Registry = {
    modules: new Map(),
    states: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
    allDependencies: new Map(),
    waitingQueue: new Map(),
    source: new Map(),
  };

  readonly initPhase: InitPhase = {
    preInitCompleted: false,
    mainInitCompleted: false,
    loadInitExecuted: false,
    postInitExecuted: false,
    expectedCount: 0,
    registeredCount: 0,
    allRegisteredTriggered: false
  };

  private preInitialized = new Set<string>();
  private waitingResolvers = new Map<string, Array<() => void>>();
  private depthMemo = new Map<string, number>();
  private circularCheckCache = new Map<string, boolean>();

  constructor(readonly core: MaplebirchCore) { }

  async register(
    name: string,
    module: any,
    dependencies: string[] = [],
    source: string = ''
  ): Promise<boolean> {
    if (source) return this.registerExtension(name, module, source);
    if (this.registry.modules.has(name)) {
      this.core.logger.log(`模块 ${name} 已注册`, 'WARN');
      return false;
    }
    const moduleDependencies = [
      ...new Set([
        ...(module.dependencies || []),
        ...(dependencies || [])
      ])
    ];
    this.handleEarlyMount(name, module, moduleDependencies);
    const allDependencies = this.collectAllDependencies(moduleDependencies);
    if (this.hasCircularDependency(name, allDependencies)) {
      this.core.logger.log(`模块 ${name} 注册失败: 存在循环依赖`, 'ERROR');
      return false;
    }
    this.storeModuleRegistration(name, module, moduleDependencies, allDependencies);
    this.logModuleRegistration(name, moduleDependencies, allDependencies);
    this.initPhase.registeredCount++;
    this.checkModuleRegistration();
    this.processWaitingQueue(name);

    return true;
  }

  private logModuleRegistration(
    name: string,
    directDeps: string[],
    allDeps: Set<string>
  ) {
    if (directDeps.length > 0) {
      this.core.logger.log(`注册模块: ${name}, 依赖: [${directDeps.join(', ')}]`, 'DEBUG');
    } else {
      this.core.logger.log(`注册模块: ${name} (无依赖)`, 'DEBUG');
    }
    if (allDeps.size > directDeps.length) this.core.logger.log(`传递依赖: [${[...allDeps].join(', ')}]`, 'DEBUG');
  }

  private async registerExtension(
    name: string,
    module: any,
    source: string
  ): Promise<boolean> {
    try {
      if ((this.core as any)[name] != null) {
        this.core.logger.log(`扩展模块 ${name} 挂载失败: 名称冲突`, 'WARN');
        return false;
      }
      let Extension = null;
      try {
        Extension = await this.core.idb.withTransaction(
          ['settings'],
          'readonly',
          async (tx: any) => await tx.objectStore('settings').get('Extension')
        );
      } catch (e) { }
      if (this.core.lodash.get(Extension, 'value.disabled', []).some((m: any) => m.name === name)) {
        this.core.logger.log(`扩展模块 ${name} 被禁用，跳过注册`, 'DEBUG');
        return false;
      }
      (this.core as any)[name] = module;
      this.registry.modules.set(name, module);
      this.registry.states.set(name, ModuleState.EXTENSION);
      this.registry.source.set(name, source);
      this.core.logger.log(`挂载扩展模块: ${name} (来源: ${source})`, 'DEBUG');
      return true;
    } catch (e: any) {
      this.core.logger.log(`扩展模块 ${name} 挂载失败: ${e.message}`, 'ERROR');
      return false;
    }
  }

  private handleEarlyMount(name: any, module: any, dependencies: any[]) {
    if (!this.core.meta.early.includes(name)) return;
    const earlyMount = new Set(this.core.meta.early);
    const unmetDeps = dependencies.filter(dep => earlyMount.has(dep) && !(this.core as any)[dep]);
    if (unmetDeps.length === 0) {
      (this.core as any)[name] = module;
      this.registry.states.set(name, ModuleState.LOADED);
      this.core.logger.log(`[${name}] 模块已在注册时挂载 (earlyMount)`, 'DEBUG');
    } else {
      this.core.logger.log(`[${name}] 模块等待依赖挂载: [${unmetDeps.join(', ')}]`, 'DEBUG');
      this.scheduleEarlyMountCheck(name, module, unmetDeps);
    }
  }

  private scheduleEarlyMountCheck(name: string, module: any, unmetDeps: string[]) {
    const maxRetries = 10;
    let retries = 0;

    const checkDeps = () => {
      const stillUnmet = unmetDeps.filter(dep => !(this.core as any)[dep]);
      if (stillUnmet.length === 0) {
        (this.core as any)[name] = module;
        this.registry.states.set(name, ModuleState.LOADED);
        this.core.logger.log(`[${name}] 模块已在依赖满足后挂载 (earlyMount)`, 'DEBUG');
      } else if (retries++ < maxRetries) {
        setTimeout(checkDeps, 5);
      } else {
        this.core.logger.log(`[${name}] earlyMount 超时: 依赖未满足 [${stillUnmet.join(', ')}]`, 'WARN');
      }
    };

    setTimeout(checkDeps, 0);
  }

  private collectAllDependencies(directDeps: string[]): Set<string> {
    const allDeps = new Set<string>();
    const visited = new Set<string>();
    const collect = (depName: string) => {
      if (visited.has(depName)) return;
      visited.add(depName);
      allDeps.add(depName);
      const subDeps = this.registry.dependencies.get(depName);
      if (subDeps) subDeps.forEach(collect);
    };

    directDeps.forEach(collect);
    return allDeps;
  }

  private storeModuleRegistration(
    name: string,
    module: any,
    directDeps: string[],
    allDeps: Set<string>
  ) {
    this.registry.modules.set(name, module);
    this.registry.states.set(name, ModuleState.REGISTERED);
    this.registry.dependencies.set(name, new Set(directDeps));
    this.registry.allDependencies.set(name, allDeps);
    if (!this.registry.dependents.has(name)) this.registry.dependents.set(name, new Set());
    directDeps.forEach(dep => {
      if (!this.registry.dependents.has(dep)) this.registry.dependents.set(dep, new Set());
      this.registry.dependents.get(dep)!.add(name);
    });
  }

  private processWaitingQueue(name: string) {
    const waitingModules = this.registry.waitingQueue.get(name);
    if (!waitingModules) return;
    const pendingModules = [...waitingModules].filter(moduleName =>
      this.registry.states.get(moduleName) === ModuleState.REGISTERED ||
      this.registry.states.get(moduleName) === ModuleState.LOADED
    );
    if (pendingModules.length > 0) queueMicrotask(() => this.core.lodash.forEach(pendingModules, moduleName => this.initModule(moduleName)));
    this.registry.waitingQueue.delete(name);
  }

  set ExpectedModuleCount(count: number) {
    this.initPhase.expectedCount = count;
    this.checkModuleRegistration();
  }

  get dependencyGraph() {
    const graph: any = {};
    this.registry.modules.forEach((_, name) => {
      graph[name] = {
        dependencies: Array.from(this.registry.dependencies.get(name) || []),
        dependents: Array.from(this.registry.dependents.get(name) || []),
        state: ModuleState[this.registry.states.get(name) as number] || `UNKNOWN(${this.registry.states.get(name)})`,
        allDependencies: Array.from(this.registry.allDependencies.get(name) || []),
        source: this.registry.source.get(name) || null
      };
    });
    return graph;
  }

  async preInit() {
    if (this.initPhase.preInitCompleted) return;
    await this.initAllModules(true);
    this.initPhase.preInitCompleted = true;
    this.core.logger.log('预初始化完成', 'INFO');
  }

  async init() {
    if (this.initPhase.mainInitCompleted) return;
    if (!this.initPhase.preInitCompleted) await this.preInit();
    await this.initAllModules(false);
    this.initPhase.mainInitCompleted = true;
    this.core.logger.log('主初始化完成', 'INFO');
  }

  async loadInit() {
    if (this.initPhase.loadInitExecuted || !this.initPhase.mainInitCompleted) return;
    await this.executePhaseInit('loadInit', '存档初始化');
    this.initPhase.loadInitExecuted = true;
  }

  async postInit() {
    if (this.initPhase.postInitExecuted || !this.initPhase.mainInitCompleted) return;
    await this.executePhaseInit('postInit', '后初始化');
    this.initPhase.postInitExecuted = true;
  }

  private checkModuleRegistration() {
    if (this.initPhase.allRegisteredTriggered) return;
    const { expectedCount, registeredCount } = this.initPhase;
    if (registeredCount >= expectedCount) {
      this.core.logger.log(`模块注册完成 (${registeredCount}/${expectedCount})`, 'DEBUG');
      this.initPhase.allRegisteredTriggered = true;
    }
  }

  private waitForModule(moduleName: string): Promise<void> {
    const state = this.registry.states.get(moduleName);
    if (state === ModuleState.EXTENSION || state === ModuleState.MOUNTED || state === ModuleState.ERROR || this.preInitialized.has(moduleName)) return Promise.resolve();
    return new Promise(resolve => {
      const resolvers = this.waitingResolvers.get(moduleName) || [];
      if (resolvers.length === 0) this.waitingResolvers.set(moduleName, resolvers);
      resolvers.push(resolve);
    });
  }

  private resolveWaiters(moduleName: string) {
    const resolvers = this.waitingResolvers.get(moduleName);
    if (!resolvers || resolvers.length === 0) return;

    resolvers.forEach(resolve => {
      try {
        resolve();
      } catch (e) { }
    });

    this.waitingResolvers.delete(moduleName);
  }

  private async checkDependencies(
    moduleName: string,
    isPreInit: boolean = false
  ): Promise<boolean> {
    const allDeps = this.registry.allDependencies.get(moduleName);
    if (!allDeps || allDeps.size === 0) return true;

    for (const dep of allDeps) {
      if (!this.registry.modules.has(dep)) {
        this.addToWaitingQueue(dep, moduleName);
        return false;
      }

      const depState = this.registry.states.get(dep);

      if (depState === ModuleState.EXTENSION) continue;

      if (isPreInit) {
        if (!this.preInitialized.has(dep)) await this.waitForModule(dep);
      } else {
        if (depState === ModuleState.ERROR) return false;

        if (depState !== ModuleState.MOUNTED) {
          await this.waitForModule(dep);
          if (this.registry.states.get(dep) === ModuleState.ERROR) return false;
        }
      }
    }

    return true;
  }

  private addToWaitingQueue(dependency: string, moduleName: string) {
    const queue = this.registry.waitingQueue.get(dependency) || new Set();
    if (queue.size === 0) {
      this.registry.waitingQueue.set(dependency, queue);
    }
    queue.add(moduleName);
  }

  private async initAllModules(isPreInit: boolean = false) {
    const initOrder = this.getTopologicalOrder();
    for (const name of initOrder) await this.initModule(name, isPreInit);
  }

  private async initModule(
    moduleName: string,
    isPreInit: boolean = false
  ): Promise<boolean> {
    const module = this.registry.modules.get(moduleName);
    if (!module) return false;
    const state = this.registry.states.get(moduleName);
    if (state === ModuleState.EXTENSION) return true;
    if (state === ModuleState.MOUNTED || state === ModuleState.ERROR) return state === ModuleState.MOUNTED;
    this.registry.states.set(moduleName, ModuleState.REGISTERED);
    if (!(await this.checkDependencies(moduleName, isPreInit))) return false;
    try {
      const initMethod = isPreInit ? 'preInit' : 'Init';
      await this.executeModuleInit(module, initMethod, moduleName);
      if (isPreInit) {
        this.handlePreInitComplete(moduleName, module);
      } else {
        this.registry.states.set(moduleName, ModuleState.MOUNTED);
      }
      this.resolveWaiters(moduleName);
      return true;
    } catch (error) {
      this.registry.states.set(moduleName, ModuleState.ERROR);
      this.resolveWaiters(moduleName);
      return false;
    }
  }

  private async executeModuleInit(module: any, methodName: string, moduleName: string) {
    const initMethod = module[methodName];
    if (typeof initMethod !== 'function') return;

    try {
      const result = initMethod.call(module);
      if (result instanceof Promise) await result;
    } catch (error: any) {
      this.core.logger.log(`[${moduleName}] ${methodName} 执行失败: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  private handlePreInitComplete(moduleName: any, module: any) {
    const shouldMount = this.core.meta.core.includes(moduleName) && !this.core.meta.early.includes(moduleName);
    if (shouldMount) {
      (this.core as any)[moduleName] = module;
      this.registry.states.set(moduleName, ModuleState.LOADED);
    }
    this.preInitialized.add(moduleName);
  }

  private async executePhaseInit(phase: string, logName: string) {
    const initOrder = this.getTopologicalOrder();
    for (const name of initOrder) {
      const module = this.registry.modules.get(name);
      if (this.registry.states.get(name) !== ModuleState.MOUNTED) continue;
      const phaseMethod = module[phase];
      if (typeof phaseMethod !== 'function') continue;
      try {
        const result = phaseMethod.call(module);
        if (result instanceof Promise) await result;
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
      const validDeps = deps ? [...deps].filter(dep => this.registry.states.get(dep) !== ModuleState.EXTENSION) : [];
      const degree = validDeps.length;
      inDegree.set(name, degree);
      if (degree === 0) queue.push(name);
    });

    let idx = 0;
    while (idx < queue.length) {
      const current = queue[idx++];
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

  private hasCircularDependency(moduleName: string, allDeps: Set<string>): boolean {
    if (this.circularCheckCache.has(moduleName)) return this.circularCheckCache.get(moduleName)!;
    const hasCircular = this.detectCircularDependency(moduleName, [...allDeps]);
    this.circularCheckCache.set(moduleName, hasCircular);
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
      if (this.core.lodash.some(neighbors, neighbor => hasCycle(neighbor))) return true;
      recursionStack.delete(node);
      return false;
    };
    const result = hasCycle(startName);
    if (result) this.core.logger.log(`循环依赖检测到: ${startName}`, 'ERROR');
    return result;
  }

  private getModuleDepth(moduleName: string): number {
    if (this.depthMemo.has(moduleName)) return this.depthMemo.get(moduleName)!;
    const deps = this.registry.dependencies.get(moduleName);
    if (!deps || deps.size === 0) {
      this.depthMemo.set(moduleName, 0);
      return 0;
    }
    const validDeps = [...deps].filter(dep => this.registry.states.get(dep) !== ModuleState.EXTENSION);
    const depth = validDeps.length === 0 ? 0 : Math.max(...validDeps.map(dep => this.getModuleDepth(dep) + 1));
    this.depthMemo.set(moduleName, depth);
    return depth;
  }
}

export default ModuleSystem