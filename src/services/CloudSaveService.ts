// ./src/services/CloudSaveService.ts

import { type MaplebirchCore } from '../core';
import { gunzipSync, gzipSync } from 'fflate';
import { base64ToBytes, basicAuth, bytesToBase64, bytesToJson, joinEncodedPath, jsonToBytes, textToBytes, toArrayBuffer } from '../utils';

type CloudSaveSlot = number;
type CloudSaveBackend = 'server' | 'webdav';
type PanelAction =
  | 'connectRemote'
  | 'registerServer'
  | 'deleteServerAccount'
  | 'uploadSlot'
  | 'downloadSlot'
  | 'refreshRemoteList'
  | 'deleteRemoteSlot'
  | 'exportCurrentCode'
  | 'exportSlotCode'
  | 'uploadCode'
  | 'downloadCode'
  | 'importCode';

interface CloudSaveConfig {
  mode?: CloudSaveBackend;
  endpoint: string;
  username?: string;
  password?: string;
  userId?: string;
  passphrase?: string;
  token?: string;
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

interface CloudSaveEncryptedPayload {
  version: 1;
  compression?: 'gzip';
  salt: string;
  iv: string;
  data: string;
}

interface CloudSaveRemoteItem {
  slot: CloudSaveSlot;
  updatedAt: number;
  payload?: CloudSaveEncryptedPayload;
}

interface CloudSaveRemoteCode {
  updatedAt: number;
  payload?: CloudSaveEncryptedPayload;
}

interface CloudSaveManifest {
  version: 1;
  updatedAt: number;
  saves: CloudSaveRemoteItem[];
  codeUpdatedAt?: number;
}

interface CloudSaveAuthResponse {
  userId: number;
  username: string;
  token: string;
  expiresAt: number;
}

class CloudSaveService {
  private static readonly PANEL_STORAGE_KEY = 'maplebirch.cloudSave.panel';
  private config: CloudSaveConfig | null = null;

  public constructor(readonly core: MaplebirchCore) {}

  public configure(config: CloudSaveConfig): this {
    this.config = {
      ...config,
      endpoint: config.endpoint.replace(/\/+$/, '')
    };
    return this;
  }

  public async register(username: string, password: string, passphrase = password): Promise<CloudSaveAuthResponse> {
    const response = await this.auth('/auth/register', username, password);
    this.setServerAuth(response, passphrase);
    return response;
  }

  public async login(username: string, password: string, passphrase = password): Promise<CloudSaveAuthResponse> {
    const response = await this.auth('/auth/login', username, password);
    this.setServerAuth(response, passphrase);
    return response;
  }

  public async deleteAccount(password: string): Promise<boolean> {
    if (this.currentConfig().mode !== 'server') throw new Error('Only the server backend can delete an account.');
    await this.server('/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) });
    this.config = { endpoint: this.endpointUrl() };
    return true;
  }

  /** 从原版 indexedDB 导出本地槽位。 */
  public async exportSlot(slot: CloudSaveSlot): Promise<CloudSaveRecord> {
    const idb = (window as any).idb;
    const [item, detailsList] = await Promise.all([idb.getItem(slot), idb.getSaveDetails()]);
    if (!item?.data) throw new Error(`Local save slot ${slot} not found.`);
    return {
      slot,
      details: detailsList?.find((entry: any) => entry.slot === slot)?.data ?? null,
      save: item.data,
      exportedAt: Date.now(),
      gameId: this.core.SugarCube?.Story?.domId
    };
  }

  /** 把云端记录写回原版 indexedDB。 */
  public async importSlot(record: CloudSaveRecord, targetSlot: CloudSaveSlot = record.slot): Promise<boolean> {
    if (!record?.save) throw new Error('Invalid cloud save record.');
    const result = await (window as any).idb.setItem(targetSlot, this.normalizeSave(record.save), {
      ...record.details,
      date: Date.now()
    });
    await (window as any).idb.getSaveDetails?.();
    return result !== false;
  }

  public async upload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    const item = await this.packSlot(slot);
    if (this.isServer()) await this.server(`/saves/${slot}`, { method: 'PUT', body: JSON.stringify(item) });
    else await this.webdavPutSlot(item);
    return { slot: item.slot, updatedAt: item.updatedAt };
  }

  public async download(slot: CloudSaveSlot, targetSlot = slot): Promise<boolean> {
    const item = this.isServer()
      ? await this.server<CloudSaveRemoteItem>(`/saves/${slot}`)
      : await this.webdavRequest<CloudSaveRemoteItem>(this.webdavPath('slots', `${slot}.json`), { method: 'GET' }, true);
    return this.unpackSlot(item, targetSlot);
  }

