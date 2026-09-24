// ./src/services/GUIControl.ts

import type { IDBPObjectStore } from 'idb';
import type { ModSubUiAngularJsModeExportInterface } from '@scml/types/Mod_SubUiAngularJs/ModSubUiAngularJsModeExportInterface';
import type { ModSubUiAngularJsService } from '@scml/types/Mod_LoaderGui/ModSubUiAngularJsService';
import type ModLoader from '../host/ModLoader';
import type Emitter from '../infra/Emitter';
import Gui from '@/twee/Gui.twee';
import { widgets } from '../utils/string';
import { Config, Languages } from './../constants';
import type IndexedDB from './IndexedDB';
import Modules from './Modules';
import type Translator from './Translator';

type ModuleType = 'protected' | 'mounted' | 'exposed' | 'module';

interface ModuleInfo {
  name: string;
  type: ModuleType;
  source: string;
  protected: boolean;
  lifecycle: boolean;
  dependencies: string[];
}

interface ModuleDisabledRecord {
  name: string;
  source: string;
}

interface ModulesSettings {
  enabled: ModuleInfo[];
  disabled: ModuleInfo[];
}

interface ModulesStore {
  disabled: ModuleDisabledRecord[];
}

interface ScriptStore {
  disabled: string[];
}

type ChangeValues = {
  Language: { Language: string };
  DEBUG: { enabled: boolean; level: string };
  toggleModule: ModulesSettings;
  toggleScript: { enabled: string[]; disabled: string[] };
};

type ChangeArgs = { [K in keyof ChangeValues]: [action: K, data: ChangeValues[K] & { $ctrl?: GuiData }] }[keyof ChangeValues];

interface GuiData {
  onChange(...args: ChangeArgs): Promise<void>;
  Language: string;
  moduleText: string;
  enabledModules: ModuleInfo[];
  disabledModules: ModuleInfo[];
  enabledScripts: string[];
  disabledScripts: string[];
  text: {
    Title: string[];
    DEBUGMODE: string[];
    DEBUGSTATUS: string[];
    EnabledSTATUS: string[];
    DisabledSTATUS: string[];
    Languages: [string, string][];
    LanguageSelection: string[];
    EnableModule: string[];
    DisableModule: string[];
    EnableScript: string[];
    DisableScript: string[];
    ClearIndexedDB: string[];
  };
}

interface GuiController {
  data: GuiData;
  translation(text: string[]): string;
  $onInit(): void;
}

interface GuiScope {
  $ctrl: GuiController;
  t(text: string[]): string;
  languages: Array<{ code: string; readonly name: string }>;
  selectedEnabledModule: number;
  selectedDisabledModule: number;
  selectedEnabledScript: number;
  selectedDisabledScript: number;
  ClearIndexedDB(): Promise<boolean>;
  isDEBUG(): boolean;
  typeLabel(type: ModuleType): string;
  changeLanguage(): void;
  DEBUGMODE(type: string): string;
  DEBUGSTATUS(): string;
  EnableDisableItem(action: string): void;
  selectModule(index: number, listType: 'enabled' | 'disabled'): void;
  toggleModule(action: 'enable' | 'disable'): void;
  selectScript(index: number, listType: 'enabled' | 'disabled'): void;
  toggleScript(action: 'enable' | 'disable'): void;
}

interface SettingRecord<T = unknown> {
  key: string;
  value: T;
}

interface ScriptSource {
  jsFiles: Array<{ modName: string; filePath: string }>;
}

export class GUIControl {
  public enabledModules: ModuleInfo[] = [];
  public disabledModules: ModuleInfo[] = [];
  public enabledScripts: string[] = [];
  public disabledScripts: string[] = [];
  private modSubUiAngularJsService: ModSubUiAngularJsService;

  public constructor(
    readonly idb: IndexedDB,
    readonly modloader: ModLoader,
    readonly events: Emitter,
    readonly modules: Modules,
    readonly translator: Translator,
    private readonly addon: () => ScriptSource | undefined
  ) {
    this.modSubUiAngularJsService = modloader.modLoaderGui.getModSubUiAngularJsService();
    this.events.once(':indexedDB', () => this.idb.define('settings', { keyPath: 'key' }));
    this.events.once(':idbReady', async () => await this.initSettings());
  }

  private async initSettings(): Promise<void> {
    const modNames = await this.modNames();
    await this.idb.with(['settings'], 'readwrite', async tx => {
      const store = tx.objectStore('settings');
      if (!(await store.get('DEBUG'))) await store.put({ key: 'DEBUG', value: false });
      if (!(await store.get('Language'))) await store.put({ key: 'Language', value: navigator.language.includes('zh') ? 'CN' : 'EN' });
      await this.modulesStore(store, modNames);
      await this.scriptsStore(store, modNames);
    });
    await this.loadSettings();
  }

