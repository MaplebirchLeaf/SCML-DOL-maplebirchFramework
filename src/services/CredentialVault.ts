// ./src/services/CredentialVault.ts

import type { MaplebirchCore } from '../core';
import PromptStyle from '@/styles/PromptStyle.css';
import { base64ToArrayBuffer, bytesToBase64, bytesToJson, escapeHtmlText, jsonToBytes, toArrayBuffer } from '../utils';

export type CredentialPeriod = 'day' | 'month';

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
    period?: CredentialPeriod;
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
  password?: string;
  prompt?: AuthConfig['prompt'] & {
    name?: string;
  };
  lazyOptions?: any;
  decrypt(password: string, context: CryptContext): Promise<CryptResult | Uint8Array | ArrayBuffer | Blob | string>;
}

interface StoredBase {
  subject: string;
  key: string;
  createdAt: number;
}

type StoredCredential = StoredBase &
  (
    | {
        type: 'credential';
        credential: string;
      }
    | {
        type: 'password';
        password: string;
      }
  );

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

interface RawStoredCredential {
  type?: unknown;
  subject?: unknown;
  key?: unknown;
  credential?: unknown;
  password?: unknown;
  createdAt?: unknown;
}

interface DecodedCredential {
  payload: AuthPayload;
  payloadBuffer: ArrayBuffer;
  signatureBuffer: ArrayBuffer;
}

class CredentialVault {
  private static readonly STORE = 'credentials';
  private static readonly TOKEN_PREFIX = 'maplebirch-auth';

  private dialogQueue: Promise<unknown> = Promise.resolve();
  private storageKey: Promise<CryptoKey> | null = null;

  public constructor(readonly core: MaplebirchCore) {
    this.core.once(':indexedDB', () => this.core.idb.register(CredentialVault.STORE, { keyPath: ['bucket', 'id'] }, [{ name: 'bucket', keyPath: 'bucket', options: { unique: false } }]));
  }

  public async loadCrypt(options: CryptOptions): Promise<boolean> {
    const modName = options.modName || this.core.modUtils.getNowRunningModName?.() || '';
    if (!modName) throw new Error('无法获取当前模组名');
    const cache = options.cache?.subject && options.cache.key ? options.cache : undefined;
    if (cache) {
      const saved = await this.readStored(cache.subject, cache.key);

      if (saved) {
        try {
          const loaded = saved.type === 'credential' ? await this.loadCredential(modName, saved.credential, options) : await this.decryptAndLoad(modName, saved.password, options, {});
          if (loaded) return true;
        } catch {
          await this.forget(cache.subject, cache.key);
        }
      }
    }
    if (options.password && (await this.decryptAndLoad(modName, options.password, options, {}))) return true;
    let errorText = '';
    while (true) {
      const credential = await this.promptCredential(modName, options.prompt, errorText);
      if (!credential) {
        this.core.log(`模组加密验证失败，已禁用: ${modName}`, 'WARN');
        await this.core.disabled(modName, false);
        return false;
      }
      try {
        if (await this.loadCredential(modName, credential, options)) return true;
        errorText = this.core.t('credential.auth.error.mismatch');
      } catch (error: any) {
        errorText = String(error?.message || error);
      }
    }
  }

  private loadCredential(modName: string, credential: string, options: CryptOptions): Promise<boolean> {
    const payload = this.decodeCredential(credential).payload;
    return this.decryptAndLoad(modName, payload.password, options, {
      credential,
      payload
    });
  }

  private async decryptAndLoad(modName: string, password: string, options: CryptOptions, context: Omit<CryptContext, 'modName'>): Promise<boolean> {
    const decrypted = await options.decrypt(password, {
      modName,
      ...context
    });

    const result: CryptResult = decrypted && typeof decrypted === 'object' && 'data' in decrypted ? (decrypted as CryptResult) : { data: decrypted };
    if (result.data == null) throw new Error('解密结果为空');
    if (result.auth === false) throw new Error(this.core.t('credential.auth.error.mismatch'));
    const auth = result.auth && typeof result.auth === 'object' ? result.auth : undefined;
    if (context.credential) {
      if (!auth) throw new Error(this.core.t('credential.auth.error.mismatch'));
      const verified = await this.verify(modName, auth, context.credential);
      if (verified.password !== password) throw new Error(this.core.t('credential.auth.error.mismatch'));
    }
    const loaded = await this.core.modUtils.lazyRegisterNewModZipData.call(this.core.modUtils, result.data, options.lazyOptions);
    if (!loaded) {
      this.core.log(`模组加密验证失败，已禁用: ${modName}`, 'ERROR');
      await this.core.disabled(modName, false);
      return false;
    }
    const cache = options.cache?.subject && options.cache.key ? options.cache : undefined;
    if (cache) {
      const stored: StoredCredential = context.credential
        ? {
            type: 'credential',
            subject: cache.subject,
            key: cache.key,
            credential: context.credential,
            createdAt: Date.now()
          }
        : {
            type: 'password',
            subject: cache.subject,
            key: cache.key,
            password,
            createdAt: Date.now()
          };
      await this.storeStored(stored);
    }
    return true;
  }

