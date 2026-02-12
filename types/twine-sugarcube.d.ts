interface Util {
  /** 获取值的类型字符串表示 */
  readonly getType: (value: any) => string;
  /** 检查是否为布尔值 */
  readonly isBoolean: (value: any) => boolean;
  /** 检查是否为可迭代对象 */
  readonly isIterable: (value: any) => boolean;
  /** 检查是否为数字 */
  readonly isNumeric: (value: any) => boolean;
  /** SameValueZero 比较算法 (同值零比较) */
  readonly sameValueZero: (a: any, b: any) => boolean;
  /** 将对象转换为枚举 */
  readonly toEnum: (obj: Array<any> | Set<any> | Map<any, any> | Record<string, any>) => Readonly<Record<string, any>>;
  /** 获取对象的内部 [[Class]] 属性 */
  readonly toStringTag: (obj: any) => string;
  /** 将字符串转换为 URL 友好的 slug */
  readonly slugify: (str: string) => string;
  /** 清理文件名，移除非法字符 */
  readonly sanitizeFilename: (str: string) => string;
  /** 转义标记字符 */
  readonly escapeMarkup: (str: string) => string;
  /** HTML 实体编码 */
  readonly escape: (str: string) => string;
  /** HTML 实体解码 */
  readonly unescape: (str: string) => string;
  /** 获取指定位置的字符及其边界 */
  readonly charAndPosAt: (text: string, position: number) => {
    char: string;
    start: number;
    end: number;
  };
  /** 高精度时间戳 */
  readonly now: () => number;
  /** 转换 CSS 时间值为毫秒 */
  readonly fromCssTime: (cssTime: string) => number;
  /** 转换毫秒为 CSS 时间值 */
  readonly toCssTime: (msec: number) => string;
  /** 转换 CSS 属性名（连字符转驼峰） */
  readonly fromCssProperty: (cssName: string) => string;
  /** 解析 URL 字符串为对象 */
  readonly parseUrl: (url: string) => {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    path: string;
    pathname: string;
    query: string;
    search: string;
    queries: Record<string, string>;
    searches: Record<string, string>;
    hash: string;
  };
  /** 从现有错误创建新类型的错误 */
  readonly newExceptionFrom: (
    original: Error,
    exceptionType: new (message: string) => Error,
    override?: string | Record<string, any>
  ) => Error;
  /** 规范化事件键名 */
  readonly scrubEventKey: (key: string) => string;
  /** 检查媒体查询是否匹配 */
  readonly hasMediaQuery: (mediaQuery: string) => boolean;
  /** 生成随机数 */
  readonly random: () => number;
  /** HTML 实体编码（escape 的别名） */
  readonly entityEncode: (str: string) => string;
  /** HTML 实体解码（unescape 的别名） */
  readonly entityDecode: (str: string) => string;
  /** 评估 JavaScript 表达式 */
  readonly evalExpression: (...args: any[]) => any;
  /** 评估 JavaScript 语句 */
  readonly evalStatements: (...args: any[]) => any;
}

declare module 'twine-sugarcube' {
  export { SugarCubeObject, MacroDefinition, WikifierAPI, SugarCubeSetupObject } from 'twine-sugarcube';

  export interface SugarCubeObject {
    readonly Util: Util;
  }

  export interface MacroDefinition {
    isAsync?: boolean,
    isWidget?: boolean
  }

  export interface WikifierAPI {
    wikifyEval(text: string, passageObj?: { title: string }, passageTitle?: string): DocumentFragment;
  }

  export interface SugarCubeSetupObject {
    [x: string]: any;
  }
}

declare global {
  interface JQueryAriaClickOptions {
    /**
     * Value for the role attribute.
     */
    role?: string;
  }

  const C: { [x: string]: any; };
  const T: { [x: string]: any; };
  const V: { [x: string]: any; };
}

export {}