  public async init(): Promise<void> {
    await this.loadSettings();
    this.modSubUiAngularJsService.addLifeTimeCallback('maplebirchFrameworkAddon-GUIControl', { whenCreate: this.whenCreate.bind(this) });
  }

  private async loadSettings(): Promise<void> {
    const modNames = await this.modNames();
    await this.idb.with(['settings'], 'readonly', async tx => {
      const store = tx.objectStore('settings');
      const modulesRecord = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
      const scriptRecord = (await store.get('Script')) as SettingRecord<ScriptStore> | undefined;
      const modules = this.currentModules(modNames);
      const disabledModuleNames = Modules.traverse(
        (modulesRecord?.value?.disabled || []).map(m => m.name),
        this.moduleLinks(modules, 'disable'),
        new Set(modules.filter(m => m.protected).map(m => m.name))
      );
      const script_valid = (script: string) => {
        const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
        return !!modName && modNames.has(modName);
      };
      const scripts = [...new Set((this.addon()?.jsFiles ?? []).map(entry => `[${entry.modName}]:${entry.filePath}`).filter(script_valid))];
      const disabledScriptSet = new Set<string>((scriptRecord?.value?.disabled || []).filter(script_valid));
      this.enabledModules = modules.filter(m => !disabledModuleNames.has(m.name));
      this.disabledModules = modules.filter(m => disabledModuleNames.has(m.name));
      this.enabledScripts = scripts.filter(s => !disabledScriptSet.has(s));
      this.disabledScripts = scripts.filter(s => disabledScriptSet.has(s));
    });
  }

  private async modNames(): Promise<Set<string>> {
    const controller = this.modloader.loadController;
    const [enabled, hidden] = await Promise.all([controller.listModIndexDB(), controller.loadHiddenModList()]);
    return new Set([...enabled, ...hidden]);
  }

  private currentModules(modNames: Set<string>): ModuleInfo[] {
    const graph: Modules['dependencyGraph'] = this.modules.dependencyGraph;
    const links = new Map(Object.entries(graph).map(([name, info]) => [name, info.dependencies]));
    const protectedNames = new Set(
      Object.entries(graph)
        .filter(([, info]) => info.protected)
        .map(([name]) => name)
    );
    return Object.entries(graph)
      .map(([name, info]) => ({
        name,
        type: (info.protected ? 'protected' : info.exposed ? 'exposed' : info.mounted ? 'mounted' : 'module') as ModuleType,
        source: info.source || '',
        protected: info.protected === true,
        lifecycle: info.lifecycle === true,
        dependencies: [...Modules.traverse(info.dependencies, links, protectedNames)]
      }))
      .filter(mod => !mod.source || modNames.has(mod.source));
  }

  public typeLabel(type: ModuleType): string {
    if (type === 'protected') return '[Protected]';
    if (type === 'mounted') return '[Mounted]';
    if (type === 'exposed') return '[Exposed]';
    return '[Module]';
  }

  private async modulesStore(store: IDBPObjectStore<unknown, string[], 'settings', 'readwrite'>, modNames: Set<string>): Promise<void> {
    const record = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
    const visibleNames = new Set(this.currentModules(modNames).map(m => m.name));
    const next = new Map<string, ModuleDisabledRecord>();
    for (const item of record?.value?.disabled || []) {
      const rec = { name: item.name, source: item.source || '' };
      if (visibleNames.has(rec.name) || (!!rec.source && modNames.has(rec.source))) next.set(rec.name, rec);
    }
    await store.put({ key: 'Modules', value: { disabled: Array.from(next.values()) } });
  }

  private async scriptsStore(store: IDBPObjectStore<unknown, string[], 'settings', 'readwrite'>, modNames: Set<string>): Promise<void> {
    const record = (await store.get('Script')) as SettingRecord<ScriptStore> | undefined;
    const disabled = new Set<string>();
    for (const script of record?.value?.disabled || []) {
      const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
      if (modName && modNames.has(modName)) disabled.add(script);
    }
    await store.put({ key: 'Script', value: { disabled: Array.from(disabled) } });
  }

