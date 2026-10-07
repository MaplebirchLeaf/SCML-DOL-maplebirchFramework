// ./src/services/Repair/State.ts

import { NativeJSON } from './Json';

export type JSONValue = null | string | number | boolean | JSONValue[] | { [key: string]: JSONValue };
export interface RepairStatePolicy {
  modName: string;
  path: string[];
  scope: 'state';
}
export interface RepairStateChange {
  type: 'set' | 'delete' | 'rename' | 'copy' | 'merge' | 'fill';
  path: string[];
  value?: JSONValue;
  to?: string[];
}
export interface RepairStateHandle {
  read(): string;
  write(content: string): void;
  restore(): void;
}
interface Envelope {
  exists: boolean;
  value?: JSONValue;
}
type Slot = { parent: Record<string, unknown>; key: string; descriptor?: PropertyDescriptor; after?: PropertyDescriptor };

export class RepairState {
  private static readonly MAX = 16384;
  private static readonly DEPTH = 32;
  private static readonly unsafe = new Set(['__proto__', 'prototype', 'constructor', 'V', 'T', 'C', 'setup', 'window', 'globalThis', 'State', 'Story', 'Renderer']);

  public static policy(value: unknown): RepairStatePolicy {
    const policy = RepairState.detach(value) as unknown as RepairStatePolicy;
    RepairState.keys(policy, ['modName', 'path', 'scope']);
    if (typeof policy.modName !== 'string' || !policy.modName.trim() || policy.modName.length > 128 || policy.scope !== 'state') throw new Error('Invalid state policy');
    RepairState.path(policy.path);
    return policy;
  }

