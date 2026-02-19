// types/twine-sugarcube.d.ts

/// <reference types='twine-sugarcube' />
/// <reference types='@scml/sc2-verlnir' />

declare module 'twine-sugarcube' {
  export interface WikifierAPI {
    wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
  }

  export interface SugarCubeSetupObject {
    [x: string]: any;
  }

  export interface MacroDefinition {
    isAsync?: boolean;
    isWidget?: boolean;
  }

  export interface JQueryAriaClickOptions {
    role?: string;
  }
}

declare global {
  const C: { [x: string]: any; };
  const T: { [x: string]: any; };
  const V: { [x: string]: any; };
}

export type TwineSugarCube = typeof window.SugarCube & {
  Wikifier: import('twine-sugarcube').WikifierAPI;
};