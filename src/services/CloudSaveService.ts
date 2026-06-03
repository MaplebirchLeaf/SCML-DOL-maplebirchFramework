// ./src/services/CloudSaveService.ts

import { type MaplebirchCore } from '../core';
import { gunzipSync, gzipSync } from 'fflate';
import { base64ToBytes, basicAuth, bytesToBase64, bytesToJson, joinEncodedPath, jsonToBytes, textToBytes, toArrayBuffer } from '../utils';

type CloudSaveSlot = number;
type CloudSaveBackend = 'webdav' | 'server';

interface CloudSaveConfig {
  /** 已连接的存储后端。由连接流程自动写入，外部通常不需要传。 */
  mode?: CloudSaveBackend;
  /** WebDAV 根地址，或 Go 服务地址。 */
  endpoint: string;
  /** WebDAV 账号，或 Go 服务登录账号。 */
  username?: string;
  /** 面板中临时输入的密码，不会保存到 localStorage。 */
  password?: string;
  userId?: string;
  /** 用于加密/解密云存档的口令，默认与 password 相同。 */
  passphrase?: string;
  token?: string;
}

interface CloudSaveRecord {
  slot: CloudSaveSlot;
  details: any;
  save: any;
  exportedAt: number;
  gameId?: string;
  frameworkVersion?: string;
}

interface CloudSaveCodeRecord {
  code: string;
  exportedAt: number;
  gameId?: string;
  frameworkVersion?: string;
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
  /** WebDAV 远端索引文件。避免解析 PROPFIND，也能让免费存储占用保持很小。 */
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

  /** 写入并标准化云存档配置。后端模式由连接流程自动确定。 */
  public configure(config: CloudSaveConfig): this {
    this.config = {
      ...config,
      endpoint: config.endpoint.replace(/\/+$/, '')
    };
    return this;
  }

  /** 调用 Go 后端注册账号，成功后保存登录 token 和加密口令。 */
  public async register(username: string, password: string, passphrase = password): Promise<CloudSaveAuthResponse> {
    const response = await this.auth('/auth/register', username, password);
    this.applyAuth(response, passphrase);
    return response;
  }

  /** 调用 Go 后端登录账号，成功后保存登录 token 和加密口令。 */
  public async login(username: string, password: string, passphrase = password): Promise<CloudSaveAuthResponse> {
    const response = await this.auth('/auth/login', username, password);
    this.applyAuth(response, passphrase);
    return response;
  }

  /** 删除 Go 服务账号及其所有云端存档。WebDAV 没有账户删除接口。 */
  public async deleteAccount(password: string): Promise<boolean> {
    if (this.requireConfig().mode !== 'server') throw new Error('Only the server backend can delete an account.');
    await this.serverRequest('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });
    this.config = { endpoint: this.requireEndpoint() };
    return true;
  }

  /** 从游戏 indexedDB 中导出指定本地槽位，整理成可加密上传的记录。 */
  public async exportSlot(slot: CloudSaveSlot): Promise<CloudSaveRecord> {
    const idb = this.getGameIdb();
    const [item, detailsList] = await Promise.all([idb.getItem(slot), idb.getSaveDetails()]);
    if (!item?.data) throw new Error(`Local save slot ${slot} not found.`);
    // 在全部存档详情中找到当前槽位对应的详情数据。
    const details = detailsList?.find((entry: any) => entry.slot === slot)?.data ?? null;
    return {
      slot,
      details,
      save: item.data,
      exportedAt: Date.now(),
      gameId: this.core.SugarCube?.Story?.domId,
      frameworkVersion: this.core.meta.version
    };
  }

  /** 把云端下载得到的存档记录写回指定本地槽位。 */
  public async importSlot(record: CloudSaveRecord, targetSlot: CloudSaveSlot = record.slot): Promise<boolean> {
    const idb = this.getGameIdb();
    if (!record?.save) throw new Error('Invalid cloud save record.');
    const save = this.prepareSaveForIdb(record.save);
    const details = {
      ...record.details,
      date: Date.now()
    };
    const result = await idb.setItem(targetSlot, save, details);
    await idb.getSaveDetails?.();
    return result !== false;
  }

  /** 统一上传入口；根据当前后端模式分发到 Go 服务或 WebDAV。 */
  public async upload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    // 对外的存档 API 不暴露后端细节，只有这个服务负责分流到具体存储实现。
    if (this.requireConfig().mode === 'server') return this.serverUpload(slot);
    return this.webdavUpload(slot);
  }

