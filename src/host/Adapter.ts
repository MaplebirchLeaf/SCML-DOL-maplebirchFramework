import type { DoLCharacters, DoLGlobalName, DoLHost, DoLRenderer, DoLSetup, DoLTemporary, DoLVariables } from './DoLHost';

interface DoLGlobalScope {
  V?: DoLVariables;
  T?: DoLTemporary;
  C?: DoLCharacters;
  setup?: DoLSetup;
  Renderer?: DoLRenderer;
}

export class Adapter implements DoLHost {
  public constructor(private readonly scope: DoLGlobalScope = globalThis as DoLGlobalScope) {}

  public get variables(): DoLVariables {
    return this.require(this.scope.V, 'variables');
  }

  public get temporary(): DoLTemporary {
    return this.require(this.scope.T, 'temporary');
  }

  public get characters(): DoLCharacters {
    return this.require(this.scope.C, 'characters');
  }

  public get setup(): DoLSetup {
    return this.require(this.scope.setup, 'setup');
  }

  public get renderer(): DoLRenderer {
    return this.require(this.scope.Renderer, 'renderer');
  }

  public has(name: DoLGlobalName): boolean {
    if (name === 'variables') return this.scope.V != null;
    if (name === 'temporary') return this.scope.T != null;
    if (name === 'characters') return this.scope.C != null;
    if (name === 'setup') return this.scope.setup != null;
    return this.scope.Renderer != null;
  }

  private require<Value>(value: Value | null | undefined, name: DoLGlobalName): Value {
    if (value == null) throw new Error(`DoL host is not ready: ${name}`);
    return value;
  }
}

const dol = Object.freeze(new Adapter());

export default dol;
