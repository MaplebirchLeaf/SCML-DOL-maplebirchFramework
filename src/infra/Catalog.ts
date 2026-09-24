// ./src/infra/Catalog.ts

import type ModLoader from '../host/ModLoader';
import Diagnostics from './Diagnostics';

export class Catalog<Key, Value> extends Diagnostics {
  protected readonly items = new Map<Key, Value>();

  public constructor(modloader?: ModLoader, entries: Iterable<readonly [Key, Value]> = []) {
    super(modloader);
    for (const [key, value] of entries) this.items.set(key, value);
  }

  public add(key: Key, value: Value): boolean {
    if (this.items.has(key)) return false;
    this.items.set(key, value);
    return true;
  }

  public remove(key: Key): boolean {
    return this.items.delete(key);
  }

  public get(key: Key): Value | undefined {
    return this.items.get(key);
  }

  public has(key: Key): boolean {
    return this.items.has(key);
  }

  public list(): Value[] {
    return [...this.items.values()];
  }

  public clear(): void {
    this.items.clear();
  }

  public get entries(): ReadonlyMap<Key, Value> {
    return this.items;
  }
}

export default Catalog;
