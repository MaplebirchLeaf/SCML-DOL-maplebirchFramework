import type framework from '../../packages/types';

const api: typeof framework = maplebirch;
const copy = clone({ enabled: true });

api.log('types package loaded', 'INFO');
copy.enabled satisfies boolean;
window.maplebirch satisfies typeof framework;
