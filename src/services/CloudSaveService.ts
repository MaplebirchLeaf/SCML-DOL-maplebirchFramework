// ./src/services/CloudSaveService.ts

import type { MaplebirchCore } from '../core';
import { clone } from '../utils';

type CloudSaveSlot = number;

type PanelAction = 'connectRemote' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode';

interface CloudSaveConfig {
  endpoint: string;
  token: string;
  remember?: boolean;
}

interface CloudSaveRecord {
  slot: CloudSaveSlot;
  details: any;
  save: any;
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

interface DoLSaveDatabase {
  getItem(slot: CloudSaveSlot): Promise<{ data?: any } | null | undefined>;
  getSaveDetails(): Promise<Array<{ slot: CloudSaveSlot; data?: any }> | null | undefined>;
  setItem(slot: CloudSaveSlot, save: any, details?: any): Promise<boolean | void>;
}

class CloudSaveService {
  private static readonly PANEL_STORAGE_KEY = 'maplebirch.cloudSave.panel';
  private static readonly REQUEST_TIMEOUT = 15_000;
  private config: CloudSaveConfig | null = null;
  private mountFrame: number | null = null;
  private busy = false;

  public constructor(readonly core: MaplebirchCore) {}

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
    const [item, details] = await Promise.all([this.saveDB.getItem(slot), this.saveDB.getSaveDetails()]);
    if (!item?.data) throw new Error(`Local save slot ${slot} not found.`);
    return {
      slot,
      details: details?.find(item => item.slot === slot)?.data ?? null,
      save: item.data,
      exportedAt: Date.now(),
      gameId: this.core.SugarCube?.Story?.domId
    };
  }

