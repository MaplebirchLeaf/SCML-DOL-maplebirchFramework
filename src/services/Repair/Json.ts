// ./src/services/Repair/Json.ts

// 由框架早期入口导入，先于 SugarCube 替换 JSON.parse。
export class NativeJSON {
  private static readonly PARSE = JSON.parse.bind(JSON);
  private static readonly STRINGIFY = JSON.stringify.bind(JSON);

  static parse(source: string): unknown {
    return NativeJSON.PARSE(source);
  }

  static stringify(value: unknown): string {
    const parents = new Set<object>();
    const detach = (item: unknown): unknown => {
      if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
      if (typeof item === 'number' && Number.isFinite(item)) return item;
      if (typeof item !== 'object') throw new Error('Repair data must contain JSON values');
      if (parents.has(item)) throw new Error('Circular repair data');
      const array = Array.isArray(item);
      if (!array && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new Error('Repair data must contain plain objects');
      parents.add(item);
      const output: Record<string, unknown> = array ? Object.setPrototypeOf(Array.from({ length: (item as unknown[]).length }), null) : Object.create(null);
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
        if (!descriptor.enumerable) continue;
        if (!Object.hasOwn(descriptor, 'value')) throw new Error('Repair data cannot contain accessors');
        // 与原生 JSON.stringify 一致，省略值为 undefined 的可选对象字段。
        if (descriptor.value === undefined && !array) continue;
        output[key] = array && descriptor.value === undefined ? null : detach(descriptor.value);
      }
      parents.delete(item);
      return output;
    };
    return NativeJSON.STRINGIFY(detach(value));
  }
}
