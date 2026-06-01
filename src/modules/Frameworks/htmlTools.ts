// ./src/modules/Frameworks/HtmlTools.ts

import { createlog } from '../../core';
import type { MacroContext } from '../../SugarCubeMacros';
import type { MacroFunction } from './macros';
import ToolCollection from '../ToolCollection';

interface TextHandler {
  id: string;
  fn: (tools: Builder) => void;
}

type TextContent = string | number | boolean | null | undefined;
type RawContent = TextContent | Node;

class Builder {
  public readonly auto: (text: string) => string;
  public readonly fragment: DocumentFragment;
  public readonly context: Record<string, any>;

  public constructor(
    readonly parent: htmlTools,
    fragment: DocumentFragment,
    context: Record<string, any> = {}
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
    const container = document.createElement('div');
    new Wikifier(container, text);
    while (container.firstChild) this.fragment.appendChild(container.firstChild);
    return this;
  }

  public raw(content: RawContent): this {
    if (content == null) return this;
    if (content instanceof Node) {
      this.fragment.appendChild(content);
      return this;
    }
    const text = typeof content === 'string' ? content : content.toString();
    this.fragment.appendChild(document.createTextNode(this.auto(text)));
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
  public readonly core: ToolCollection['core'];
  public readonly log: ReturnType<typeof createlog>;
  private uid = 0;
  private readonly store = new Map<string, TextHandler[]>();
  public constructor(manager: ToolCollection) {
    this.core = manager.core;
    this.log = createlog('text');
  }

  public get Wikifier(): any {
    return this.core.SugarCube.Wikifier;
  }

  public replaceText(oldText: string, newText: string): void {
    const passage = document.getElementById('passage-content');
    if (!passage) return;
    const target = window.lanSwitch(oldText);
    const replacement = window.lanSwitch(newText);
    if (!target || !passage.textContent?.includes(target)) return;
    const walker = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.includes(target)) continue;
      node.textContent = node.textContent.split(target).join(replacement);
    }
  }

  public replaceLink(oldLink: string, newLink: string): void {
    const passage = document.getElementById('passage-content');
    if (!passage) return;
    const target = window.lanSwitch(oldLink);
    const replacement = window.lanSwitch(newLink);
    if (!target) return;
    const links = passage.querySelectorAll('.macro-link, .link-internal');
    for (const link of links) {
      if (!link.textContent?.includes(target)) continue;
      const container = document.createElement('span');
      try {
        link.parentNode?.replaceChild(container, link);
        new this.core.SugarCube.Wikifier(container, replacement);
      } catch (error) {
        this.log('replaceLink:', 'ERROR', error);
        container.textContent = replacement;
      }
      return;
    }
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

  public renderFragment(keys: string | string[], context: Record<string, any> = {}): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const tools = new Builder(this, fragment, context);
    const list = Array.isArray(keys) ? keys : keys == null ? [] : [keys];
    for (const key of list) {
      const handlers = this.store.get(key);
      if (!handlers) {
        this.log(`渲染片段: 未找到键值 [${key}]`, 'DEBUG');
        continue;
      }
      for (const { fn } of handlers) {
        try {
          fn(tools);
        } catch (error: any) {
          this.log(`处理器错误 [${key}]: ${error?.message || error}`, 'ERROR', error);
        }
      }
    }
    return fragment;
  }

  public render(macro: any, keys: string | string[]): void {
    if (keys == null) return;
    try {
      const fragment = this.renderFragment(keys, macro);
      const output = macro?.output;
      if (output?.appendChild) {
        output.appendChild(fragment);
        return;
      }
      if (output?.append) {
        output.append(fragment);
        return;
      }
      this.log(`无法找到宏输出目标: ${String(macro)}`, 'WARN');
      console.log(fragment);
    } catch (error: any) {
      this.log(`渲染到宏输出失败: ${error?.message || error}`, 'ERROR', error);
    }
  }

  public makeTextOutput(options: { CSV?: boolean } = {}): MacroFunction {
    const CSV = options.CSV ?? true;
    const render = this.render.bind(this);
    return function (this: any) {
      const raw = this.args?.[0];
      let keys = raw;
      if (CSV && typeof raw === 'string' && raw.includes(',')) {
        keys = raw
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
      }
      render(this, keys);
    };
  }
}

export default htmlTools;
