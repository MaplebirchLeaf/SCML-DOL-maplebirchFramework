import instance, * as types from './maplebirch';

type Utils = typeof types.utils;

declare global {
  const maplebirch: typeof instance;
  const clone: Utils['clone'];
  const merge: Utils['merge'];
  const equal: Utils['equal'];
  const contains: Utils['contains'];
  const SelectCase: Utils['SelectCase'];
  const random: Utils['random'];
  const either: Utils['either'];
  const convert: Utils['convert'];
  const number: Utils['number'];
  const loadImage: Utils['loadImage'];

  interface Window extends Readonly<Utils> {
    readonly maplebirch: typeof instance;
  }
}

export default instance;
export * from './maplebirch';
