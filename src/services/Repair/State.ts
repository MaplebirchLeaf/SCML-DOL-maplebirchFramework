// ./src/services/Repair/State.ts

import Catalog from '../../infra/Catalog';
import Diagnostics from '../../infra/Diagnostics';
import { NativeJSON } from './Json';

export type JSONValue = null | string | number | boolean | JSONValue[] | { [key: string]: JSONValue };
export interface RepairStateSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, RepairStateSchema>;
  required?: string[];
  items?: RepairStateSchema;
  enum?: JSONValue[];
}
export interface RepairStatePolicy {
  modName: string;
  path: string[];
  schema: RepairStateSchema;
  scope: 'mod' | 'game' | 'vanilla';
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

export class RepairState extends Catalog<string, RepairStatePolicy> {
  private static readonly MAX = 16384;
  private static readonly DEPTH = 32;
  private static readonly unsafe = new Set(['__proto__', 'prototype', 'constructor', 'V', 'T', 'C', 'setup', 'window', 'globalThis', 'State', 'Story', 'Renderer']);

  public register(policy: RepairStatePolicy): boolean {
    try {
      const trusted = RepairState.policy(policy);
      const freeze = (value: object): void => {
        for (const nested of Object.values(value)) if (nested && typeof nested === 'object') freeze(nested);
        Object.freeze(value);
      };
      freeze(trusted);
      return super.add(NativeJSON.stringify(trusted.path), trusted);
    } catch (error) {
      this.write(`State policy registration rejected: ${Diagnostics.message(error)}`, 'WARN', 'repair', error);
      return false;
    }
  }