  public async listRemote(): Promise<CloudSaveRemoteItem[]> {
    if (this.isServer()) return this.server<CloudSaveRemoteItem[]>('/saves');
    return (await this.readManifest()).saves.sort((a, b) => a.slot - b.slot);
  }

  public async deleteRemote(slot: CloudSaveSlot): Promise<boolean> {
    if (this.isServer()) {
      await this.server(`/saves/${slot}`, { method: 'DELETE' });
      return true;
    }
    await this.webdavRequest(this.webdavPath('slots', `${slot}.json`), { method: 'DELETE' }, true);
    await this.updateManifest(manifest => {
      manifest.saves = manifest.saves.filter(item => item.slot !== slot);
    });
    return true;
  }

  /** 导出当前 SugarCube 存档码。 */
  public exportCode(): string {
    const save = this.core.SugarCube.Save;
    if (typeof save?.serialize !== 'function') throw new Error('SugarCube.Save.serialize is not available.');
    const dolSave = (window as any).DoLSave;
    const wasCompressed = dolSave?.isCompressionEnabled?.() === true;
    if (wasCompressed) dolSave.disableCompression?.();
    try {
      return save.serialize();
    } finally {
      if (wasCompressed) dolSave.enableCompression?.();
    }
  }

  /** 把本地槽位转成可复制的 SugarCube 存档码。 */
  public async exportSlotCode(slot: CloudSaveSlot): Promise<string> {
    const record = await this.exportSlot(slot);
    const lz = (window as any).LZString;
    const story = this.core.SugarCube?.Story;
    const config = this.core.SugarCube?.Config ?? (window as any).Config;
    if (!lz?.compressToBase64 || !story?.domId || !config?.saves?.id) throw new Error(this.core.t('cloud.save.error.code.tools'));

    const state = this.normalizeSave(record.save);
    const saveObj: any = {
      id: config.saves.id,
      state,
      idx: record.details?.idx ?? this.core.SugarCube.State.qc
    };
    if (record.details?.metadata) saveObj.metadata = record.details.metadata;
    if (config.saves.version) saveObj.version = config.saves.version;
    saveObj.state.delta = this.core.SugarCube.State.deltaEncode(saveObj.state.history);
    delete saveObj.state.history;

    const data = lz.compressToBase64(JSON.stringify(saveObj));
    return data + lz.compressToBase64(JSON.stringify({ [story.domId]: data.length }));
  }

  public importCode(code: string): boolean {
    const save = this.core.SugarCube?.Save;
    if (typeof save?.deserialize !== 'function') throw new Error('SugarCube.Save.deserialize is not available.');
    return save.deserialize(code) !== null;
  }

  public async uploadCode(code = this.exportCode()): Promise<CloudSaveRemoteCode> {
    const item = await this.packCode(code);
    if (this.isServer()) await this.server('/save-code', { method: 'PUT', body: JSON.stringify(item) });
    else await this.webdavPutCode(item);
    return { updatedAt: item.updatedAt };
  }

  public async downloadCode(): Promise<string> {
    const item = this.isServer() ? await this.server<CloudSaveRemoteCode>('/save-code') : await this.webdavRequest<CloudSaveRemoteCode>(this.webdavPath('save-code.json'), { method: 'GET' }, true);
    return this.unpackCode(item);
  }

  public mountPanel(): void {
    const panel = this.panel();
    if (!panel) return;
    const saved = this.loadPanelConfig();
    const current = this.config;
    this.setField(panel, 'endpoint', current?.endpoint || saved.endpoint || '');
    this.setField(panel, 'username', current?.username || saved.username || '');
    this.setField(panel, 'password', current?.password || '');
    if (!current && saved.endpoint) this.configure({ endpoint: saved.endpoint, username: saved.username });
    if (this.config?.mode) void this.refreshPanel(panel).then(() => this.status(panel, this.core.t('cloud.save.status.connect'), true));
  }

  public async panelAction(action: PanelAction, slot?: CloudSaveSlot): Promise<void> {
    const panel = this.panel();
    if (!panel) return;
    this.status(panel, this.core.t('cloud.save.status.working'));
    try {
      const form = this.readPanel(panel);
      this.configure({ ...this.config, ...form });
      this.savePanelConfig(panel);
      await this.runPanelAction(panel, action, slot ?? this.panelSlot(panel));
    } catch (error: any) {
      this.status(panel, this.errorMessage(error), false);
    }
  }

