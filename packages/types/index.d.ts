import instance, * as types from './maplebirch';

type Utils = typeof types.utils.publicUtils;

declare global {
  const maplebirch: typeof instance;
  function clone<T>(...args: Parameters<typeof types.utils.clone<T>>): ReturnType<typeof types.utils.clone<T>>;
  const equal: Utils['equal'];
  const merge: Utils['merge'];
  const append: Utils['append'];
  const cover: Utils['cover'];
  const mergefn: Utils['mergefn'];
  const appendfn: Utils['appendfn'];
  const coverfn: Utils['coverfn'];
  const contains: Utils['contains'];
  function random(...args: Parameters<Utils['random']>): ReturnType<Utils['random']>;
  function either<T>(...args: Parameters<typeof types.utils.either<T>>): ReturnType<typeof types.utils.either<T>>;
  const SelectCase: Utils['SelectCase'];
  const convert: Utils['convert'];
  const clamp: Utils['clamp'];
  const loadImage: typeof types.ImageLoader.load;

  interface Window extends Readonly<Utils> {
    readonly maplebirch: typeof instance;
    readonly loadImage: typeof types.ImageLoader.load;
  }
}

export default instance;
export * from './maplebirch';
