// ./src/services/CloudSaveService.ts

import type { MaplebirchCore } from '../core';
import { clone } from '../utils';

type CloudSaveSlot = number;

type PanelAction = 'connectRemote' | 'uploadSlot' | 'downloadSlot' | 'refreshRemoteList' | 'deleteRemoteSlot' | 'exportCurrentCode' | 'exportSlotCode' | 'uploadCode' | 'downloadCode' | 'importCode';

interface CloudSaveConfig {
  endpoint: string;
  token: string;
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
  private config: CloudSaveConfig | null = null;

  public constructor(readonly core: MaplebirchCore) {}

  public configure(config: CloudSaveConfig): this {
    this.config = {
      endpoint: config.endpoint.trim().replace(/\/+$/, ''),
      token: config.token.trim()
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
    if (!record?.save) throw new Error('Invalid cloud save record.');
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
    const item = await this.request<CloudSaveRemoteItem>(`/saves/${slot}`, undefined, true);
    if (!item?.payload) throw new Error(`Remote save slot ${slot} not found.`);
    return this.importSlot(item.payload, targetSlot);
  }

  /** 获取远端存档列表。 */
  public async listRemote(): Promise<CloudSaveRemoteItem[]> {
    return (await this.request<CloudSaveRemoteItem[]>('/saves')) ?? [];
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
    const item = await this.request<CloudSaveRemoteCode>('/save-code', undefined, true);
    if (!item?.payload) throw new Error(this.core.t('cloud.save.error.code.notFound'));
    if (!item.payload.code) throw new Error(this.core.t('cloud.save.error.code.empty'));
    return item.payload.code;
  }

  /** 初始化云存档面板。 */
  public mountPanel(): void {
    const panel = this.panel;
    if (!panel) return;
    const saved = this.loadPanelConfig();
    this.setField(panel, 'endpoint', this.config?.endpoint ?? saved.endpoint);
    this.setField(panel, 'token', this.config?.token ?? '');
    if (!this.config?.endpoint || !this.config.token) return;
    void this.refreshPanel(panel)
      .then(() => this.status(panel, 'cloud.save.status.connect', true))
      .catch(error => this.status(panel, this.error(error)));
  }

  /** Twee 面板动作入口。 */
  public async panelAction(action: PanelAction, slot?: CloudSaveSlot): Promise<void> {
    const panel = this.panel;
    if (!panel) return;
    this.status(panel, 'cloud.save.status.working');
    try {
      this.configure(this.readPanel(panel));
      this.savePanelConfig();
      await this.runPanelAction(panel, action, slot);
    } catch (error) {
      this.status(panel, this.error(error));
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
        await this.download(slot ?? this.panelSlot(panel));
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
    row.innerHTML = `
      <span>${item.slot}</span>
      <span>${new Date(item.updatedAt).toLocaleString()}</span>
      <button
        type="button"
        class="saveMenuButton"
        data-cloud-save-download-slot="${item.slot}"
      >${this.core.t('cloud.save.action.download')}</button>
      <button
        type="button"
        class="deleteButton right saveMenuButton"
        data-cloud-save-delete-slot="${item.slot}"
      >${this.core.t('cloud.save.action.delete')}</button>
    `;
    row.querySelector('[data-cloud-save-download-slot]')?.addEventListener('click', () => void this.panelAction('downloadSlot', item.slot));
    row.querySelector('[data-cloud-save-delete-slot]')?.addEventListener('click', () => void this.panelAction('deleteRemoteSlot', item.slot));
    return row;
  }

  private readPanel(panel: HTMLElement): CloudSaveConfig {
    return {
      endpoint: this.field(panel, 'endpoint').trim(),
      token: this.field(panel, 'token').trim()
    };
  }

  private loadPanelConfig(): {
    endpoint: string;
  } {
    try {
      const data = JSON.parse(localStorage.getItem(CloudSaveService.PANEL_STORAGE_KEY) ?? '{}');
      return { endpoint: typeof data.endpoint === 'string' ? data.endpoint : '' };
    } catch {
      return { endpoint: '' };
    }
  }

  private savePanelConfig(): void {
    localStorage.setItem(
      CloudSaveService.PANEL_STORAGE_KEY,
      JSON.stringify({
        endpoint: this.endpoint
      })
    );
  }

  /** Worker 请求统一入口。 */
  private async request<T = unknown>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    if (init.body != null) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers
    });
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      const message = await response.text();
      if (response.status === 401) throw new Error('Cloud save authorization failed.');
      throw new Error(`Cloud save request failed: ${response.status}${message ? ` ${message}` : ''}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
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

  private field(panel: HTMLElement, name: string): string {
    return panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`)?.value ?? '';
  }

  private setField(panel: HTMLElement, name: string, value: string): void {
    const field = panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`);
    if (field) field.value = value;
  }

  private panelSlot(panel: HTMLElement): CloudSaveSlot {
    const slot = Number(this.field(panel, 'slot'));
    if (!Number.isInteger(slot) || slot < 0 || slot > 10) throw new Error(this.core.t('cloud.save.error.slot.range'));
    return slot;
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
