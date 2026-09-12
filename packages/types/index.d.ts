import instance, * as types from './maplebirch';

type Utils = typeof types.utils.publicUtils;

declare global {
  const maplebirch: typeof instance;
  function clone(...args: Parameters<Utils['clone']>): ReturnType<Utils['clone']>;
  const equal: Utils['equal'];
  const merge: Utils['merge'];
  const append: Utils['append'];
  const cover: Utils['cover'];
  const mergefn: Utils['mergefn'];
  const appendfn: Utils['appendfn'];
  const coverfn: Utils['coverfn'];
  const contains: Utils['contains'];
  function random(...args: Parameters<Utils['random']>): ReturnType<Utils['random']>;
  function either(...args: Parameters<Utils['either']>): ReturnType<Utils['either']>;
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
