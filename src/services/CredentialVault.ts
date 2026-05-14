// ./src/services/CredentialVault.ts

import type { MaplebirchCore } from '../core';

export interface AuthConfig {
  key: string;
  subject?: string;
  name?: string;
  publicKey: JsonWebKey | string;
  prompt?: {
    title?: string;
    label?: string;
    placeholder?: string;
    hint?: string;
  };
  date?: {
    timezone?: string;
    graceDays?: number;
  };
}

export interface AuthPayload {
  subject: string;
  key: string;
  date?: string;
  password: string;
  expiresAt?: number;
}

export interface CryptContext {
  modName: string;
  credential?: string;
  payload?: AuthPayload;
}

export interface CryptResult {
  data: any;
  auth?: AuthConfig | boolean | void;
}

export interface CryptOptions {
  modName?: string;
  cache?: {
    subject: string;
    key: string;
  };
  prompt?: AuthConfig['prompt'] & {
    name?: string;
  };
  lazyOptions?: any;
  decrypt(password: string, context: CryptContext): Promise<CryptResult | Uint8Array | ArrayBuffer | Blob | string>;
}

export interface StoredCredential {
  subject: string;
  key: string;
  password: string;
  issuedDate?: string;
  expiresAt?: number;
  createdAt: number;
}

interface CredentialRecord {
  bucket: 'license' | 'meta';
  id: string;
  iv?: string;
  data?: string;
  cryptoKey?: CryptoKey;
  updatedAt: number;
}

interface RawAuthPayload {
  subject?: unknown;
  key?: unknown;
  date?: unknown;
  password?: unknown;
  expiresAt?: unknown;
}

class CredentialVault {
  private static readonly STORE = 'credentials';
  private static readonly TOKEN_PREFIX = 'maplebirch-auth';

  private dialogQueue: Promise<unknown> = Promise.resolve();

  constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.core.idb.register(CredentialVault.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]));
  }

  async readPassword(subject: string, key: string): Promise<string | null> {
    const record = await this.core.idb.withTransaction(CredentialVault.STORE, 'readonly', async (tx: any) => {
      return await tx.objectStore(CredentialVault.STORE).get(['license', `${subject}:${key}`]);
    });
    if (!record) return null;
    const stored = await this.decryptRecord<StoredCredential>(record as CredentialRecord);
    if (!stored?.password) return null;
    if (stored.subject !== subject || stored.key !== key) {
      await this.forget(subject, key);
      return null;
    }
    return stored.password;
  }

  async unlock(modName: string, config: AuthConfig, credential: string): Promise<string> {
    const payload = await this.verify(modName, config, credential);
    const subject = config.subject || modName;
    await this.storePassword(subject, config.key, {
      subject,
      key: config.key,
      password: payload.password,
      issuedDate: payload.date,
      expiresAt: payload.expiresAt,
      createdAt: Date.now()
    });
    return payload.password;
  }

  async loadCrypt(options: CryptOptions): Promise<boolean> {
    const modName = options.modName || this.core.modUtils.getNowRunningModName?.() || '';
    if (!modName) throw new Error('无法获取当前模组名');
    if (options.cache?.subject && options.cache?.key) {
      const saved = await this.readPassword(options.cache.subject, options.cache.key);
      if (saved) {
        try {
          const loaded = await this.decryptAndLoad(modName, saved, options, {});
          if (loaded) return true;
        } catch {
          await this.forget(options.cache.subject, options.cache.key);
        }
      }
    }
    let errorText = '';
    while (true) {
      const credential = await this.promptCredential(modName, options.prompt, errorText);
      if (!credential) {
        this.core.log(`模组加密验证失败，已禁用: ${modName}`, 'WARN');
        await this.core.disabled(modName, false);
        return false;
      }
      try {
        const [prefix, payloadPart, signaturePart, extraPart] = credential.trim().split('.');
        if (extraPart !== undefined || prefix !== CredentialVault.TOKEN_PREFIX || !payloadPart || !signaturePart) {
          throw new Error(`${this.core.t('credential.auth.error.format')}: ${CredentialVault.TOKEN_PREFIX}.<payload>.<signature>`);
        }
        const payload = JSON.parse(new TextDecoder().decode(this.base64ToBuffer(payloadPart.replace(/-/g, '+').replace(/_/g, '/')))) as RawAuthPayload;
        if (typeof payload.subject !== 'string' || typeof payload.key !== 'string' || typeof payload.password !== 'string' || !payload.password) {
          throw new Error(this.core.t('credential.auth.error.format'));
        }
        const loaded = await this.decryptAndLoad(modName, payload.password, options, {
          credential,
          payload: payload as AuthPayload
        });
        if (loaded) return true;
        errorText = this.core.t('credential.auth.error.mismatch');
      } catch (error: any) {
        errorText = String(error?.message || error);
      }
    }
  }

  private async decryptAndLoad(modName: string, password: string, options: CryptOptions, context: Omit<CryptContext, 'modName'>): Promise<boolean> {
    const decrypted = await options.decrypt(password, { modName, ...context });
    const result: CryptResult = decrypted && typeof decrypted === 'object' && 'data' in decrypted ? (decrypted as CryptResult) : { data: decrypted };
    if (!result.data) throw new Error('解密结果为空');
    if (result.auth && typeof result.auth === 'object') {
      const auth = result.auth;
      if (context.credential) {
        const verifiedPassword = await this.unlock(modName, auth, context.credential);
        if (verifiedPassword !== password) throw new Error(this.core.t('credential.auth.error.mismatch'));
        if (options.cache?.subject && options.cache?.key) {
          await this.storePassword(options.cache.subject, options.cache.key, {
            subject: options.cache.subject,
            key: options.cache.key,
            password,
            createdAt: Date.now()
          });
        }
      } else {
        await this.storePassword(auth.subject || modName, auth.key, {
          subject: auth.subject || modName,
          key: auth.key,
          password,
          createdAt: Date.now()
        });
      }
    } else if (result.auth === false) {
      throw new Error(this.core.t('credential.auth.error.mismatch'));
    } else if (options.cache?.subject && options.cache?.key) {
      await this.storePassword(options.cache.subject, options.cache.key, {
        subject: options.cache.subject,
        key: options.cache.key,
        password,
        createdAt: Date.now()
      });
    }
    const register = (this.core.modUtils as any).lazyRegisterNewModZipData;
    if (typeof register !== 'function') throw new Error('ModLoader 懒加载接口不可用');
    if (await register.call(this.core.modUtils, result.data, options.lazyOptions)) return true;
    this.core.log(`模组加密验证失败，已禁用: ${modName}`, 'ERROR');
    await this.core.disabled(modName, false);
    return false;
  }

  private async storePassword(subject: string, key: string, value: StoredCredential): Promise<void> {
    const encrypted = await this.encryptRecord({ ...value, subject, key });
    await this.core.idb.withTransaction(
      CredentialVault.STORE,
      'readwrite',
      async (tx: any) => await tx.objectStore(CredentialVault.STORE).put({ bucket: 'license', id: `${subject}:${key}`, ...encrypted, updatedAt: Date.now() })
    );
  }

  private ensurePromptStyle(): void {
    const styleId = 'maplebirch-auth-dialog-style';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      .swal2-popup.maplebirch-auth-popup {
        display: block !important;
        position: relative !important;
        width: min(760px, calc(100vw - 24px)) !important;
        max-height: calc(100vh - 24px) !important;
        padding: 0 !important;
        margin: 0 !important;
        border: 1px solid #3c3c3c !important;
        border-radius: 0 !important;
        background: #070707 !important;
        color: #f2f2f2 !important;
        overflow: hidden !important;
        font-family: "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif !important;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.65) !important;
      }

      .maplebirch-auth-popup .swal2-title,
      .maplebirch-auth-popup .swal2-icon {
        display: none !important;
      }

      .maplebirch-auth-popup .swal2-html-container {
        display: block !important;
        width: 100% !important;
        max-height: calc(100vh - 180px) !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-y: auto !important;
      }

      .maplebirch-auth-header {
        box-sizing: border-box;
        width: 100%;
        height: 44px;
        margin: 0;
        padding: 0 52px;
        background: #444444;
        border-bottom: 1px solid #555555;
        color: #ffffff;
        font-size: clamp(17px, 2.4vw, 20px);
        font-weight: 700;
        line-height: 44px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .maplebirch-auth-body {
        box-sizing: border-box;
        width: 100%;
        padding: clamp(16px, 3vh, 22px) 28px 12px;
        text-align: center;
      }

      .maplebirch-auth-label {
        display: block;
        margin: 0 0 10px;
        color: #ffffff;
        font-size: clamp(14px, 2vw, 16px);
        font-weight: 700;
        line-height: 1.5;
      }

      .maplebirch-auth-hint,
      .maplebirch-auth-error {
        margin: 0;
        font-size: clamp(13px, 1.8vw, 15px);
        line-height: 1.65;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .maplebirch-auth-hint {
        color: #d8d8d8;
      }

      .maplebirch-auth-error {
        color: #ff4a4a;
        font-weight: 700;
      }

      .maplebirch-auth-popup .swal2-input {
        box-sizing: border-box !important;
        width: calc(100% - 56px) !important;
        margin: 0 28px !important;
        padding: 11px 13px !important;
        border: 1px solid #777777 !important;
        border-radius: 0 !important;
        background: #4a4a4a !important;
        color: #ffffff !important;
        font-size: 15px !important;
        font-family: Consolas, "Courier New", monospace !important;
        box-shadow: none !important;
        outline: none !important;
        color-scheme: light;
      }

      .maplebirch-auth-popup .swal2-input::placeholder {
        color: #cfcfcf !important;
        opacity: 1 !important;
      }

      .maplebirch-auth-popup .swal2-input:focus {
        background: #565656 !important;
        border-color: #9a9a9a !important;
      }

      .maplebirch-auth-popup .swal2-actions {
        width: 100%;
        margin: 16px 0 0 !important;
        padding: 0 28px 24px !important;
      }

      .maplebirch-auth-popup .swal2-confirm {
        min-width: min(230px, calc(100vw - 96px));
        padding: 10px 22px !important;
        border: 1px solid #666666 !important;
        border-radius: 0 !important;
        background: #242424 !important;
        color: #ffffff !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        font-family: "Microsoft YaHei", "Noto Sans SC", Arial, sans-serif !important;
        box-shadow: none !important;
      }

      .maplebirch-auth-popup .swal2-confirm:hover {
        background: #303030 !important;
      }

      .maplebirch-auth-popup .swal2-close {
        position: absolute !important;
        top: 0 !important;
        right: 0 !important;
        z-index: 2 !important;
        width: 44px !important;
        height: 44px !important;
        border-radius: 0 !important;
        color: #e0e0e0 !important;
        font-size: 30px !important;
        line-height: 44px !important;
        box-shadow: none !important;
        font-family: Arial, sans-serif !important;
      }

      .maplebirch-auth-popup .swal2-close:hover {
        background: #333333 !important;
        color: #ffffff !important;
      }
    `;
  }

  private async promptCredential(modName: string, prompt: CryptOptions['prompt'] = {}, errorText: string = ''): Promise<string | null> {
    const next = this.dialogQueue.then(async () => {
      const Swal = await this.getSweetAlert();
      this.ensurePromptStyle();
      let credentialDraft = '';
      const label = prompt?.label || `${prompt?.name || modName} - ${this.core.t('credential.auth.label')}`;
      while (true) {
        const title = prompt?.title || this.core.t('credential.auth.title');
        const hint = errorText || prompt?.hint || this.core.t('credential.auth.hint');
        const html = `
          <div class="maplebirch-auth-header">${this.escapeHtmlText(String(title))}</div>
          <div class="maplebirch-auth-body">
            <label class="maplebirch-auth-label">${this.escapeHtmlText(String(label))}</label>
            ${errorText ? `<div class="maplebirch-auth-error">${this.escapeHtmlText(errorText)}</div>` : `<div class="maplebirch-auth-hint">${this.escapeHtmlText(String(hint))}</div>`}
          </div>
        `;
        const result = await Swal.fire({
          html,
          input: 'password',
          inputValue: credentialDraft,
          inputPlaceholder: prompt?.placeholder || this.core.t('credential.auth.placeholder'),
          showCancelButton: false,
          showCloseButton: true,
          allowOutsideClick: false,
          confirmButtonText: this.core.t('credential.auth.unlock'),
          padding: 0,
          customClass: {
            popup: 'maplebirch-auth-popup'
          },
          buttonsStyling: true,
          inputAttributes: {
            maxlength: '4096',
            autocapitalize: 'off',
            autocorrect: 'off',
            spellcheck: 'false'
          }
        });
        if (!result.isConfirmed) return null;
        const credential = String(result.value || '').trim();
        credentialDraft = credential;
        if (credential) return credential;
        errorText = this.core.t('credential.auth.error.format');
      }
    });
    this.dialogQueue = next.catch(() => undefined);
    return next;
  }

  async verify(modName: string, config: AuthConfig, credential: string): Promise<AuthPayload> {
    const [prefix, payloadPart, signaturePart, extraPart] = credential.trim().split('.');
    if (extraPart !== undefined || prefix !== CredentialVault.TOKEN_PREFIX || !payloadPart || !signaturePart) {
      throw new Error(`${this.core.t('credential.auth.error.format')}: ${CredentialVault.TOKEN_PREFIX}.<payload>.<signature>`);
    }

    const payloadBuffer = this.base64ToBuffer(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    const signatureBuffer = this.base64ToBuffer(signaturePart.replace(/-/g, '+').replace(/_/g, '/'));

    const publicKey =
      typeof config.publicKey === 'string'
        ? await crypto.subtle.importKey('spki', this.base64ToBuffer(config.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
        : await crypto.subtle.importKey('jwk', config.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);

    const validSignature = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signatureBuffer, payloadBuffer);
    if (!validSignature) throw new Error(this.core.t('credential.auth.error.signature'));

    let payload: RawAuthPayload;

    try {
      payload = JSON.parse(new TextDecoder().decode(payloadBuffer)) as RawAuthPayload;
    } catch {
      throw new Error(this.core.t('credential.auth.error.format'));
    }

    const subject = config.subject || modName;

    if (payload.subject !== subject) throw new Error(`${this.core.t('credential.auth.error.mismatch')}: ${typeof payload.subject === 'string' ? payload.subject : 'unknown'}`);
    if (payload.key !== config.key) throw new Error(this.core.t('credential.auth.error.mismatch'));
    if (typeof payload.password !== 'string' || !payload.password) throw new Error(this.core.t('credential.auth.error.format'));

    let date: string | undefined;

    if (payload.date != null) {
      if (typeof payload.date !== 'string' || !payload.date) throw new Error(this.core.t('credential.auth.error.mismatch'));
      date = payload.date;
    }

    let expiresAt: number | undefined;

    if (payload.expiresAt != null) {
      if (typeof payload.expiresAt !== 'number' || !Number.isFinite(payload.expiresAt)) throw new Error(this.core.t('credential.auth.error.format'));
      if (payload.expiresAt < Date.now()) throw new Error(this.core.t('credential.auth.error.mismatch'));
      expiresAt = payload.expiresAt;
    }

    if (date || config.date) {
      if (!date) throw new Error(this.core.t('credential.auth.error.mismatch'));
      const timezone = config.date?.timezone || 'UTC';
      const graceDays = Math.max(0, Math.floor(config.date?.graceDays ?? 0));
      const now = Date.now();
      let matched = false;
      for (let offset = -graceDays; offset <= graceDays; offset++) {
        const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now + offset * 86400000));
        const year = parts.find(part => part.type === 'year')?.value;
        const month = parts.find(part => part.type === 'month')?.value;
        const day = parts.find(part => part.type === 'day')?.value;
        if (`${year}-${month}-${day}` === date) {
          matched = true;
          break;
        }
      }
      if (!matched) throw new Error(`${this.core.t('credential.auth.error.mismatch')}: ${date}`);
    }

    return {
      subject,
      key: config.key,
      date,
      password: payload.password,
      expiresAt
    };
  }

  async forget(subject: string, key: string): Promise<void> {
    await this.core.idb.withTransaction(CredentialVault.STORE, 'readwrite', async (tx: any) => await tx.objectStore(CredentialVault.STORE).delete(['license', `${subject}:${key}`]));
  }

  private async ensureStorageKey(): Promise<CryptoKey> {
    const record = await this.core.idb.withTransaction(CredentialVault.STORE, 'readonly', async (tx: any) => {
      return await tx.objectStore(CredentialVault.STORE).get(['meta', 'cryptoKey']);
    });

    if (record?.cryptoKey) return record.cryptoKey as CryptoKey;
    const cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

    await this.core.idb.withTransaction(CredentialVault.STORE, 'readwrite', async (tx: any) => {
      await tx.objectStore(CredentialVault.STORE).put({
        bucket: 'meta',
        id: 'cryptoKey',
        cryptoKey,
        updatedAt: Date.now()
      });
    });

    return cryptoKey;
  }

  private async encryptRecord(value: unknown): Promise<{ iv: string; data: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    const ivBuffer = iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer;
    const encodedBuffer = encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) as ArrayBuffer;
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBuffer }, await this.ensureStorageKey(), encodedBuffer);
    return {
      iv: this.bytesToBase64(iv),
      data: this.bytesToBase64(new Uint8Array(encrypted))
    };
  }

  private async decryptRecord<T>(record: CredentialRecord): Promise<T | null> {
    if (!record.iv || !record.data) return null;
    try {
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.base64ToBuffer(record.iv) }, await this.ensureStorageKey(), this.base64ToBuffer(record.data));
      return JSON.parse(new TextDecoder().decode(decrypted)) as T;
    } catch (error: any) {
      this.core.log(`凭证解密失败: ${error?.message || error}`, 'WARN');
      return null;
    }
  }

  private base64ToBuffer(value: string): ArrayBuffer {
    const padded = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return buffer;
  }

  private bytesToBase64(value: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < value.length; i++) binary += String.fromCharCode(value[i]);
    return btoa(binary);
  }

  private escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  private async getSweetAlert(): Promise<any> {
    const existing = window.modSweetAlert2Mod;
    if (existing?.fire) return existing;
    return await new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        const Swal = window.modSweetAlert2Mod;
        if (Swal?.fire) {
          window.clearInterval(timer);
          resolve(Swal);
          return;
        }
        if (Date.now() - startedAt > 5000) {
          window.clearInterval(timer);
          reject(new Error('SweetAlert2Mod 不可用'));
        }
      }, 50);
    });
  }
}

export default CredentialVault;
