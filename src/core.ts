// ./src/core.ts

import type { Passage } from '@scml/types/sugarcube-2-ModLoader/SugarCube2';
import type { TwineSugarCube } from '../types/twine-sugarcube';
import type { SC2DataManager } from '@scml/types/sugarcube-2-ModLoader/SC2DataManager';
import type { WikifyTracerCallback } from '@scml/types/sugarcube-2-ModLoader/WikifyTracer';
import type { Gui } from '@scml/types/Mod_LoaderGui/Gui';
import { author, lastModifiedBy, lastUpdate } from '../package.json';
import * as marked from 'marked';
import jsyaml from 'js-yaml';
import { Howl, Howler } from 'howler';
import { version, Languages } from './constants';
import * as utils from './utils';
import prototype from './compat/Prototype';
import ModLoader from './host/ModLoader';
import SugarCube, { type Save } from './host/SugarCube';
import Diagnostics from './infra/Diagnostics';
import Emitter, { type EventCallback } from './infra/Emitter';
import IndexedDB, { type StoreIndex, type Transaction } from './services/IndexedDB';
import CredentialVault from './services/CredentialVault';
import CloudSave from './services/CloudSave';
import Translator from './services/Translator';
import Modules, { type Module, type DependencyGraph } from './services/Modules';
import GUIControl from './services/GUIControl';
import AddonPlugin from './services/AddonPlugin';

const renderer = new marked.Renderer();
renderer.link = function ({ href, title, tokens }: marked.Tokens.Link) {
  const linkText = this.parser.parseInline(tokens);
  const titleAttribute = title ? ` title="${utils.escapeHtmlText(title)}"` : '';
  return `<a href="${utils.escapeHtmlText(href)}"${titleAttribute} target="_blank" rel="noopener noreferrer">${linkText}</a>`;
};
renderer.heading = function (token: marked.Tokens.Heading) {
  const id = token.text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `<h${token.depth} id="${id}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`;
};
marked.setOptions({ renderer, gfm: true, breaks: true, pedantic: false });

declare global {
  interface MaplebirchExtensions {}
}

interface Extensions extends MaplebirchExtensions {}

interface CoreEvents {
  ':indexedDB': [];
  ':idbReady': [];
  ':import': [];
  ':variable': [];
  ':onSave': [save: Save];
  ':onLoad': [save: Save];
  ':language': [];
  ':storyready': [];
  ':passageinit': [passage: Passage];
  ':passagestart': [passage: Passage, content: HTMLDivElement];
  ':passagerender': [passage: Passage, content: HTMLDivElement];
  ':passagedisplay': [passage: Passage, content: HTMLDivElement];
  ':passageend': [passage: Passage, content: HTMLDivElement];
  ':sugarcube': [];
  ':modLoaderEnd': [];
}

export interface FrameworkHost {
  readonly sugarcube: SugarCube;
  readonly modLoader: ModLoader;
}

export interface FrameworkInfra {
  readonly diagnostics: Diagnostics;
  readonly events: Emitter;
}

export interface FrameworkServices {
  readonly indexedDB: IndexedDB;
  readonly modules: Modules;
  readonly addonPlugin: AddonPlugin;
  readonly translator: Translator;
  readonly credentialVault: CredentialVault;
  readonly cloudSave: CloudSave;
  readonly gui: GUIControl;
}

type MaplebirchCore = InstanceType<typeof MaplebirchCore> & Extensions;

