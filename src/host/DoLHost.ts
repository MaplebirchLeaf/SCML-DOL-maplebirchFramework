export type DoLVariables = typeof V;
export type DoLTemporary = typeof T;
export type DoLCharacters = typeof C;
export type DoLSetup = typeof setup;
export type DoLRenderer = typeof Renderer;

export interface DoLHost {
  readonly variables: DoLVariables;
  readonly temporary: DoLTemporary;
  readonly characters: DoLCharacters;
  readonly setup: DoLSetup;
  readonly renderer: DoLRenderer;
  has(name: DoLGlobalName): boolean;
}

export type DoLGlobalName = 'variables' | 'temporary' | 'characters' | 'setup' | 'renderer';
