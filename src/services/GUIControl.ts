// ./src/services/GUIControl.ts

import type { ModSubUiAngularJsService } from '@scml/types/Mod_LoaderGui/ModSubUiAngularJsService';
import maplebirch, { type MaplebirchCore } from '../core';
import { convert } from '../utils';
import { Config } from './../constants';

type ModuleType = 'protected' | 'mounted' | 'exposed' | 'module';

interface ModuleInfo {
  name: string;
  type: ModuleType;
  source: string;
  protected: boolean;
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

interface SettingRecord<T = any> {
  key: string;
  value: T;
}

class GUIControl {
  enabledModules: ModuleInfo[] = [];
  disabledModules: ModuleInfo[] = [];
  enabledScripts: string[] = [];
  disabledScripts: string[] = [];
  private modSubUiAngularJsService: ModSubUiAngularJsService;

  constructor(readonly core: MaplebirchCore) {
    this.modSubUiAngularJsService = core.manager.modLoaderGui.getModSubUiAngularJsService();
    this.core.once(':indexedDB', () => this.core.idb.register('settings', { keyPath: 'key' }));
    this.core.once(':idbReady', async () => await this.initSettings());
  }

  async initSettings(): Promise<void> {
    const modNames = await this.modNames();
    await this.core.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
      const store = tx.objectStore('settings');
      if (!(await store.get('DEBUG'))) await store.put({ key: 'DEBUG', value: false });
      if (!(await store.get('Language'))) await store.put({ key: 'Language', value: navigator.language.includes('zh') ? 'CN' : 'EN' });
      await this.modulesStore(store, modNames);
      await this.scriptsStore(store, modNames);
    });
    await this.loadSettings();
  }

  async init(): Promise<void> {
    await this.loadSettings();
    this.modSubUiAngularJsService.addLifeTimeCallback('maplebirchFrameworkAddon-GUIControl', { whenCreate: this.whenCreate.bind(this) });
  }

  private async loadSettings(): Promise<void> {
    const modNames = await this.modNames();
    await this.core.idb.withTransaction(['settings'], 'readonly', async (tx: any) => {
      const store = tx.objectStore('settings');
      const Modules = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
      const Script = (await store.get('Script')) as SettingRecord<ScriptStore> | undefined;
      const modules = this.currentModules(modNames);
      const disabledModuleNames = new Set((Modules?.value?.disabled || []).map(m => m.name));
      const script_valid = (script: string) => {
        const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
        return !!modName && modNames.has(modName);
      };
      const addon = this.core.get('addon');
      const scripts: string[] = Array.from(new Set<string>(((addon?.jsFiles || []) as any[]).map((entry: any) => `[${entry.modName}]:${entry.filePath}`).filter(script_valid)));
      const disabledScriptSet = new Set<string>((Script?.value?.disabled || []).filter(script_valid));
      this.enabledModules = modules.filter(m => !disabledModuleNames.has(m.name));
      this.disabledModules = modules.filter(m => disabledModuleNames.has(m.name));
      this.enabledScripts = scripts.filter(s => !disabledScriptSet.has(s));
      this.disabledScripts = scripts.filter(s => disabledScriptSet.has(s));
    });
  }

  private async modNames(): Promise<Set<string>> {
    const controller = this.core.modUtils.getModLoadController();
    const [enabled, hidden] = await Promise.all([controller.listModIndexDB(), controller.loadHiddenModList()]);
    return new Set([...enabled, ...hidden]);
  }

  private currentModules(modNames: Set<string>): ModuleInfo[] {
    const graph = this.core.dependencyGraph;
    return Object.entries(graph)
      .map(([name, info]: [string, any]) => ({
        name,
        type: (info.protected ? 'protected' : info.state === 'EXPOSED' ? 'exposed' : info.mounted ? 'mounted' : 'module') as ModuleType,
        source: info.source || '',
        protected: info.protected === true,
        dependencies: (info.allDependencies || []).filter((dep: string) => {
          const target = graph[dep];
          return target && !target.protected && target.state !== 'EXPOSED';
        })
      }))
      .filter(mod => !mod.source || modNames.has(mod.source));
  }

  typeLabel(type: ModuleType): string {
    if (type === 'protected') return '[Protected]';
    if (type === 'mounted') return '[Mounted]';
    if (type === 'exposed') return '[Exposed]';
    return '[Module]';
  }

  canBeDisabled(mod: Pick<ModuleInfo, 'protected' | 'type'>): boolean {
    return !mod.protected && mod.type !== 'exposed';
  }

  private async modulesStore(store: any, modNames: Set<string>): Promise<void> {
    const record = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
    const visibleNames = new Set(this.currentModules(modNames).map(m => m.name));
    const next = new Map<string, ModuleDisabledRecord>();
    for (const item of record?.value?.disabled || []) {
      const rec = { name: item.name, source: item.source || '' };
      if (visibleNames.has(rec.name) || (!!rec.source && modNames.has(rec.source))) next.set(rec.name, rec);
    }
    await store.put({ key: 'Modules', value: { disabled: Array.from(next.values()) } });
  }

  private async scriptsStore(store: any, modNames: Set<string>): Promise<void> {
    const record = (await store.get('Script')) as SettingRecord<ScriptStore> | undefined;
    const disabled = new Set<string>();
    for (const script of record?.value?.disabled || []) {
      const modName = script.match(/^\[([^\]]+)\]:/)?.[1] || '';
      if (modName && modNames.has(modName)) disabled.add(script);
    }
    await store.put({ key: 'Script', value: { disabled: Array.from(disabled) } });
  }

  async saveModules(enabled: ModuleInfo[], disabled: ModuleInfo[]): Promise<void> {
    const modNames = await this.modNames();
    const currentNames = new Set([...enabled, ...disabled].map(m => m.name));
    await this.core.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
      const store = tx.objectStore('settings');
      const old = (await store.get('Modules')) as SettingRecord<ModulesStore> | undefined;
      const next = new Map<string, ModuleDisabledRecord>();
      for (const item of old?.value?.disabled || []) if (!currentNames.has(item.name) && item.source && modNames.has(item.source)) next.set(item.name, { name: item.name, source: item.source });
      for (const mod of disabled) if (this.canBeDisabled(mod)) next.set(mod.name, { name: mod.name, source: mod.source || '' });
      await store.put({ key: 'Modules', value: { disabled: Array.from(next.values()) } });
    });
    await this.loadSettings();
  }

  async saveScripts(enabled: string[], disabled: string[]): Promise<void> {
    const modNames = await this.modNames();
    const currentScripts = new Set([...enabled, ...disabled]);
    await this.core.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
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

  cascadeModules(action: 'enable' | 'disable', moduleName: string, modules: ModulesSettings): string[] {
    const result = new Set([moduleName]);
    if (action === 'enable') {
      const disabled = new Set(modules.disabled.map(m => m.name));
      const addDeps = (name: string) => {
        const module = modules.disabled.find(m => m.name === name) || modules.enabled.find(m => m.name === name);
        if (!module) return;
        for (const dep of module.dependencies || []) {
          if (!disabled.has(dep)) continue;
          result.add(dep);
          addDeps(dep);
        }
      };
      addDeps(moduleName);
      return Array.from(result);
    }

    const enabled = new Set(modules.enabled.map(m => m.name));
    const addDependents = (name: string) => {
      for (const mod of modules.enabled) {
        if (!(mod.dependencies || []).includes(name) || !enabled.has(mod.name) || !this.canBeDisabled(mod)) continue;
        result.add(mod.name);
        addDependents(mod.name);
      }
    };

    addDependents(moduleName);
    return Array.from(result);
  }

  get moduleList(): string {
    const addon = this.core.get('addon');
    const result: string[] = [];
    Object.entries(this.core.dependencyGraph).forEach(([name, info]: [string, any]) => {
      const type = (info.protected ? 'protected' : info.state === 'EXPOSED' ? 'exposed' : info.mounted ? 'mounted' : 'module') as ModuleType;
      result.push(`${this.typeLabel(type)} ${name} [${info.source || info.state}]`);
    });
    addon?.jsFiles?.forEach((entry: any) => result.push(`[Script] ${entry.filePath} [${entry.modName}]`));
    return result.length > 0 ? result.join('\n') : '';
  }

  private async whenCreate(Ref: any): Promise<void> {
    Ref.registryComponentModGuiConfig((ngModule: any) => {
      const componentDef = {
        selector: 'maplebirch-control-component',
        componentName: 'maplebirchControlComponent',
        componentOptions: {
          bindings: { data: '<' },
          template: `
          <div id='maplebirch'>
            <div class='title-container'>{{t($ctrl.data.text.Title)}}</div>
            <div class='content-container'>
              <div style='display: flex; align-items: center;'>
                <label>{{t($ctrl.data.text.LanguageSelection)}}</label>
                <select ng-model='$ctrl.data.Language' ng-change='changeLanguage()'>
                  <option ng-repeat='lang in languages' value='{{lang.code}}'>{{lang.name}}</option>
                </select>
                <div ng-if='isDEBUG()' style='margin-left: auto;'>
                  <input type='button' value='{{t($ctrl.data.text.ClearIndexedDB)}}' ng-click='ClearIndexedDB()' class='theme-button' />
                </div>
              </div>
              <input type='button' ng-click="EnableDisableItem('enable')" ng-value="DEBUGMODE('enable')" class='theme-button' />
              <input type='button' ng-click="EnableDisableItem('disable')" ng-value="DEBUGMODE('disable')" class='theme-button' />
              <input type='text' readonly='true' ng-value='DEBUGSTATUS()' /><br>
              <textarea ng-model='$ctrl.data.moduleText' readonly='true'></textarea>
              <div ng-if='isDEBUG()' class='module-settings-container'>
                <div class='settings-panel'>
                  <div class='module-list-enabled'>
                    <div ng-repeat='module in $ctrl.data.enabledModules track by $index' ng-click="selectModule($index, 'enabled')" ng-class="{'selected': selectedEnabledModule === $index}">
                      {{typeLabel(module.type)}} {{module.name}} [{{module.source || module.type}}]
                    </div>
                  </div>
                  <input type='button' value='{{t($ctrl.data.text.DisableModule)}}' ng-click="toggleModule('disable')" class='theme-button' />
                  <input type='button' value='{{t($ctrl.data.text.EnableModule)}}' ng-click="toggleModule('enable')" class='theme-button' />
                  <div class='module-list-disabled'>
                    <div ng-repeat='module in $ctrl.data.disabledModules track by $index' ng-click="selectModule($index, 'disabled')" ng-class="{'selected': selectedDisabledModule === $index}">
                      {{typeLabel(module.type)}} {{module.name}} [{{module.source || module.type}}]
                    </div>
                  </div>
                </div>
                <div class='settings-panel'>
                  <div class='module-list-enabled'>
                    <div ng-repeat='script in $ctrl.data.enabledScripts track by $index' ng-click="selectScript($index, 'enabled')" ng-class="{'selected': selectedEnabledScript === $index}">
                      {{script}}
                    </div>
                  </div>
                  <input type='button' value='{{t($ctrl.data.text.DisableScript)}}' ng-click="toggleScript('disable')" class='theme-button' />
                  <input type='button' value='{{t($ctrl.data.text.EnableScript)}}' ng-click="toggleScript('enable')" class='theme-button' />
                  <div class='module-list-disabled'>
                    <div ng-repeat='script in $ctrl.data.disabledScripts track by $index' ng-click="selectScript($index, 'disabled')" ng-class="{'selected': selectedDisabledScript === $index}">
                      {{script}}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>`,
          controller: [
            '$scope',
            '$compile',
            '$element',
            function ($scope: any, _$compile: any, _$element: any) {
              const ctrl = this as any;
              $scope.t = ctrl.translation = (text: string[]) => text[maplebirch.meta.Languages.indexOf(maplebirch.Language as 'EN' | 'CN')];
              const callOnChange = (action: any, data: any) => {
                try {
                  return $scope.$ctrl.data?.onChange?.(action, data) || false;
                } catch (e) {
                  maplebirch.log(`Error in onChange: ${action}`, 'ERROR', e);
                  return false;
                }
              };

              $scope.ClearIndexedDB = () => maplebirch.idb.deleteDatabase();

              ctrl.$onInit = () => {
                $scope.languages = $scope.$ctrl.data.text.Languages.map((lang: string[]) => ({
                  code: lang[0],
                  get name() {
                    return maplebirch.auto(lang[1]);
                  }
                }));
                $scope.isDEBUG = () => maplebirch.LogLevel === 'DEBUG';
                $scope.selectedEnabledModule = -1;
                $scope.selectedDisabledModule = -1;
                $scope.selectedEnabledScript = -1;
                $scope.selectedDisabledScript = -1;
              };

              $scope.typeLabel = (type: ModuleType) => maplebirch.gui.typeLabel(type);

              $scope.changeLanguage = () => {
                callOnChange('Language', {
                  Language: $scope.$ctrl.data.Language,
                  $ctrl: $scope.$ctrl.data
                });
              };

              $scope.DEBUGMODE = (type: string) => convert(maplebirch.t(type === 'enable' ? 'enable' : 'disable', true), 'title') + $scope.t($scope.$ctrl.data.text.DEBUGMODE);

              $scope.DEBUGSTATUS = () =>
                $scope.t($scope.$ctrl.data.text.DEBUGSTATUS) + (maplebirch.LogLevel === 'DEBUG' ? $scope.t($scope.$ctrl.data.text.EnabledSTATUS) : $scope.t($scope.$ctrl.data.text.DisabledSTATUS));

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
                  enabled: $scope.$ctrl.data.enabledModules.map((m: any) => ({
                    name: m.name,
                    type: m.type,
                    source: m.source || '',
                    protected: m.protected === true,
                    dependencies: m.dependencies || []
                  })),
                  disabled: $scope.$ctrl.data.disabledModules.map((m: any) => ({
                    name: m.name,
                    type: m.type,
                    source: m.source || '',
                    protected: m.protected === true,
                    dependencies: m.dependencies || []
                  }))
                };

                for (const moduleName of maplebirch.gui.cascadeModules(action, module.name, modules)) {
                  const srcArray = isEnable ? $scope.$ctrl.data.disabledModules : $scope.$ctrl.data.enabledModules;
                  const dstArray = isEnable ? $scope.$ctrl.data.enabledModules : $scope.$ctrl.data.disabledModules;
                  const srcIdx = srcArray.findIndex((m: any) => m.name === moduleName);
                  if (srcIdx === -1) continue;
                  const mod = srcArray[srcIdx];
                  srcArray.splice(srcIdx, 1);
                  if (!dstArray.some((m: any) => m.name === moduleName)) dstArray.push(mod);
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

    Ref.addComponentModGuiConfig({
      selector: 'maplebirch-control-component',
      data: {
        onChange: async function (action: any, data: any) {
          switch (action) {
            case 'Language':
              maplebirch.Language = data.Language;
              await maplebirch.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => await tx.objectStore('settings').put({ key: 'Language', value: data.Language }));
              break;
            case 'DEBUG':
              maplebirch.LogLevel = data.level;
              await maplebirch.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => await tx.objectStore('settings').put({ key: 'DEBUG', value: data.enabled }));
              break;
            case 'toggleModule':
              await maplebirch.gui.saveModules(data.enabled, data.disabled);
              break;
            case 'toggleScript':
              await maplebirch.gui.saveScripts(data.enabled, data.disabled);
              break;
          }
        },
        Language: maplebirch.Language,
        moduleText: maplebirch.gui.moduleList,
        enabledModules: maplebirch.gui.enabledModules.filter(m => maplebirch.gui.canBeDisabled(m)),
        disabledModules: maplebirch.gui.disabledModules.filter(m => maplebirch.gui.canBeDisabled(m)),
        enabledScripts: maplebirch.gui.enabledScripts,
        disabledScripts: maplebirch.gui.disabledScripts,
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