const MaplebirchCore = class MaplebirchCore {
  public static meta = {
    name: 'maplebirch Frameworks' as const,
    author,
    version,
    modifiedby: lastModifiedBy,
    updateDate: lastUpdate,
    Languages,
    core: [] as readonly string[],
    protected: [] as readonly string[]
  };

  public readonly meta = { ...MaplebirchCore.meta };
  public readonly host: Readonly<FrameworkHost>;
  public readonly infra: Readonly<FrameworkInfra>;
  public readonly services: Readonly<FrameworkServices>;

  public readonly utils = utils.publicUtils;
  public readonly yaml = Object.freeze(jsyaml);
  public readonly howler = Object.freeze({ Howl, Howler });

  public constructor(modSC2DataManager: SC2DataManager, modLoaderGui: Gui) {
    prototype();
    for (const [key, value] of Object.entries(utils.publicUtils)) Object.defineProperty(window, key, { value, enumerable: true, writable: false, configurable: true });
    this.host = Object.freeze({ sugarcube: new SugarCube(), modLoader: new ModLoader(modSC2DataManager, modLoaderGui) });
    this.infra = Object.freeze({ diagnostics: Object.seal(this.host.modLoader.diagnostics), events: Object.seal(new Emitter(this.host.modLoader)) });
    const indexedDB = Object.seal(new IndexedDB(this.host.modLoader));
    const modules = Object.seal(new Modules(this as unknown as Record<string, unknown>, this.meta, indexedDB, this.host.modLoader));
    const addonPlugin = Object.seal(
      new AddonPlugin(this.host.modLoader, this.host.sugarcube, this.infra.events, indexedDB, modules, {
        translator: () => this.services.translator,
        gui: () => this.services.gui,
        credential: () => this.services.credentialVault
      })
    );
    const translator = Object.seal(new Translator(indexedDB, this.host.modLoader, this.infra.events, () => this.services.addonPlugin));
    const credentialVault = Object.seal(new CredentialVault(indexedDB, this.host.modLoader, this.infra.events, this.infra.diagnostics, key => this.t(key)));
    const cloudSave = Object.seal(new CloudSave(this.host.sugarcube, key => this.t(key), this.host.modLoader.lodash, this.infra.diagnostics));
    const gui = Object.seal(new GUIControl(indexedDB, this.host.modLoader, this.infra.events, modules, translator, () => this.services.addonPlugin));
    this.services = Object.freeze({ indexedDB, modules, addonPlugin, translator, credentialVault, cloudSave, gui });
    this.log(`框架核心系统创建完成(v${MaplebirchCore.meta.version})`, 'INFO');
  }

  public log(message: string, level: string = 'INFO', ...objects: unknown[]): void {
    this.infra.diagnostics.write(message, level, '', ...objects);
  }

  public get export(): string {
    return this.infra.diagnostics.export();
  }

  public get passage(): Passage {
    return this.host.sugarcube.passage;
  }

  public set passage(passage: Passage) {
    this.host.sugarcube.passage = passage;
  }

  public get SugarCube(): TwineSugarCube {
    return this.host.sugarcube.require();
  }

  public set SugarCube(runtime: TwineSugarCube) {
    this.host.sugarcube.runtime = runtime;
  }

  public get modUtils(): ReturnType<SC2DataManager['getModUtils']> {
    return this.host.modLoader.modUtils;
  }

  public get modLoader(): ReturnType<SC2DataManager['getModLoader']> {
    return this.host.modLoader.modLoader;
  }

  public get lodash(): ModLoader['lodash'] {
    return this.host.modLoader.lodash;
  }

  public get marked(): typeof marked {
    return marked;
  }

  public get Language(): string {
    return this.services.translator.language;
  }

  public set Language(language: string) {
    void this.services.translator.setLanguage(language).then(() => this.trigger(':language'));
  }

  public get LogLevel(): string {
    return this.infra.diagnostics.LevelName;
  }

  public set LogLevel(level: string) {
    this.infra.diagnostics.LevelName = level;
  }

  public get dependencyGraph(): DependencyGraph {
    return this.services.modules.dependencyGraph;
  }

  public on<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
  public on<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
  public on<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description = ''): boolean {
    return this.infra.events.on(eventName, callback, description);
  }

  public off<Args extends unknown[]>(eventName: string, identifier: string | EventCallback<Args>): boolean {
    return this.infra.events.off(eventName, identifier);
  }

  public once<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>, description?: string): boolean;
  public once<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>, description?: string): boolean;
  public once<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>, description = ''): boolean {
    return this.infra.events.once(eventName, callback, description);
  }

  public after<Name extends keyof CoreEvents>(eventName: Name, callback: EventCallback<CoreEvents[Name]>): void;
  public after<Name extends string, Args extends unknown[]>(eventName: Name extends keyof CoreEvents ? never : Name, callback: EventCallback<Args>): void;
  public after<Args extends unknown[]>(eventName: string, callback: EventCallback<Args>): void {
    this.infra.events.after(eventName, callback);
  }

  public trigger<Name extends keyof CoreEvents>(eventName: Name, ...args: CoreEvents[Name]): Promise<void>;
  public trigger<Name extends string>(eventName: Name extends keyof CoreEvents ? never : Name, ...args: unknown[]): Promise<void>;
  public async trigger(eventName: string, ...args: unknown[]): Promise<void> {
    await this.infra.events.trigger(eventName, ...args);
  }

  public define<T extends object>(name: string, module: T & Module, dependencies: string[] = []): boolean {
    return this.services.modules.register(name, module, dependencies);
  }

  public wikify(name: string, callbacks: WikifyTracerCallback): void {
    this.services.addonPlugin.wikify(name, callbacks);
  }

  public idb(name: string, options: IDBObjectStoreParameters = { keyPath: 'id' }, indexes: StoreIndex[] = []): boolean {
    return this.services.indexedDB.define(name, options, indexes);
  }

  public with<T, Mode extends IDBTransactionMode>(storeNames: string | string[], mode: Mode, callback: (tx: Transaction<Mode>) => T | Promise<T>): Promise<T> {
    return this.services.indexedDB.with(storeNames, mode, callback);
  }

  public t(key: string, space = false): string {
    return this.services.translator.t(key, space);
  }

  public auto(text: string): string {
    return this.services.translator.auto(text);
  }

  public get<K extends keyof Extensions>(name: K): Extensions[K] | undefined;
  public get(name: string): Module | undefined;
  public get(name: string): object | undefined {
    return this.services.modules.get(name);
  }
};

var maplebirch = new MaplebirchCore(window.modSC2DataManager, window.modLoaderGui) as MaplebirchCore;

export { MaplebirchCore, type CoreEvents, type Extensions };
export default maplebirch;
