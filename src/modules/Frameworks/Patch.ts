import Catalog from '../../infra/Catalog';

export type PatchPhase = 'init' | 'state';

export interface WidgetPatch {
  before?: (text: string) => string;
  after?: (node: DocumentFragment) => void;
}

export interface PatchDefinition<T extends object = object, Flat extends object = T> {
  api: T;
  legacy?: Flat;
  available?: () => boolean;
  init?: () => void;
  state?: () => void;
  widgets?: Readonly<Record<string, WidgetPatch>>;
}

class Patch<Extensions extends Record<string, object> = Record<never, never>> {
  private readonly definitions = new Catalog<string, PatchDefinition>();

  public constructor(private readonly report: (name: string, error: unknown) => void) {}

  public add<T extends object, Flat extends object = T>(name: string, definition: PatchDefinition<T, Flat>): this & Flat {
    if (!name.trim() || this.definitions.has(name)) {
      const error = new Error(`Patch already registered or invalid: ${name}`);
      this.report(name, error);
      throw error;
    }
    const widgets = Object.fromEntries(Object.entries(definition.widgets ?? {}).map(([widget, hooks]) => [widget, { ...hooks }]));
    this.definitions.add(name, { ...definition, widgets });
    if (!(name in this)) Object.defineProperty(this, name, { configurable: false, enumerable: true, get: () => definition.api });
    const flat = (definition.legacy ?? definition.api) as Flat;
    for (const key of Object.keys(flat) as Array<keyof Flat & string>) {
      if (key in this) continue;
      Object.defineProperty(this, key, {
        configurable: false,
        enumerable: true,
        get: () => flat[key],
        set: value => {
          Reflect.set(flat, key, value);
        }
      });
    }
    return this as this & Flat;
  }

  public get<Name extends keyof Extensions>(name: Name): Extensions[Name] | undefined;
  public get<T extends object = object>(name: string): T | undefined;
  public get<T extends object = object>(name: string): T | undefined {
    return this.definitions.get(name)?.api as T | undefined;
  }

  public require<Name extends keyof Extensions>(name: Name): Extensions[Name];
  public require<T extends object = object>(name: string): T;
  public require<T extends object = object>(name: string): T {
    const extension = this.definitions.get(name)?.api;
    if (!extension) throw new Error(`Patch extension is not registered: ${name}`);
    return extension as T;
  }

  public has(name: string): boolean {
    return this.definitions.has(name);
  }

  public names(): string[] {
    return [...this.definitions.entries.keys()];
  }

  public beforeWidget(widget: string, text: string): string {
    for (const [name, definition] of this.definitions.entries) {
      const callback = this.widget(definition, widget)?.before;
      if (callback && this.available(name, definition)) this.run(name, () => (text = callback(text)));
    }
    return text;
  }

  public afterWidget(widget: string, node: DocumentFragment): void {
    for (const [name, definition] of this.definitions.entries) {
      const callback = this.widget(definition, widget)?.after;
      if (callback && this.available(name, definition)) this.run(name, () => callback(node));
    }
  }

  private widget(definition: PatchDefinition, name: string): WidgetPatch | undefined {
    return definition.widgets && Object.hasOwn(definition.widgets, name) ? definition.widgets[name] : undefined;
  }

  private available(name: string, definition: PatchDefinition): boolean {
    const check = definition.available;
    if (!check) return true;
    let available = false;
    this.run(name, () => (available = check()));
    return available;
  }

  private run(name: string, callback: () => void): void {
    try {
      callback();
    } catch (error) {
      this.report(name, error);
    }
  }

  public apply(phase: PatchPhase): void {
    for (const [name, definition] of this.definitions.entries) {
      const callback = definition[phase];
      if (callback && this.available(name, definition)) this.run(name, callback);
    }
  }
}

export default Patch;
