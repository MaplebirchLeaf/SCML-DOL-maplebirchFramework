import '../support/runtime';
import { expect, test } from 'bun:test';
import DoLX from '../../src/compat/DoLX';

test('DoLX detection via StartConfig version', () => {
  const savedStartConfig = Object.getOwnPropertyDescriptor(globalThis, 'StartConfig');

  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 DoLP v0.778 DoLX v1.0' },
      configurable: true
    });
    expect(DoLX.isDoLX).toBe(true);

    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 DoLP v0.778' },
      configurable: true
    });
    expect(DoLX.isDoLX).toBe(false);
  } finally {
    if (savedStartConfig) Object.defineProperty(globalThis, 'StartConfig', savedStartConfig);
    else Reflect.deleteProperty(globalThis, 'StartConfig');
  }
});

test('DoLX trait extension when DoLX is active', () => {
  const savedStartConfig = Object.getOwnPropertyDescriptor(globalThis, 'StartConfig');
  try {
    Object.defineProperty(globalThis, 'StartConfig', {
      value: { version: '0.5.12.13 DoLP v0.778 DoLX v1.0' },
      configurable: true
    });
    const valid = { names: new Set<string>(), traits: new Set<string>() };
    DoLX.extend(valid);
    expect(valid.traits.has('dragonTongue')).toBe(true);
    expect(valid.traits.has('ironWill')).toBe(true);
    expect(valid.traits.has('leviathan')).toBe(true);
  } finally {
    if (savedStartConfig) Object.defineProperty(globalThis, 'StartConfig', savedStartConfig);
    else Reflect.deleteProperty(globalThis, 'StartConfig');
  }
});
