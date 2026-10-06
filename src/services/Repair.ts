// ./src/services/Repair.ts

import type ModLoader from '../host/ModLoader';
import type Emitter from '../infra/Emitter';
import Diagnostics from '../infra/Diagnostics';
import Cipher from '../infra/Cipher';
import type IndexedDB from './IndexedDB';
import { textToBytes } from '../utils/binary';
import { RepairConnection, type RepairConnectionInput, type ConnectionResult } from './Repair/Connection';
import { RepairAgent } from './Repair/Agent';
import { RepairEngine, type RepairOverlay } from './Repair/Engine';
import { NativeJSON } from './Repair/Json';
import { RepairProof, type ReplacePatchProof } from './Repair/Proof';
import { RepairPrompt } from './Repair/Prompt';
import { RepairSources, type RepairSource } from './Repair/Source';
import { ZonesManager } from '../modules/Frameworks/ZonesManager';
import { RepairRecipeParser, type RepairContext, type RepairRecipe, type RepairTarget } from './Repair/Recipe';
import { RepairTargets, type RepairZone, type RepairAnchors, type RepairHandle } from './Repair/Targets';

export interface RepairMemory {
  id: string;
  summary: string;
  state: 'pending' | 'trial' | 'active' | 'disabled' | 'stale' | 'failed';
  enabled: boolean;
  createdAt: string;
  verifiedAt?: string;
  error?: string;
  recipe: RepairRecipe;
  context: RepairContext;
  steps?: Array<{ recipe: RepairRecipe; context: RepairContext }>;
}

interface RepairSecret {
  key: CryptoKey;
  iv: string;
  data: string;
}

interface RepairConfig {
  id: 'connection';
  connection: RepairConnectionInput;
  secret?: RepairSecret;
}

interface RepairProposal {
  recipe: RepairRecipe;
  context: RepairContext;
  overlays: RepairOverlay[];
}

interface AppliedRepair {
  record: RepairMemory;
  overlays: RepairOverlay[];
  handles: RepairHandle[];
  proof: ReplacePatchProof;
  anchorOutputs: Map<RepairHandle, string>;
}

export class Repair extends Diagnostics {
  private static targetKey(target: Pick<RepairTarget, 'modName' | 'kind' | 'path'>): string {
    return `${target.modName}\0${target.kind}\0${target.path}`;
  }

  private static memoryTargets(record: RepairMemory): RepairTarget[] {
    return [...(record.steps || []).flatMap(step => step.context.targets), ...record.context.targets];
  }

  private static memoryRows(rows: unknown[]): RepairMemory[] {
    const states = ['pending', 'trial', 'active', 'disabled', 'stale', 'failed'];
    const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
    const step = (value: unknown): boolean =>
      object(value) &&
      object(value.recipe) &&
      object(value.context) &&
      typeof value.context.requestId === 'string' &&
      Array.isArray(value.context.targets) &&
      value.context.targets.every(
        target =>
          object(target) &&
          typeof target.id === 'string' &&
          typeof target.modName === 'string' &&
          typeof target.kind === 'string' &&
          typeof target.path === 'string' &&
          typeof target.content === 'string' &&
          typeof target.fingerprint === 'string'
      );
    return rows.filter(
      (row): row is RepairMemory =>
        object(row) &&
        typeof row.id === 'string' &&
        row.id.startsWith('memory:') &&
        typeof row.summary === 'string' &&
        typeof row.createdAt === 'string' &&
        typeof row.enabled === 'boolean' &&
        states.includes(String(row.state)) &&
        step(row) &&
        (row.steps === undefined || (Array.isArray(row.steps) && row.steps.length <= 16 && row.steps.every(step)))
    );
  }

  private static readonly STORE = 'repair';
  public readonly connection: RepairConnectionInput = { apiType: 'openai', apiUrl: '', apiKey: '', model: '' };
  private storageFailure?: string;
  private storageKey?: CryptoKey;
  private savedConnection?: RepairConnectionInput;
  private proposal?: RepairProposal;
  private readonly applied: AppliedRepair[] = [];
  private readonly verifiedTrials = new Set<string>();
  private readonly sessionRepairs = new Map<string, RepairMemory>();
  private loaded = false;
  private readonly busyTargets = new Set<string>();
  private anchors: RepairAnchors = new Map();
  private originalPassages: ReadonlyMap<string, string> = new Map();

