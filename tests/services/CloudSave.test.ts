import { lodash } from './runtime';
import { expect, test } from 'bun:test';
import type { CloudSaveRecord, CloudSaveRemoteItem } from '../../src/services/CloudSave';
import SugarCube from '../../src/host/SugarCube';
import Diagnostics from '../../src/infra/Diagnostics';
const { default: CloudSave } = await import('../../src/services/CloudSave');

class Element extends EventTarget {
  childNodes: Element[] = [];
  className = '';
  textContent = '';
  title = '';
  focused = false;
  append(...children: Element[]) {
    this.childNodes.push(...children);
  }
  replaceChildren(...children: Element[]) {
    this.childNodes = children;
  }
  focus() {
    this.focused = true;
  }
  click() {
    this.dispatchEvent(new Event('click'));
  }
}

test('remote delete requires confirmation and cancel restores the list without deleting', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const list = new Element();
  const panel = { querySelector: () => list };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new Element(), querySelector: () => panel } });
  try {
    const { service } = fixture();
    const actions: unknown[][] = [];
    service.panelAction = async (...args) => {
      actions.push(args);
    };
    const row = (service as unknown as { remoteRow(item: CloudSaveRemoteItem): Element }).remoteRow({ slot: 7, updatedAt: 1, details: { title: 'Temple', metadata: { saveName: 'Example' } } });
    list.append(row);
    const trigger = row.childNodes[4];
    trigger.click();
    const warning = list.childNodes[0];
    expect(warning.className).toBe('saveBorder maplebirch-cloud-save-confirm');
    expect(warning.childNodes[0].className).toBe('red');
    expect(warning.childNodes[1].childNodes[0].textContent).toBe('Example');
    expect(warning.childNodes[1].childNodes[1].textContent).toBe('Temple');
    expect(warning.childNodes[2].childNodes[0].className).toBe('deleteButton saveMenuButton');
    expect(warning.childNodes[2].childNodes[1].focused).toBe(true);
    expect(actions).toEqual([]);
    warning.childNodes[2].childNodes[1].click();
    expect(list.childNodes).toEqual([row]);
    expect(trigger.focused).toBe(true);
    expect(actions).toEqual([]);
    trigger.click();
    list.childNodes[0].childNodes[2].childNodes[0].click();
    expect(actions).toEqual([['deleteRemoteSlot', 7]]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('remote rows separate gold names from descriptions and show a compact teal saved date', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new Element() } });
  try {
    const { service } = fixture();
    const row = (service as unknown as { remoteRow(item: CloudSaveRemoteItem): Element }).remoteRow({
      slot: 3,
      updatedAt: 2000,
      details: { title: '<img src=x onerror=alert(1)>Temple', date: 1000, metadata: { saveName: 'Example — Temple route' } }
    });
    expect(row.childNodes[2].textContent).toBe('Example — Temple route');
    expect(row.childNodes[2].className).toBe('maplebirch-cloud-save-name gold');
    const summary = row.childNodes[3];
    expect(summary.className).toBe('maplebirch-cloud-save-details');
    expect(summary.childNodes.map(node => node.textContent)).toEqual(['<img src=x onerror=alert(1)>Temple', new Date(1000).toLocaleString()]);
    expect(summary.childNodes[0].childNodes).toEqual([]);
    expect(summary.childNodes[0].title).toBe('<img src=x onerror=alert(1)>Temple');
    expect(summary.childNodes[1].className).toBe('teal');
    expect(summary.childNodes[1].title).toContain(`cloud.save.date.uploaded ${new Date(2000).toLocaleString()}`);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('native save IDs and older records remain renderable with an upload-date fallback', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => new Element() } });
  try {
    const { service } = fixture();
    const view = service as unknown as { remoteRow(item: CloudSaveRemoteItem): Element };
    const duplicate = view.remoteRow({ slot: 1, updatedAt: 2000, details: { title: 'Example', metadata: { saveName: 'Example' } } });
    expect(duplicate.childNodes[3].childNodes).toHaveLength(2);
    expect(duplicate.childNodes[3].childNodes[0].textContent).toBe('Example');
    const unnamed = view.remoteRow({ slot: 2, updatedAt: 2000, details: { metadata: { saveName: '', saveId: 13029 } } });
    expect(unnamed.childNodes[2].textContent).toBe('13029');
    const old = view.remoteRow({ slot: 2, updatedAt: 2000 });
    expect(old.childNodes[3].childNodes[0].textContent).toBe('cloud.save.description.none');
    expect(old.childNodes[3].childNodes[1].textContent).toBe(new Date(2000).toLocaleString());
    expect(old.childNodes).toHaveLength(5);
    const titleOnly = view.remoteRow({ slot: 0, updatedAt: 2000, details: { title: 'Temple' } });
    expect(titleOnly.childNodes[0].textContent).toBe('A');
    expect(titleOnly.childNodes[3].childNodes[0].textContent).toBe('Temple');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

function fixture() {
  const writes: unknown[][] = [];
  const state = { index: 0, history: [{ title: 'Start', variables: { player: { name: 'Example' } } }] };
  const sugarcube = new SugarCube();
  sugarcube.runtime = {
    Story: { domId: 'degrees-of-lewdity' },
    Config: { saves: { id: 'degrees-of-lewdity', version: 1 } },
    State: { qc: 0, deltaDecode: () => structuredClone(state.history), deltaEncode: (history: unknown) => ({ encoded: history }) }
  } as never;
  Object.assign(window, {
    idb: {
      async getItem() {
        return { data: state };
      },
      async getSaveDetails() {
        return [{ slot: 1, data: { title: 'Example', date: 1, idx: 3 } }];
      },
      async setItem(...args: unknown[]) {
        writes.push(args);
        return true;
      }
    }
  });
  return { service: new CloudSave(sugarcube, key => key, lodash, new Diagnostics()), state, writes };
}

test('cloud imports reject invalid target slots and malformed histories before writing', async () => {
  const { service, state, writes } = fixture();
  const record: CloudSaveRecord = { slot: 1, save: state, details: null, exportedAt: Date.now() };
  await expect(service.importSlot(record, -1)).rejects.toThrow('cloud.save.error.slot.range');
  await expect(service.importSlot({ ...record, save: { history: 'invalid' } } as unknown as CloudSaveRecord)).rejects.toThrow('valid SugarCube history');
  await expect(service.importSlot({ ...record, save: { history: [] } })).rejects.toThrow('valid SugarCube history');
  expect(writes).toHaveLength(0);
});

test('cloud import expands delta state without mutating the remote record', async () => {
  const { service, state, writes } = fixture();
  const record: CloudSaveRecord = { slot: 1, save: { index: 0, delta: ['encoded'] }, details: { title: 'Cloud', custom: 5 }, exportedAt: 1 };
  expect(await service.importSlot(record, 2)).toBe(true);
  expect(writes[0][0]).toBe(2);
  expect(writes[0][1]).toEqual(state);
  expect(writes[0][2]).toMatchObject({ title: 'Cloud', custom: 5 });
  expect(record.save).toEqual({ index: 0, delta: ['encoded'] });
});

test('slot code export uses delta encoding and retains the original local history', async () => {
  const { service, state } = fixture();
  const compressed: string[] = [];
  Object.assign(window, {
    LZString: {
      compressToBase64(text: string) {
        compressed.push(text);
        return 'encoded';
      }
    }
  });
  expect(await service.exportSlotCode(1)).toBe('encodedencoded');
  const save = JSON.parse(compressed[0]);
  expect(save.idx).toBe(3);
  expect(save.state.history).toBeUndefined();
  expect(save.state.delta).toEqual({ encoded: state.history });
  expect(state.history[0].title).toBe('Start');
});