  public static *paths(source: string, offsets?: Uint8Array): Generator<string[]> {
    const identifier = /^[$_\p{ID_Start}][$_\p{ID_Continue}]*/u;
    for (const match of source.matchAll(/(?<![$_\p{ID_Continue}.])(?:\$(?=[$_\p{ID_Start}])|V\b|(?:SugarCube\s*\.\s*)?State\s*\.\s*variables\b)/gu)) {
      if (offsets && !offsets[match.index]) continue;
      let previous = match.index - 1;
      while (previous >= 0 && (/\s/.test(source[previous]) || (offsets && !offsets[previous]))) previous--;
      if (source[previous] === '.') continue;
      let index = match.index + match[0].length;
      const path: string[] = [];
      if (match[0] === '$') {
        const root = source.slice(index).match(identifier)!;
        path.push(root[0]);
        index += root[0].length;
      }
      let dynamic = false;
      while (path.length <= RepairState.DEPTH) {
        const tail = source.slice(index);
        const dot = tail.match(/^\s*(?:\?\.(?!\s*\[)|\.)\s*/);
        if (dot) {
          const segment = tail.slice(dot[0].length).match(identifier);
          if (!segment) {
            dynamic = true;
            break;
          }
          path.push(segment[0]);
          index += dot[0].length + segment[0].length;
          continue;
        }
        const bracket = tail.match(/^\s*(?:\?\.)?\[\s*(?:"([^"\\]*)"|'([^'\\]*)'|(0|[1-9]\d*))\s*\]/);
        if (bracket) {
          path.push(bracket[1] ?? bracket[2] ?? bracket[3]);
          index += bracket[0].length;
          continue;
        }
        dynamic = /^\s*(?:(?:\?\.)?\[|\/[/*])/.test(tail);
        break;
      }
      if (!dynamic && RepairState.validPath(path)) yield path;
    }
  }

  public static targetPath(path: string[], root: object): string[] {
    RepairState.path(path);
    let current: unknown = root;
    for (const [index, segment] of path.entries()) {
      RepairState.container(current);
      const descriptor = Object.getOwnPropertyDescriptor(current, segment);
      if (descriptor && !Object.hasOwn(descriptor, 'value')) throw new Error('State path cannot contain accessors');
      const prefix = path.slice(0, index + 1);
      if (!descriptor || descriptor.value === undefined || (index < path.length - 1 && !RepairState.object(descriptor.value) && !Array.isArray(descriptor.value))) {
        RepairState.read(prefix, root);
        return prefix;
      }
      current = descriptor.value;
    }
    RepairState.read(path, root);
    if (path.length > 1) {
      const parent = path.slice(0, -1);
      try {
        RepairState.read(parent, root);
        return parent;
      } catch {
        return path;
      }
    }
    return path;
  }

  public static overlaps(left: string[], right: string[]): boolean {
    return RepairState.inside(left, right) || RepairState.inside(right, left);
  }

  public static fragment(policyValue: RepairStatePolicy, content: string, path: string[]): string {
    const policy = RepairState.policy(policyValue);
    RepairState.path(path);
    if (!RepairState.inside(path, policy.path)) throw new Error('State fragment escapes its target');
    return RepairState.read(['value', ...path.slice(policy.path.length)], RepairState.envelope(content));
  }

  public static replaceFragment(policyValue: RepairStatePolicy, content: string, path: string[], expected: string, replacement: string): string {
    const policy = RepairState.policy(policyValue);
    if (RepairState.fragment(policy, content, path) !== expected) throw new Error('Repair state fragment changed');
    const before = RepairState.envelope(expected);
    const next = RepairState.envelope(replacement);
    if (path.length === policy.path.length) return RepairState.encode(next);
    if (!next.exists && !before.exists) return content;
    return RepairState.validate(policy, content, [next.exists ? { type: 'set', path, value: next.value! } : { type: 'delete', path }]);
  }

  public static changes(value: unknown): RepairStateChange[] {
    const changes = RepairState.detach(value) as unknown as RepairStateChange[];
    if (!Array.isArray(changes) || !changes.length || changes.length > 128) throw new Error('Invalid state changes');
    for (const change of changes) {
      const hasValue = ['set', 'merge', 'fill'].includes(change.type);
      const hasTo = ['rename', 'copy'].includes(change.type);
      if (!hasValue && !hasTo && change.type !== 'delete') throw new Error('Invalid state change type');
      RepairState.keys(change, ['type', 'path', ...(hasValue ? ['value'] : []), ...(hasTo ? ['to'] : [])]);
      RepairState.path(change.path);
      if (hasTo) RepairState.path(change.to!);
    }
    return changes;
  }

  public static validate(policyValue: RepairStatePolicy, content: string, input: RepairStateChange[]): string {
    const policy = RepairState.policy(policyValue);
    const state = RepairState.envelope(content);
    const changes = RepairState.changes(input);
    for (const change of changes) {
      for (const path of [change.path, ...(change.to ? [change.to] : [])]) {
        if (!RepairState.inside(path, policy.path)) throw new Error('State change escapes its policy');
      }
      const relative = change.path.slice(policy.path.length);
      if (!state.exists && !relative.length) state.exists = true;
      if (!state.exists) {
        state.exists = true;
        state.value = {};
      }
      const slot = RepairState.slot(state, ['value', ...relative], ['set', 'merge', 'fill'].includes(change.type));
      const current = slot.descriptor?.value;
      if (change.type === 'set') RepairState.put(slot, change.value);
      else if (change.type === 'delete') {
        if (!slot.descriptor) throw new Error('State source is missing');
        RepairState.remove(slot);
        if (!relative.length) state.exists = false;
      } else if (change.to) {
        if (!slot.descriptor || RepairState.inside(change.path, change.to) || RepairState.inside(change.to, change.path)) throw new Error('Invalid state move');
        const destination = RepairState.slot(state, ['value', ...change.to.slice(policy.path.length)], true);
        if (destination.descriptor) throw new Error('State destination already exists');
        RepairState.put(destination, RepairState.detach(current));
        if (change.type === 'rename') RepairState.remove(slot);
      } else {
        if (change.type === 'fill' && !RepairState.object(change.value)) {
          if (current === undefined) RepairState.put(slot, change.value);
        } else {
          if (!RepairState.object(change.value)) throw new Error('State merge requires an object value');
          const next = current === undefined ? {} : current;
          if (!RepairState.object(next)) throw new Error('State merge requires an object');
          RepairState.merge(next, change.value, change.type === 'fill');
          RepairState.put(slot, next);
        }
      }
    }
    return RepairState.encode(state);
  }

  public static read(path: string[], root: object): string {
    RepairState.path(path);
    let current: unknown = root;
    for (const segment of path) {
      RepairState.container(current);
      if (Array.isArray(current) && (!/^(0|[1-9]\d*)$/.test(segment) || Number(segment) > current.length)) throw new Error('Invalid state array index');
      const descriptor = Object.getOwnPropertyDescriptor(current, segment);
      if (!descriptor) return RepairState.encode({ exists: false });
      if (!Object.hasOwn(descriptor, 'value')) throw new Error('State path cannot contain accessors');
      current = descriptor.value;
      if (current === undefined) return RepairState.encode({ exists: false });
    }
    return RepairState.encode({ exists: true, value: RepairState.detach(current) as JSONValue });
  }

  public static handle(root: object, policyValue: RepairStatePolicy): RepairStateHandle {
    const policy = RepairState.policy(policyValue);
    RepairState.read(policy.path, root);
    const snapshots: Slot[] = [];
    const rollback = (): void => {
      for (const { parent, key, descriptor } of [...snapshots].reverse()) {
        if (descriptor) Object.defineProperty(parent, key, descriptor);
        else if (!Reflect.deleteProperty(parent, key)) throw new Error('State rollback failed');
      }
      snapshots.length = 0;
    };
    return {
      read: () => RepairState.read(policy.path, root),
      write: content => {
        const next = RepairState.envelope(content);
        try {
          const slot = RepairState.slot(root, policy.path, next.exists, snapshots);
          if (!next.exists && Array.isArray(slot.parent)) throw new Error('State array deletion requires its parent target');
          if (!snapshots.some(saved => saved.parent === slot.parent && saved.key === slot.key)) snapshots.push(slot);
          if (next.exists) RepairState.put(slot, next.value);
          else RepairState.remove(slot);
          for (const saved of snapshots) saved.after = Object.getOwnPropertyDescriptor(saved.parent, saved.key);
        } catch (error) {
          rollback();
          throw error;
        }
      },
      restore: () => {
        for (const { parent, key, after } of snapshots) {
          const current = Object.getOwnPropertyDescriptor(parent, key);
          if (
            current === undefined || after === undefined
              ? current !== after
              : Reflect.ownKeys(current).length !== Reflect.ownKeys(after).length || Object.keys(after).some(field => !Object.is(Reflect.get(current, field), Reflect.get(after, field)))
          )
            throw new Error('State changed after repair; rollback rejected');
        }
        rollback();
      }
    };
  }

  private static object(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  }

  private static container(value: unknown): asserts value is Record<string, unknown> {
    if (!RepairState.object(value) && !(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype)) throw new Error('State path requires plain data');
  }

  private static path(value: unknown): asserts value is string[] {
    if (!RepairState.validPath(value)) throw new Error('Invalid state path');
  }

  private static validPath(value: unknown): value is string[] {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || !value.length || value.length > RepairState.DEPTH) return false;
    if (Reflect.ownKeys(value).some(key => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) return false;
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      const segment = descriptor?.value;
      if (
        !descriptor ||
        !Object.hasOwn(descriptor, 'value') ||
        typeof segment !== 'string' ||
        !segment.trim() ||
        segment.length > 128 ||
        ['.', '..'].includes(segment) ||
        RepairState.unsafe.has(segment)
      )
        return false;
    }
    return true;
  }

  private static inside(path: string[], root: string[]): boolean {
    return root.length <= path.length && root.every((segment, index) => path[index] === segment);
  }

  private static keys(value: unknown, required: string[], optional: string[] = []): void {
    if (!RepairState.object(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key)))
      throw new Error('Unexpected state fields');
  }

  private static encode(value: unknown): string {
    const text = NativeJSON.stringify(value);
    if (new TextEncoder().encode(text).length > RepairState.MAX) throw new Error('State data exceeds 16 KiB');
    return text;
  }

  private static detach(value: unknown): unknown {
    const parents = new Set<object>();
    let nodes = 0;
    const visit = (item: unknown, depth: number): void => {
      if (++nodes > RepairState.MAX || depth > RepairState.DEPTH) throw new Error('State data is too deep or large');
      if (item === null || ['string', 'boolean'].includes(typeof item) || (typeof item === 'number' && Number.isFinite(item))) return;
      RepairState.container(item);
      if (parents.has(item)) throw new Error('Circular state data');
      parents.add(item);
      for (const key of Reflect.ownKeys(item)) {
        if (Array.isArray(item) && key === 'length') continue;
        if (typeof key !== 'string' || RepairState.unsafe.has(key)) throw new Error('Unsafe state key');
        if (Array.isArray(item) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length)) throw new Error('Invalid state array fields');
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
        if (!Object.hasOwn(descriptor, 'value')) throw new Error('State data cannot contain accessors');
        if (!descriptor.enumerable) throw new Error('State data must contain enumerable JSON fields');
        visit(descriptor.value, depth + 1);
      }
      parents.delete(item);
    };
    visit(value, 0);
    return NativeJSON.parse(RepairState.encode(value));
  }

  private static envelope(content: string): Envelope {
    if (typeof content !== 'string' || new TextEncoder().encode(content).length > RepairState.MAX) throw new Error('Invalid state content');
    const envelope = RepairState.detach(NativeJSON.parse(content)) as Envelope;
    RepairState.keys(envelope, ['exists'], envelope.exists === true ? ['value'] : []);
    if (typeof envelope.exists !== 'boolean' || (envelope.exists && !Object.hasOwn(envelope, 'value'))) throw new Error('Invalid state envelope');
    return envelope;
  }

  public static equals(left: string, right: string): boolean {
    const compare = (a: unknown, b: unknown): boolean => {
      if (a === b) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && compare(Reflect.get(a, key), Reflect.get(b, key)));
    };
    return compare(RepairState.envelope(left), RepairState.envelope(right));
  }

  private static slot(root: object, path: string[], create: boolean, snapshots?: Slot[]): Slot {
    let parent: unknown = root;
    for (const [index, key] of path.entries()) {
      RepairState.container(parent);
      if (Array.isArray(parent) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) > parent.length)) throw new Error('Invalid state array index');
      const slot = { parent, key, descriptor: Object.getOwnPropertyDescriptor(parent, key) };
      if (slot.descriptor && !Object.hasOwn(slot.descriptor, 'value')) throw new Error('State path cannot contain accessors');
      if (snapshots && Array.isArray(parent) && !snapshots.some(saved => saved.parent === parent && saved.key === 'length'))
        snapshots.push({ parent, key: 'length', descriptor: Object.getOwnPropertyDescriptor(parent, 'length') });
      if (index === path.length - 1) return slot;
      if (!slot.descriptor || slot.descriptor.value === undefined) {
        if (!create) throw new Error('State parent is missing');
        if (snapshots && !snapshots.some(saved => saved.parent === slot.parent && saved.key === slot.key)) snapshots.push(slot);
        RepairState.put(slot, {});
      }
      parent = Reflect.getOwnPropertyDescriptor(slot.parent, key)!.value;
    }
    throw new Error('Invalid state path');
  }

  private static put(slot: Slot, value: unknown): void {
    Object.defineProperty(slot.parent, slot.key, slot.descriptor ? { ...slot.descriptor, value } : { value, writable: true, enumerable: true, configurable: true });
  }

  private static remove(slot: Slot): void {
    if (Array.isArray(slot.parent)) slot.parent.splice(Number(slot.key), 1);
    else if (!Reflect.deleteProperty(slot.parent, slot.key)) throw new Error('State delete failed');
  }

  private static merge(target: Record<string, unknown>, patch: Record<string, unknown>, fill: boolean): void {
    for (const [key, value] of Object.entries(patch)) {
      const previous = Object.hasOwn(target, key) ? target[key] : undefined;
      if (RepairState.object(value) && RepairState.object(previous)) RepairState.merge(previous, value, fill);
      else if (!fill || previous === undefined) Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
    }
  }
}

export default RepairState;
