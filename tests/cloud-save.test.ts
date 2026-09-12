import './helpers/runtime';
import { describe, expect, test } from 'bun:test';
import type { MaplebirchCore } from '../src/core';

const { default: CloudSaveService } = await import('../src/services/CloudSaveService');

async function downloadFromPanel(writeResult: boolean | void) {
  const classes = new Set<string>();
  const status = {
    textContent: '',
    classList: {
      toggle(name: string, enabled: boolean) {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
      add(name: string) {
        classes.add(name);
      }
    }
  };
  const panel = {
    querySelector(selector: string) {
      if (selector === '[data-cloud-save-status]') return status;
      if (selector === '[data-cloud-save-field="endpoint"]') return { value: 'https://cloud.example.test' };
      if (selector === '[data-cloud-save-field="token"]') return { value: 'test-token' };
      return null;
    }
  };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const key of ['document', 'localStorage', 'fetch']) originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  const idbDescriptor = Object.getOwnPropertyDescriptor(window, 'idb');
  const written: unknown[] = [];
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { querySelector: () => panel } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() {} } });
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async () => Response.json({ payload: { slot: 2, save: { history: [{ variables: { value: 1 } }] }, details: {} } }) });
  Object.defineProperty(window, 'idb', {
    configurable: true,
    value: {
      getItem: async () => null,
      getSaveDetails: async () => [],
      setItem: async (...args: unknown[]) => {
        written.push(args);
        return writeResult;
      }
    }
  });
  try {
    const service = new CloudSaveService({ t: (key: string) => key } as unknown as MaplebirchCore);
    await service.panelAction('downloadSlot', 2);
    return { message: status.textContent, success: classes.has('success'), error: classes.has('error'), written };
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    if (idbDescriptor) Object.defineProperty(window, 'idb', idbDescriptor);
    else Reflect.deleteProperty(window, 'idb');
  }
}

describe('CloudSaveService download panel', () => {
  test('shows failure when the local save database rejects the write', async () => {
    const result = await downloadFromPanel(false);
    expect(result.written).toHaveLength(1);
    expect(result.message).toBe('cloud.save.error.download');
    expect(result.success).toBe(false);
    expect(result.error).toBe(true);
  });

  for (const result of [true, undefined]) {
    test(`shows success when the local save write returns ${String(result)}`, async () => {
      const status = await downloadFromPanel(result);
      expect(status.message).toBe('cloud.save.status.download');
      expect(status.success).toBe(true);
      expect(status.error).toBe(false);
    });
  }
});