  public async saveModules(enabled: ModuleInfo[], disabled: ModuleInfo[]): Promise<void> {
    const modNames = await this.modNames();
    const currentNames = new Set([...enabled, ...disabled].map(m => m.name));
    await this.idb.with(['settings'], 'readwrite', async tx => {
      const store = tx.objectStore('settings');
      const old = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
      const next = new Map<string, ModuleDisabledRecord>();
      for (const item of old?.value?.disabled || []) if (!currentNames.has(item.name) && item.source && modNames.has(item.source)) next.set(item.name, { name: item.name, source: item.source });
      for (const mod of disabled) if (!mod.protected && (mod.type !== 'exposed' || mod.lifecycle)) next.set(mod.name, { name: mod.name, source: mod.source || '' });
      await store.put({ key: 'Modules', value: { disabled: Array.from(next.values()) } });
    });
    await this.loadSettings();
  }

  public async setModuleStates(states: Readonly<Record<string, boolean>>): Promise<boolean> {
    const changes = Object.entries(states);
    if (changes.length === 0) return false;
    const modules = this.currentModules(await this.modNames());
    const byName = new Map(modules.map(module => [module.name, module]));
    for (const [name, enabled] of changes) {
      const module = byName.get(name);
      if (!module || module.protected || (module.type === 'exposed' && !module.lifecycle) || typeof enabled !== 'boolean') throw new Error(`模块状态不可修改: ${name}`);
    }
    let changed = false;
    await this.idb.with(['settings'], 'readwrite', async tx => {
      const store = tx.objectStore('settings');
      const old = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
      const disabled = new Map((old?.value?.disabled ?? []).map(item => [item.name, item]));
      const protectedNames = new Set(modules.filter(module => module.protected).map(module => module.name));
      const links = this.moduleLinks(modules, 'disable');
      const before = Modules.traverse(disabled.keys(), links, protectedNames);
      for (const [name, enabled] of changes) {
        const module = byName.get(name)!;
        if (enabled) disabled.delete(name);
        else disabled.set(name, { name, source: module.source });
      }
      const after = Modules.traverse(disabled.keys(), links, protectedNames);
      for (const [name, enabled] of changes) if (after.has(name) === enabled) throw new Error(`模块依赖阻止状态修改: ${name}`);
      for (const module of modules) {
        if (Object.hasOwn(states, module.name)) continue;
        if (before.has(module.name) !== after.has(module.name)) throw new Error(`模块状态会影响未指定模块: ${module.name}`);
      }
      changed = modules.some(module => Object.hasOwn(states, module.name) && before.has(module.name) !== after.has(module.name));
      if (changed) await store.put({ key: 'Modules', value: { disabled: [...disabled.values()] } });
    });
    if (changed) await this.loadSettings();
    return changed;
  }

  public async saveScripts(enabled: string[], disabled: string[]): Promise<void> {
    const modNames = await this.modNames();
    const currentScripts = new Set([...enabled, ...disabled]);
    await this.idb.with(['settings'], 'readwrite', async tx => {
      const store = tx.objectStore('settings');
      const old = (await store.get('Script')) as SettingRecord<ScriptStore> | undefined;
      const next = new Set<string>();
      for (const script of old?.value?.disabled || []) {
        const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
        if (!currentScripts.has(script) && modName && modNames.has(modName)) next.add(script);
      }
      for (const script of disabled) {
        const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
        if (modName && modNames.has(modName)) next.add(script);
      }
      await store.put({ key: 'Script', value: { disabled: Array.from(next) } });
    });
    await this.loadSettings();
  }

  public cascadeModules(action: 'enable' | 'disable', moduleName: string, modules: ModulesSettings): string[] {
    const allModules = [...modules.enabled, ...modules.disabled];
    const protectedNames = new Set(allModules.filter(module => module.protected).map(module => module.name));
    const candidateNames = new Set((action === 'enable' ? modules.disabled : modules.enabled).map(module => module.name));
    const affectedNames = Modules.traverse([moduleName], this.moduleLinks(allModules, action), protectedNames);
    return [...affectedNames].filter(name => candidateNames.has(name));
  }

  private moduleLinks(modules: ModuleInfo[], action: 'enable' | 'disable'): Map<string, Set<string>> {
    const links = new Map<string, Set<string>>();
    for (const module of modules) {
      for (const dependency of module.dependencies) {
        const from = action === 'enable' ? module.name : dependency;
        const to = action === 'enable' ? dependency : module.name;
        if (!links.has(from)) links.set(from, new Set());
        links.get(from)!.add(to);
      }
    }
    return links;
  }

  public get moduleList(): string {
    const result: string[] = [];
    Object.entries(this.modules.dependencyGraph).forEach(([name, info]) => {
      const type = (info.protected ? 'protected' : info.exposed ? 'exposed' : info.mounted ? 'mounted' : 'module') as ModuleType;
      result.push(`${this.typeLabel(type)} ${name} [${info.source || info.state}]`);
    });
    this.addon()?.jsFiles.forEach(entry => result.push(`[Script] ${entry.filePath} [${entry.modName}]`));
    return result.length > 0 ? result.join('\n') : '';
  }

