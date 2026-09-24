// ./src/utils/selector.ts

import Diagnostics from '../infra/Diagnostics';

type Comparator = '<' | '<=' | '>' | '>=';
type ResultValue<Input, Result, Meta> = Result | ((input: Input, meta: Meta) => Result);
type Condition<Input, Meta> =
  | { type: 'exact'; condition: string | number }
  | { type: 'predicate'; condition: (input: Input, meta: Meta) => boolean }
  | { type: 'range'; condition: [number, number] }
  | { type: 'set'; condition: readonly (string | number)[] }
  | { type: 'substring'; condition: readonly string[] }
  | { type: 'regex'; condition: RegExp }
  | { type: 'comparison'; condition: { comparator: Comparator; value: number } };

export class SelectCase<Input = unknown, Result = unknown, Meta = Record<string, unknown>> {
  private readonly cases: Array<Condition<Input, Meta> & { result: ResultValue<Input, Result, Meta> }> = [];
  private defaultResult: ResultValue<Input, Result, Meta> | null = null;
  private valueType: string | null = null;
  private allowMixedTypes = false;

  public case(condition: string | number | ((input: Input, meta: Meta) => boolean), result: ResultValue<Input, Result, Meta>): this {
    if (typeof condition === 'function') return this.casePredicate(condition, result);
    this.validateType(condition);
    this.cases.push({ type: 'exact', condition, result });
    return this;
  }

  public casePredicate(fn: (input: Input, meta: Meta) => boolean, result: ResultValue<Input, Result, Meta>): this {
    if (typeof fn !== 'function') throw new TypeError('predicate must be a function');
    this.allowMixedTypes = true;
    this.cases.push({ type: 'predicate', condition: fn, result });
    return this;
  }

  public caseRange(min: number, max: number, result: ResultValue<Input, Result, Meta>): this {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new TypeError('range must have finite, ordered bounds');
    this.validateType(min);
    this.cases.push({ type: 'range', condition: [min, max], result });
    return this;
  }

  public caseIn(values: readonly (string | number)[], result: ResultValue<Input, Result, Meta>): this {
    if (!Array.isArray(values)) throw new TypeError('set values must be an array');
    for (const value of values) this.validateType(value);
    if (values.length) this.cases.push({ type: 'set', condition: [...values], result });
    return this;
  }

  public caseIncludes(values: string | readonly string[], result: ResultValue<Input, Result, Meta>): this {
    const includes = typeof values === 'string' ? [values] : [...values];
    if (includes.some(value => typeof value !== 'string')) throw new TypeError('substrings must be strings');
    this.validateType('string');
    this.cases.push({ type: 'substring', condition: includes, result });
    return this;
  }

  public caseRegex(regex: RegExp, result: ResultValue<Input, Result, Meta>): this {
    if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');
    this.validateType('string');
    this.cases.push({ type: 'regex', condition: regex, result });
    return this;
  }

  public caseCompare(operator: Comparator, value: number, result: ResultValue<Input, Result, Meta>): this {
    if (!['<', '<=', '>', '>='].includes(operator)) throw new Error(`Invalid comparator: ${operator}`);
    if (!Number.isFinite(value)) throw new TypeError('comparison value must be finite');
    this.validateType(value);
    this.cases.push({ type: 'comparison', condition: { comparator: operator, value }, result });
    return this;
  }

  public else(result: ResultValue<Input, Result, Meta>): this {
    this.defaultResult = result;
    return this;
  }

  public match(input: Input, meta: Meta = {} as Meta): Result | null {
    for (const item of this.cases) {
      let matched = false;
      switch (item.type) {
        case 'exact':
          matched = input === item.condition;
          break;
        case 'range':
          matched = typeof input === 'number' && input >= item.condition[0] && input <= item.condition[1];
          break;
        case 'set':
          matched = item.condition.some(value => value === input);
          break;
        case 'substring':
          matched = typeof input === 'string' && item.condition.some(value => input.includes(value));
          break;
        case 'regex':
          matched = typeof input === 'string' && new RegExp(item.condition.source, item.condition.flags).test(input);
          break;
        case 'comparison': {
          if (typeof input !== 'number') break;
          const { comparator, value } = item.condition;
          if (comparator === '<') matched = input < value;
          else if (comparator === '<=') matched = input <= value;
          else if (comparator === '>') matched = input > value;
          else matched = input >= value;
          break;
        }
        case 'predicate':
          try {
            matched = item.condition(input, meta);
          } catch (error) {
            console.error(`SelectCase predicate error: ${Diagnostics.message(error)}`);
          }
          break;
      }
      if (matched) return this.resolve(item.result, input, meta);
    }
    return this.resolve(this.defaultResult, input, meta);
  }

  private resolve(result: ResultValue<Input, Result, Meta> | null, input: Input, meta: Meta): Result | null {
    return typeof result === 'function' ? (result as (input: Input, meta: Meta) => Result)(input, meta) : result;
  }

  private validateType(value: unknown): void {
    if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError('condition must be a string or number');
    if (this.allowMixedTypes) return;
    const type = typeof value;
    if (this.valueType === null) this.valueType = type;
    else if (this.valueType !== type) throw new TypeError(`Cannot mix ${this.valueType} and ${type} type conditions`);
  }
}