  /** 将云端存档写回 DoL 原生 IndexedDB。 */
  public async importSlot(record: CloudSaveRecord, targetSlot: CloudSaveSlot = record.slot): Promise<boolean> {
    this.validateRecord(record);
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
    const response = await this.request<unknown>(`/saves/${slot}`, undefined, true);
    if (response === null) throw new Error(`Remote save slot ${slot} not found.`);
    if (!this.core.lodash.isPlainObject(response)) this.invalidResponse();
    const item = response as Partial<CloudSaveRemoteItem>;
    if (item.slot !== slot || !this.core.lodash.isFinite(item.updatedAt)) this.invalidResponse();
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
      if (!this.core.lodash.isPlainObject(value)) this.invalidResponse();
      const item = value as Partial<CloudSaveRemoteItem>;
      if (!this.isSlot(item.slot) || !this.core.lodash.isFinite(item.updatedAt)) this.invalidResponse();
    }
    return response as CloudSaveRemoteItem[];
  }

  /** 删除远端存档。 */
  public async deleteRemote(slot: CloudSaveSlot): Promise<void> {
    await this.request(`/saves/${slot}`, {
      method: 'DELETE'
    });
  }

  /** 导出当前 SugarCube 存档码。 */
  public exportCode(): string {
    const save = this.core.SugarCube?.Save;
    if (typeof save?.serialize !== 'function') throw new Error('SugarCube.Save.serialize is not available.');
    const dolSave = (window as any).DoLSave;
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
    const lz = (window as any).LZString;
    const story = this.core.SugarCube?.Story;
    const config = this.core.SugarCube?.Config ?? (window as any).Config;
    if (!lz?.compressToBase64 || !story?.domId || !config?.saves?.id) throw new Error(this.core.t('cloud.save.error.code.tools'));
    const state = this.normalizeSave(record.save);
    const save: any = {
      id: config.saves.id,
      state,
      idx: record.details?.idx ?? this.core.SugarCube.State.qc
    };
    if (record.details?.metadata) save.metadata = record.details.metadata;
    if (config.saves.version) save.version = config.saves.version;
    save.state.delta = this.core.SugarCube.State.deltaEncode(save.state.history);
    delete save.state.history;
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
    const save = this.core.SugarCube?.Save;
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
        gameId: this.core.SugarCube?.Story?.domId
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
    const response = await this.request<unknown>('/save-code', undefined, true);
    if (response === null) throw new Error(this.core.t('cloud.save.error.code.notFound'));
    if (!this.core.lodash.isPlainObject(response)) this.invalidResponse();
    const item = response as Partial<CloudSaveRemoteCode>;
    if (!this.core.lodash.isFinite(item.updatedAt)) this.invalidResponse();
    const payload = item.payload;
    this.validateCodeRecord(payload);
    if (!payload.code) throw new Error(this.core.t('cloud.save.error.code.empty'));
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
        .then(() => this.status(panel, 'cloud.save.status.connect', true))
        .catch(error => this.status(panel, this.error(error)));
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
      this.status(panel, this.error(error));
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
        return this.done(panel, 'cloud.save.status.connect');

      case 'uploadSlot':
        await this.upload(slot ?? this.panelSlot(panel));
        return this.done(panel, 'cloud.save.status.upload');

      case 'downloadSlot':
        if (!(await this.download(slot ?? this.panelSlot(panel)))) throw new Error(this.core.t('cloud.save.error.download'));
        return this.done(panel, 'cloud.save.status.download');

      case 'deleteRemoteSlot':
        await this.deleteRemote(slot ?? this.panelSlot(panel));
        return this.done(panel, 'cloud.save.status.delete');

      case 'refreshRemoteList':
        return this.done(panel, 'cloud.save.status.refresh');

      case 'exportCurrentCode':
        this.setField(panel, 'code', this.exportCode());
        return this.status(panel, 'cloud.save.status.code.generate', true);

      case 'exportSlotCode':
        this.setField(panel, 'code', await this.exportSlotCode(slot ?? this.panelSlot(panel)));

        return this.status(panel, 'cloud.save.status.slot.code.generate', true);

      case 'uploadCode':
        await this.uploadCode(this.field(panel, 'code').trim() || this.exportCode());

        return this.status(panel, 'cloud.save.status.code.upload', true);

      case 'downloadCode':
        this.setField(panel, 'code', await this.downloadCode());

        return this.status(panel, 'cloud.save.status.code.download', true);

      case 'importCode':
        if (!this.importCode(this.field(panel, 'code').trim())) throw new Error(this.core.t('cloud.save.error.code.invalid'));
        return this.status(panel, 'cloud.save.status.code.load', true);
    }
  }

  private async done(panel: HTMLElement, key: string): Promise<void> {
    await this.refreshPanel(panel);
    void this.populateSlotOptions(panel);
    this.status(panel, key, true);
  }

  private async refreshPanel(panel: HTMLElement): Promise<void> {
    const list = panel.querySelector<HTMLElement>('[data-cloud-save-list]');
    if (!list) return;
    const items = await this.listRemote();
    if (!items.length) {
      list.textContent = this.core.t('cloud.save.none');
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
    download.textContent = this.core.t('cloud.save.action.download');
    download.addEventListener('click', () => void this.panelAction('downloadSlot', item.slot));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'deleteButton right saveMenuButton';
    remove.textContent = this.core.t('cloud.save.action.delete');
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
      const data = JSON.parse(localStorage.getItem(CloudSaveService.PANEL_STORAGE_KEY) ?? '{}');
      return {
        endpoint: typeof data.endpoint === 'string' ? data.endpoint : '',
        token: typeof data.token === 'string' ? data.token : '',
        remember: data.remember === true
      };
    } catch {
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
        CloudSaveService.PANEL_STORAGE_KEY,
        JSON.stringify({
          endpoint,
          token: remember ? token : '',
          remember
        })
      );
    } catch {
      // ignore
    }
  }

  /** Worker 请求统一入口。 */
  private async request<T = unknown>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    if (init.body != null) headers.set('Content-Type', 'application/json');
    const endpoint = new URL(`${this.endpoint}/`);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
      throw new Error(this.core.t('cloud.save.error.endpoint'));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CloudSaveService.REQUEST_TIMEOUT);
    try {
      const response = await fetch(new URL(path.replace(/^\/+/, ''), endpoint), {
        ...init,
        headers,
        signal: controller.signal
      });
      if (allowNotFound && response.status === 404) return null;
      if (!response.ok) {
        const message = (await response.text()).slice(0, 200);
        if (response.status === 401) throw new Error(this.core.t('cloud.save.error.auth'));
        throw new Error(`Cloud save request failed: ${response.status}${message ? ` ${message}` : ''}`);
      }
      if (response.status === 204) return null;
      const text = await response.text();
      return text ? (JSON.parse(text) as T) : null;
    } catch (error) {
      if (controller.signal.aborted) throw new Error(this.core.t('cloud.save.error.timeout'));
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /** SugarCube delta 存档还原为完整 history。 */
  private normalizeSave(save: any): any {
    const state = clone(save);
    if (!state.history && state.delta) {
      const decode = this.core.SugarCube?.State?.deltaDecode;
      if (typeof decode !== 'function') throw new Error('SugarCube.State.deltaDecode is not available.');
      state.history = decode(state.delta);
      delete state.delta;
    }
    if (!state.history) throw new Error('Cloud save data does not contain a valid SugarCube history.');
    return state;
  }

  private validateRecord(value: unknown): asserts value is CloudSaveRecord {
    if (!this.core.lodash.isPlainObject(value)) this.invalidResponse();
    const record = value as Partial<CloudSaveRecord>;
    if (!this.isSlot(record.slot)) this.invalidResponse();
    if (!this.core.lodash.isPlainObject(record.save) || !this.core.lodash.isFinite(record.exportedAt)) this.invalidResponse();
    if (record.gameId !== undefined && typeof record.gameId !== 'string') this.invalidResponse();
    this.validateGame(record.gameId);
  }

  private validateCodeRecord(value: unknown): asserts value is CloudSaveCodeRecord {
    if (!this.core.lodash.isPlainObject(value)) this.invalidResponse();
    const record = value as Partial<CloudSaveCodeRecord>;
    if (typeof record.code !== 'string' || !this.core.lodash.isFinite(record.exportedAt)) this.invalidResponse();
    if (record.gameId !== undefined && typeof record.gameId !== 'string') this.invalidResponse();
    this.validateGame(record.gameId);
  }

  private isSlot(value: unknown): value is CloudSaveSlot {
    return this.core.lodash.isInteger(value) && this.core.lodash.inRange(value as number, 0, 201);
  }

  private validateGame(gameId?: string): void {
    const current = this.core.SugarCube?.Story?.domId;
    if (gameId && current && gameId !== current) throw new Error(this.core.t('cloud.save.error.game'));
  }

  private invalidResponse(): never {
    throw new Error(this.core.t('cloud.save.error.response'));
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
    if (!Number.isInteger(slot) || slot < 0 || slot > 200) throw new Error(this.core.t('cloud.save.error.slot.range'));
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

      const existingSlots = new Map<number, any>();
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

      const isCN = this.core.lang.language !== 'EN';
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
      groupExisting.label = isCN ? '本地已有存档' : 'Existing Saves';

      if (existingSlots.has(0)) {
        const autoData = existingSlots.get(0);
        const opt = document.createElement('option');
        opt.value = '0';
        const tm = formatDate(autoData.date);
        opt.textContent = `0 - ${isCN ? '自动存档' : 'Autosave'}${tm ? ` (${tm})` : ''}`;
        groupExisting.appendChild(opt);
      }

      const sortedExisting = Array.from(existingSlots.keys())
        .filter(s => s > 0)
        .sort((a, b) => a - b);

      for (const slot of sortedExisting) {
        const d = existingSlots.get(slot);
        const opt = document.createElement('option');
        opt.value = String(slot);
        let name = d.metadata?.saveName || d.title || '';
        if (name.length > 18) name = name.slice(0, 16) + '…';
        const tm = formatDate(d.date);
        const isLatest = slot === latestSlot;
        opt.textContent = `${slot}: ${name ? `${name} ` : ''}${tm ? `(${tm})` : ''}${isLatest ? (isCN ? ' [最新]' : ' [Latest]') : ''}`;
        groupExisting.appendChild(opt);
      }

      if (groupExisting.children.length > 0) {
        select.appendChild(groupExisting);
      }

      const groupAll = document.createElement('optgroup');
      groupAll.label = isCN ? '所有槽位 (1-200)' : 'All Slots (1-200)';

      if (!existingSlots.has(0)) {
        const opt0 = document.createElement('option');
        opt0.value = '0';
        opt0.textContent = `0 - ${isCN ? '自动存档 (空)' : 'Autosave (Empty)'}`;
        groupAll.appendChild(opt0);
      }

      for (let i = 1; i <= 200; i++) {
        if (!existingSlots.has(i)) {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = `${i} ${isCN ? '(空)' : '(Empty)'}`;
          groupAll.appendChild(opt);
        }
      }
      select.appendChild(groupAll);

      const targetValue = latestSlot != null ? String(latestSlot) : (existingSlots.has(0) ? '0' : (sortedExisting[0] != null ? String(sortedExisting[0]) : '1'));
      select.value = targetValue;
    } catch (error) {
      console.error('Failed to populate slot options:', error);
    }
  }

  private status(panel: HTMLElement, message: string, success = false): void {
    const status = panel.querySelector<HTMLElement>('[data-cloud-save-status]');
    if (!status) return;
    status.textContent = message.startsWith('cloud.') ? this.core.t(message) : message;
    status.classList.toggle('success', success);
    status.classList.toggle('error', !success);
    status.classList.add('visible');
  }

  private error(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private get saveDB(): DoLSaveDatabase {
    const db = (window as any).idb;
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

export default CloudSaveService;

export type { CloudSaveConfig, CloudSaveRecord, CloudSaveRemoteItem, CloudSaveRemoteCode };