  /** 权限只由宿主注册，模型不能扩大路径或改写 schema。 */
  public static policy(value: unknown): RepairStatePolicy {
    const policy = RepairState.detach(value) as unknown as RepairStatePolicy;
    RepairState.keys(policy, ['modName', 'path', 'schema', 'scope']);
    if (typeof policy.modName !== 'string' || !policy.modName.trim() || policy.modName.length > 128 || !['mod', 'game', 'vanilla'].includes(policy.scope)) throw new Error('Invalid state policy');
    RepairState.path(policy.path);
    if (policy.scope !== 'mod' && policy.path.length < 2) throw new Error('Game state requires an explicit nested path');
    RepairState.schema(policy.schema);
    return policy;
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
        if (policy.scope === 'mod' && path.length === 1 && (path !== change.path || !['merge', 'fill'].includes(change.type))) throw new Error('Cannot replace a complete mod root');
      }
      if (policy.scope !== 'mod' && !['set', 'fill'].includes(change.type)) throw new Error('Game state permits only set and fill');
      const relative = change.path.slice(policy.path.length);
      if (!relative.length && change.type === 'delete') throw new Error('Cannot delete the policy root');
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
      } else if (change.to) {
        if (!slot.descriptor || RepairState.inside(change.path, change.to) || RepairState.inside(change.to, change.path)) throw new Error('Invalid state move');
        const destination = RepairState.slot(state, ['value', ...change.to.slice(policy.path.length)], true);
        if (destination.descriptor) throw new Error('State destination already exists');
        RepairState.put(destination, RepairState.detach(current));
        if (change.type === 'rename') RepairState.remove(slot);
      } else {
        const schema = relative.reduce<RepairStateSchema | undefined>(
          (schema, segment) => (schema?.type === 'array' ? schema.items : schema?.properties && Object.hasOwn(schema.properties, segment) ? schema.properties[segment] : undefined),
          policy.schema
        );
        if (!schema) throw new Error('Unknown state field');
        if (change.type === 'fill' && !RepairState.object(change.value)) {
          if (policy.scope === 'mod' && change.path.length === 1) throw new Error('Cannot replace a complete mod root');
          if (current === undefined) RepairState.put(slot, change.value);
        } else {
          if (schema.type !== 'object' || !RepairState.object(change.value)) throw new Error('State merge requires an object schema and value');
          const next = current === undefined ? {} : current;
          if (!RepairState.object(next)) throw new Error('State merge requires an object');
          RepairState.merge(next, change.value, schema, change.type === 'fill');
          RepairState.put(slot, next);
        }
      }
    }
    if (state.exists) RepairState.check(state.value, policy.schema);
    return RepairState.encode(state);
  }

  /** 只读自身数据属性，不执行 getter，也不访问授权树外的数据。 */
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
    const before = RepairState.envelope(RepairState.read(policy.path, root));
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
        if (next.exists) RepairState.check(next.value, policy.schema);
        else if (before.exists) throw new Error('Cannot delete the policy root');
        try {
          const slot = RepairState.slot(root, policy.path, next.exists, snapshots);
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
        // 跨存档切换后，等值的新对象也不能视为本次写入的槽。
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
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || !value.length || value.length > RepairState.DEPTH) throw new Error('Invalid state path');
    if (Reflect.ownKeys(value).some(key => key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) throw new Error('Invalid state path fields');
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
        throw new Error('Invalid state path');
    }
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

  private static schema(schema: RepairStateSchema): void {
    if (!schema || !['object', 'array', 'string', 'number', 'boolean', 'null'].includes(schema.type)) throw new Error('Invalid state schema type');
    RepairState.keys(schema, ['type'], ['enum', ...(schema.type === 'object' ? ['properties', 'required'] : schema.type === 'array' ? ['items'] : [])]);
    if (schema.type === 'object') {
      if (schema.properties !== undefined && !RepairState.object(schema.properties)) throw new Error('Invalid state schema properties');
      for (const child of Object.values(schema.properties ?? {})) RepairState.schema(child);
      if (
        schema.required !== undefined &&
        (!Array.isArray(schema.required) ||
          new Set(schema.required).size !== schema.required.length ||
          schema.required.some(key => typeof key !== 'string' || !Object.hasOwn(schema.properties ?? {}, key)))
      )
        throw new Error('Invalid required state fields');
    }
    if (schema.type === 'array') RepairState.schema(schema.items!);
    if (schema.enum !== undefined) {
      if (!Array.isArray(schema.enum) || !schema.enum.length) throw new Error('Invalid state enum');
      for (const item of schema.enum) RepairState.check(item, { ...schema, enum: undefined });
    }
  }

  private static equal(left: unknown, right: unknown): boolean {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => Object.hasOwn(right, key) && RepairState.equal(Reflect.get(left, key), Reflect.get(right, key)));
  }

  private static check(value: unknown, schema: RepairStateSchema): void {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (type !== schema.type || (schema.enum && !schema.enum.some(item => RepairState.equal(item, value)))) throw new Error('State value does not match its schema');
    if (schema.type === 'object') {
      const record = value as Record<string, unknown>;
      if (schema.required?.some(key => !Object.hasOwn(record, key))) throw new Error('Required state field is missing');
      for (const [key, item] of Object.entries(record)) {
        const child = schema.properties && Object.hasOwn(schema.properties, key) ? schema.properties[key] : undefined;
        if (!child) throw new Error('Unknown state field');
        RepairState.check(item, child);
      }
    } else if (schema.type === 'array') for (const item of value as unknown[]) RepairState.check(item, schema.items!);
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

  private static merge(target: Record<string, unknown>, patch: Record<string, unknown>, schema: RepairStateSchema, fill: boolean): void {
    for (const [key, value] of Object.entries(patch)) {
      const child = schema.properties && Object.hasOwn(schema.properties, key) ? schema.properties[key] : undefined;
      if (!child) throw new Error('Unknown state merge field');
      const previous = Object.hasOwn(target, key) ? target[key] : undefined;
      if (RepairState.object(value) && RepairState.object(previous)) RepairState.merge(previous, value, child, fill);
      else if (!fill || previous === undefined) Object.defineProperty(target, key, { value, writable: true, enumerable: true, configurable: true });
    }
  }
}

export default RepairState;
