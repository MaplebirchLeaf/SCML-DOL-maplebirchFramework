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
import RepairBody from './Repair/Body';
import RepairState, { type RepairStatePolicy, type RepairStateHandle } from './Repair/State';
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
  stateOverlays: RepairOverlay[];
  stateHandles: RepairStateHandle[];
  sourceVerified: boolean;
  stateVerified: boolean;
  finishing: boolean;
  stateEpoch: number;
  stateRoot?: object;
}

export class Repair extends Diagnostics {
  private static targetKey(target: Pick<RepairTarget, 'modName' | 'kind' | 'path'>): string {
    return `${target.modName}\0${target.kind}\0${target.path}`;
  }

  private static overlaps(left: Pick<RepairTarget, 'modName' | 'kind' | 'path'>, right: Pick<RepairTarget, 'modName' | 'kind' | 'path'>): boolean {
    if (left.kind === 'state' && right.kind === 'state') return RepairState.overlaps(NativeJSON.parse(left.path) as string[], NativeJSON.parse(right.path) as string[]);
    return Repair.targetKey(left) === Repair.targetKey(right);
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
  private readonly stateSnapshots = new WeakMap<RepairOverlay, string[]>();
  private readonly memories = new Map<string, AppliedRepair>();
  private readonly revoked = new Set<string>();
  private loaded = false;
  private readonly busyTargets = new Set<string>();
  private anchors: RepairAnchors = new Map();
  private originalPassages: ReadonlyMap<string, string> = new Map();
  private stateEpoch = 0;

  public constructor(
    private readonly idb: IndexedDB,
    private readonly host: ModLoader,
    events: Emitter,
    private readonly zone: () => RepairZone | undefined = () => undefined,
    private readonly variables: () => object | undefined = () => undefined
  ) {
    super(host, 'repair');
    events.once(':indexedDB', () => idb.define(Repair.STORE, { keyPath: 'id' }));
    events.once(':idbReady', () => this.loadConnection());
    events.once(':addon:repair', () => this.replay());
    events.after(':addon:beforePatch', () => this.captureAnchorOutputs());
    events.once(':addon:verify', () => this.verify());
    events.once(':modLoaderEnd', () => this.verify(true));
    events.on(':variable', () => this.applyStates());
  }

  private statePolicy(target: Pick<RepairTarget, 'modName' | 'path' | 'signature'>): RepairStatePolicy {
    const policy = RepairState.policy(NativeJSON.parse(target.signature || '{}'));
    if (policy.modName !== target.modName || NativeJSON.stringify(policy.path) !== target.path || NativeJSON.stringify(policy) !== target.signature || policy.modName !== 'maplebirch')
      throw new Error('Repair state binding changed');
    return policy;
  }

  private async stateTargets(paths: Iterable<string[]>): Promise<RepairTarget[]> {
    const root = this.variables();
    if (!root) return [];
    const targets: RepairTarget[] = [];
    const selected: Array<{ path: string[]; content: string }> = [];
    for (const candidate of paths) {
      try {
        const path = RepairState.targetPath(candidate, root);
        if (selected.some(target => RepairState.overlaps(target.path, path))) continue;
        selected.push({ path, content: RepairState.read(path, root) });
        if (selected.length === 8) break;
      } catch (error) {
        this.write('Repair state snapshot unavailable', 'WARN', this.scope, error);
      }
    }
    for (const { path, content } of selected) {
      const policy: RepairStatePolicy = { modName: 'maplebirch', path, scope: 'state' };
      const signature = NativeJSON.stringify(policy);
      targets.push({
        id: '',
        modName: policy.modName,
        kind: 'state',
        path: NativeJSON.stringify(policy.path),
        signature,
        reference: signature,
        content,
        fingerprint: await RepairRecipeParser.fingerprint(content)
      });
    }
    return targets;
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
      if (config) {
        const connection = { ...this.connection };
        if (RepairConnection.TYPES.includes(config.apiType!)) connection.apiType = config.apiType;
        for (const name of ['apiUrl', 'apiKey', 'model'] as const) if (typeof config[name] === 'string') connection[name] = config[name];
        if (!record?.secret) await this.writeConnection(connection);
        Object.assign(this.connection, connection);
        this.savedConnection = connection;
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

  private resolve = (target: RepairTarget): string | undefined => {
    if (target.kind !== 'state') return RepairTargets.handle(this.host, target, this.anchors)?.read();
    const policy = this.statePolicy(target);
    const root = this.variables();
    return root && RepairState.read(policy.path, root);
  };

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
    const context = await RepairAgent.context(this.host, input.apiKey, await this.anchorTargets(), this.originalPassages, paths => this.stateTargets(paths));
    if (signal.aborted) return { result: 'timeout' };
    this.write(`Repair request: ${context.targets.length} targets`);
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
    const inherited = [...this.sessionRepairs.values()].filter(row => Repair.memoryTargets(row).some(target => proposal.overlays.some(overlay => Repair.overlaps(target, overlay.target))));
    const steps = inherited.flatMap(row => {
      const states = this.memories.get(row.id)?.stateOverlays ?? this.applied.find(item => item.record.id === row.id)?.stateOverlays ?? [];
      const replaced = states.filter(old => proposal.overlays.some(next => next.target.kind === 'state' && Repair.overlaps(next.target, old.target) && !this.stateContinues(old, next)));
      return [...(row.steps || []), { recipe: row.recipe, context: row.context }].flatMap(step => {
        const targets = new Map(step.context.targets.map(target => [target.id, target]));
        const retained = (target: RepairTarget) => target.kind !== 'state' || !replaced.some(old => Repair.overlaps(target, old.target));
        const operations = step.recipe.operations.filter(operation => retained(targets.get(operation.targetId)!));
        if (!operations.length) return [];
        return [{ recipe: { ...step.recipe, operations }, context: { ...step.context, targets: step.context.targets.filter(retained) } }];
      });
    });
    if (steps.length > 16) throw new Error('Repair memory steps limit reached');
    if (steps.length) record.steps = steps;
    await this.prepareMemory(record, true);
    if (NativeJSON.stringify(record).length > 512000) throw new Error('Repair memory is too large');
    await this.idb.with(Repair.STORE, 'readwrite', async tx => {
      const store = tx.objectStore(Repair.STORE);
      const memories = Repair.memoryRows(await store.getAll());
      const replaced = memories.filter(row => Repair.memoryTargets(row).some(target => Repair.memoryTargets(record).some(next => Repair.overlaps(target, next))));
      if (memories.length - replaced.length >= 100) throw new Error('Repair memory limit reached');
      for (const old of replaced) await store.delete(old.id);
      await store.put(record);
    });
    this.proposal = undefined;
  }

  private async get(id: string): Promise<RepairMemory> {
    if (!id.startsWith('memory:')) throw new Error('Invalid repair record');
    const row = await this.idb.with(Repair.STORE, 'readonly', tx => tx.objectStore(Repair.STORE).get(id));
    const record = Repair.memoryRows([row])[0];
    if (!record) throw new Error('Repair record missing');
    return record;
  }

  public async setEnabled(id: string, enabled: boolean): Promise<void> {
    const record = await this.get(id);
    await this.put({ ...record, enabled, state: enabled ? (record.verifiedAt ? 'active' : 'pending') : 'disabled', error: undefined });
    if (!enabled) this.forget(id);
  }

  public async remove(id: string): Promise<void> {
    await this.get(id);
    await this.idb.with(Repair.STORE, 'readwrite', tx => tx.objectStore(Repair.STORE).delete(id));
    this.verifiedTrials.delete(id);
    this.forget(id);
  }

  private forget(id: string): void {
    this.revoked.add(id);
    this.sessionRepairs.delete(id);
    this.memories.delete(id);
    const pending = this.applied.find(item => item.record.id === id);
    if (pending) {
      pending.record.enabled = false;
      pending.proof.restore();
      for (const overlay of [...pending.overlays, ...pending.stateOverlays]) this.busyTargets.delete(Repair.targetKey(overlay.target));
      this.discard(pending);
    }
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

  private static *pathSteps(steps: NonNullable<RepairMemory['steps']>): Generator<{ recipe: RepairRecipe; context: RepairContext }> {
    const later = new Map<string, Set<string>>();
    for (let index = steps.length - 1; index >= 0; index--) {
      const { recipe, context } = steps[index];
      const targets = new Map(context.targets.map(target => [target.id, target]));
      const operations = recipe.operations.filter(operation => {
        if (operation.type) return true;
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

  private stateContinues(previous: RepairOverlay, next: RepairOverlay): boolean {
    try {
      const before = this.statePolicy(previous.target);
      const after = this.statePolicy(next.target);
      if (before.path.length === after.path.length && (Repair.targetKey(previous.target) !== Repair.targetKey(next.target) || previous.target.signature !== next.target.signature)) return false;
      return before.path.length <= after.path.length
        ? RepairState.fragment(before, previous.after, after.path) === next.before
        : RepairState.fragment(after, next.before, before.path) === previous.after;
    } catch {
      return false;
    }
  }

  private async foldStates(history: RepairOverlay[]): Promise<RepairOverlay> {
    const anchor = history.reduce((parent, overlay) => (this.statePolicy(overlay.target).path.length < this.statePolicy(parent.target).path.length ? overlay : parent));
    const index = history.indexOf(anchor);
    const policy = this.statePolicy(anchor.target);
    let before = anchor.before;
    const snapshots = new Set([before]);
    for (let step = index - 1; step >= 0; step--) {
      const overlay = history[step];
      before = RepairState.replaceFragment(policy, before, this.statePolicy(overlay.target).path, overlay.after, overlay.before);
      snapshots.add(before);
    }
    let after = anchor.before;
    for (const overlay of history.slice(index)) {
      after = RepairState.replaceFragment(policy, after, this.statePolicy(overlay.target).path, overlay.before, overlay.after);
      snapshots.add(after);
    }
    const folded = { ...anchor, target: { ...anchor.target, fingerprint: await RepairRecipeParser.fingerprint(before) }, before, after, fingerprint: await RepairRecipeParser.fingerprint(after) };
    if (history.length > 1) this.stateSnapshots.set(folded, [...snapshots]);
    return folded;
  }

  private async prepareMemory(record: RepairMemory, stateOnly = false): Promise<RepairOverlay[]> {
    const staged = new Map<string, RepairOverlay>();
    const originalSteps = [...(record.steps || []), { recipe: record.recipe, context: record.context }];
    if (originalSteps.length > 17) throw new Error('Repair memory steps limit reached');
    const steps = originalSteps.flatMap(step => {
      if (!stateOnly) return [step];
      const operations = step.recipe.operations.filter(operation => operation.type === 'state');
      const ids = new Set(operations.map(operation => operation.targetId));
      return operations.length ? [{ recipe: { ...step.recipe, operations }, context: { ...step.context, targets: step.context.targets.filter(target => ids.has(target.id)) } }] : [];
    });
    const history: RepairOverlay[] = [];
    for (const step of Repair.pathSteps(steps)) {
      if (RepairRecipeParser.validatePaths(step.recipe, step.context)) RepairRecipeParser.validatePaths(step.recipe, this.livePathContext(step.context));
    }
    for (const step of steps) {
      const overlays = await RepairEngine.prepare(step.recipe, step.context, target => {
        if (target.kind === 'state') this.statePolicy(target);
        const previous = staged.get(Repair.targetKey(target));
        if (!previous) {
          if (target.kind !== 'state') return this.resolve(target);
          const parent = [...staged.values()].find(
            overlay => overlay.target.kind === 'state' && Repair.overlaps(overlay.target, target) && this.statePolicy(overlay.target).path.length < this.statePolicy(target).path.length
          );
          return parent ? RepairState.fragment(this.statePolicy(parent.target), parent.after, this.statePolicy(target).path) : target.content;
        }
        const signature = previous.replacement ? RepairTargets.companionForBody(previous.target.signature!, previous.replacement.after) : previous.target.signature;
        if (target.signature !== signature) throw new Error('Repair companion changed between memory steps');
        return previous.after;
      });
      for (const overlay of overlays) {
        if (overlay.target.kind === 'state') {
          history.push(overlay);
          const previous = [...staged.values()].filter(item => item.target.kind === 'state' && Repair.overlaps(item.target, overlay.target));
          const parent = [...previous, overlay].reduce((left, right) => (this.statePolicy(left.target).path.length <= this.statePolicy(right.target).path.length ? left : right));
          const folded = await this.foldStates(history.filter(item => Repair.overlaps(item.target, parent.target)));
          for (const item of previous) staged.delete(Repair.targetKey(item.target));
          staged.set(Repair.targetKey(folded.target), folded);
          continue;
        }
        const id = Repair.targetKey(overlay.target);
        const previous = staged.get(id);
        if (!previous) {
          staged.set(id, overlay);
          continue;
        }
        const replacement = previous.replacement
          ? {
              before: previous.replacement.before,
              after: overlay.replacement?.after ?? previous.replacement.after,
              introduced: [...new Set([...(previous.replacement.introduced || []), ...(overlay.replacement?.introduced || [])])]
            }
          : overlay.replacement;
        if (replacement?.introduced) replacement.introduced = RepairBody.filterDependencies(replacement.after, replacement.introduced, RepairRecipeParser.macroRanges);
        staged.set(id, { ...overlay, before: previous.before, target: previous.target, ...(replacement && { replacement }) });
      }
    }
    if ([...staged.values()].some(overlay => overlay.target.kind !== 'state' && this.resolve({ ...overlay.target, content: overlay.before }) !== overlay.before))
      throw new Error('Repair sources changed during preparation');
    this.validateStateTargets([...staged.values()]);
    return [...staged.values()];
  }

  private validateStateTargets(overlays: RepairOverlay[], previous: Iterable<AppliedRepair> = []): void {
    const paths = [...previous].flatMap(applied => applied.stateOverlays.map(overlay => this.statePolicy(overlay.target).path));
    for (const overlay of overlays) {
      if (overlay.target.kind !== 'state') continue;
      const path = this.statePolicy(overlay.target).path;
      if (paths.some(existing => RepairState.overlaps(existing, path))) throw new Error('Overlapping repair state targets');
      paths.push(path);
    }
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
          const prepared = await this.prepareMemory(record);
          if (!prepared.length) throw new Error('Empty repair');
          this.validateStateTargets(prepared, [...this.applied, ...this.memories.values()]);
          const keys = prepared.map(overlay => Repair.targetKey(overlay.target));
          if (keys.some(key => this.busyTargets.has(key))) throw new Error('Conflicting repair targets');
          const stateOverlays = prepared.filter(overlay => overlay.target.kind === 'state');
          const overlays = prepared.filter(overlay => overlay.target.kind !== 'state');
          const handles = overlays.map(overlay => RepairTargets.handle(this.host, { ...overlay.target, content: overlay.before }, this.anchors));
          if (handles.some(handle => !handle)) throw new Error('Repair target unavailable');
          const ready = handles as RepairHandle[];
          let applied: AppliedRepair | undefined;
          const guard = overlays.some(overlay => overlay.replacement?.introduced?.length)
            ? {
                validate: (handle: RepairHandle, source: string) => {
                  const overlay = overlays[ready.indexOf(handle)];
                  if (!overlay.replacement?.introduced?.length || !handle.twee) return;
                  RepairBody.validateScope(source, handle.twee.rule.findString || '', overlay.replacement.introduced, RepairRecipeParser.macroRanges);
                },
                rollback: (error: unknown) => {
                  if (!applied?.record.enabled) return;
                  this.rollback(applied);
                  applied.record = { ...applied.record, enabled: false, error: Repair.errorMessage(error) };
                }
              }
            : undefined;
          const proof = RepairProof.observe(ready, this, guard);
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
          applied = {
            record,
            overlays,
            handles: ready,
            proof,
            anchorOutputs: new Map(),
            stateOverlays,
            stateHandles: [],
            stateVerified: !stateOverlays.length,
            sourceVerified: !overlays.length,
            finishing: false,
            stateEpoch: 0
          };
          this.applied.push(applied);
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

  private writeStates(overlays: RepairOverlay[]): RepairStateHandle[] {
    const root = this.variables();
    if (!root) throw new Error('Repair variables are not ready');
    const handles = overlays.map(overlay => RepairState.handle(root, this.statePolicy(overlay.target)));
    const before = handles.map(handle => handle.read());
    if (
      before.some(
        (content, index) =>
          content !== overlays[index].before && content !== overlays[index].after && !this.stateSnapshots.get(overlays[index])?.some(snapshot => RepairState.equals(snapshot, content))
      )
    )
      throw new Error('Repair state fingerprint changed');
    try {
      for (let index = 0; index < handles.length; index++) {
        if (before[index] !== overlays[index].after) handles[index].write(overlays[index].after);
      }
      if (handles.some((handle, index) => handle.read() !== overlays[index].after)) throw new Error('Repair state verification failed');
      return handles;
    } catch (error) {
      for (const handle of [...handles].reverse()) {
        try {
          handle.restore();
        } catch (rollbackError) {
          this.write('Repair state rollback failed', 'WARN', this.scope, rollbackError);
        }
      }
      throw error;
    }
  }

  private applyStates(): void {
    this.stateEpoch++;
    for (const applied of this.applied.slice()) {
      if (!applied.record.enabled || !applied.stateOverlays.length) continue;
      try {
        applied.stateHandles = [];
        applied.stateVerified = false;
        applied.stateEpoch = this.stateEpoch;
        applied.stateRoot = this.variables();
        applied.stateHandles = this.writeStates(applied.stateOverlays);
        applied.stateVerified = true;
        if (applied.sourceVerified) void this.finish(applied);
      } catch (error) {
        this.rollback(applied);
        this.discard(applied);
        void this.fail(applied.record, error);
      }
    }
    for (const memory of this.memories.values()) {
      try {
        this.writeStates(memory.stateOverlays);
      } catch (error) {
        this.rollback(memory);
        void this.fail(memory.record, error);
      }
    }
  }

  private rollback(applied: AppliedRepair): void {
    applied.proof.restore();
    if (applied.stateEpoch === this.stateEpoch && applied.stateRoot === this.variables()) {
      for (let index = applied.stateHandles.length - 1; index >= 0; index--) {
        try {
          const handle = applied.stateHandles[index];
          if (handle.read() === applied.stateOverlays[index].after) handle.restore();
          else this.write('Repair state changed after application; reload required', 'WARN');
        } catch (error) {
          this.write('Repair state rollback failed', 'WARN', this.scope, error);
        }
      }
    }
    for (let index = applied.handles.length - 1; index >= 0; index--) {
      try {
        const overlay = applied.overlays[index];
        const handle = applied.handles[index];
        if (handle.read() === overlay.after && (!overlay.replacement || handle.output.replacement === overlay.replacement.after)) handle.write(overlay.before, overlay.replacement?.before);
        else this.write('Repair source changed after application; reload required', 'WARN');
      } catch (error) {
        this.write('Repair source rollback failed; reload required', 'WARN', this.scope, error);
      }
    }
    this.sessionRepairs.delete(applied.record.id);
    this.memories.delete(applied.record.id);
    this.verifiedTrials.delete(applied.record.id);
    for (const overlay of [...applied.overlays, ...applied.stateOverlays]) this.busyTargets.delete(Repair.targetKey(overlay.target));
  }

  private discard(applied: AppliedRepair): void {
    const index = this.applied.indexOf(applied);
    if (index !== -1) this.applied.splice(index, 1);
  }

  private async fail(record: RepairMemory, error: unknown): Promise<void> {
    try {
      await this.updateMemory(record, { state: 'failed', enabled: false, error: Repair.errorMessage(error) });
    } catch (storageError) {
      this.write(`Repair failed status could not be saved: ${record.id}`, 'WARN', this.scope, storageError);
    }
    this.write(`Repair verification failed: ${record.id}; reload required`, 'WARN', this.scope, error);
  }

  private async updateMemory(record: RepairMemory, change: Partial<RepairMemory>): Promise<boolean> {
    try {
      const updated = await this.idb.with(Repair.STORE, 'readwrite', async tx => {
        const store = tx.objectStore(Repair.STORE);
        const current = Repair.memoryRows([await store.get(record.id)])[0];
        if (!current?.enabled || this.revoked.has(record.id)) return false;
        await store.put({ ...current, ...change });
        return true;
      });
      this.storageFailure = undefined;
      return updated;
    } catch (error) {
      this.storageFailure = Repair.errorMessage(error);
      throw error;
    }
  }

  private async finish(applied: AppliedRepair): Promise<void> {
    if (applied.finishing) return;
    applied.finishing = true;
    try {
      const state = applied.record.verifiedAt ? 'active' : 'trial';
      const updated = await this.updateMemory(applied.record, { state, error: undefined });
      if (!updated || this.revoked.has(applied.record.id)) return;
      if (state === 'trial') this.verifiedTrials.add(applied.record.id);
      if (applied.stateOverlays.length) this.memories.set(applied.record.id, applied);
      applied.proof.restore();
      applied.stateHandles = [];
    } catch (error) {
      this.rollback(applied);
      await this.fail(applied.record, error);
    } finally {
      applied.proof.restore();
      this.discard(applied);
    }
  }

  private async verify(atEnd = false): Promise<void> {
    const patchOutputs = new Map<string, { sequence: number; content: string }>();
    for (const applied of this.applied)
      for (const handle of applied.handles) {
        const content = applied.proof.output(handle);
        if (!applied.proof.verify(handle) || content === undefined) continue;
        const key = `${handle.output.kind}\0${handle.output.path}`;
        const sequence = applied.proof.sequence(handle);
        if (!patchOutputs.has(key) || sequence > patchOutputs.get(key)!.sequence) patchOutputs.set(key, { sequence, content });
      }
    for (const applied of this.applied.slice()) {
      try {
        if (!applied.record.enabled) throw new Error(applied.record.error || 'Repair was withdrawn before native patching');
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
          if (atEnd && overlay.replacement?.introduced?.length && handle.twee) {
            const body = overlay.replacement.after;
            const start = content.indexOf(body);
            if (start < 0 || content.indexOf(body, start + 1) >= 0) throw new Error('Migrated replacement output must be unique');
            const reference = content.slice(0, start) + handle.twee.rule.findString + content.slice(start + body.length);
            RepairBody.validateScope(reference, handle.twee.rule.findString || '', overlay.replacement.introduced, RepairRecipeParser.macroRanges);
          }
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
        applied.sourceVerified = true;
        if (applied.stateVerified) await this.finish(applied);
      } catch (error) {
        this.rollback(applied);
        this.discard(applied);
        await this.fail(applied.record, error);
      }
    }
  }
}

export default Repair;
