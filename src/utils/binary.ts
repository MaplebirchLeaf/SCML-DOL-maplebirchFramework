// ./src/utils/binary.ts

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function textToBytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

function bytesToText(bytes: Uint8Array | ArrayBuffer): string {
  return textDecoder.decode(bytes);
}

export function jsonToBytes(value: unknown): Uint8Array {
  return textToBytes(JSON.stringify(value));
}

export function bytesToJson<T = any>(bytes: Uint8Array | ArrayBuffer): T {
  return JSON.parse(bytesToText(bytes)) as T;
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function normalizeBase64(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(normalizeBase64(value));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64ToArrayBuffer(value: string): ArrayBuffer {
  return toArrayBuffer(base64ToBytes(value));
}

export function basicAuth(username: string, password: string): string {
  return bytesToBase64(textToBytes(`${username}:${password}`));
}
