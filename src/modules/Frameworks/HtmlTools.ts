// ./src/modules/Frameworks/HtmlTools.ts

import { errorMessage } from '../../utils/error';
import { createlog, type MaplebirchCore } from '../../core';
import type { MacroFunction } from './macros';
import type { MacroContext } from '../../SugarCubeMacros';

export type HtmlRoot = Element | DocumentFragment;
export interface TextContext {
  readonly macro?: MacroContext;
  readonly args?: readonly unknown[];
  readonly name?: string;
  readonly widgetName?: string;
  readonly passageTitle?: string;
  readonly [key: string]: unknown;
}

interface TextHandler {
  id: string;
  fn: (tools: Builder) => void;
}

type TextContent = string | number | boolean | null | undefined;
type RawContent = TextContent | Node;

class Builder {
  public readonly auto: (text: string) => string;
  public readonly fragment: HtmlRoot;
  public readonly context: TextContext;

  public constructor(
    readonly parent: htmlTools,
    fragment: HtmlRoot,
    context: TextContext = {}
  ) {
    this.auto = text => parent.core.auto(text);
    this.fragment = fragment;
    this.context = context;
  }

  public text(content: TextContent, style?: string): this {
    if (content == null) return this;
    const span = document.createElement('span');
    const text = typeof content === 'string' ? content : content.toString();
    if (style) span.className = style;
    span.textContent = `${this.auto(text)} `;
    this.fragment.appendChild(span);
    return this;
  }

  public line(content?: TextContent, style?: string): this {
    this.fragment.appendChild(document.createElement('br'));
    if (content != null) this.text(content, style);
    return this;
  }

  public wikify(content: TextContent): this {
    if (content == null) return this;
    const Wikifier = this.parent.Wikifier;
    const text = typeof content === 'string' ? content : content.toString();
    if (!Wikifier) {
      this.parent.log('Wikifier 未设置，无法解析维基语法', 'ERROR');
      return this.text(text);
    }
    new Wikifier(this.fragment, text);
    return this;
  }

  public raw(content: RawContent): this {
    if (content == null) return this;
    if (content instanceof Node) {
      this.fragment.appendChild(content);
      return this;
    }
    const text = typeof content === 'string' ? content : content.toString();
    this.fragment.appendChild(document.createTextNode(text));
    return this;
  }

  public box(content: RawContent, style?: string): this {
    const box = document.createElement('div');
    if (style) box.className = style;
    if (content instanceof Node) {
      box.appendChild(content);
    } else if (content != null) {
      const text = typeof content === 'string' ? content : content.toString();
      box.appendChild(document.createTextNode(this.auto(text)));
    }
    this.fragment.appendChild(box);
    return this;
  }
}

class htmlTools {
  public readonly log: ReturnType<typeof createlog>;
  private uid = 0;
  private readonly store = new Map<string, TextHandler[]>();
  public constructor(readonly core: MaplebirchCore) {
    this.log = createlog('text');
  }

  public get Wikifier(): MaplebirchCore['SugarCube']['Wikifier'] {
    return this.core.SugarCube.Wikifier;
  }