  private async whenCreate(Ref: ModSubUiAngularJsModeExportInterface): Promise<void> {
    const { translator, idb, events, modloader } = this;
    const typeLabel = this.typeLabel.bind(this);
    const cascadeModules = this.cascadeModules.bind(this);
    const saveModules = this.saveModules.bind(this);
    const saveScripts = this.saveScripts.bind(this);
    Ref.registryComponentModGuiConfig(ngModule => {
      const componentDef = {
        selector: 'maplebirch-control-component',
        componentName: 'maplebirchControlComponent',
        componentOptions: {
          bindings: { data: '<' },
          template: widgets(Gui),
          controller: [
            '$scope',
            function (this: GuiController, $scope: GuiScope) {
              $scope.t = this.translation = (text: string[]) => text[Languages.indexOf(translator.language as 'EN' | 'CN')];
              const callOnChange = async (...args: ChangeArgs): Promise<boolean> => {
                try {
                  await $scope.$ctrl.data.onChange(...args);
                  return true;
                } catch (e) {
                  modloader.diagnostics.write(`Error in onChange: ${args[0]}`, 'ERROR', 'gui', e);
                  return false;
                }
              };

              $scope.ClearIndexedDB = () => idb.deleteDatabase();

              this.$onInit = () => {
                $scope.languages = $scope.$ctrl.data.text.Languages.map((lang: string[]) => ({
                  code: lang[0],
                  get name() {
                    return translator.auto(lang[1]);
                  }
                }));
                $scope.isDEBUG = () => modloader.diagnostics.LevelName === 'DEBUG';
                $scope.selectedEnabledModule = -1;
                $scope.selectedDisabledModule = -1;
                $scope.selectedEnabledScript = -1;
                $scope.selectedDisabledScript = -1;
              };

              $scope.typeLabel = (type: ModuleType) => typeLabel(type);

              $scope.changeLanguage = () => {
                callOnChange('Language', {
                  Language: $scope.$ctrl.data.Language,
                  $ctrl: $scope.$ctrl.data
                });
              };

              $scope.DEBUGMODE = (type: string) => translator.t(type === 'enable' ? 'enable' : 'disable', true).convert('title') + $scope.t($scope.$ctrl.data.text.DEBUGMODE);

              $scope.DEBUGSTATUS = () =>
                $scope.t($scope.$ctrl.data.text.DEBUGSTATUS) +
                (modloader.diagnostics.LevelName === 'DEBUG' ? $scope.t($scope.$ctrl.data.text.EnabledSTATUS) : $scope.t($scope.$ctrl.data.text.DisabledSTATUS));

              $scope.EnableDisableItem = (action: string) => {
                const enable = action === 'enable';
                callOnChange('DEBUG', {
                  enabled: enable,
                  level: enable ? 'DEBUG' : 'INFO',
                  $ctrl: $scope.$ctrl.data
                });
              };

              $scope.selectModule = (index: number, listType: 'enabled' | 'disabled') => {
                if (listType === 'enabled') {
                  $scope.selectedEnabledModule = $scope.selectedEnabledModule === index ? -1 : index;
                  $scope.selectedDisabledModule = -1;
                  return;
                }

                $scope.selectedDisabledModule = $scope.selectedDisabledModule === index ? -1 : index;
                $scope.selectedEnabledModule = -1;
              };

              $scope.toggleModule = (action: 'enable' | 'disable') => {
                const isEnable = action === 'enable';
                const src = isEnable ? $scope.$ctrl.data.disabledModules : $scope.$ctrl.data.enabledModules;
                const idx = isEnable ? $scope.selectedDisabledModule : $scope.selectedEnabledModule;
                if (idx === -1 || !src[idx]) return;
                const module = src[idx];
                const modules: ModulesSettings = {
                  enabled: $scope.$ctrl.data.enabledModules.map(m => ({
                    name: m.name,
                    type: m.type,
                    source: m.source || '',
                    protected: m.protected === true,
                    lifecycle: m.lifecycle === true,
                    dependencies: m.dependencies || []
                  })),
                  disabled: $scope.$ctrl.data.disabledModules.map(m => ({
                    name: m.name,
                    type: m.type,
                    source: m.source || '',
                    protected: m.protected === true,
                    lifecycle: m.lifecycle === true,
                    dependencies: m.dependencies || []
                  }))
                };

                for (const moduleName of cascadeModules(action, module.name, modules)) {
                  const srcArray = isEnable ? $scope.$ctrl.data.disabledModules : $scope.$ctrl.data.enabledModules;
                  const dstArray = isEnable ? $scope.$ctrl.data.enabledModules : $scope.$ctrl.data.disabledModules;
                  const srcIdx = srcArray.findIndex(m => m.name === moduleName);
                  if (srcIdx === -1) continue;
                  const mod = srcArray[srcIdx];
                  srcArray.splice(srcIdx, 1);
                  if (!dstArray.some(m => m.name === moduleName)) dstArray.push(mod);
                }

                callOnChange('toggleModule', {
                  enabled: $scope.$ctrl.data.enabledModules,
                  disabled: $scope.$ctrl.data.disabledModules,
                  $ctrl: $scope.$ctrl.data
                });

                $scope.selectedEnabledModule = -1;
                $scope.selectedDisabledModule = -1;
              };

              $scope.selectScript = (index: number, listType: 'enabled' | 'disabled') => {
                if (listType === 'enabled') {
                  $scope.selectedEnabledScript = $scope.selectedEnabledScript === index ? -1 : index;
                  $scope.selectedDisabledScript = -1;
                  return;
                }

                $scope.selectedDisabledScript = $scope.selectedDisabledScript === index ? -1 : index;
                $scope.selectedEnabledScript = -1;
              };

              $scope.toggleScript = (action: 'enable' | 'disable') => {
                const isEnable = action === 'enable';
                const src = isEnable ? $scope.$ctrl.data.disabledScripts : $scope.$ctrl.data.enabledScripts;
                const idx = isEnable ? $scope.selectedDisabledScript : $scope.selectedEnabledScript;
                if (idx === -1 || !src[idx]) return;
                const script = src[idx];
                const srcArray = isEnable ? $scope.$ctrl.data.disabledScripts : $scope.$ctrl.data.enabledScripts;
                const dstArray = isEnable ? $scope.$ctrl.data.enabledScripts : $scope.$ctrl.data.disabledScripts;
                const srcIdx = srcArray.findIndex((s: string) => s === script);
                if (srcIdx === -1) return;
                srcArray.splice(srcIdx, 1);
                if (!dstArray.includes(script)) dstArray.push(script);
                callOnChange('toggleScript', {
                  enabled: $scope.$ctrl.data.enabledScripts,
                  disabled: $scope.$ctrl.data.disabledScripts,
                  $ctrl: $scope.$ctrl.data
                });

                $scope.selectedEnabledScript = -1;
                $scope.selectedDisabledScript = -1;
              };
            }
          ]
        }
      };

      ngModule.component(componentDef.componentName, componentDef.componentOptions);
      return componentDef;
    });

    Ref.addComponentModGuiConfig<GuiData>({
      selector: 'maplebirch-control-component',
      data: {
        onChange: async function (...[action, data]: ChangeArgs) {
          switch (action) {
            case 'Language':
              await translator.setLanguage(data.Language);
              await events.trigger(':language');
              await idb.with(['settings'], 'readwrite', async tx => await tx.objectStore('settings').put({ key: 'Language', value: data.Language }));
              break;
            case 'DEBUG':
              modloader.diagnostics.LevelName = data.level;
              await idb.with(['settings'], 'readwrite', async tx => await tx.objectStore('settings').put({ key: 'DEBUG', value: data.enabled }));
              break;
            case 'toggleModule':
              await saveModules(data.enabled, data.disabled);
              break;
            case 'toggleScript':
              await saveScripts(data.enabled, data.disabled);
              break;
          }
        },
        Language: translator.language,
        moduleText: this.moduleList,
        enabledModules: this.enabledModules.filter(m => !m.protected && (m.type !== 'exposed' || m.lifecycle)),
        disabledModules: this.disabledModules.filter(m => !m.protected && (m.type !== 'exposed' || m.lifecycle)),
        enabledScripts: this.enabledScripts,
        disabledScripts: this.disabledScripts,
        text: {
          Title: Config.Title,
          DEBUGMODE: Config.DEBUG,
          DEBUGSTATUS: Config.DEBUGSTATUS,
          EnabledSTATUS: Config.EnabledSTATUS,
          DisabledSTATUS: Config.DisabledSTATUS,
          Languages: Config.Languages,
          LanguageSelection: Config.LanguageSelection,
          EnableModule: Config.EnableModule,
          DisableModule: Config.DisableModule,
          EnableScript: Config.EnableScript,
          DisableScript: Config.DisableScript,
          ClearIndexedDB: Config.ClearIndexedDB
        }
      }
    });
  }
}

export default GUIControl;