  public constructor(
    private readonly idb: IndexedDB,
    private readonly host: ModLoader,
    events: Emitter,
    private readonly zone: () => RepairZone | undefined = () => undefined
  ) {
    super(host, 'repair');
    events.once(':indexedDB', () => idb.define(Repair.STORE, { keyPath: 'id' }));
    events.once(':idbReady', () => this.loadConnection());
    events.once(':addon:repair', () => this.replay());
    events.after(':addon:beforePatch', () => this.captureAnchorOutputs());
    events.once(':addon:verify', () => this.verify());
    events.once(':modLoaderEnd', () => this.verify(true));
  }

  private static errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Repair operation failed';
  }

  private async put(record: RepairMemory | RepairConfig): Promise<void> {
    try {
      await this.idb.with(Repair.STORE, 'readwrite', tx => tx.objectStore(Repair.STORE).put(record));
      this.storageFailure = undefined;
    } catch (error) {
      this.storageFailure = Repair.errorMessage(error);
      throw error;
    }
  }

  public get storageError(): string | undefined {
    return this.storageFailure;
  }

  public get connectionSaved(): boolean {
    return !!this.savedConnection && (['apiType', 'apiUrl', 'apiKey', 'model'] as const).every(name => this.connection[name] === this.savedConnection![name]);
  }

  private async writeConnection(connection: RepairConnectionInput): Promise<void> {
    try {
      const record: RepairConfig = { id: 'connection', connection: { ...connection } };
      if (connection.apiKey && Cipher.available) {
        const key = this.storageKey ?? (await Cipher.generateKey());
        record.secret = { key, ...(await Cipher.encrypt(textToBytes(connection.apiKey), key)) };
        record.connection.apiKey = '';
      }
      // 加密完成后再开启事务，密钥与密文随配置一起原子保存。
      await this.idb.with(Repair.STORE, 'readwrite', async tx => {
        const store = tx.objectStore(Repair.STORE);
        const current = (await store.get('connection')) as RepairConfig | undefined;
        if (current?.secret && !record.secret && (!Cipher.available || !this.storageKey)) throw new Error('Encrypted repair key unavailable');
        await store.put(record);
      });
      this.storageKey = record.secret?.key;
      this.storageFailure = undefined;
    } catch (error) {
      this.storageFailure = Repair.errorMessage(error);
      throw error;
    }
  }

  private async loadConnection(): Promise<void> {
    if (this.loaded) return;
    try {
      const record = (await this.idb.with(Repair.STORE, 'readonly', tx => tx.objectStore(Repair.STORE).get('connection'))) as RepairConfig | undefined;
      let config = record?.connection;
      if (config && record?.secret) {
        if (!Cipher.available) throw new Error('WebCrypto unavailable');
        const decrypted = await Cipher.decrypt(record.secret, record.secret.key);
        config = { ...config, apiKey: new TextDecoder().decode(decrypted) };
        this.storageKey = record.secret.key;
      }
      // 将旧地址和模型设置迁入此存储，不改动已安装模组数据库。
      if (!config && this.idb.has('settings')) {
        const old = await this.idb.with('settings', 'readonly', tx => tx.objectStore('settings').get('RepairConnection'));
        if (old?.value) config = { ...old.value, apiKey: '' };
      }
      if (config) {
        const connection = { ...this.connection };
        if (RepairConnection.TYPES.includes(config.apiType!)) connection.apiType = config.apiType;
        for (const name of ['apiUrl', 'apiKey', 'model'] as const) if (typeof config[name] === 'string') connection[name] = config[name];
        if (!record?.secret) await this.writeConnection(connection);
        Object.assign(this.connection, connection);
        this.savedConnection = connection;
        if (this.idb.has('settings')) await this.idb.with('settings', 'readwrite', tx => tx.objectStore('settings').delete('RepairConnection'));
      }
      this.loaded = true;
      this.storageFailure = undefined;
    } catch (error) {
      this.storageFailure = Repair.errorMessage(error);
      this.write('Repair settings unavailable; continuing normal loading', 'WARN');
    }
  }

  public async saveConnection(): Promise<void> {
    if (!RepairConnection.TYPES.includes(this.connection.apiType || 'openai') || /[\r\n]/.test(this.connection.apiKey)) throw new Error('Invalid repair connection');
    RepairConnection.endpoint(this.connection.apiUrl, this.connection.apiType, this.connection.model);
    const connection = {
      ...this.connection,
      apiType: this.connection.apiType || 'openai',
      apiUrl: this.connection.apiUrl.trim(),
      apiKey: this.connection.apiKey.trim(),
      model: this.connection.model.trim()
    };
    await this.writeConnection(connection);
    Object.assign(this.connection, connection);
    this.savedConnection = connection;
    this.loaded = true;
    this.storageFailure = undefined;
  }

  public async test(signal: AbortSignal): Promise<ConnectionResult> {
    if (signal.aborted) return 'timeout';
    await this.saveConnection();
    return RepairConnection.test({ ...this.connection }, signal);
  }

  public async fetchModels(signal: AbortSignal): ReturnType<typeof RepairConnection.listModels> {
    if (signal.aborted) return { result: 'timeout', models: [] };
    await this.saveConnection();
    const input = { ...this.connection };
    const response = await RepairConnection.listModels(input, signal);
    if (!signal.aborted && response.result === 'success') {
      this.connection.model = response.models.includes(input.model) ? input.model : response.models[0];
      await this.saveConnection();
    }
    return response;
  }

  private resolve = (target: RepairTarget) => RepairTargets.handle(this.host, target, this.anchors)?.read();

  private async anchorTargets(): Promise<RepairTarget[]> {
    if (!this.host.modUtils.getMod('maplebirch')) return [];
    const targets: RepairTarget[] = [];
    for (const [path, anchor] of this.anchors) {
      const content = anchor.descriptor.src!;
      targets.push({
        id: '',
        modName: 'maplebirch',
        kind: 'patch-anchor',
        path,
        signature: RepairTargets.anchorSignature(anchor.descriptor),
        reference: anchor.title,
        content,
        fingerprint: await RepairRecipeParser.fingerprint(content)
      });
    }
    return targets;
  }

  public async analyze(signal: AbortSignal, language: 'EN' | 'CN' = 'EN'): Promise<{ result: ConnectionResult | 'preflight'; recipe?: RepairRecipe; overlays?: RepairOverlay[]; reason?: string }> {
    this.proposal = undefined;
    if (signal.aborted) return { result: 'timeout' };
    await this.saveConnection();
    const input = { ...this.connection };
    const context = await RepairAgent.context(this.host, input.apiKey, await this.anchorTargets(), this.originalPassages);
    if (signal.aborted) return { result: 'timeout' };
    this.write(`Repair request: ${RepairPrompt.messages(context, language).reduce((size, message) => size + message.content.length, 0)} characters, ${context.targets.length} targets`);
    const response = await RepairAgent.analyze(input, context, signal, language);
    if (!signal.aborted && (response.result !== 'success' || response.reason)) this.write(`Repair analysis: ${response.result}${response.reason ? ` (${response.reason})` : ''}`, 'WARN');
    if (signal.aborted) return { result: 'timeout' };
    if (response.result !== 'success' || !response.recipe) return { result: response.result, ...(response.reason && { reason: response.reason }) };
    let overlays: RepairOverlay[];
    try {
      overlays = await RepairEngine.prepare(response.recipe, context, this.resolve);
    } catch (error) {
      if (signal.aborted) return { result: 'timeout' };
      const message = error instanceof Error ? error.message : '';
      const reason = /^(?:Repair target changed: target-\d+|Repair inputs changed during preparation)$/.test(message) ? message : 'Repair preparation failed';
      this.write(`Repair analysis: preflight (${reason})`, 'WARN');
      return { result: 'preflight', reason };
    }
    if (signal.aborted) return { result: 'timeout' };
    this.proposal = { recipe: response.recipe, context, overlays };
    return { ...response, overlays };
  }

  public async list(): Promise<RepairMemory[]> {
    const rows: unknown[] = await this.idb.with(Repair.STORE, 'readonly', tx => tx.objectStore(Repair.STORE).getAll());
    return Repair.memoryRows(rows).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public async stage(): Promise<void> {
    const proposal = this.proposal;
    if (!proposal?.overlays.length) throw new Error('No executable repair proposal');
    await RepairEngine.prepare(proposal.recipe, proposal.context, this.resolve);
    const ids = new Set(proposal.recipe.operations.map(operation => operation.targetId));
    const sourceRepair = proposal.overlays.some(overlay => overlay.target.kind === 'js' || overlay.target.kind === 'twee');
    const destinations = new Set<string>();
    for (const overlay of proposal.overlays) {
      if (overlay.target.kind !== 'twee-replacer' && !(overlay.target.kind === 'replace-patcher' && overlay.target.path.endsWith('|binding'))) continue;
      const binding = NativeJSON.parse(overlay.after) as { passage?: string; passageName?: string; fileName?: string };
      destinations.add((binding.passage ?? binding.passageName ?? binding.fileName)!);
    }
    const { relatedRules: _relatedRules, scripts: _scripts, omittedRules: _omittedRules, ...proposalContext } = proposal.context;
    const context: RepairContext = {
      ...proposalContext,
      diagnostics: [],
      modLoaderLogs: [],
      patches: [],
      conflicts: [],
      passages: proposal.context.passages?.filter(passage => sourceRepair || destinations.has(passage.name)).map(({ name, current, excerpts }) => ({ name, current, excerpts })),
      sources: proposal.context.sources?.filter(source => sourceRepair || destinations.has(source.name)),
      ...(sourceRepair && proposal.context.scripts && { scripts: proposal.context.scripts }),
      targets: proposal.context.targets.filter(target => ids.has(target.id)).map(({ reference: _reference, ...target }) => target)
    };
    if (sourceRepair) {
      for (const target of proposal.context.targets) {
        if (ids.has(target.id)) continue;
        if (target.kind === 'js' && !context.sources?.some(source => source.name === target.path)) (context.sources ||= []).push({ name: target.path, kind: 'js', current: target.content });
        if (target.kind === 'twee' && !context.passages?.some(passage => passage.name === target.path)) (context.passages ||= []).push({ name: target.path, current: target.content });
      }
    }
    const record: RepairMemory = {
      id: `memory:${crypto.randomUUID()}`,
      summary: proposal.recipe.summary,
      state: 'pending',
      enabled: true,
      createdAt: new Date().toISOString(),
      recipe: proposal.recipe,
      context
    };
    const targetKeys = new Set(proposal.overlays.map(overlay => Repair.targetKey(overlay.target)));
    const inherited = [...this.sessionRepairs.values()].filter(row => Repair.memoryTargets(row).some(target => targetKeys.has(Repair.targetKey(target))));
    const steps = inherited.flatMap(row => [...(row.steps || []), { recipe: row.recipe, context: row.context }]);
    if (steps.length > 16) throw new Error('Repair memory steps limit reached');
    if (steps.length) record.steps = steps;
    Repair.memoryTargets(record).forEach(target => targetKeys.add(Repair.targetKey(target)));
    if (NativeJSON.stringify(record).length > 512000) throw new Error('Repair memory is too large');
    await this.idb.with(Repair.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(Repair.STORE);
      const memories = Repair.memoryRows(await store.getAll());
      const replaced = memories.filter(row => Repair.memoryTargets(row).some(target => targetKeys.has(Repair.targetKey(target))));
      if (memories.length - replaced.length >= 100) throw new Error('Repair memory limit reached');
      for (const old of replaced) await store.delete(old.id);
      await store.put(record);
    });
    this.proposal = undefined;
  }

  private async get(id: string): Promise<RepairMemory> {
    if (!id.startsWith('memory:')) throw new Error('Invalid repair record');
    const record = (await this.list()).find(row => row.id === id);
    if (!record) throw new Error('Repair record missing');
    return record;
  }

  public async setEnabled(id: string, enabled: boolean): Promise<void> {
    const record = await this.get(id);
    await this.put({ ...record, enabled, state: enabled ? (record.verifiedAt ? 'active' : 'pending') : 'disabled', error: undefined });
  }

  public async remove(id: string): Promise<void> {
    await this.get(id);
    await this.idb.with(Repair.STORE, 'readwrite', tx => tx.objectStore(Repair.STORE).delete(id));
    this.verifiedTrials.delete(id);
  }

  public async confirm(id: string): Promise<void> {
    const record = await this.get(id);
    if (record.state !== 'trial' || !this.verifiedTrials.has(id)) throw new Error('Repair has not passed loading verification in this session');
    await this.put({ ...record, state: 'active', verifiedAt: new Date().toISOString() });
  }

  private static currentPathSource(
    kind: 'js' | 'twee' | 'css',
    name: string,
    current: RepairSource | undefined,
    mods: ReturnType<typeof RepairTargets.loadedMods>,
    finalOnly: boolean
  ): string | undefined {
    const field = kind === 'js' ? 'scriptFileItems' : kind === 'twee' ? 'passageDataItems' : 'styleFileItems';
    if (!finalOnly) {
      const matches = mods.flatMap(mod => mod.cache[field].items.filter(item => item.name === name));
      if (matches.length) return matches.length === 1 ? matches[0].content : undefined;
    }
    return current?.[field].map.get(name)?.content;
  }

  /** 按已记录的名称重新读取源码，不沿用记忆中的旧正文。 */
  private livePathContext(context: RepairContext, finalOnly = false): RepairContext {
    let current: RepairSource | undefined;
    let mods: ReturnType<typeof RepairTargets.loadedMods> = [];
    try {
      current = this.host.modSC2DataManager.getSC2DataInfoAfterPatch();
    } catch (error) {
      this.write('Repair current path source unavailable', 'WARN', this.scope, error);
    }
    if (!finalOnly) {
      try {
        mods = RepairTargets.loadedMods(this.host);
      } catch (error) {
        this.write('Repair loaded path sources unavailable', 'WARN', this.scope, error);
      }
    }
    const live: RepairContext = { ...context, targets: [], sources: [], passages: [], scripts: [] };
    const modified = new Set(context.targets.filter(target => target.kind === 'js' || target.kind === 'twee').map(target => `${target.kind}\0${target.path}`));
    for (const target of context.targets) {
      if (target.kind !== 'js' && target.kind !== 'twee') {
        live.targets.push(target);
        continue;
      }
      // 最终正文已验证存活，仅沿用修改前已有的路径，避免新调用自证。
      if (finalOnly) {
        live.targets.push(target);
        continue;
      }
      const content = this.resolve(target);
      if (content !== undefined) live.targets.push({ ...target, content });
    }
    for (const source of context.sources || []) {
      if (finalOnly && modified.has(`${source.kind}\0${source.name}`)) continue;
      const content = Repair.currentPathSource(source.kind, source.name, current, mods, finalOnly);
      if (content !== undefined) live.sources!.push({ name: source.name, kind: source.kind, current: content });
    }
    for (const passage of context.passages || []) {
      if (finalOnly && modified.has(`twee\0${passage.name}`)) continue;
      const content = Repair.currentPathSource('twee', passage.name, current, mods, finalOnly);
      if (content !== undefined) live.passages!.push({ name: passage.name, current: content });
    }
    for (const script of context.scripts || []) {
      if (finalOnly && modified.has(`js\0${script.name}`)) continue;
      const content = Repair.currentPathSource('js', script.name, current, mods, finalOnly);
      if (content !== undefined) live.scripts!.push({ name: script.name, symbols: [], excerpts: [{ line: 1, content }] });
    }
    return live;
  }

  // 后续同目标整段替换的中间路径不会进入最终正文。
  private static *pathSteps(steps: NonNullable<RepairMemory['steps']>): Generator<{ recipe: RepairRecipe; context: RepairContext }> {
    const later = new Map<string, Set<string>>();
    for (let index = steps.length - 1; index >= 0; index--) {
      const { recipe, context } = steps[index];
      const targets = new Map(context.targets.map(target => [target.id, target]));
      const operations = recipe.operations.filter(operation => {
        const target = targets.get(operation.targetId);
        if (!target) return true;
        const key = Repair.targetKey(target);
        let finds = later.get(key);
        const retained = !finds?.has(operation.replace);
        if (!finds) later.set(key, (finds = new Set()));
        finds.add(operation.find);
        return retained;
      });
      yield { recipe: { ...recipe, operations }, context };
    }
  }

  private async prepareMemory(record: RepairMemory): Promise<RepairOverlay[]> {
    const staged = new Map<string, RepairOverlay>();
    const steps = [...(record.steps || []), { recipe: record.recipe, context: record.context }];
    if (steps.length > 17) throw new Error('Repair memory steps limit reached');
    for (const step of Repair.pathSteps(steps)) {
      if (RepairRecipeParser.validatePaths(step.recipe, step.context)) RepairRecipeParser.validatePaths(step.recipe, this.livePathContext(step.context));
    }
    for (const step of steps) {
      const overlays = await RepairEngine.prepare(step.recipe, step.context, target => {
        const previous = staged.get(Repair.targetKey(target));
        if (!previous) return this.resolve(target);
        const signature = previous.replacement ? RepairTargets.companionForBody(previous.target.signature!, previous.replacement.after) : previous.target.signature;
        if (target.signature !== signature) throw new Error('Repair companion changed between memory steps');
        return previous.after;
      });
      for (const overlay of overlays) {
        const id = Repair.targetKey(overlay.target);
        const previous = staged.get(id);
        if (!previous) {
          staged.set(id, overlay);
          continue;
        }
        const replacement = previous.replacement ? { before: previous.replacement.before, after: overlay.replacement?.after ?? previous.replacement.after } : overlay.replacement;
        staged.set(id, { ...overlay, before: previous.before, target: previous.target, ...(replacement && { replacement }) });
      }
    }
    if ([...staged.values()].some(overlay => this.resolve({ ...overlay.target, content: overlay.before }) !== overlay.before)) throw new Error('Repair sources changed during preparation');
    return [...staged.values()];
  }

  private async replay(): Promise<void> {
    try {
      this.anchors = RepairTargets.captureAnchors(this.zone());
      const memories = await this.list();
      if (memories.some(record => record.enabled && ['pending', 'trial', 'active'].includes(record.state) && Repair.memoryTargets(record).some(target => target.kind === 'twee-replacer')))
        await RepairTargets.prepareRules(this.host);
      this.originalPassages = RepairSources.captureOriginalPassages(
        this.host,
        [...this.anchors.values()].map(anchor => anchor.title)
      );
      for (const record of memories) {
        if (!record.enabled || !['pending', 'trial', 'active'].includes(record.state)) continue;
        try {
          const overlays = await this.prepareMemory(record);
          if (!overlays.length) throw new Error('Empty repair');
          const keys = overlays.map(overlay => Repair.targetKey(overlay.target));
          if (keys.some(key => this.busyTargets.has(key))) throw new Error('Conflicting repair targets');
          const handles = overlays.map(overlay => RepairTargets.handle(this.host, { ...overlay.target, content: overlay.before }, this.anchors));
          if (handles.some(handle => !handle)) throw new Error('Repair target unavailable');
          const ready = handles as RepairHandle[];
          const proof = RepairProof.observe(ready, this);
          let written = 0;
          try {
            for (let index = 0; index < overlays.length; index++) {
              written++;
              ready[index].write(overlays[index].after, overlays[index].replacement?.after);
            }
          } catch (error) {
            proof.restore();
            for (let index = written - 1; index >= 0; index--) {
              try {
                ready[index].write(overlays[index].before, overlays[index].replacement?.before);
              } catch (error) {
                this.write(`Repair rollback failed: ${record.id} (${ready[index].output.kind}: ${ready[index].output.path})`, 'WARN', this.scope, error);
              }
            }
            throw error;
          }
          keys.forEach(key => this.busyTargets.add(key));
          this.applied.push({ record, overlays, handles: ready, proof, anchorOutputs: new Map() });
          this.sessionRepairs.set(record.id, record);
        } catch (error) {
          try {
            await this.put({ ...record, enabled: false, state: 'stale', error: Repair.errorMessage(error) });
          } catch (error) {
            this.write(`Repair disabled status could not be saved: ${record.id}`, 'WARN', this.scope, error);
          }
          this.write(`Repair disabled: ${record.id}`, 'WARN', this.scope, error);
        }
      }
    } catch (error) {
      this.write('Repair replay unavailable; continuing normal loading', 'WARN', this.scope, error);
    }
  }

  private captureAnchorOutputs(): void {
    try {
      const records = this.host.modSC2DataManager.getSC2DataInfoAfterPatch().passageDataItems.map;
      for (const applied of this.applied)
        for (const handle of applied.handles) {
          if (!handle.anchor) continue;
          const content = records.get(handle.output.path)?.content;
          if (content !== undefined) applied.anchorOutputs.set(handle, content);
        }
    } catch (error) {
      this.write('Repair anchor output snapshot unavailable', 'WARN', this.scope, error);
    }
  }

  private async verify(atEnd = false): Promise<void> {
    const completed = new Set<AppliedRepair>();
    const patchOutputs = new Map<string, { sequence: number; content: string }>();
    for (const applied of this.applied)
      for (const handle of applied.handles) {
        const content = applied.proof.output(handle);
        if (!applied.proof.verify(handle) || content === undefined) continue;
        const key = `${handle.output.kind}\0${handle.output.path}`;
        const sequence = applied.proof.sequence(handle);
        if (!patchOutputs.has(key) || sequence > patchOutputs.get(key)!.sequence) patchOutputs.set(key, { sequence, content });
      }
    for (const applied of this.applied) {
      let complete = false;
      try {
        const final = this.host.modSC2DataManager.getSC2DataInfoAfterPatch();
        for (let index = 0; index < applied.overlays.length; index++) {
          const overlay = applied.overlays[index],
            handle = applied.handles[index];
          if (handle.read() !== overlay.after) throw new Error('Another patch changed the repair target');
          if (overlay.replacement && handle.output.replacement !== overlay.replacement.after) throw new Error('Another patch changed the derived replacement');
          if ((handle.twee || handle.addon) && !atEnd) continue;
          const records = handle.output.kind === 'twee' ? final.passageDataItems : handle.output.kind === 'js' ? final.scriptFileItems : final.styleFileItems;
          const content = records.map.get(handle.output.path)?.content;
          if (content === undefined) throw new Error('Repaired output missing');
          const survived = (expected: string | undefined) =>
            expected !== undefined &&
            (content === expected || content === expected + '\n' || (atEnd && handle.output.kind === 'twee' && content === ZonesManager.wrapSpecialPassage(expected, handle.output.path)));
          if (handle.anchor) {
            const report = this.host.diagnostics.patches.find(patch => patch.kind === 'passage' && patch.target === handle.anchor!.title && patch.index === handle.anchor!.index);
            if (!report || report.status !== 'applied' || report.applied < 1 || !survived(applied.anchorOutputs.get(handle))) throw new Error('Repaired framework anchor did not survive merging');
          } else if (handle.output.replacement !== undefined) {
            const output = patchOutputs.get(`${handle.output.kind}\0${handle.output.path}`)?.content;
            if (!applied.proof.verify(handle) || !survived(output)) throw new Error('Repaired patch output could not be verified');
          } else if (!survived(overlay.after)) throw new Error('Repaired output was overwritten');
        }
        if (!atEnd) continue;
        for (const step of Repair.pathSteps([...(applied.record.steps || []), { recipe: applied.record.recipe, context: applied.record.context }])) {
          if (RepairRecipeParser.validatePaths(step.recipe, step.context)) RepairRecipeParser.validatePaths(step.recipe, this.livePathContext(step.context, true));
        }
        complete = true;
        const state = applied.record.verifiedAt ? 'active' : 'trial';
        await this.put({ ...applied.record, state, error: undefined });
        if (state === 'trial') this.verifiedTrials.add(applied.record.id);
      } catch (error) {
        complete = true;
        try {
          await this.put({ ...applied.record, state: 'failed', enabled: false, error: Repair.errorMessage(error) });
        } catch (error) {
          this.write(`Repair failed status could not be saved: ${applied.record.id}`, 'WARN', this.scope, error);
        }
        this.write(`Repair verification failed: ${applied.record.id}`, 'WARN', this.scope, error);
      } finally {
        if (complete) {
          applied.proof.restore();
          completed.add(applied);
        }
      }
    }
    for (let index = this.applied.length - 1; index >= 0; index--) if (completed.has(this.applied[index])) this.applied.splice(index, 1);
  }
}

export default Repair;
