// ./src/services/CloudSave.ts

import Diagnostics from '../infra/Diagnostics';
import type SugarCube from '../host/SugarCube';
import type { DolStateMoment, TwineSugarCube } from '../../types/twine-sugarcube';
import { clone } from '../utils/object';

type CloudSaveSlot = number;

type PanelAction = 'connectRemote' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode';

interface CloudSaveConfig {
  endpoint: string;
  token: string;
  remember?: boolean;
}

interface CloudSaveRecord {
  slot: CloudSaveSlot;
  details: SaveDetails | null;
  save: SaveState;
  exportedAt: number;
  gameId?: string;
}

interface CloudSaveCodeRecord {
  code: string;
  exportedAt: number;
  gameId?: string;
}

interface CloudSaveRemoteItem {
  slot: CloudSaveSlot;
  updatedAt: number;
  payload?: CloudSaveRecord;
}

interface CloudSaveRemoteCode {
  updatedAt: number;
  payload?: CloudSaveCodeRecord;
}

interface SaveDetails {
  date?: number;
  title?: string;
  idx?: unknown;
  metadata?: { saveName?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface SaveState {
  history?: DolStateMoment[];
  delta?: unknown;
  [key: string]: unknown;
}

interface DoLSaveDatabase {
  getItem(slot: CloudSaveSlot): Promise<{ data?: SaveState } | null | undefined>;
  getSaveDetails(): Promise<Array<{ slot: CloudSaveSlot; data?: SaveDetails }> | null | undefined>;
  setItem(slot: CloudSaveSlot, save: SaveState, details?: SaveDetails): Promise<boolean | void>;
}

interface CloudSaveHost {
  DoLSave?: {
    isCompressionEnabled?(): boolean;
    disableCompression?(): void;
    enableCompression?(): void;
  };
  LZString?: { compressToBase64(value: string): string };
  Config?: TwineSugarCube['Config'];
  idb?: DoLSaveDatabase;
}

interface CloudSaveTools {
  isPlainObject(value: unknown): value is Record<string, unknown>;
  isFinite(value: unknown): boolean;
  isInteger(value: unknown): boolean;
  inRange(value: number, start: number, end: number): boolean;
}

export class CloudSave {
  private static readonly PANEL_STORAGE_KEY = 'maplebirch.cloudSave.panel';
  private static readonly REQUEST_TIMEOUT = 15_000;
  private config: CloudSaveConfig | null = null;
  private mountFrame: number | null = null;
  private busy = false;

  public constructor(
    readonly sugarcube: SugarCube,
    readonly translate: (key: string) => string,
    readonly tools: CloudSaveTools,
    readonly diagnostics: Diagnostics
  ) {}

  public configure(config: CloudSaveConfig): this {
    this.config = {
      endpoint: config.endpoint.trim().replace(/\/+$/, ''),
      token: config.token.trim(),
      remember: config.remember ?? false
    };
    return this;
  }

  /** 验证 Worker 与 Token 是否可用。 */
  public async connect(): Promise<void> {
    await this.listRemote();
  }

  /** 从 DoL 原生 IndexedDB 读取本地存档。 */
  public async exportSlot(slot: CloudSaveSlot): Promise<CloudSaveRecord> {
    this.validateSlot(slot);
    const [item, details] = await Promise.all([this.saveDB.getItem(slot), this.saveDB.getSaveDetails()]);
    if (!item?.data) throw new Error(`Local save slot ${slot} not found.`);
    return {
      slot,
      details: details?.find(item => item.slot === slot)?.data ?? null,
      save: item.data,
      exportedAt: Date.now(),
      gameId: this.sugarcube.runtime?.Story?.domId
    };
  }

  /** 将云端存档写回 DoL 原生 IndexedDB。 */
  public async importSlot(record: CloudSaveRecord, targetSlot: CloudSaveSlot = record.slot): Promise<boolean> {
    this.validateRecord(record);
    this.validateSlot(targetSlot);
    const result = await this.saveDB.setItem(targetSlot, this.normalizeSave(record.save), {
      ...record.details,
      date: Date.now()
    });
    await this.saveDB.getSaveDetails();
    return result !== false;
  }

  /** 上传本地存档。 */
  public async upload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    const item: CloudSaveRemoteItem = {
      slot,
      updatedAt: Date.now(),
      payload: await this.exportSlot(slot)
    };

    await this.request(`/saves/${slot}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });

    return {
      slot,
      updatedAt: item.updatedAt
    };
  }

  /** 下载云端存档。 */
  public async download(slot: CloudSaveSlot, targetSlot: CloudSaveSlot = slot): Promise<boolean> {
    this.validateSlot(slot);
    this.validateSlot(targetSlot);
    const response = await this.request<unknown>(`/saves/${slot}`, {}, true);
    if (response === null) throw new Error(`Remote save slot ${slot} not found.`);
    if (!this.tools.isPlainObject(response)) this.invalidResponse();
    const item = response as Partial<CloudSaveRemoteItem>;
    if (item.slot !== slot || !this.tools.isFinite(item.updatedAt)) this.invalidResponse();
    const payload = item.payload;
    this.validateRecord(payload);
    if (payload.slot !== item.slot) this.invalidResponse();
    return this.importSlot(payload, targetSlot);
  }

  /** 获取远端存档列表。 */
  public async listRemote(): Promise<CloudSaveRemoteItem[]> {
    const response = await this.request<unknown>('/saves');
    if (!Array.isArray(response)) this.invalidResponse();
    for (const value of response) {
      if (!this.tools.isPlainObject(value)) this.invalidResponse();
      const item = value as Partial<CloudSaveRemoteItem>;
      if (!this.isSlot(item.slot) || !this.tools.isFinite(item.updatedAt)) this.invalidResponse();
    }
    return response as CloudSaveRemoteItem[];
  }

  /** 删除远端存档。 */
  public async deleteRemote(slot: CloudSaveSlot): Promise<void> {
    this.validateSlot(slot);
    await this.request(`/saves/${slot}`, {
      method: 'DELETE'
    });
  }

  /** 导出当前 SugarCube 存档码。 */
  public exportCode(): string {
    const save = this.sugarcube.runtime?.Save;
    if (typeof save?.serialize !== 'function') throw new Error('SugarCube.Save.serialize is not available.');
    const dolSave = (window as Window & CloudSaveHost).DoLSave;
    const compressed = dolSave?.isCompressionEnabled?.() === true;
    if (compressed) dolSave.disableCompression?.();
    try {
      return save.serialize();
    } finally {
      if (compressed) dolSave.enableCompression?.();
    }
  }

  /** 将指定本地槽位转换为 SugarCube 存档码。 */
  public async exportSlotCode(slot: CloudSaveSlot): Promise<string> {
    const record = await this.exportSlot(slot);
    const lz = (window as Window & CloudSaveHost).LZString;
    const runtime = this.sugarcube.runtime;
    const story = runtime?.Story;
    const config = runtime?.Config ?? (window as Window & CloudSaveHost).Config;
    if (!runtime || !lz?.compressToBase64 || !story?.domId || !config?.saves?.id) throw new Error(this.translate('cloud.save.error.code.tools'));
    const { history, ...state } = this.normalizeSave(record.save);
    const save = {
      id: config.saves.id,
      state: { ...state, delta: runtime.State.deltaEncode(history) },
      idx: record.details?.idx ?? runtime.State.qc,
      ...(record.details?.metadata ? { metadata: record.details.metadata } : {}),
      ...(config.saves.version ? { version: config.saves.version } : {})
    };
    const data = lz.compressToBase64(JSON.stringify(save));
    return (
      data +
      lz.compressToBase64(
        JSON.stringify({
          [story.domId]: data.length
        })
      )
    );
  }

  /** 导入 SugarCube 存档码。 */
  public importCode(code: string): boolean {
    const save = this.sugarcube.runtime?.Save;
    if (typeof save?.deserialize !== 'function') throw new Error('SugarCube.Save.deserialize is not available.');
    return save.deserialize(code) !== null;
  }

  /** 上传 SugarCube 存档码。 */
  public async uploadCode(code = this.exportCode()): Promise<CloudSaveRemoteCode> {
    const item: CloudSaveRemoteCode = {
      updatedAt: Date.now(),
      payload: {
        code,
        exportedAt: Date.now(),
        gameId: this.sugarcube.runtime?.Story?.domId
      }
    };

    await this.request('/save-code', {
      method: 'PUT',
      body: JSON.stringify(item)
    });

    return {
      updatedAt: item.updatedAt
    };
  }

  /** 下载 SugarCube 存档码。 */
  public async downloadCode(): Promise<string> {
    const response = await this.request<unknown>('/save-code', {}, true);
    if (response === null) throw new Error(this.translate('cloud.save.error.code.remote'));
    if (!this.tools.isPlainObject(response)) this.invalidResponse();
    const item = response as Partial<CloudSaveRemoteCode>;
    if (!this.tools.isFinite(item.updatedAt)) this.invalidResponse();
    const payload = item.payload;
    this.validateCodeRecord(payload);
    if (!payload.code) throw new Error(this.translate('cloud.save.error.code.remote'));
    return payload.code;
  }

  /** 初始化云存档面板。 */
  public mountPanel(): void {
    if (this.mountFrame !== null) cancelAnimationFrame(this.mountFrame);
    this.mountFrame = requestAnimationFrame(() => {
      this.mountFrame = null;
      const panel = this.panel;
      if (!panel) return;
      const saved = this.loadPanelConfig();
      const endpoint = this.config?.endpoint || saved.endpoint;
      const token = this.config?.token || (saved.remember ? saved.token : '');
      const remember = this.config?.remember ?? saved.remember;

      this.setField(panel, 'endpoint', endpoint);
      this.setField(panel, 'token', token);

      const rememberBox = panel.querySelector<HTMLInputElement>('[data-cloud-save-field="remember"]');
      if (rememberBox) rememberBox.checked = remember;
      panel.querySelectorAll<HTMLInputElement>('[data-cloud-save-field]').forEach(input => (input.oninput = () => this.savePanelConfig(panel)));
      void this.populateSlotOptions(panel);

      if (!endpoint || !token) return;
      this.configure({ endpoint, token, remember });
      void this.refreshPanel(panel)
        .then(() => this.complete(panel, 'cloud.save.action.connect'))
        .catch(error => this.status(panel, Diagnostics.message(error)));
    });
  }

  /** Twee 面板动作入口。 */
  public async panelAction(action: PanelAction, slot?: CloudSaveSlot): Promise<void> {
    const panel = this.panel;
    if (!panel || this.busy) return;
    try {
      this.configure(this.readPanel(panel));
      this.savePanelConfig(panel);
      const slotActions: PanelAction[] = ['uploadSlot', 'downloadSlot', 'deleteRemoteSlot', 'exportSlotCode'];
      const targetSlot = slotActions.includes(action) ? (slot ?? this.panelSlot(panel)) : slot;

      this.busy = true;
      panel.setAttribute('aria-busy', 'true');
      panel.querySelectorAll<HTMLButtonElement>('button').forEach(button => (button.disabled = true));
      this.status(panel, 'cloud.save.status.working');
      await this.runPanelAction(panel, action, targetSlot);
    } catch (error) {
      this.status(panel, Diagnostics.message(error));
    } finally {
      this.busy = false;
      panel.setAttribute('aria-busy', 'false');
      panel.querySelectorAll<HTMLButtonElement>('button').forEach(button => (button.disabled = false));
    }
  }

  private async runPanelAction(panel: HTMLElement, action: PanelAction, slot?: CloudSaveSlot): Promise<void> {
    switch (action) {
      case 'connectRemote':
        await this.connect();
        return this.done(panel, 'cloud.save.action.connect');

      case 'uploadSlot':
        await this.upload(slot ?? this.panelSlot(panel));
        return this.done(panel, 'cloud.save.action.upload');

      case 'downloadSlot':
        if (!(await this.download(slot ?? this.panelSlot(panel)))) throw new Error(this.translate('cloud.save.error.download'));
        return this.done(panel, 'cloud.save.action.download');

      case 'deleteRemoteSlot':
        await this.deleteRemote(slot ?? this.panelSlot(panel));
        return this.done(panel, 'cloud.save.action.delete');

      case 'refreshRemoteList':
        return this.done(panel, 'cloud.save.action.refresh');

      case 'exportCurrentCode':
        this.setField(panel, 'code', this.exportCode());
        return this.complete(panel, 'cloud.save.action.code.current');

      case 'exportSlotCode':
        this.setField(panel, 'code', await this.exportSlotCode(slot ?? this.panelSlot(panel)));

        return this.complete(panel, 'cloud.save.action.code.export');

      case 'uploadCode':
        await this.uploadCode(this.field(panel, 'code').trim() || this.exportCode());

        return this.complete(panel, 'cloud.save.action.code.upload');

      case 'downloadCode':
        this.setField(panel, 'code', await this.downloadCode());

        return this.complete(panel, 'cloud.save.action.code.download');

      case 'importCode':
        if (!this.importCode(this.field(panel, 'code').trim())) throw new Error(this.translate('cloud.save.error.code.invalid'));
        return this.complete(panel, 'cloud.save.action.code.load');
    }
  }

  private async done(panel: HTMLElement, action: string): Promise<void> {
    await this.refreshPanel(panel);
    void this.populateSlotOptions(panel);
    this.complete(panel, action);
  }

  private complete(panel: HTMLElement, action: string): void {
    this.status(panel, this.translate('cloud.save.status.done').replace('{action}', this.translate(action)), true);
  }

  private async refreshPanel(panel: HTMLElement): Promise<void> {
    const list = panel.querySelector<HTMLElement>('[data-cloud-save-list]');
    if (!list) return;
    const items = await this.listRemote();
    if (!items.length) {
      list.textContent = this.translate('cloud.save.none');
      return;
    }
    list.replaceChildren(...items.map(item => this.remoteRow(item)));
  }

  private remoteRow(item: CloudSaveRemoteItem): HTMLElement {
    const row = document.createElement('div');
    row.className = 'maplebirch-cloud-save-row';

    const slot = document.createElement('span');
    slot.textContent = String(item.slot);
    const updated = document.createElement('span');
    updated.textContent = new Date(item.updatedAt).toLocaleString();
    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'saveMenuButton';
    download.textContent = this.translate('cloud.save.action.download');
    download.addEventListener('click', () => void this.panelAction('downloadSlot', item.slot));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'deleteButton right saveMenuButton';
    remove.textContent = this.translate('cloud.save.action.delete');
    remove.addEventListener('click', () => void this.panelAction('deleteRemoteSlot', item.slot));
    row.append(slot, updated, download, remove);
    return row;
  }

  private readPanel(panel: HTMLElement): CloudSaveConfig {
    return {
      endpoint: this.field(panel, 'endpoint').trim(),
      token: this.field(panel, 'token').trim(),
      remember: panel.querySelector<HTMLInputElement>('[data-cloud-save-field="remember"]')?.checked ?? false
    };
  }

  private loadPanelConfig(): {
    endpoint: string;
    token: string;
    remember: boolean;
  } {
    try {
      const data = JSON.parse(localStorage.getItem(CloudSave.PANEL_STORAGE_KEY) ?? '{}');
      return {
        endpoint: typeof data.endpoint === 'string' ? data.endpoint : '',
        token: typeof data.token === 'string' ? data.token : '',
        remember: data.remember === true
      };
    } catch (error) {
      this.diagnostics.write(`云存档面板设置读取失败: ${Diagnostics.message(error)}`, 'WARN', 'cloudSave');
      return { endpoint: '', token: '', remember: false };
    }
  }

  private savePanelConfig(panel = this.panel): void {
    try {
      const config = panel ? this.readPanel(panel) : this.config;
      if (!config) return;
      this.configure(config);
      const { endpoint, token, remember = false } = this.current;

      localStorage.setItem(
        CloudSave.PANEL_STORAGE_KEY,
        JSON.stringify({
          endpoint,
          token: remember ? token : '',
          remember
        })
      );
    } catch (error) {
      this.diagnostics.write(`云存档面板设置保存失败: ${Diagnostics.message(error)}`, 'WARN', 'cloudSave');
    }
  }

  /** Worker 请求统一入口。 */
  private async request<T = unknown>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    if (init.body != null) headers.set('Content-Type', 'application/json');
    const endpoint = new URL(`${this.endpoint}/`);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error(this.translate('cloud.save.error.endpoint'));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CloudSave.REQUEST_TIMEOUT);
    try {
      const response = await fetch(new URL(path.replace(/^\/+/, ''), endpoint), {
        ...init,
        headers,
        signal: controller.signal
      });
      if (allowNotFound && response.status === 404) return null;
      if (!response.ok) {
        const message = (await response.text()).slice(0, 200);
        if (response.status === 401) throw new Error(this.translate('cloud.save.error.auth'));
        throw new Error(`Cloud save request failed: ${response.status}${message ? ` ${message}` : ''}`);
      }
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? (JSON.parse(text) as T) : null;
    } catch (error) {
      if (controller.signal.aborted) throw new Error(this.translate('cloud.save.error.timeout'));
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** SugarCube delta 存档还原为完整 history。 */
  private normalizeSave(save: SaveState): SaveState & { history: DolStateMoment[] } {
    const state = clone(save);
    if (!state.history && state.delta) {
      const decode = this.sugarcube.runtime?.State?.deltaDecode;
      if (typeof decode !== 'function') throw new Error('SugarCube.State.deltaDecode is not available.');
      state.history = decode(state.delta);
      delete state.delta;
    }
    const history = state.history;
    if (!Array.isArray(history) || !history.length || history.some(moment => !this.tools.isPlainObject(moment) || typeof moment.title !== 'string' || !this.tools.isPlainObject(moment.variables))) {
      throw new Error('Cloud save data does not contain a valid SugarCube history.');
    }
    return { ...state, history };
  }

  private validateRecord(value: unknown): asserts value is CloudSaveRecord {
    if (!this.tools.isPlainObject(value)) this.invalidResponse();
    const record = value as Partial<CloudSaveRecord>;
    if (!this.isSlot(record.slot)) this.invalidResponse();
    if (!this.tools.isPlainObject(record.save) || !this.tools.isFinite(record.exportedAt)) this.invalidResponse();
    if (record.gameId !== undefined && typeof record.gameId !== 'string') this.invalidResponse();
    if (record.details != null && !this.tools.isPlainObject(record.details)) this.invalidResponse();
    this.validateGame(record.gameId);
  }

  private validateCodeRecord(value: unknown): asserts value is CloudSaveCodeRecord {
    if (!this.tools.isPlainObject(value)) this.invalidResponse();
    const record = value as Partial<CloudSaveCodeRecord>;
    if (typeof record.code !== 'string' || !this.tools.isFinite(record.exportedAt)) this.invalidResponse();
    if (record.gameId !== undefined && typeof record.gameId !== 'string') this.invalidResponse();
    this.validateGame(record.gameId);
  }

  private isSlot(value: unknown): value is CloudSaveSlot {
    return this.tools.isInteger(value) && this.tools.inRange(value as number, 0, 201);
  }

  private validateSlot(slot: CloudSaveSlot): void {
    if (!this.isSlot(slot)) throw new Error(this.translate('cloud.save.error.slot.range'));
  }

  private validateGame(gameId?: string): void {
    const current = this.sugarcube.runtime?.Story?.domId;
    if (gameId && current && gameId !== current) throw new Error(this.translate('cloud.save.error.game'));
  }

  private invalidResponse(): never {
    throw new Error(this.translate('cloud.save.error.response'));
  }

  private field(panel: HTMLElement, name: string): string {
    return panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`)?.value ?? '';
  }

  private setField(panel: HTMLElement, name: string, value: string): void {
    const field = panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`);
    if (field) field.value = value;
  }

  private panelSlot(panel: HTMLElement): CloudSaveSlot {
    const slot = Number(this.field(panel, 'slot'));
    if (!Number.isInteger(slot) || slot < 0 || slot > 200) throw new Error(this.translate('cloud.save.error.slot.range'));
    return slot;
  }

  /** 动态填充本地存档槽位选项。 */
  public async populateSlotOptions(panel = this.panel): Promise<void> {
    if (!panel) return;
    const select = panel.querySelector<HTMLSelectElement>('select[data-cloud-save-field="slot"]');
    if (!select) return;

    try {
      const detailsList = await this.saveDB.getSaveDetails();
      if (!Array.isArray(detailsList)) return;

      const selected = select.querySelector('optgroup') ? select.value : '';
      const existingSlots = new Map<number, SaveDetails>();
      let latestSlot: number | null = null;
      let latestDate = 0;

      for (const item of detailsList) {
        if (typeof item.slot === 'number' && item.data) {
          existingSlots.set(item.slot, item.data);
          if (item.slot > 0 && item.data.date && item.data.date > latestDate) {
            latestDate = item.data.date;
            latestSlot = item.slot;
          }
        }
      }

      const formatDate = (ts?: number) => {
        if (!ts) return '';
        const d = new Date(ts);
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${MM}/${DD} ${hh}:${mm}`;
      };

      select.innerHTML = '';

      const groupExisting = document.createElement('optgroup');
      groupExisting.label = this.translate('cloud.save.slot.existing');

      if (existingSlots.has(0)) {
        const autoData = existingSlots.get(0)!;
        const opt = document.createElement('option');
        opt.value = '0';
        const tm = formatDate(autoData.date);
        opt.textContent = `0 - ${this.translate('cloud.save.slot.autosave')}${tm ? ` (${tm})` : ''}`;
        groupExisting.appendChild(opt);
      }

      const sortedExisting = Array.from(existingSlots.keys())
        .filter(s => s > 0)
        .sort((a, b) => a - b);

      for (const slot of sortedExisting) {
        const d = existingSlots.get(slot)!;
        const opt = document.createElement('option');
        opt.value = String(slot);
        let name = d.metadata?.saveName || d.title || '';
        if (name.length > 18) name = name.slice(0, 16) + '…';
        const tm = formatDate(d.date);
        const isLatest = slot === latestSlot;
        opt.textContent = `${slot}: ${name ? `${name} ` : ''}${tm ? `(${tm})` : ''}${isLatest ? ` [${this.translate('cloud.save.slot.latest')}]` : ''}`;
        groupExisting.appendChild(opt);
      }

      if (groupExisting.children.length > 0) {
        select.appendChild(groupExisting);
      }

      const groupAll = document.createElement('optgroup');
      groupAll.label = this.translate('cloud.save.slot.available');

      if (!existingSlots.has(0)) {
        const opt0 = document.createElement('option');
        opt0.value = '0';
        opt0.textContent = `0 - ${this.translate('cloud.save.slot.autosave')} (${this.translate('cloud.save.slot.empty')})`;
        groupAll.appendChild(opt0);
      }

      for (let i = 1; i <= 200; i++) {
        if (!existingSlots.has(i)) {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = String(i);
          groupAll.appendChild(opt);
        }
      }
      select.appendChild(groupAll);

      const targetValue = latestSlot != null ? String(latestSlot) : existingSlots.has(0) ? '0' : sortedExisting[0] != null ? String(sortedExisting[0]) : '1';
      select.value = selected || targetValue;
    } catch (error) {
      this.diagnostics.write(`读取本地存档槽位失败: ${Diagnostics.message(error)}`, 'ERROR', 'cloudSave', error);
    }
  }

  private status(panel: HTMLElement, message: string, success = false): void {
    const status = panel.querySelector<HTMLElement>('[data-cloud-save-status]');
    if (!status) return;
    status.textContent = message.startsWith('cloud.') ? this.translate(message) : message;
    status.classList.toggle('success', success);
    status.classList.toggle('error', !success);
    status.classList.add('visible');
  }

  private get saveDB(): DoLSaveDatabase {
    const db = (window as Window & CloudSaveHost).idb;
    if (!db || typeof db.getItem !== 'function' || typeof db.getSaveDetails !== 'function' || typeof db.setItem !== 'function') throw new Error('DoL IndexedDB is not available.');
    return db;
  }

  private get panel(): HTMLElement | null {
    return document.querySelector('#maplebirch-cloud-save');
  }

  private get current(): CloudSaveConfig {
    if (!this.config) throw new Error('Cloud save is not configured.');
    return this.config;
  }

  private get endpoint(): string {
    if (!this.current.endpoint) throw new Error('Cloud save endpoint is not configured.');
    return this.current.endpoint;
  }

  private get token(): string {
    if (!this.current.token) throw new Error('Cloud save token is not configured.');
    return this.current.token;
  }
}

export default CloudSave;

export type { CloudSaveConfig, CloudSaveRecord, CloudSaveRemoteItem, CloudSaveRemoteCode };
