import maplebirchDefault, * as maplebirchTypes from './maplebirch';

declare global {
  const maplebirch: typeof maplebirchDefault;
  const clone: typeof maplebirchTypes.clone;
  const merge: typeof maplebirchTypes.merge;
  const equal: typeof maplebirchTypes.equal;
  const contains: typeof maplebirchTypes.contains;
  const SelectCase: typeof maplebirchTypes.SelectCase;
  const random: typeof maplebirchTypes.random;
  const either: typeof maplebirchTypes.either;
  const convert: typeof maplebirchTypes.convert;
  const number: typeof maplebirchTypes.number;
  const loadImage: typeof maplebirchTypes.loadImage;

  interface Window {
    readonly maplebirch: typeof maplebirchDefault;
    readonly clone: typeof maplebirchTypes.clone;
    readonly merge: typeof maplebirchTypes.merge;
    readonly equal: typeof maplebirchTypes.equal;
    readonly contains: typeof maplebirchTypes.contains;
    readonly SelectCase: typeof maplebirchTypes.SelectCase;
    readonly random: typeof maplebirchTypes.random;
    readonly either: typeof maplebirchTypes.either;
    readonly convert: typeof maplebirchTypes.convert;
    readonly number: typeof maplebirchTypes.number;
    readonly loadImage: typeof maplebirchTypes.loadImage;
  }
}

export default maplebirchDefault;
export * from './maplebirch';
