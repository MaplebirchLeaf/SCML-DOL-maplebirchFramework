import './modules/DoL';
import './compat/SimpleFrameworks';
import './compat/Prototype';

export { default } from './main';
export * from './main';
export { default as dol, DoL, type DoLHost, type DoLGlobalScope } from './host/DoL';
export type { CoreModules } from './modules/DoL/types';
export { default as DoLDynamic } from './modules/DoL/Dynamic';
export { default as DoLToolCollection } from './modules/DoL/ToolCollection';
export { default as ImageLoader } from './modules/Frameworks/ImageLoader';
