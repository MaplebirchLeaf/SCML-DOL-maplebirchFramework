import maplebirchDefault from './maplebirch';

declare global {
  const maplebirch: typeof maplebirchDefault;

  interface Window {
    readonly maplebirch: typeof maplebirchDefault;
  }
}

export default maplebirchDefault;
export * from './maplebirch';
