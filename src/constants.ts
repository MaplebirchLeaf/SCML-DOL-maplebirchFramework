// .src/constants.ts

export type LanguageCode = (typeof Languages)[number];

export const version = window.modUtils.getMod('maplebirch').version;
export const Languages = ['EN', 'CN'] as const;

// prettier-ignore
export const Config = {
  Title            : ['Maplebirch Framworks', '秋枫白桦框架'],
  DEBUG            : ['DEBUG MODE', '调试模式'],
  DEBUGSTATUS      : ['DEBUG MODE STATUS', '调试模式状态'],
  EnabledSTATUS    : [' Enabled', '已启用'],
  DisabledSTATUS   : [' Disabled', '已禁用'],
  Languages        : [['EN', 'English'], ['CN', 'Chinese']] as [string, string][],
  LanguageSelection: ['Frameworks Language Selection: ', '框架语言选择：'],
  EnableModule     : ['Enable selected module', '启用选中模块'],
  DisableModule    : ['Disable selected module', '禁用选中模块'],
  EnableScript     : ['Enable selected script', '启用选中脚本'],
  DisableScript    : ['Disable selected script', '禁用选中脚本'],
  ClearIndexedDB   : ['Clear IndexedDB', '清除索引数据库']
};

// prettier-ignore
export const ModuleState: {[key: string|number]: string|number} = (() => {
  const state: {[key: string|number]: string|number} = {
    REGISTERED: 0,
    MOUNTED   : 1,
    ERROR     : 2,
    EXPOSED   : 3,
    DISABLED  : 4
  };
  Object.entries(state).forEach(([key, value]) => state[value] = key);
  return state;
})();

export const TimeConstants = (() => {
  const secondsPerDay = 86400;
  const secondsPerHour = 3600;
  const secondsPerMinute = 60;
  const minutesPerHour = 60;
  const standardYearMonths = Object.freeze([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  const leapYearMonths = Object.freeze([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  const synodicMonth = 29.53058867;
  const MIN_DATE = Object.freeze({
    timeStamp: -315537984000,
    year: -9999,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
  });
  const MAX_DATE = Object.freeze({
    timeStamp: 315537897599,
    year: 9999,
    month: 12,
    day: 31,
    hour: 23,
    minute: 59,
    second: 59
  });

  return Object.freeze({
    secondsPerDay,
    secondsPerHour,
    secondsPerMinute,
    minutesPerHour,
    standardYearMonths,
    leapYearMonths,
    synodicMonth,
    MIN_DATE,
    MAX_DATE
  });
})();
