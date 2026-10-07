// .src/constants.ts

import commonCN from '@/assets/translations/CN/Common.yaml?raw';
import characterCN from '@/assets/translations/CN/Character.yaml?raw';
import frameworkCN from '@/assets/translations/CN/Framework.yaml?raw';
import credentialCN from '@/assets/translations/CN/Credential.yaml?raw';
import cloudSaveCN from '@/assets/translations/CN/CloudSave.yaml?raw';
import traitsCN from '@/assets/translations/CN/Traits.yaml?raw';
import commonEN from '@/assets/translations/EN/Common.yaml?raw';
import characterEN from '@/assets/translations/EN/Character.yaml?raw';
import frameworkEN from '@/assets/translations/EN/Framework.yaml?raw';
import credentialEN from '@/assets/translations/EN/Credential.yaml?raw';
import cloudSaveEN from '@/assets/translations/EN/CloudSave.yaml?raw';
import traitsEN from '@/assets/translations/EN/Traits.yaml?raw';

export type LanguageCode = (typeof Languages)[number];

export const version = window.modUtils.getMod('maplebirch')!.version;
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
  ClearIndexedDB   : ['Clear IndexedDB', '清除索引数据库'],
  Repair           : {
    Title          : ['AI Repair', 'AI 修复'],
    Connection     : ['Settings', '配置'],
    Summary        : ['Summary', '结论'],
    Evidence       : ['Evidence', '依据'],
    Expand         : ['Expand', '展开'],
    Collapse       : ['Collapse', '收起'],
    EmptyAnalysis  : ['Not analyzed', '尚未分析'],
    ConfigSaved    : ['Saved', '已保存'],
    ConfigUnsaved  : ['Unsaved', '未保存'],
    ApiType        : ['API type', '接口类型'],
    FetchModels    : ['Fetch models', '获取模型'],
    ManualModel    : ['Manual entry', '手动填写'],
    SelectModel    : ['Select a model', '选择模型'],
    ApiUrl         : ['API URL', 'API URL'],
    ApiKey         : ['API Key', 'API Key'],
    Model          : ['Model', '模型'],
    Notice         : ['Settings and key saved locally. API fees may apply.', '配置与 Key 本地保存，API 可能收费。'],
    Save           : ['Save', '保存'],
    Test           : ['Test', '测试'],
    Analyze        : ['Analyze', '分析'],
    AnalyzeNotice  : ['Sends diagnostics, related source and authorized state fragments.', '发送诊断、相关源码与已授权状态片段。'],
    Preview        : ['Repair preview', '修复预览'],
    Before         : ['Before', '修改前'],
    After          : ['After', '修改后'],
    Reload         : ['Reload, retest, then confirm.', '重载后复测，再确认修复。'],
    Memory         : ['Memory', '记忆'],
    EmptyMemory    : ['No repairs', '暂无记录'],
    Enable         : ['Enable', '启用'],
    Disable        : ['Disable', '停用'],
    Delete         : ['Delete', '删除'],
    Confirm        : ['Confirm fix', '确认修复'],
    States         : {
      pending : ['Pending reload', '待重载'],
      trial   : ['Unverified', '待复测'],
      active  : ['Verified', '已验证'],
      disabled: ['Disabled', '已停用'],
      stale   : ['Outdated', '已失效'],
      failed  : ['Failed', '失败']
    },
    Close          : ['Close', '关闭']
  },
  RepairStatus     : {
    analyzing      : ['Analyzing…', '分析中…'],
    completed      : ['Done', '已完成'],
    insufficient   : ['No repair', '无可用修复'],
    analysisTimeout: ['Analysis timeout (15min)', '分析超时（15 分钟）'],
    loadingModels  : ['Fetching models…', '获取模型…'],
    success        : ['Connected', '连接成功'],
    configuration  : ['Check URL and model', '检查地址与模型'],
    unauthorized   : ['Invalid API key', 'Key 无效'],
    model          : ['Check model and API', '检查模型与接口'],
    context        : ['Context limit exceeded', '上下文超限'],
    rateLimit      : ['Rate limit or low quota', '限流或额度不足'],
    server         : ['API error', 'API 服务错误'],
    response       : ['Invalid response', '响应无效'],
    truncated      : ['Output truncated', '输出截断'],
    oversized      : ['Response too large', '响应过大'],
    timeout        : ['Connection timeout (20s)', '连接超时（20 秒）'],
    network        : ['Check network and CORS', '检查网络与跨域'],
    testing        : ['Connecting…', '连接中…'],
    saving         : ['Saving…', '保存中…'],
    reload         : ['Reload to apply', '重载后生效'],
    storage        : ['Storage error', '数据读写失败'],
    preflight      : ['Validation failed', '修复校验失败'],
    saveFailed     : ['Save failed', '保存失败'],
    cancelled      : ['Cancelled', '已取消']
  }
};

export enum ModuleState {
  REGISTERED,
  MOUNTED,
  ERROR,
  EXPOSED,
  DISABLED
}

export const Translations: Record<LanguageCode, readonly string[]> = {
  CN: [commonCN, characterCN, frameworkCN, credentialCN, cloudSaveCN, traitsCN],
  EN: [commonEN, characterEN, frameworkEN, credentialEN, cloudSaveEN, traitsEN]
};

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