  private async runPanelAction(panel: HTMLElement, action: PanelAction, slot: CloudSaveSlot): Promise<void> {
    const password = this.currentConfig().password || '';
    switch (action) {
      case 'connectRemote':
        await this.connect(this.currentConfig().username || '', password);
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.connect'), true);
      case 'registerServer':
        await this.register(this.currentConfig().username || '', password);
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.registered'), true);
      case 'deleteServerAccount':
        await this.deleteAccount(password);
        this.setField(panel, 'password', '');
        return this.status(panel, this.core.t('cloud.save.status.account.delete'), true);
      case 'uploadSlot':
        await this.upload(slot);
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.upload'), true);
      case 'downloadSlot':
        if (!(await this.download(slot))) throw new Error(this.core.t('cloud.save.error.download'));
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.download'), true);
      case 'deleteRemoteSlot':
        await this.deleteRemote(slot);
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.delete'), true);
      case 'refreshRemoteList':
        await this.refreshPanel(panel);
        return this.status(panel, this.core.t('cloud.save.status.refresh'), true);
      case 'exportCurrentCode':
        this.setField(panel, 'code', this.exportCode());
        return this.status(panel, this.core.t('cloud.save.status.code.generate'), true);
      case 'exportSlotCode':
        this.setField(panel, 'code', await this.exportSlotCode(slot));
        return this.status(panel, this.core.t('cloud.save.status.slot.code.generate'), true);
      case 'uploadCode':
        await this.uploadCode(this.field(panel, 'code') || this.exportCode());
        return this.status(panel, this.core.t('cloud.save.status.code.upload'), true);
      case 'downloadCode':
        this.setField(panel, 'code', await this.downloadCode());
        return this.status(panel, this.core.t('cloud.save.status.code.download'), true);
      case 'importCode':
        if (!this.importCode(this.field(panel, 'code'))) throw new Error(this.core.t('cloud.save.error.code.invalid'));
        return this.status(panel, this.core.t('cloud.save.status.code.load'), true);
    }
  }

  private readPanel(panel: HTMLElement): CloudSaveConfig {
    const password = this.field(panel, 'password') || this.config?.password || '';
    return {
      endpoint: this.field(panel, 'endpoint'),
      username: this.field(panel, 'username'),
      password,
      passphrase: password || this.config?.passphrase
    };
  }

  private panel(): HTMLElement | null {
    return document.querySelector<HTMLElement>('#maplebirch-cloud-save');
  }

  private field(panel: HTMLElement, name: string): string {
    return panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`)?.value.trim() ?? '';
  }

  private setField(panel: HTMLElement, name: string, value: string): void {
    const input = panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${name}"]`);
    if (input) input.value = value;
  }

  private panelSlot(panel: HTMLElement): CloudSaveSlot {
    const slot = Number(this.field(panel, 'slot'));
    if (!Number.isInteger(slot) || slot < 0 || slot > 10) throw new Error(this.core.t('cloud.save.error.slot.range'));
    return slot;
  }

  private loadPanelConfig(): { endpoint: string; username: string } {
    try {
      const data = JSON.parse(localStorage.getItem(CloudSaveService.PANEL_STORAGE_KEY) || '{}');
      return {
        endpoint: typeof data.endpoint === 'string' ? data.endpoint : '',
        username: typeof data.username === 'string' ? data.username : ''
      };
    } catch {
      return { endpoint: '', username: '' };
    }
  }

