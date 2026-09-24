export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isKey(key: unknown): key is string {
  return typeof key === 'string' && key.trim().length > 0 && !['__proto__', 'constructor', 'prototype'].includes(key);
}
