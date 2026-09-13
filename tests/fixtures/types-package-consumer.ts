import type framework from '../../packages/types';

const api: typeof framework = maplebirch;
const copy = clone({ enabled: true });

api.log('types package loaded', 'INFO');
copy.enabled satisfies boolean;
window.maplebirch satisfies typeof framework;

const history = api.SugarCube.State.history;
history satisfies readonly { readonly title: string; readonly variables: Record<string, unknown> }[];
history satisfies 0 extends 1 & typeof history ? never : typeof history;
