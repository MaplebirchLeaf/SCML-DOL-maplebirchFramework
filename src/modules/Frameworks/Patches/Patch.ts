export type PatchPhase = 'init' | 'state';

export interface WidgetPatch {
  before?: (text: string) => string;
  after?: (node: DocumentFragment) => void;
}

export interface PatchDefinition<T extends object = object> {
  api: T;
  init?: () => void;
  state?: () => void;
  widgets?: Readonly<Record<string, WidgetPatch>>;
}

export default class Patch {
  private readonly entries = new Map<string, PatchDefinition>();

  public constructor(private readonly report: (name: string, error: unknown) => void) {}

  public add<T extends object>(name: string, definition: PatchDefinition<T>): this & T {
    if (!name.trim() || this.entries.has(name)) throw new Error(`Patch already registered or invalid: ${name}`);
    for (const key of Object.keys(definition.api)) if (key in this) throw new Error(`Patch API already registered: ${key}`);
    const widgets = Object.fromEntries(Object.entries(definition.widgets ?? {}).map(([widget, hooks]) => [widget, { ...hooks }]));
    this.entries.set(name, { ...definition, widgets });
    return Object.assign(this, definition.api);
  }

  public beforeWidget(widget: string, text: string): string {
    for (const [name, definition] of this.entries) {
      const callback = this.widget(definition, widget)?.before;
      if (callback) this.run(name, () => (text = callback(text)));
    }
    return text;
  }

  public afterWidget(widget: string, node: DocumentFragment): void {
    for (const [name, definition] of this.entries) {
      const callback = this.widget(definition, widget)?.after;
      if (callback) this.run(name, () => callback(node));
    }
  }

  private widget(definition: PatchDefinition, name: string): WidgetPatch | undefined {
    return definition.widgets && Object.hasOwn(definition.widgets, name) ? definition.widgets[name] : undefined;
  }

  private run(name: string, callback: () => void): void {
    try {
      callback();
    } catch (error) {
      this.report(name, error);
    }
  }

  public apply(phase: PatchPhase): void {
    for (const [name, definition] of this.entries) {
      const callback = definition[phase];
      if (callback) this.run(name, callback);
    }
  }
}