  private decodeCredential(credential: string): DecodedCredential {
    const [prefix, payloadPart, signaturePart, extraPart] = credential.trim().split('.');
    if (extraPart !== undefined || prefix !== CredentialVault.TOKEN_PREFIX || !payloadPart || !signaturePart) {
      throw new Error(`${this.core.t('credential.auth.error.format')}: ${CredentialVault.TOKEN_PREFIX}.<payload>.<signature>`);
    }
    let payloadBuffer: ArrayBuffer;
    let signatureBuffer: ArrayBuffer;
    let raw: RawAuthPayload;
    try {
      payloadBuffer = base64ToArrayBuffer(payloadPart);
      signatureBuffer = base64ToArrayBuffer(signaturePart);
      raw = bytesToJson<RawAuthPayload>(payloadBuffer);
    } catch {
      throw new Error(this.core.t('credential.auth.error.format'));
    }
    if (typeof raw.subject !== 'string' || !raw.subject || typeof raw.key !== 'string' || !raw.key || typeof raw.password !== 'string' || !raw.password) {
      throw new Error(this.core.t('credential.auth.error.format'));
    }
    if (raw.date != null && (typeof raw.date !== 'string' || !raw.date)) throw new Error(this.core.t('credential.auth.error.format'));
    if (raw.expiresAt != null && (typeof raw.expiresAt !== 'number' || !Number.isFinite(raw.expiresAt))) throw new Error(this.core.t('credential.auth.error.format'));
    const payload: AuthPayload = {
      subject: raw.subject,
      key: raw.key,
      password: raw.password
    };
    if (typeof raw.date === 'string') payload.date = raw.date;
    if (typeof raw.expiresAt === 'number') payload.expiresAt = raw.expiresAt;
    return {
      payload,
      payloadBuffer,
      signatureBuffer
    };
  }