  public replaceText(oldText: string, newText: string, root: HtmlRoot | null = document.getElementById('passage-content')): number {
    if (!root) return 0;
    const target = window.lanSwitch(oldText);
    const replacement = window.lanSwitch(newText);
    if (!target || !root.textContent?.includes(target)) return 0;
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let count = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.includes(target)) continue;
      if (node.parentElement?.closest('script, style, textarea')) continue;
      const parts = node.textContent.split(target);
      count += parts.length - 1;
      node.textContent = parts.join(replacement);
    }
    return count;
  }

  public renameLink(target: string | Element, label: string, root: HtmlRoot | null = document.getElementById('passage-content')): boolean {
    const link = this.findLink(target, root);
    if (!link) return false;
    link.textContent = window.lanSwitch(label);
    return true;
  }

  public replaceLink(target: string | Element, source: string, root: HtmlRoot | null = document.getElementById('passage-content')): boolean {
    const link = this.findLink(target, root);
    if (!link?.parentNode) return false;
    const container = link.ownerDocument.createElement('span');
    try {
      new this.Wikifier(container, window.lanSwitch(source));
      if (container.querySelector('.error')) return false;
      link.replaceWith(container);
      return true;
    } catch (error) {
      this.log('replaceLink:', 'ERROR', error);
      return false;
    }
  }

  private findLink(target: string | Element, root: HtmlRoot | null): Element | undefined {
    if (typeof target !== 'string') return target;
    const label = window.lanSwitch(target);
    if (!root || !label) return;
    const selector = '.macro-link, .link-internal';
    const links = [...(root instanceof Element && root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    return links.find(link => link.textContent?.includes(label));
  }

  public add(key: string, handler: (tools: Builder) => void, id?: string): string | false {
    if (typeof key !== 'string' || !key.trim() || typeof handler !== 'function') {
      this.log('注册失败: 参数无效', 'WARN');
      return false;
    }
    const handlers = this.store.get(key) || [];
    const finalId = id || `text_${++this.uid}`;
    const index = handlers.findIndex(item => item.id === finalId);
    const record = { id: finalId, fn: handler };
    if (index >= 0) {
      handlers[index] = record;
    } else {
      handlers.push(record);
    }
    this.store.set(key, handlers);
    this.log(`已注册处理器 [${key}] (ID: ${finalId})`, 'DEBUG');
    return finalId;
  }

  public delete(key: string, idOrHandler?: string | ((tools: Builder) => void)): boolean {
    const handlers = this.store.get(key);
    if (!handlers) return false;
    if (idOrHandler == null) {
      this.store.delete(key);
      this.log(`已清除键值所有处理器 [${key}]`, 'DEBUG');
      return true;
    }
    const filtered = handlers.filter(handler => (typeof idOrHandler === 'function' ? handler.fn !== idOrHandler : handler.id !== idOrHandler));
    const removed = handlers.length - filtered.length;
    if (removed <= 0) return false;
    if (filtered.length > 0) {
      this.store.set(key, filtered);
    } else {
      this.store.delete(key);
    }
    this.log(`已移除键值 [${key}] 的 ${removed} 个处理器`, 'DEBUG');
    return true;
  }

  public clear(): void {
    const count = this.store.size;
    this.store.clear();
    this.log(`已清除所有键值 (共 ${count} 个)`, 'DEBUG');
  }

  public renderFragment(keys: string | string[], context: TextContext = {}): DocumentFragment {
    const fragment = document.createDocumentFragment();
    this.renderInto(fragment, keys, context);
    return fragment;
  }

  public renderInto(root: HtmlRoot, keys: string | string[], context: TextContext = {}): void {
    const tools = new Builder(this, root, context);
    const list = Array.isArray(keys) ? keys : keys == null ? [] : [keys];
    for (const key of list) {
      const handlers = this.store.get(key);
      if (!handlers) {
        this.log(`渲染片段: 未找到键值 [${key}]`, 'DEBUG');
        continue;
      }
      for (const { fn } of handlers.slice()) {
        try {
          fn(tools);
        } catch (error) {
          this.log(`处理器错误 [${key}]: ${errorMessage(error)}`, 'ERROR', error);
        }
      }
    }
  }

  public render(macro: MacroContext, keys: string | string[]): void {
    if (keys == null) return;
    try {
      this.renderInto(macro.output, keys, { ...macro, macro, name: macro.name, args: Array.from(macro.args) });
    } catch (error) {
      this.log(`渲染到宏输出失败: ${errorMessage(error)}`, 'ERROR', error);
    }
  }

  public makeTextOutput(options: { CSV?: boolean } = {}): MacroFunction {
    const CSV = options.CSV ?? true;
    const render = this.render.bind(this);
    return function (this: MacroContext) {
      const raw: unknown = this.args[0];
      if (typeof raw === 'string') {
        const keys = CSV
          ? raw
              .split(',')
              .map(item => item.trim())
              .filter(Boolean)
          : raw;
        render(this, keys);
      } else if (Array.isArray(raw) && raw.every((key): key is string => typeof key === 'string')) {
        render(this, raw);
      } else {
        this.error('maplebirchTextOutput requires a string or string array');
      }
    };
  }
}

export default htmlTools;
