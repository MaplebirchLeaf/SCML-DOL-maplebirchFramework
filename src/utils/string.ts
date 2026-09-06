// ./src/utils/string.ts

import _ from './shared';

export type ConvertMode = 'lower' | 'upper' | 'capitalize' | 'title' | 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant';

export function convert(
  value: string,
  mode: ConvertMode = 'lower',
  options: {
    delimiter?: string;
    acronym?: boolean;
  } = {}
): string {
  if (typeof value !== 'string') return value;

  const { delimiter = ' ', acronym = true } = options;

  const splitWords = (source: string): string[] => {
    if (source.includes(delimiter)) {
      return source.split(delimiter);
    }

    return source
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(' ');
  };

  const words = splitWords(value).filter(word => word.length > 0);

  if (words.length === 0) {
    return '';
  }

  switch (mode) {
    case 'upper':
      return _.toUpper(value);

    case 'lower':
      return _.toLower(value);

    case 'capitalize':
      return _.capitalize(_.toLower(value));

    case 'title':
      if (!acronym) {
        return _.startCase(_.toLower(value));
      }

      return words
        .map(word => {
          if (/^[A-Z0-9]+$/.test(word) && word.length > 1) {
            return word;
          }

          return _.upperFirst(_.toLower(word));
        })
        .join(' ');

    case 'camel':
      return _.camelCase(value);

    case 'pascal':
      return _.upperFirst(_.camelCase(value));

    case 'snake':
      return _.snakeCase(value);

    case 'kebab':
      return _.kebabCase(value);

    case 'constant':
      return _.snakeCase(value).toUpperCase();

    default:
      return value;
  }
}

export function escapeHtmlText(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function widgets(content: string): string;
export function widgets(...contents: string[]): string[];
export function widgets(...rawContents: string[]): string | string[] {
  const parse = (content: string): string =>
    String(content ?? '')
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .replace(/^::[^\n]*(?:\n[ \t]*)*/, '')
      .trim();
  const result = rawContents.map(parse);
  return result.length === 1 ? result[0] : result;
}
