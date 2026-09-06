// ./src/utils/selector.ts

import _ from './shared';

interface CaseItem {
  type: string;
  condition: any;
  result: any;
}

export class SelectCase {
  private cases: CaseItem[] = [];

  private defaultResult: any = null;

  private valueType: string | null = null;

  private allowMixedTypes = false;

  public case(condition: string | number, result: any): this;

  public case(condition: (input: any, meta?: any) => boolean, result: any): this;

  public case(condition: any, result: any): this {
    if (typeof condition === 'function') {
      this.allowMixedTypes = true;

      this.cases.push({
        type: 'predicate',
        condition,
        result
      });
    } else {
      this.validateType(condition);

      this.cases.push({
        type: 'exact',
        condition,
        result
      });
    }

    return this;
  }

  public casePredicate(fn: (input: any, meta?: any) => boolean, result: any): this {
    if (typeof fn !== 'function') throw new TypeError('predicate must be a function');

    this.allowMixedTypes = true;

    this.cases.push({
      type: 'predicate',
      condition: fn,
      result
    });

    return this;
  }

  public caseRange(min: number, max: number, result: any): this {
    if (typeof min !== 'number' || typeof max !== 'number') throw new TypeError('range values must be numbers');

    this.validateType(min);

    this.cases.push({
      type: 'range',
      condition: [min, max],
      result
    });

    return this;
  }

  public caseIn(values: any[], result: any): this {
    if (!Array.isArray(values)) throw new TypeError('set values must be an array');

    if (values.length === 0) return this;

    this.validateType(values[0]);

    this.cases.push({
      type: 'set',
      condition: values,
      result
    });

    return this;
  }

  public caseIncludes(values: string | string[], result: any): this {
    const includes = Array.isArray(values) ? values : [values];

    includes.forEach(value => {
      if (typeof value !== 'string') throw new TypeError('substrings must be strings');
    });

    this.validateType('string');

    this.cases.push({
      type: 'substring',
      condition: includes,
      result
    });

    return this;
  }

  public caseRegex(regex: RegExp, result: any): this {
    if (!(regex instanceof RegExp)) throw new TypeError('condition must be a RegExp');

    this.validateType('string');

    this.cases.push({
      type: 'regex',
      condition: regex,
      result
    });

    return this;
  }

  public caseCompare(operator: '<' | '<=' | '>' | '>=', value: number, result: any): this {
    if (!['<', '<=', '>', '>='].includes(operator)) throw new Error(`Invalid comparator: ${operator}`);

    if (typeof value !== 'number') throw new TypeError('comparison value must be a number');

    this.validateType(value);

    this.cases.push({
      type: 'comparison',
      condition: {
        comparator: operator,
        value
      },
      result
    });

    return this;
  }

  public else(result: any): this {
    this.defaultResult = result;
    return this;
  }

  public match(input: any, meta: any = {}): any {
    for (const { type, condition, result } of this.cases) {
      let matched = false;

      switch (type) {
        case 'exact':
          matched = input === condition;

          break;

        case 'range':
          matched = input >= condition[0] && input <= condition[1];

          break;

        case 'set':
          matched = _.includes(condition, input);

          break;

        case 'substring':
          matched = typeof input === 'string' && _.some(condition, (value: string) => _.includes(input, value));

          break;

        case 'regex':
          matched = typeof input === 'string' && condition.test(input);

          break;

        case 'comparison':
          {
            const { comparator, value } = condition;

            switch (comparator) {
              case '<':
                matched = input < value;

                break;

              case '<=':
                matched = input <= value;

                break;

              case '>':
                matched = input > value;

                break;

              case '>=':
                matched = input >= value;

                break;
            }
          }

          break;

        case 'predicate':
          try {
            matched = condition(input, meta);
          } catch (error: any) {
            console.error(`SelectCase predicate error: ${_.get(error, 'message', '未知错误')}`);
          }

          break;
      }

      if (matched) return typeof result === 'function' ? result(input, meta) : result;
    }

    return typeof this.defaultResult === 'function' ? this.defaultResult(input, meta) : this.defaultResult;
  }

  private validateType(value: any): void {
    if (this.allowMixedTypes) return;

    const valueType = typeof value;
    if (this.valueType === null) {
      this.valueType = valueType;
      return;
    }

    if (this.valueType !== valueType) throw new TypeError(`Cannot mix ${this.valueType} and ${valueType} type conditions`);
  }
}
