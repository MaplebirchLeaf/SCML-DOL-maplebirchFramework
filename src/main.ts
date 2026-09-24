// ./src/main.ts

export { default, type MaplebirchCore, type FrameworkHost, type FrameworkInfra, type FrameworkServices, type CoreEvents, type Extensions } from './core';
export { Save, type SaveObject } from './host/SugarCube';
export { default as AddonPlugin, type AddonServices, type BootTask, type BootHandler } from './services/AddonPlugin';
export { default as Resources } from './host/Resources';
export { default as Logger, type LogLevel } from './infra/Logger';
export { default as Diagnostics, type DiagnosticRecord, type PatchResult, type ModRequirement, type ModConflict } from './infra/Diagnostics';
export { default as Catalog } from './infra/Catalog';
export { default as Hooks, type HookCallback } from './infra/Hooks';
export { default as Lifecycle, type LifecyclePhase, type LifecycleTarget, type LifecycleResult } from './infra/Lifecycle';
export { default as Emitter, type EventCallback } from './infra/Emitter';
export { default as Modules, type Module, type ModulesMeta, type DependencyInfo, type DependencyGraph } from './services/Modules';
export { default as IndexedDB } from './services/IndexedDB';
export { default as Translator, type Translation } from './services/Translator';
export { default as GUIControl } from './services/GUIControl';
export { default as CredentialVault } from './services/CredentialVault';
export { default as CloudSave, type CloudSaveConfig, type CloudSaveRecord, type CloudSaveRemoteItem, type CloudSaveRemoteCode } from './services/CloudSave';
export { default as SugarCube } from './host/SugarCube';
export { default as ModLoader } from './host/ModLoader';
export { default as Dynamic } from './modules/Dynamic';
export { StateManager, type StateEventOptions } from './modules/State';
export { default as ToolCollection } from './modules/ToolCollection';
export * as utils from './utils';
