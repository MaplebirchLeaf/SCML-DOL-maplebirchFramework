// .src/constants.ts

const version = modUtils.getMod('maplebirch').version;
const lastUpdate = '2026.03.01';
const lastModifiedBy = '楓樺葉';
const Languages = ['EN', 'CN'] as const;

const Config = {
  Title: ['Maplebirch Framworks', '秋枫白桦框架'],
  DEBUG: ['DEBUG MODE', '调试模式'],
  DEBUGSTATUS: ['DEBUG MODE STATUS', '调试模式状态'],
  EnabledSTATUS: [' Enabled', '已启用'],
  DisabledSTATUS: [' Disabled', '已禁用'],
  Languages: [['EN', 'English'], ['CN', 'Chinese']] as [string, string][],
  LanguageSelection: ['Frameworks Language Selection: ', '框架语言选择：'],
  EnableModule: ['Enable selected module', '启用选中模块'],
  DisableModule: ['Disable selected module', '禁用选中模块'],
  EnableScript: ['Enable selected script', '启用选中脚本'],
  DisableScript: ['Disable selected script', '禁用选中脚本']
};

const ModuleState: {[key: string|number]: string|number} = (() => {
  const state: {[key: string|number]: string|number} = {
    REGISTERED: 0,
    LOADED: 1,
    MOUNTED: 2,
    ERROR: 3,
    EXTENSION: 4
  };
  Object.entries(state).forEach(([key, value]) => state[value] = key);
  return state;
})();

export { version, lastUpdate, lastModifiedBy, Languages, Config, ModuleState }