  private savePanelConfig(panel: HTMLElement): void {
    localStorage.setItem(
      CloudSaveService.PANEL_STORAGE_KEY,
      JSON.stringify({
        endpoint: this.field(panel, 'endpoint'),
        username: this.field(panel, 'username')
      })
    );
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
      <button type="button" class="saveMenuButton" data-cloud-save-download-slot="${item.slot}">${this.core.t('cloud.save.action.download')}</button>
      <button type="button" class="deleteButton right saveMenuButton" data-cloud-save-delete-slot="${item.slot}">${this.core.t('cloud.save.action.delete')}</button>`;
    row.querySelector<HTMLButtonElement>('[data-cloud-save-download-slot]')?.addEventListener('click', () => this.panelAction('downloadSlot', item.slot));
    row.querySelector<HTMLButtonElement>('[data-cloud-save-delete-slot]')?.addEventListener('click', () => this.panelAction('deleteRemoteSlot', item.slot));
    return row;
  }

  private status(panel: HTMLElement, message: string, success = false): void {
    const status = panel.querySelector<HTMLElement>('[data-cloud-save-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('success', success);
    status.classList.toggle('error', !success);
    status.classList.add('visible');
  }

  private errorMessage(error: any): string {
    if (error?.name === 'OperationError') return this.core.t('cloud.save.error.decrypt');
    return error?.message || String(error);
  }

  private async auth(path: '/auth/register' | '/auth/login', username: string, password: string): Promise<CloudSaveAuthResponse> {
    return this.server<CloudSaveAuthResponse>(path, { method: 'POST', body: JSON.stringify({ username, password }) });
  }

  private async connect(username: string, password: string): Promise<void> {
    if (await this.isServerEndpoint()) return void (await this.login(username, password));
    this.configure({ ...this.currentConfig(), username, password, passphrase: password });
    await this.ensureWebdav();
    this.configure({ ...this.currentConfig(), mode: 'webdav' });
  }

  private async isServerEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpointUrl()}/health`);
      if (!response.ok) return false;
      if ((response.headers.get('content-type') || '').includes('application/json')) return true;
      return /ok|healthy|cloud/i.test(await response.text());
    } catch {
      return false;
    }
  }

  private async server<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const config = this.config;
    const response = await fetch(`${this.endpointUrl()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.userId ? { 'X-Cloud-Save-User': config.userId } : {}),
        ...(config?.token ? { Authorization: `Bearer ${config.token}` } : {}),
        ...init.headers
      }
    });
    if (!response.ok) throw new Error(`Cloud save request failed: ${response.status} ${await response.text()}`);
    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  }

  private setServerAuth(response: CloudSaveAuthResponse, passphrase: string): void {
    this.config = {
      ...this.currentConfig(),
      mode: 'server',
      userId: String(response.userId),
      passphrase,
      token: response.token
    };
  }

  private async webdavPutSlot(item: CloudSaveRemoteItem): Promise<void> {
    await this.ensureWebdav();
    await this.webdavRequest(this.webdavPath('slots', `${item.slot}.json`), { method: 'PUT', body: JSON.stringify(item) });
    await this.updateManifest(manifest => {
      manifest.saves = [...manifest.saves.filter(save => save.slot !== item.slot), { slot: item.slot, updatedAt: item.updatedAt }].sort((a, b) => a.slot - b.slot);
    });
  }

  private async webdavPutCode(item: CloudSaveRemoteCode): Promise<void> {
    await this.ensureWebdav();
    await this.webdavRequest(this.webdavPath('save-code.json'), { method: 'PUT', body: JSON.stringify(item) });
    await this.updateManifest(manifest => {
      manifest.codeUpdatedAt = item.updatedAt;
    });
  }

  private async readManifest(): Promise<CloudSaveManifest> {
    await this.ensureWebdav();
    const manifest = await this.webdavRequest<CloudSaveManifest>(this.webdavPath('manifest.json'), { method: 'GET' }, true);
    if (!manifest) return this.emptyManifest();
    return {
      version: 1,
      updatedAt: Number(manifest.updatedAt) || Date.now(),
      saves: Array.isArray(manifest.saves) ? manifest.saves.filter(item => Number.isInteger(item.slot) && typeof item.updatedAt === 'number') : [],
      codeUpdatedAt: typeof manifest.codeUpdatedAt === 'number' ? manifest.codeUpdatedAt : undefined
    };
  }

  private async updateManifest(change: (manifest: CloudSaveManifest) => void): Promise<void> {
    const manifest = await this.readManifest();
    change(manifest);
    await this.webdavRequest(this.webdavPath('manifest.json'), {
      method: 'PUT',
      body: JSON.stringify({ ...manifest, updatedAt: Date.now() })
    });
  }

  private emptyManifest(): CloudSaveManifest {
    return { version: 1, updatedAt: Date.now(), saves: [] };
  }

  private async ensureWebdav(): Promise<void> {
    const config = this.currentConfig();
    if (!config.endpoint) throw new Error('Cloud save endpoint is not configured.');
    if (!config.username || !config.password) throw new Error(this.core.t('cloud.save.error.webdav.credentials'));
    const response = await this.webdavFetch(this.webdavPath('slots'), { method: 'MKCOL' });
    if (![200, 201, 204, 405].includes(response.status)) throw new Error(`WebDAV MKCOL failed: ${response.status} ${await response.text()}`);
  }

  private async webdavRequest<T = any>(path: string, init: RequestInit = {}, allowNotFound = false): Promise<T | null> {
    const response = await this.webdavFetch(path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers
      }
    });
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) throw new Error(`WebDAV request failed: ${response.status} ${await response.text()}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  }

  private webdavFetch(path: string, init: RequestInit): Promise<Response> {
    const { username = '', password = '' } = this.currentConfig();
    return fetch(`${this.endpointUrl()}/${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${basicAuth(username, password)}`,
        ...init.headers
      }
    });
  }

  private webdavPath(...parts: string[]): string {
    return joinEncodedPath(...parts);
  }

  private async packSlot(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    return {
      slot,
      updatedAt: Date.now(),
      payload: await this.encrypt(await this.exportSlot(slot), this.activePassphrase())
    };
  }

  private async unpackSlot(item: CloudSaveRemoteItem | null, targetSlot: CloudSaveSlot): Promise<boolean> {
    if (!item?.payload) throw new Error(`Remote save slot ${targetSlot} not found.`);
    return this.importSlot(await this.decrypt<CloudSaveRecord>(item.payload, this.activePassphrase()), targetSlot);
  }

  private async packCode(code: string): Promise<CloudSaveRemoteCode> {
    return {
      updatedAt: Date.now(),
      payload: await this.encrypt(
        {
          code,
          exportedAt: Date.now(),
          gameId: this.core.SugarCube?.Story?.domId
        } satisfies CloudSaveCodeRecord,
        this.activePassphrase()
      )
    };
  }

  private async unpackCode(item: CloudSaveRemoteCode | null): Promise<string> {
    if (!item?.payload) throw new Error(this.core.t('cloud.save.error.code.notFound'));
    const record = await this.decrypt<CloudSaveCodeRecord>(item.payload, this.activePassphrase());
    if (!record.code) throw new Error(this.core.t('cloud.save.error.code.empty'));
    return record.code;
  }

  private normalizeSave(save: any): any {
    const state = save.clone();
    if (!state.history && state.delta) {
      const deltaDecode = this.core.SugarCube?.State?.deltaDecode;
      if (typeof deltaDecode !== 'function') throw new Error('SugarCube.State.deltaDecode is not available.');
      state.history = deltaDecode(state.delta);
      delete state.delta;
    }
    if (!state.history) throw new Error('Cloud save data does not contain a valid SugarCube history.');
    return state;
  }

  private async encrypt(data: unknown, passphrase: string): Promise<CloudSaveEncryptedPayload> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = await this.compress(jsonToBytes(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.deriveKey(passphrase, salt), toArrayBuffer(encoded));
    return {
      version: 1,
      compression: encoded.compressed ? 'gzip' : undefined,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  private async decrypt<T>(payload: CloudSaveEncryptedPayload, passphrase: string): Promise<T> {
    if (payload.version !== 1) throw new Error(`Unsupported cloud save payload version: ${payload.version}`);
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const encrypted = base64ToBytes(payload.data);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, await this.deriveKey(passphrase, salt), toArrayBuffer(encrypted));
    const bytes = payload.compression === 'gzip' ? await this.decompress(new Uint8Array(decrypted)) : new Uint8Array(decrypted);
    return bytesToJson<T>(bytes);
  }

  private async compress(bytes: Uint8Array): Promise<Uint8Array & { compressed?: boolean }> {
    const compressed = gzipSync(bytes, { level: 9, mem: 9 }) as Uint8Array & { compressed?: boolean };
    compressed.compressed = compressed.byteLength < bytes.byteLength;
    return compressed.compressed ? compressed : bytes;
  }

  private async decompress(bytes: Uint8Array): Promise<Uint8Array> {
    try {
      return gunzipSync(bytes);
    } catch {
      if (typeof DecompressionStream !== 'function') throw new Error(this.core.t('cloud.save.error.decompress'));
      const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
  }

  private async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey('raw', toArrayBuffer(textToBytes(passphrase)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 150000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  private isServer(): boolean {
    return this.currentConfig().mode === 'server';
  }

  private currentConfig(): CloudSaveConfig {
    if (!this.config) throw new Error('Cloud save is not configured.');
    return this.config;
  }

  private endpointUrl(): string {
    const endpoint = this.config?.endpoint;
    if (!endpoint) throw new Error('Cloud save endpoint is not configured.');
    return endpoint;
  }

  private activePassphrase(): string {
    const passphrase = this.currentConfig().passphrase;
    if (!passphrase) throw new Error('Cloud save passphrase is not configured.');
    return passphrase;
  }
}

export default CloudSaveService;
export type { CloudSaveAuthResponse, CloudSaveConfig, CloudSaveRecord, CloudSaveRemoteItem };
