type TextItem = string | number | boolean | null | undefined;

class TextStore {
  private readonly items: TextItem[] = [];

  public push(...items: TextItem[]): void {
    for (const item of items) if (!this.items.includes(item)) this.items.push(item);
  }

  public get play(): string {
    return this.items.map(item => (item == null ? '' : String(item))).join('');
  }
}

export default TextStore;