  private async verify(modName: string, config: AuthConfig, credential: string): Promise<AuthPayload> {
    const decoded = this.decodeCredential(credential);
    const publicKey =
      typeof config.publicKey === 'string'
        ? await crypto.subtle.importKey('spki', base64ToArrayBuffer(config.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
        : await crypto.subtle.importKey('jwk', config.publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, decoded.signatureBuffer, decoded.payloadBuffer);
    if (!valid) throw new Error(this.core.t('credential.auth.error.signature'));
    const payload = decoded.payload;
    const subject = config.subject || modName;
    if (payload.subject !== subject) throw new Error(`${this.core.t('credential.auth.error.mismatch')}: ${payload.subject}`);
    if (payload.key !== config.key) throw new Error(this.core.t('credential.auth.error.mismatch'));
    if (payload.expiresAt !== undefined && payload.expiresAt < Date.now()) throw new Error(this.core.t('credential.auth.error.mismatch'));
    if (payload.date || config.date) {
      if (!payload.date) throw new Error(this.core.t('credential.auth.error.mismatch'));
      const period = config.date?.period ?? 'day';
      const timezone = config.date?.timezone || 'UTC';
      const graceDays = Math.max(0, Math.floor(config.date?.graceDays ?? 0));
      const now = Date.now();
      let matched = false;
      for (let offset = -graceDays; offset <= graceDays; offset++) {
        if (this.credentialDate(new Date(now + offset * 86400000), timezone, period) === payload.date) {
          matched = true;
          break;
        }
      }
      if (!matched) throw new Error(`${this.core.t('credential.auth.error.mismatch')}: ${payload.date}`);
    }
    return payload;
  }

  private credentialDate(date: Date, timezone: string, period: CredentialPeriod): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const year = parts.find(part => part.type === 'year')?.value;
    const month = parts.find(part => part.type === 'month')?.value;
    if (period === 'month') return `${year}-${month}`;
    const day = parts.find(part => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private async readStored(subject: string, key: string): Promise<StoredCredential | null> {
    const record = await this.core.idb.withTransaction(CredentialVault.STORE, 'readonly', (tx: any) => tx.objectStore(CredentialVault.STORE).get(['license', `${subject}:${key}`]));
    if (!record) return null;
    const stored = await this.decryptRecord<RawStoredCredential>(record as CredentialRecord);
    if (!stored || stored.subject !== subject || stored.key !== key || typeof stored.createdAt !== 'number') {
      await this.forget(subject, key);
      return null;
    }
    if (stored.type === 'credential' && typeof stored.credential === 'string' && stored.credential) {
      return {
        type: 'credential',
        subject,
        key,
        credential: stored.credential,
        createdAt: stored.createdAt
      };
    }
    if (stored.type === 'password' && typeof stored.password === 'string' && stored.password) {
      return {
        type: 'password',
        subject,
        key,
        password: stored.password,
        createdAt: stored.createdAt
      };
    }
    await this.forget(subject, key);
    return null;
  }

  private async storeStored(value: StoredCredential): Promise<void> {
    const encrypted = await this.encryptRecord(value);
    await this.core.idb.withTransaction(CredentialVault.STORE, 'readwrite', (tx: any) =>
      tx.objectStore(CredentialVault.STORE).put({
        bucket: 'license',
        id: `${value.subject}:${value.key}`,
        ...encrypted,
        updatedAt: Date.now()
      })
    );
  }

  private async forget(subject: string, key: string): Promise<void> {
    await this.core.idb.withTransaction(CredentialVault.STORE, 'readwrite', (tx: any) => tx.objectStore(CredentialVault.STORE).delete(['license', `${subject}:${key}`]));
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

  private async promptCredential(modName: string, prompt: CryptOptions['prompt'] = {}, errorText = ''): Promise<string | null> {
    const next = this.dialogQueue.then(async () => {
      const Swal = window.modSweetAlert2Mod;
      this.ensurePromptStyle();
      let credentialDraft = '';
      const label = prompt.label || `${prompt.name || modName} - ${this.core.t('credential.auth.label')}`;
      while (true) {
        const title = prompt.title || this.core.t('credential.auth.title');
        const hint = errorText || prompt.hint || this.core.t('credential.auth.hint');
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
          inputPlaceholder: prompt.placeholder || this.core.t('credential.auth.placeholder'),
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

  private ensureStorageKey(): Promise<CryptoKey> {
    if (!this.storageKey) {
      this.storageKey = this.loadStorageKey().catch(error => {
        this.storageKey = null;
        throw error;
      });
    }
    return this.storageKey;
  }

  private async loadStorageKey(): Promise<CryptoKey> {
    const existing = await this.core.idb.withTransaction(CredentialVault.STORE, 'readonly', (tx: any) => tx.objectStore(CredentialVault.STORE).get(['meta', 'cryptoKey']));
    if (existing?.cryptoKey) return existing.cryptoKey as CryptoKey;
    const candidate = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    return this.core.idb.withTransaction(CredentialVault.STORE, 'readwrite', async (tx: any) => {
      const store = tx.objectStore(CredentialVault.STORE);
      const current = await store.get(['meta', 'cryptoKey']);
      if (current?.cryptoKey) return current.cryptoKey as CryptoKey;
      await store.put({
        bucket: 'meta',
        id: 'cryptoKey',
        cryptoKey: candidate,
        updatedAt: Date.now()
      });
      return candidate;
    });
  }

  private async encryptRecord(value: unknown): Promise<{ iv: string; data: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: toArrayBuffer(iv)
      },
      await this.ensureStorageKey(),
      toArrayBuffer(jsonToBytes(value))
    );
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  private async decryptRecord<T>(record: CredentialRecord): Promise<T | null> {
    if (!record.iv || !record.data) return null;
    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: base64ToArrayBuffer(record.iv)
        },
        await this.ensureStorageKey(),
        base64ToArrayBuffer(record.data)
      );
      return bytesToJson<T>(decrypted);
    } catch (error: any) {
      this.core.log(`凭证解密失败: ${error?.message || error}`, 'WARN');
      return null;
    }
  }
}

export default CredentialVault;
