// ./src/services/GUIControl.ts

import { ModSubUiAngularJsService } from '../../types/Mod_LoaderGui//ModSubUiAngularJsService';
import maplebirch, { MaplebirchCore } from '../core';
import { convert } from '../utils';
import { Config } from './../constants';

interface ModuleInfo {
  name: string;
  source: string;
  dependencies?: string[];
}

interface ExtensionSettings {
  enabled: ModuleInfo[];
  disabled: ModuleInfo[];
}

interface Data {
  value: {
    enabled: any;
    disabled: any;
  };
}

class GUIControl {
  enabledModules: ModuleInfo[] = [];
  disabledModules: ModuleInfo[] = [];
  enabledScripts: string[] = [];
  disabledScripts: string[] = [];
  private modSubUiAngularJsService: ModSubUiAngularJsService;

  constructor(readonly core: MaplebirchCore) {
    this.modSubUiAngularJsService = core.manager.modLoaderGui.getModSubUiAngularJsService();
    this.core.once(':IndexedDB', async () => this.initDB());
  }

  async initDB(): Promise<void> {
    this.core.idb.register('settings', { keyPath: 'key' });
    await this.core.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
      const store = tx.objectStore('settings');
      if (!(await store.get('DEBUG'))) await store.put({ key: 'DEBUG', value: false });
      if (!(await store.get('Language'))) await store.put({ key: 'Language', value: 'EN' });
      const Extension = await store.get('Extension');
      const modules = Object.entries(this.core.dependencyGraph)
        .filter(([_, m]: [string, any]) => m.state === 'EXTENSION')
        .map(([n, m]: [string, any]) => ({
          name: n,
          source: m.source,
          dependencies: m.allDependencies.filter((dep: string) => this.core.dependencyGraph[dep]?.state === 'EXTENSION')
        }));
      if (!Extension) {
        await store.put({ key: 'Extension', value: { enabled: modules, disabled: [] } });
      } else {
        const Enabled = Extension.value.enabled;
        const Disabled = Extension.value.disabled;
        modules.forEach(mod => {
          const existingMod = [...Enabled, ...Disabled].find((m: any) => m.name === mod.name);
          if (existingMod) {
            existingMod.dependencies = mod.dependencies;
            if (mod.source) existingMod.source = mod.source;
          } else if (mod.source) {
            Enabled.push(mod);
          }
        });
        await store.put(Extension);
      }
      if (!(await store.get('Script'))) await store.put({ key: 'Script', value: { enabled: [], disabled: [] } });
    });
    const Script = (await this.core.idb.withTransaction(['settings'], 'readonly', (tx: any) => tx.objectStore('settings').get('Script'))) as Data;
    this.enabledScripts = Script.value.enabled;
    this.disabledScripts = Script.value.disabled;
  }

  async init(): Promise<void> {
    const settings = (await this.core.idb.withTransaction(['settings'], 'readonly', (tx: any) => tx.objectStore('settings').get('Extension'))) as Data;

    const Extension = settings.value;
    this.enabledModules = Extension.enabled.map((m: any) => ({
      name: m.name,
      source: m.source,
      dependencies: m.dependencies || []
    }));

    this.disabledModules = Extension.disabled.map((m: any) => ({
      name: m.name,
      source: m.source,
      dependencies: m.dependencies || []
    }));

    const addon = this.core.getModule('addon');
    const all = new Set([...this.enabledScripts, ...this.disabledScripts]);
    const scripts: string[] = [];

    addon.jsFiles.forEach((entry: any) => {
      const key = `[${entry.modName}]:${entry.filePath}`;
      if (!all.has(key)) scripts.push(key);
    });

    if (scripts.length > 0) {
      this.enabledScripts.push(...scripts);
      await this.core.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
        const store = tx.objectStore('settings');
        const script = await store.get('Script');
        script.value.enabled.push(...scripts);
        await store.put(script);
      });
    }
    this.modSubUiAngularJsService.addLifeTimeCallback('maplebirchFrameworkAddon-GUIControl', { whenCreate: this.whenCreate.bind(this) });
  }

  canToggleModule(action: 'enable' | 'disable', moduleName: string, Extension: ExtensionSettings): boolean {
    const disabled = new Set(Extension.disabled.map(m => m.name));
    if (action === 'enable') {
      const module = Extension.disabled.find(m => m.name === moduleName);
      if (!module) return false;
      for (const dep of module.dependencies || []) if (disabled.has(dep)) return false;
      return true;
    } else {
      const module = Extension.enabled.find(m => m.name === moduleName);
      if (!module) return false;
      for (const enabled of Extension.enabled) if ((enabled.dependencies || []).includes(moduleName)) return false;
      return true;
    }
  }

  cascadeModules(action: 'enable' | 'disable', moduleName: string, Extension: ExtensionSettings): string[] {
    const result = new Set([moduleName]);
    if (action === 'enable') {
      const disabled = new Set(Extension.disabled.map(m => m.name));
      const addDeps = (name: string) => {
        const module = Extension.disabled.find(m => m.name === name) || Extension.enabled.find(m => m.name === name);
        if (!module) return;
        for (const dep of module.dependencies || [])
          if (disabled.has(dep)) {
            result.add(dep);
            addDeps(dep);
          }
      };
      addDeps(moduleName);
    } else {
      const enabled = new Set(Extension.enabled.map(m => m.name));
      const addDependents = (name: string) => {
        for (const mod of Extension.enabled)
          if ((mod.dependencies || []).includes(name) && enabled.has(mod.name)) {
            result.add(mod.name);
            addDependents(mod.name);
          }
      };
      addDependents(moduleName);
    }
    return Array.from(result);
  }

  get moduleList(): string {
    const addon = this.core.getModule('addon');
    const result: string[] = [];
    Object.entries(this.core.dependencyGraph).forEach(([name, info]: [string, any]) => {
      if (info.state === 'EXTENSION') {
        result.push(`[Extension] ${name} [${info.source || 'unknown'}]`);
      } else {
        result.push(`[Core] ${name} [${info.state}]`);
      }
    });
    addon.jsFiles.forEach((entry: any) => result.push(`[Script] ${entry.filePath} [${entry.modName}]`));
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
                  <input type='button' value='{{t($ctrl.data.text.ClearIndexedDB)}}' ng-click='maplebirch.idb.deleteDatabase()' class='theme-button' />
                </div>
              </div>
              <input type='button' ng-click="EnableDisableItem('enable')" ng-value="DEBUGMODE('enable')" class='theme-button' />
              <input type='button' ng-click="EnableDisableItem('disable')" ng-value="DEBUGMODE('disable')" class='theme-button' />
              <input type='text' readonly='true' ng-value='DEBUGSTATUS()' />
              <textarea ng-model='$ctrl.data.moduleText' readonly='true'></textarea>
              <div ng-if='isDEBUG()' class='module-settings-container'>
                <div class='settings-panel'>
                  <div class='module-list-enabled'>
                    <div ng-repeat='module in $ctrl.data.enabledModules track by $index' ng-click="selectModule($index, 'enabled')" ng-class="{'selected': selectedEnabledModule === $index}">{{module.name}} [{{module.source}}]</div>
                  </div>
                  <input type='button' value='{{t($ctrl.data.text.DisableModule)}}' ng-click="toggleModule('disable')" class='theme-button' />
                  <input type='button' value='{{t($ctrl.data.text.EnableModule)}}' ng-click="toggleModule('enable')" class='theme-button' />
                  <div class='module-list-disabled'>
                    <div ng-repeat='module in $ctrl.data.disabledModules track by $index' ng-click="selectModule($index, 'disabled')" ng-class="{'selected': selectedDisabledModule === $index}">{{module.name}} [{{module.source}}]</div>
                  </div>
                </div>
                <div class='settings-panel'>
                  <div class='module-list-enabled'>
                    <div ng-repeat='script in $ctrl.data.enabledScripts track by $index' ng-click="selectScript($index, 'enabled')" ng-class="{'selected': selectedEnabledScript === $index}">{{script}}</div>
                  </div>
                  <input type='button' value='{{t($ctrl.data.text.DisableScript)}}' ng-click="toggleScript('disable')" class='theme-button' />
                  <input type='button' value='{{t($ctrl.data.text.EnableScript)}}' ng-click="toggleScript('enable')" class='theme-button' />
                  <div class='module-list-disabled'>
                    <div ng-repeat='script in $ctrl.data.disabledScripts track by $index' ng-click="selectScript($index, 'disabled')" ng-class="{'selected': selectedDisabledScript === $index}">{{script}}</div>
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

              ctrl.$onInit = () => {
                $scope.languages = $scope.$ctrl.data.text.Languages.map((lang: string[]) => ({
                  code: lang[0],
                  get name() {
                    return maplebirch.auto(lang[1]);
                  }
                }));
                $scope.isDEBUG = () => maplebirch.LogLevel === 'DEBUG';
                $scope.selectedEnabledModule = $scope.selectedDisabledModule = -1;
                $scope.selectedEnabledScript = $scope.selectedDisabledScript = -1;
              };

              $scope.changeLanguage = () =>
                callOnChange('Language', {
                  Language: $scope.$ctrl.data.Language,
                  $ctrl: $scope.$ctrl.data
                });

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

              $scope.toggleModule = (action: 'enable' | 'disable') => {
                const isEnable = action === 'enable';
                const src = isEnable ? $scope.$ctrl.data.disabledModules : $scope.$ctrl.data.enabledModules;
                const idx = isEnable ? $scope.selectedDisabledModule : $scope.selectedEnabledModule;
                if (idx === -1 || !src[idx]) return;
                const module = src[idx];
                const Extension: ExtensionSettings = {
                  enabled: $scope.$ctrl.data.enabledModules.map((m: any) => ({
                    name: m.name,
                    dependencies: m.dependencies || []
                  })),
                  disabled: $scope.$ctrl.data.disabledModules.map((m: any) => ({
                    name: m.name,
                    dependencies: m.dependencies || []
                  }))
                };
                const cascadeModules = maplebirch.gui.cascadeModules(action, module.name, Extension);
                cascadeModules.forEach((moduleName: string) => {
                  const allModules = [...$scope.$ctrl.data.enabledModules, ...$scope.$ctrl.data.disabledModules];
                  const mod = allModules.find((m: any) => m.name === moduleName);
                  if (!mod) return;
                  const srcArray = isEnable ? $scope.$ctrl.data.disabledModules : $scope.$ctrl.data.enabledModules;
                  const dstArray = isEnable ? $scope.$ctrl.data.enabledModules : $scope.$ctrl.data.disabledModules;
                  const srcIdx = srcArray.findIndex((m: any) => m.name === moduleName);
                  if (srcIdx !== -1) {
                    srcArray.splice(srcIdx, 1);
                    if (!dstArray.some((m: any) => m.name === moduleName)) dstArray.push(mod);
                  }
                });

                callOnChange('toggleModule', {
                  action,
                  enabled: $scope.$ctrl.data.enabledModules,
                  disabled: $scope.$ctrl.data.disabledModules,
                  $ctrl: $scope.$ctrl.data
                });

                $scope.selectedDisabledModule = $scope.selectedEnabledModule = -1;
              };

              $scope.selectModule = (index: number, listType: string) => {
                if (listType === 'enabled') {
                  $scope.selectedEnabledModule = $scope.selectedEnabledModule === index ? -1 : index;
                  $scope.selectedDisabledModule = -1;
                } else {
                  $scope.selectedDisabledModule = $scope.selectedDisabledModule === index ? -1 : index;
                  $scope.selectedEnabledModule = -1;
                }
              };

              $scope.toggleScript = (action: 'enable' | 'disable') => {
                const isEnable = action === 'enable';
                const src = isEnable ? $scope.$ctrl.data.disabledScripts : $scope.$ctrl.data.enabledScripts;
                const idx = isEnable ? $scope.selectedDisabledScript : $scope.selectedEnabledScript;
                if (idx === -1 || !src[idx]) return;
                const script = src[idx];
                const srcArray = isEnable ? $scope.$ctrl.data.disabledScripts : $scope.$ctrl.data.enabledScripts;
                const dstArray = isEnable ? $scope.$ctrl.data.enabledScripts : $scope.$ctrl.data.disabledScripts;
                const srcIdx = srcArray.findIndex((s: any) => s === script);
                if (srcIdx !== -1) {
                  srcArray.splice(srcIdx, 1);
                  if (!dstArray.includes(script)) dstArray.push(script);
                }
                callOnChange('toggleScript', {
                  action,
                  enabled: $scope.$ctrl.data.enabledScripts,
                  disabled: $scope.$ctrl.data.disabledScripts,
                  $ctrl: $scope.$ctrl.data
                });
                $scope.selectedDisabledScript = $scope.selectedEnabledScript = -1;
              };

              $scope.selectScript = (index: number, listType: string) => {
                if (listType === 'enabled') {
                  $scope.selectedEnabledScript = $scope.selectedEnabledScript === index ? -1 : index;
                  $scope.selectedDisabledScript = -1;
                } else {
                  $scope.selectedDisabledScript = $scope.selectedDisabledScript === index ? -1 : index;
                  $scope.selectedEnabledScript = -1;
                }
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
              maplebirch.gui.enabledModules = data.enabled;
              maplebirch.gui.disabledModules = data.disabled;
              await maplebirch.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
                const store = tx.objectStore('settings');
                const Extension = await store.get('Extension');
                Extension.value.enabled = data.enabled.map((m: any) => ({
                  name: m.name,
                  source: m.source,
                  dependencies: m.dependencies || []
                }));
                Extension.value.disabled = data.disabled.map((m: any) => ({
                  name: m.name,
                  source: m.source,
                  dependencies: m.dependencies || []
                }));
                await store.put(Extension);
              });
              break;
            case 'toggleScript':
              maplebirch.gui.enabledScripts = data.enabled;
              maplebirch.gui.disabledScripts = data.disabled;
              await maplebirch.idb.withTransaction(['settings'], 'readwrite', async (tx: any) => {
                const store = tx.objectStore('settings');
                const Script = await store.get('Script');
                Script.value.enabled = data.enabled;
                Script.value.disabled = data.disabled;
                await store.put(Script);
              });
              break;
          }
        },
        Language: maplebirch.Language,
        moduleText: maplebirch.gui.moduleList,
        enabledModules: maplebirch.gui.enabledModules,
        disabledModules: maplebirch.gui.disabledModules,
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