  /** 统一下载入口；根据当前后端模式从远端取回存档并导入本地槽位。 */
  public async download(slot: CloudSaveSlot, targetSlot = slot): Promise<boolean> {
    if (this.requireConfig().mode === 'server') return this.serverDownload(slot, targetSlot);
    return this.webdavDownload(slot, targetSlot);
  }

  /** 统一远端列表入口；返回当前后端保存的所有远端槽位信息。 */
  public async listRemote(): Promise<CloudSaveRemoteItem[]> {
    if (this.requireConfig().mode === 'server') return this.serverRequest<CloudSaveRemoteItem[]>('/saves');
    return this.webdavListRemote();
  }

  /** 统一远端删除入口；删除指定远端槽位。 */
  public async deleteRemote(slot: CloudSaveSlot): Promise<boolean> {
    if (this.requireConfig().mode === 'server') {
      await this.serverRequest(`/saves/${slot}`, { method: 'DELETE' });
      return true;
    }
    return this.webdavDeleteRemote(slot);
  }

  /** 使用 Go 服务后端上传指定槽位：先导出本地存档，再加密并 PUT 到 /saves/{slot}。 */
  private async serverUpload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    const item = await this.packSlot(slot);
    await this.serverRequest(`/saves/${slot}`, {
      method: 'PUT',
      body: JSON.stringify(item)
    });
    return { slot: item.slot, updatedAt: item.updatedAt };
  }

  /** 使用 Go 服务后端下载指定槽位：读取密文、解密后导入本地槽位。 */
  private async serverDownload(slot: CloudSaveSlot, targetSlot = slot): Promise<boolean> {
    const item = await this.serverRequest<CloudSaveRemoteItem>(`/saves/${slot}`);
    return this.unpackSlot(item, targetSlot);
  }

  /** 调用 SugarCube 的序列化接口导出当前游戏存档码。 */
  public exportCode(): string {
    const save = this.core.SugarCube?.Save;
    if (typeof save?.serialize !== 'function') throw new Error('SugarCube.Save.serialize is not available.');
    const dolSave = (window as any).DoLSave;
    const compressionWasEnabled = dolSave?.isCompressionEnabled?.() === true;
    if (compressionWasEnabled) dolSave.disableCompression?.();
    try {
      return save.serialize();
    } finally {
      if (compressionWasEnabled) dolSave.enableCompression?.();
    }
  }

  /** 把指定 indexedDB 槽位转换成 SugarCube 可导入的存档码文本。 */
  public async exportSlotCode(slot: CloudSaveSlot): Promise<string> {
    const record = await this.exportSlot(slot);
    const save = this.prepareSaveForIdb(record.save);
    const lz = (window as any).LZString;
    const story = this.core.SugarCube?.Story;
    const config = this.core.SugarCube?.Config ?? (window as any).Config;
    if (!lz?.compressToBase64 || !story?.domId || !config?.saves?.id) throw new Error(this.t('cloud.save.error.code.tools'));
    const saveObj: any = {
      id: config.saves.id,
      state: save,
      idx: record.details?.idx ?? this.core.SugarCube.State.qc
    };
    if (record.details?.metadata) saveObj.metadata = record.details.metadata;
    if (config.saves.version) saveObj.version = config.saves.version;
    saveObj.state.delta = this.core.SugarCube.State.deltaEncode(saveObj.state.history);
    delete saveObj.state.history;
    const data = lz.compressToBase64(JSON.stringify(saveObj));
    return data + lz.compressToBase64(JSON.stringify({ [story.domId]: data.length }));
  }

  /** 调用 SugarCube 的反序列化接口，把存档码导入游戏。 */
  public importCode(code: string): boolean {
    const save = this.core.SugarCube?.Save;
    if (typeof save?.deserialize !== 'function') throw new Error('SugarCube.Save.deserialize is not available.');
    return save.deserialize(code) !== null;
  }

  /** 统一存档码上传入口；根据当前后端模式保存一段加密后的存档码文本。 */
  public async uploadCode(code = this.exportCode()): Promise<CloudSaveRemoteCode> {
    // 存档码同步使用与固定槽位相同的加密方式，但只保存一段可移植文本。
    if (this.requireConfig().mode === 'server') return this.serverUploadCode(code);
    return this.webdavUploadCode(code);
  }

  /** 统一存档码下载入口；根据当前后端模式取回并解密存档码文本。 */
  public async downloadCode(): Promise<string> {
    if (this.requireConfig().mode === 'server') return this.serverDownloadCode();
    return this.webdavDownloadCode();
  }

  /** 使用 Go 服务后端上传存档码，内容会先按云存档口令加密。 */
  private async serverUploadCode(code = this.exportCode()): Promise<CloudSaveRemoteCode> {
    const item = await this.packCode(code);
    await this.serverRequest('/save-code', {
      method: 'PUT',
      body: JSON.stringify(item)
    });
    return { updatedAt: item.updatedAt };
  }

  /** 使用 Go 服务后端下载存档码，并在解密后返回原始文本。 */
  private async serverDownloadCode(): Promise<string> {
    const item = await this.serverRequest<CloudSaveRemoteCode>('/save-code');
    return this.unpackCode(item);
  }

  /** 初始化云存档设置面板，把已保存的非敏感配置回填到输入框。 */
  public mountPanel(): void {
    const panel = document.querySelector<HTMLElement>('#maplebirch-cloud-save');
    if (!panel) return;
    const saved = this.loadPanelConfig();
    const current = this.config;
    this.setPanelValue(panel, 'endpoint', current?.endpoint || saved.endpoint || '');
    this.setPanelValue(panel, 'username', current?.username || saved.username || '');
    this.setPanelValue(panel, 'password', current?.password || '');
    if (!current && saved.endpoint) this.configure({ endpoint: saved.endpoint, username: saved.username });
    if (this.config?.mode) void this.refreshPanel(panel).then(() => this.setPanelStatus(panel, this.t('cloud.save.status.connect'), true));
  }

  /** 处理面板按钮动作，是 UI 与云存档服务之间的统一调度入口。 */
  public async panelAction(
    action:
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
      | 'importCode',
    slot?: CloudSaveSlot
  ): Promise<void> {
    const panel = document.querySelector<HTMLElement>('#maplebirch-cloud-save');
    if (!panel) return;
    this.setPanelStatus(panel, this.t('cloud.save.status.working'));
    try {
      const endpoint = this.panelValue(panel, 'endpoint');
      const username = this.panelValue(panel, 'username');
      const passwordInput = this.panelValue(panel, 'password');
      const password = passwordInput || this.config?.password || '';
      const passphrase = passwordInput || this.config?.passphrase || password;
      const targetSlot = slot ?? this.panelSlot(panel);
      this.configure({ ...this.config, endpoint, username, password, passphrase });
      this.savePanelConfig(panel);

      switch (action) {
        case 'connectRemote':
          await this.connectRemote(username, password);
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.connect'), true);
          return;
        case 'deleteServerAccount':
          await this.deleteAccount(password);
          this.setPanelValue(panel, 'password', '');
          this.setPanelStatus(panel, this.t('cloud.save.status.account.delete'), true);
          return;
        case 'registerServer':
          await this.register(username, password);
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.registered'), true);
          return;
        case 'uploadSlot':
          await this.upload(targetSlot);
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.upload'), true);
          return;
        case 'downloadSlot':
          if (!(await this.download(targetSlot))) throw new Error(this.t('cloud.save.error.download'));
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.download'), true);
          return;
        case 'deleteRemoteSlot':
          await this.deleteRemote(targetSlot);
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.delete'), true);
          return;
        case 'refreshRemoteList':
          await this.refreshPanel(panel);
          this.setPanelStatus(panel, this.t('cloud.save.status.refresh'), true);
          return;
        case 'exportCurrentCode':
          this.setPanelValue(panel, 'code', this.exportCode());
          this.setPanelStatus(panel, this.t('cloud.save.status.code.generate'), true);
          return;
        case 'exportSlotCode':
          this.setPanelValue(panel, 'code', await this.exportSlotCode(targetSlot));
          this.setPanelStatus(panel, this.t('cloud.save.status.slot.code.generate'), true);
          return;
        case 'uploadCode':
          await this.uploadCode(this.panelValue(panel, 'code') || this.exportCode());
          this.setPanelStatus(panel, this.t('cloud.save.status.code.upload'), true);
          return;
        case 'downloadCode':
          this.setPanelValue(panel, 'code', await this.downloadCode());
          this.setPanelStatus(panel, this.t('cloud.save.status.code.download'), true);
          return;
        case 'importCode':
          if (!this.importCode(this.panelValue(panel, 'code'))) throw new Error(this.t('cloud.save.error.code.invalid'));
          this.setPanelStatus(panel, this.t('cloud.save.status.code.load'), true);
          return;
        default:
          return;
      }
    } catch (error: any) {
      this.setPanelStatus(panel, this.panelErrorMessage(error), false);
    }
  }

  /** 获取游戏当前启用的 indexedDB 存档接口，并在不可用时抛错。 */
  private getGameIdb(): any {
    const idb = (window as any).idb;
    if (!idb?.active) throw new Error('Game indexedDB save backend is not active.');
    return idb;
  }

  /** 从云存档面板中读取指定字段的字符串值。 */
  private panelValue(panel: HTMLElement, field: string): string {
    return panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${field}"]`)?.value.trim() ?? '';
  }

  /** 向云存档面板中的指定字段写入字符串值。 */
  private setPanelValue(panel: HTMLElement, field: string, value: string): void {
    const input = panel.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-cloud-save-field="${field}"]`);
    if (input) input.value = value;
  }

  /** 读取并校验面板中选择的本地槽位编号。 */
  private panelSlot(panel: HTMLElement): CloudSaveSlot {
    const slot = Number(this.panelValue(panel, 'slot'));
    if (!Number.isInteger(slot) || slot < 0 || slot > 10) throw new Error(this.t('cloud.save.error.slot.range'));
    return slot;
  }

  /** 从 localStorage 读取面板的非敏感配置。 */
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

  /** 把面板的非敏感配置保存到 localStorage，避免保存密码。 */
  private savePanelConfig(panel: HTMLElement): void {
    // 只记住非敏感面板字段。密码只保留在本次交互的内存配置中。
    localStorage.setItem(
      CloudSaveService.PANEL_STORAGE_KEY,
      JSON.stringify({
        endpoint: this.panelValue(panel, 'endpoint'),
        username: this.panelValue(panel, 'username')
      })
    );
  }

  /** 刷新远端存档列表，并为每个槽位生成下载和删除按钮。 */
  private async refreshPanel(panel: HTMLElement): Promise<void> {
    const list = panel.querySelector<HTMLElement>('[data-cloud-save-list]');
    if (!list) return;
    const items = await this.listRemote();
    if (!items.length) {
      list.textContent = this.t('cloud.save.none');
      return;
    }
    list.replaceChildren(
      // 把每个远端槽位转换成一行可操作的 DOM 元素。
      ...items.map(item => {
        const row = document.createElement('div');
        row.className = 'maplebirch-cloud-save-row';
        row.innerHTML = `
          <span>${item.slot}</span>
          <span>${new Date(item.updatedAt).toLocaleString()}</span>
          <button type="button" class="saveMenuButton" data-cloud-save-download-slot="${item.slot}">${this.t('cloud.save.action.download')}</button>
          <button type="button" class="deleteButton right saveMenuButton" data-cloud-save-delete-slot="${item.slot}">${this.t('cloud.save.action.delete')}</button>`;
        // 下载按钮点击后，把该远端槽位导入到当前选择的本地槽位。
        row.querySelector<HTMLButtonElement>('[data-cloud-save-download-slot]')?.addEventListener('click', () => this.panelAction('downloadSlot', item.slot));
        // 删除按钮点击后，删除该远端槽位并刷新列表。
        row.querySelector<HTMLButtonElement>('[data-cloud-save-delete-slot]')?.addEventListener('click', () => this.panelAction('deleteRemoteSlot', item.slot));
        return row;
      })
    );
  }

  /** 更新面板状态提示，并根据成功或失败切换样式。 */
  private setPanelStatus(panel: HTMLElement, message: string, success = false): void {
    const status = panel.querySelector<HTMLElement>('[data-cloud-save-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('success', success);
    status.classList.toggle('error', !success);
    status.classList.add('visible');
  }

  /** 把捕获到的异常转换成适合显示在面板上的错误文本。 */
  private panelErrorMessage(error: any): string {
    if (error?.name === 'OperationError') return this.t('cloud.save.error.decrypt');
    return error?.message || String(error);
  }

  /** 调用项目核心翻译函数，统一取得本地化文本。 */
  private t(key: string): string {
    return this.core.t(key);
  }

  /** 把云端存档整理成 indexedDB 可写入的 SugarCube 状态格式。 */
  private prepareSaveForIdb(save: any): any {
    const state = structuredClone(save);
    if (!state.history && state.delta) {
      const deltaDecode = this.core.SugarCube?.State?.deltaDecode;
      if (typeof deltaDecode !== 'function') throw new Error('SugarCube.State.deltaDecode is not available.');
      state.history = deltaDecode(state.delta);
      delete state.delta;
    }
    if (!state.history) throw new Error('Cloud save data does not contain a valid SugarCube history.');
    return state;
  }

  /** 要求云存档配置已经存在，否则直接抛出明确错误。 */
  private requireConfig(): CloudSaveConfig {
    if (!this.config) throw new Error('Cloud save is not configured.');
    return this.config;
  }

  /** 要求配置中存在服务地址或 WebDAV 地址，并返回标准化后的地址。 */
  private requireEndpoint(): string {
    const endpoint = this.config?.endpoint;
    if (!endpoint) throw new Error('Cloud save endpoint is not configured.');
    return endpoint;
  }

  /** 把后端认证结果写入当前配置，保存 userId、token 和加密口令。 */
  private applyAuth(response: CloudSaveAuthResponse, passphrase: string): void {
    const endpoint = this.requireEndpoint();
    this.config = {
      ...this.config,
      endpoint,
      mode: 'server',
      userId: String(response.userId),
      passphrase,
      token: response.token
    };
  }

  /** 封装 Go 后端注册和登录请求，减少 register/login 的重复代码。 */
  private async auth(path: '/auth/register' | '/auth/login', username: string, password: string): Promise<CloudSaveAuthResponse> {
    return this.serverRequest<CloudSaveAuthResponse>(path, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  /** 自动连接远端：地址像 Go 服务时登录账号，否则按 WebDAV 初始化。 */
  private async connectRemote(username: string, password: string): Promise<void> {
    if (await this.isServerEndpoint()) {
      await this.login(username, password);
      return;
    }
    this.configure({ ...this.requireConfig(), username, password, passphrase: password });
    await this.ensureWebdavReady();
    this.configure({ ...this.requireConfig(), mode: 'webdav' });
  }

  /** 用健康检查判断当前地址是否为框架提供的 Go + SQL 服务。 */
  private async isServerEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`${this.requireEndpoint()}/health`, { method: 'GET' });
      if (!response.ok) return false;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) return true;
      return /ok|healthy|cloud/i.test(await response.text());
    } catch {
      return false;
    }
  }

  /** 把本地槽位打包成远端可保存的加密记录。 */
  private async packSlot(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    return {
      slot,
      updatedAt: Date.now(),
      payload: await this.encrypt(await this.exportSlot(slot), this.passphrase())
    };
  }

  /** 把远端槽位解密后写回本地槽位。 */
  private async unpackSlot(item: CloudSaveRemoteItem | null, targetSlot: CloudSaveSlot): Promise<boolean> {
    if (!item?.payload) throw new Error(`Remote save slot ${targetSlot} not found.`);
    return this.importSlot(await this.decrypt<CloudSaveRecord>(item.payload, this.passphrase()), targetSlot);
  }

  /** 把存档码打包成远端可保存的加密记录。 */
  private async packCode(code: string): Promise<CloudSaveRemoteCode> {
    const record: CloudSaveCodeRecord = {
      code,
      exportedAt: Date.now(),
      gameId: this.core.SugarCube?.Story?.domId,
      frameworkVersion: this.core.meta.version
    };
    return {
      updatedAt: Date.now(),
      payload: await this.encrypt(record, this.passphrase())
    };
  }

  /** 把远端存档码解密成原始文本。 */
  private async unpackCode(item: CloudSaveRemoteCode | null): Promise<string> {
    if (!item?.payload) throw new Error(this.t('cloud.save.error.code.notFound'));
    const record = await this.decrypt<CloudSaveCodeRecord>(item.payload, this.passphrase());
    if (!record.code) throw new Error(this.t('cloud.save.error.code.empty'));
    return record.code;
  }

  /** 当前面板密码就是云存档加密口令。 */
  private passphrase(): string {
    const passphrase = this.requireConfig().passphrase;
    if (!passphrase) throw new Error('Cloud save passphrase is not configured.');
    return passphrase;
  }

  /** 向 Go 服务后端发送 JSON 请求，并自动附带 userId 与 Bearer token。 */
  private async serverRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const config = this.config;
    const endpoint = this.requireEndpoint();
    const response = await fetch(`${endpoint}${path}`, {
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

  /** 使用 WebDAV 上传指定槽位，并同步更新 manifest.json 索引。 */
  private async webdavUpload(slot: CloudSaveSlot): Promise<CloudSaveRemoteItem> {
    const item = await this.packSlot(slot);
    await this.ensureWebdavReady();
    await this.webdavRequest(this.webdavFilePath('slots', `${slot}.json`), {
      method: 'PUT',
      body: JSON.stringify(item)
    });
    const manifest = await this.readWebdavManifest();
    // 替换同槽位旧记录后按槽位号排序，保证 manifest 稳定可读。
    manifest.saves = [...manifest.saves.filter(save => save.slot !== slot), { slot, updatedAt: item.updatedAt }].sort((a, b) => a.slot - b.slot);
    await this.writeWebdavManifest(manifest);
    return { slot, updatedAt: item.updatedAt };
  }

  /** 使用 WebDAV 下载指定槽位，解密后导入本地槽位。 */
  private async webdavDownload(slot: CloudSaveSlot, targetSlot = slot): Promise<boolean> {
    const item = await this.webdavRequest<CloudSaveRemoteItem>(this.webdavFilePath('slots', `${slot}.json`), { method: 'GET' }, true);
    return this.unpackSlot(item, targetSlot);
  }

  /** 从 WebDAV manifest.json 中读取远端槽位列表。 */
  private async webdavListRemote(): Promise<CloudSaveRemoteItem[]> {
    const manifest = await this.readWebdavManifest();
    // 返回前按槽位号排序，避免 UI 列表顺序跳动。
    return manifest.saves.sort((a, b) => a.slot - b.slot);
  }

  /** 删除 WebDAV 上的指定槽位文件，并同步更新 manifest.json。 */
  private async webdavDeleteRemote(slot: CloudSaveSlot): Promise<boolean> {
    await this.webdavRequest(this.webdavFilePath('slots', `${slot}.json`), { method: 'DELETE' }, true);
    const manifest = await this.readWebdavManifest();
    // 从索引中移除被删除的槽位。
    manifest.saves = manifest.saves.filter(item => item.slot !== slot);
    await this.writeWebdavManifest(manifest);
    return true;
  }

  /** 使用 WebDAV 上传加密后的存档码，并记录存档码更新时间。 */
  private async webdavUploadCode(code = this.exportCode()): Promise<CloudSaveRemoteCode> {
    const item = await this.packCode(code);
    await this.ensureWebdavReady();
    await this.webdavRequest(this.webdavFilePath('save-code.json'), {
      method: 'PUT',
      body: JSON.stringify(item)
    });
    const manifest = await this.readWebdavManifest();
    manifest.codeUpdatedAt = item.updatedAt;
    await this.writeWebdavManifest(manifest);
    return { updatedAt: item.updatedAt };
  }

  /** 使用 WebDAV 下载并解密远端存档码。 */
  private async webdavDownloadCode(): Promise<string> {
    const item = await this.webdavRequest<CloudSaveRemoteCode>(this.webdavFilePath('save-code.json'), { method: 'GET' }, true);
    return this.unpackCode(item);
  }

  /** 读取并清洗 WebDAV 远端索引文件；不存在时返回空索引。 */
  private async readWebdavManifest(): Promise<CloudSaveManifest> {
    // manifest 让 WebDAV 实现保持简单：不解析 PROPFIND XML，只读写一个很小的 JSON 索引。
    await this.ensureWebdavReady();
    const manifest = await this.webdavRequest<CloudSaveManifest>(this.webdavFilePath('manifest.json'), { method: 'GET' }, true);
    if (!manifest) return this.emptyManifest();
    return {
      version: 1,
      updatedAt: Number(manifest.updatedAt) || Date.now(),
      // 只保留字段合法的槽位索引，避免损坏的 manifest 影响面板。
      saves: Array.isArray(manifest.saves) ? manifest.saves.filter(item => Number.isInteger(item.slot) && typeof item.updatedAt === 'number') : [],
      codeUpdatedAt: typeof manifest.codeUpdatedAt === 'number' ? manifest.codeUpdatedAt : undefined
    };
  }

  /** 写回 WebDAV 远端索引文件，并刷新 updatedAt 时间。 */
  private async writeWebdavManifest(manifest: CloudSaveManifest): Promise<void> {
    await this.ensureWebdavReady();
    await this.webdavRequest(this.webdavFilePath('manifest.json'), {
      method: 'PUT',
      body: JSON.stringify({ ...manifest, updatedAt: Date.now() })
    });
  }

  /** 创建一个空的 WebDAV 远端索引对象。 */
  private emptyManifest(): CloudSaveManifest {
    return { version: 1, updatedAt: Date.now(), saves: [] };
  }

  /** 检查 WebDAV 配置和凭据，并确保 slots 目录存在。 */
  private async ensureWebdavReady(): Promise<void> {
    const config = this.requireConfig();
    if (!config.endpoint) throw new Error('Cloud save endpoint is not configured.');
    if (!config.username || !config.password) throw new Error(this.t('cloud.save.error.webdav.credentials'));
    await this.webdavMkcol(this.webdavFilePath('slots'));
  }

  /** 调用 WebDAV MKCOL 创建目录；目录已存在时视为成功。 */
  private async webdavMkcol(path: string): Promise<void> {
    const response = await this.webdavFetch(path, { method: 'MKCOL' });
    if ([200, 201, 204, 405].includes(response.status)) return;
    throw new Error(`WebDAV MKCOL failed: ${response.status} ${await response.text()}`);
  }

  /** 发送 WebDAV JSON 请求，统一处理 404、错误状态和 JSON 解析。 */
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

  /** 发送底层 WebDAV fetch 请求，并自动附加 Basic Auth 认证头。 */
  private webdavFetch(path: string, init: RequestInit): Promise<Response> {
    const config = this.requireConfig();
    const username = config.username ?? '';
    const password = config.password ?? '';
    return fetch(this.webdavUrl(path), {
      ...init,
      headers: {
        Authorization: `Basic ${basicAuth(username, password)}`,
        ...init.headers
      }
    });
  }

  /** 把相对 WebDAV 路径拼接成完整请求 URL。 */
  private webdavUrl(path: string): string {
    return `${this.requireEndpoint()}/${path}`;
  }

  /** 根据文件片段生成已编码的 WebDAV 远端路径。 */
  private webdavFilePath(...parts: string[]): string {
    return joinEncodedPath(...parts);
  }

  /** 使用 PBKDF2 派生密钥并用 AES-GCM 加密云存档数据。 */
  private async encrypt(data: unknown, passphrase: string): Promise<CloudSaveEncryptedPayload> {
    // 远端只会看到加密后的 JSON，不需要理解 SugarCube 或 DoL 的存档结构。
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(passphrase, salt);
    const encoded = await this.compress(jsonToBytes(data));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, toArrayBuffer(encoded));
    return {
      version: 1,
      compression: encoded.compressed ? 'gzip' : undefined,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  /** 校验云存档密文版本，派生密钥后解密并还原 JSON 数据。 */
  private async decrypt<T>(payload: CloudSaveEncryptedPayload, passphrase: string): Promise<T> {
    if (payload.version !== 1) throw new Error(`Unsupported cloud save payload version: ${payload.version}`);
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const key = await this.deriveKey(passphrase, salt);
    const encrypted = base64ToBytes(payload.data);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(encrypted));
    const bytes = payload.compression === 'gzip' ? await this.decompress(new Uint8Array(decrypted)) : new Uint8Array(decrypted);
    return bytesToJson<T>(bytes);
  }

  /** 用 fflate 尝试 gzip 压缩数据，只在压缩后更小时使用压缩结果。 */
  private async compress(bytes: Uint8Array): Promise<Uint8Array & { compressed?: boolean }> {
    const compressed = gzipSync(bytes, { level: 9, mem: 9 }) as Uint8Array & { compressed?: boolean };
    compressed.compressed = compressed.byteLength < bytes.byteLength;
    return compressed.compressed ? compressed : bytes;
  }

  /** 解压 gzip 数据；优先用 fflate，旧环境异常时再尝试浏览器原生解压。 */
  private async decompress(bytes: Uint8Array): Promise<Uint8Array> {
    try {
      return gunzipSync(bytes);
    } catch {
      if (typeof DecompressionStream !== 'function') throw new Error(this.t('cloud.save.error.decompress'));
      const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }
  }

  /** 使用 PBKDF2-SHA256 从口令和 salt 派生 AES-GCM 密钥。 */
  private async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey('raw', toArrayBuffer(textToBytes(passphrase)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 150000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
}

export default CloudSaveService;
export type { CloudSaveAuthResponse, CloudSaveConfig, CloudSaveRecord, CloudSaveRemoteItem };
