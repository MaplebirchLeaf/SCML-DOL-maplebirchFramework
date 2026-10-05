// ./src/infra/Cipher.ts

import { base64ToArrayBuffer, bytesToBase64, toArrayBuffer } from '../utils/binary';

interface CipherText {
  iv: string;
  data: string;
}

export default class Cipher {
  public static get available(): boolean {
    const crypto = globalThis.crypto;
    return (
      !!crypto?.subtle &&
      typeof crypto.subtle.generateKey === 'function' &&
      typeof crypto.subtle.encrypt === 'function' &&
      typeof crypto.subtle.decrypt === 'function' &&
      typeof crypto.getRandomValues === 'function'
    );
  }

  public static generateKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  public static async encrypt(bytes: Uint8Array, key: CryptoKey): Promise<CipherText> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv) }, key, toArrayBuffer(bytes));
    return { iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
  }

  public static decrypt(cipher: CipherText, key: CryptoKey): Promise<ArrayBuffer> {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToArrayBuffer(cipher.iv) }, key, base64ToArrayBuffer(cipher.data));
  }
}
