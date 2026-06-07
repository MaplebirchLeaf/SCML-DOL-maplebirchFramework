import instance, * as types from './maplebirch';

type Utils = typeof types.utils.publicUtils;

declare global {
  const maplebirch: typeof instance;
  const clone: Utils['clone'];
  const equal: Utils['equal'];
  const merge: Utils['merge'];
  const append: Utils['append'];
  const cover: Utils['cover'];
  const mergefn: Utils['mergefn'];
  const appendfn: Utils['appendfn'];
  const coverfn: Utils['coverfn'];
  const contains: Utils['contains'];
  const random: Utils['random'];
  const either: Utils['either'];
  const SelectCase: Utils['SelectCase'];
  const convert: Utils['convert'];
  const clamp: Utils['clamp'];
  const loadImage: Utils['loadImage'];

  interface Window extends Readonly<Utils> {
    readonly maplebirch: typeof instance;
  }
}

export default instance;
export * from './maplebirch';
