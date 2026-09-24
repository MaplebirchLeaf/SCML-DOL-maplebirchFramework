// ./src/host/DoL.ts

export type DoLVariables = typeof V;
export type DoLTemporary = typeof T;
export type DoLCharacters = typeof C;
export type DoLSetup = typeof setup;
export type DoLRenderer = typeof Renderer;

export type DoLGlobalName = 'V' | 'T' | 'C' | 'setup' | 'Renderer' | 'variables' | 'temporary' | 'characters' | 'renderer';

export interface DoLHost {
  readonly V: DoLVariables;
  readonly T: DoLTemporary;
  readonly C: DoLCharacters;
  readonly setup: DoLSetup;
  readonly Renderer: DoLRenderer;
  readonly variables: DoLVariables;
  readonly temporary: DoLTemporary;
  readonly characters: DoLCharacters;
  readonly renderer: DoLRenderer;
  readonly gameVersion: string;
  has(name: DoLGlobalName): boolean;
}

export interface DoLGlobalScope {
  V?: DoLVariables;
  T?: DoLTemporary;
  C?: DoLCharacters;
  setup?: DoLSetup;
  Renderer?: DoLRenderer;
}

export class DoL implements DoLHost {
  public constructor(private readonly scope: DoLGlobalScope = globalThis as DoLGlobalScope) {}

  public get V(): DoLVariables {
    return this.require(this.scope.V, 'V');
  }

  public get T(): DoLTemporary {
    return this.require(this.scope.T, 'T');
  }

  public get C(): DoLCharacters {
    return this.require(this.scope.C, 'C');
  }

  public get setup(): DoLSetup {
    return this.require(this.scope.setup, 'setup');
  }

  public get Renderer(): DoLRenderer {
    return this.require(this.scope.Renderer, 'Renderer');
  }

  public get variables(): DoLVariables {
    return this.V;
  }

  public get temporary(): DoLTemporary {
    return this.T;
  }

  public get characters(): DoLCharacters {
    return this.C;
  }

  public get renderer(): DoLRenderer {
    return this.Renderer;
  }

  public get gameVersion(): string {
    return StartConfig.version;
  }

  public has(name: DoLGlobalName): boolean {
    if (name === 'V' || name === 'variables') return this.scope.V != null;
    if (name === 'T' || name === 'temporary') return this.scope.T != null;
    if (name === 'C' || name === 'characters') return this.scope.C != null;
    if (name === 'setup') return this.scope.setup != null;
    return this.scope.Renderer != null;
  }

  private require<Value>(value: Value | null | undefined, name: 'V' | 'T' | 'C' | 'setup' | 'Renderer'): Value {
    if (value == null) throw new Error(`DoL host is not ready: ${name}`);
    return value;
  }
}

const dol = new DoL();
Object.freeze(dol);

export default dol;
