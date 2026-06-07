// ./src/services/CredentialVault.ts

import type { MaplebirchCore } from '../core';
import PromptStyle from '@/styles/PromptStyle.css';
import { base64ToArrayBuffer, bytesToBase64, bytesToJson, escapeHtmlText, jsonToBytes, toArrayBuffer } from '../utils';

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

  public constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.core.idb.register(CredentialVault.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]));
  }

  private async readPassword(subject: string, key: string): Promise<string | null> {
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

  private async unlock(modName: string, config: AuthConfig, credential: string): Promise<string> {
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

  public async loadCrypt(options: CryptOptions): Promise<boolean> {
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
        const payload = bytesToJson<RawAuthPayload>(base64ToArrayBuffer(payloadPart));
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
    if (await this.core.modUtils.lazyRegisterNewModZipData.call(this.core.modUtils, result.data, options.lazyOptions)) return true;
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
    style.textContent = PromptStyle;
  }

  private async promptCredential(modName: string, prompt: CryptOptions['prompt'] = {}, errorText: string = ''): Promise<string | null> {
    const next = this.dialogQueue.then(async () => {
      const Swal = window.modSweetAlert2Mod;
      this.ensurePromptStyle();
      let credentialDraft = '';
      const label = prompt?.label || `${prompt?.name || modName} - ${this.core.t('credential.auth.label')}`;
      while (true) {
        const title = prompt?.title || this.core.t('credential.auth.title');
        const hint = errorText || prompt?.hint || this.core.t('credential.auth.hint');
        const html = `
          <div class="maplebirch-auth-header">${escapeHtmlText(String(title))}</div>
          <div class="maplebirch-auth-body">
            <label class="maplebirch-auth-label">${escapeHtmlText(String(label))}</label>
            ${errorText ? `<div class="maplebirch-auth-error">${escapeHtmlText(errorText)}</div>` : `<div class="maplebirch-auth-hint">${escapeHtmlText(String(hint))}</div>`}
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

  private async verify(modName: string, config: AuthConfig, credential: string): Promise<AuthPayload> {
    const [prefix, payloadPart, signaturePart, extraPart] = credential.trim().split('.');
    if (extraPart !== undefined || prefix !== CredentialVault.TOKEN_PREFIX || !payloadPart || !signaturePart) {
      throw new Error(`${this.core.t('credential.auth.error.format')}: ${CredentialVault.TOKEN_PREFIX}.<payload>.<signature>`);
    }

    const payloadBuffer = base64ToArrayBuffer(payloadPart);
    const signatureBuffer = base64ToArrayBuffer(signaturePart);

    const publicKey =
      typeof config.publicKey === 'string'
        ? await crypto.subtle.importKey('spki', base64ToArrayBuffer(config.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
        : await crypto.subtle.importKey('jwk', config.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);

    const validSignature = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signatureBuffer, payloadBuffer);
    if (!validSignature) throw new Error(this.core.t('credential.auth.error.signature'));

    let payload: RawAuthPayload;

    try {
      payload = bytesToJson<RawAuthPayload>(payloadBuffer);
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

  private async forget(subject: string, key: string): Promise<void> {
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
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, await this.ensureStorageKey(), toArrayBuffer(jsonToBytes(value)));
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  private async decryptRecord<T>(record: CredentialRecord): Promise<T | null> {
    if (!record.iv || !record.data) return null;
    try {
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToArrayBuffer(record.iv) }, await this.ensureStorageKey(), base64ToArrayBuffer(record.data));
      return bytesToJson<T>(decrypted);
    } catch (error: any) {
      this.core.log(`凭证解密失败: ${error?.message || error}`, 'WARN');
      return null;
    }
  }
}

export default CredentialVault;
