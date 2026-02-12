// ./src/modules/Frameworks/htmlTools.ts

import { createlog } from '../../core';
import { random } from '../../utils';
import ToolCollection from '../ToolCollection';

interface TextHandler {
  id: string;
  fn: (tools: Builder) => void;
}

class Builder {
  parent: htmlTools;
  auto: (text: string) => string;
  fragment: DocumentFragment;
  context: Record<string, any>;

  constructor(parent: htmlTools, fragment: DocumentFragment, context: Record<string, any> = {}) {
    this.parent = parent;
    this.auto = parent.core.auto as (text: string) => string;
    this.fragment = fragment;
    this.context = context;
  }

  text(content: string | null, style?: string) {
    if (content == null) return this;
    const el = document.createElement('span');
    if (style) el.classList.add(style);
    const translated = this.auto(String(content));
    el.textContent = (translated == null ? '' : translated) + ' ';
    this.fragment.appendChild(el);
    return this;
  }

  line(content: string | null, style?: string) {
    this.fragment.appendChild(document.createElement('br'));
    if (content == null) return this;
    const translated = this.auto(String(content));
    this.text(translated, style);
    return this;
  }

  wikify(content: string | null) {
    if (!this.parent.Wikifier) {
      this.parent.log('Wikifier 未设置，无法解析维基语法', 'ERROR');
      this.text(content, null);
      return this;
    }
    const tempContainer = document.createElement('div');
    const contentStr = content != null ? String(content) : '';
    new this.parent.Wikifier(tempContainer, contentStr);
    while (tempContainer.firstChild) this.fragment.appendChild(tempContainer.firstChild);
    return this;
  }

  raw(content: Node | string | null) {
    if (content == null) return this;
    if (content instanceof Node) {
      this.fragment.appendChild(content);
    } else {
      const translated = this.auto(String(content));
      this.fragment.appendChild(document.createTextNode(translated));
    }
    return this;
  }

  box(content: Node | string | null, style?: string) {
    const box = document.createElement('div');
    if (style) box.classList.add(style);
    if (content == null) { 
      this.fragment.appendChild(box); 
      return this; 
    }
    if (content instanceof Node) {
      box.appendChild(content);
    } else {
      const translated = this.auto(String(content));
      box.appendChild(document.createTextNode(translated));
    }
    this.fragment.appendChild(box);
    return this;
  }
};

class htmlTools {
  core: ToolCollection['core'];
  readonly log: ReturnType<typeof createlog>;
  store: Map<string, TextHandler[]>;

  constructor(manager: ToolCollection) {
    this.core = manager.core;
    this.log = createlog('text');
    this.store = new Map();
  }

  get Wikifier() {
    return this.core.SugarCube.Wikifier as typeof Wikifier;
  }

  replaceText(oldText: string | any, newText: string) {
    const passageContent = document.getElementById('passage-content');
    if (!passageContent) return;
    const targetText = window.lanSwitch(oldText);
    const actualNewText = window.lanSwitch(newText);
    const fullText = passageContent.textContent;
    if (!fullText || !fullText.includes(targetText)) return;
    const walker = document.createTreeWalker(
      passageContent,
      NodeFilter.SHOW_TEXT,
      null,
    );
    let node: Node | null;
    const nodesToReplace: Node[] = [];
    while (node = walker.nextNode()) if (node.textContent && node.textContent.includes(targetText)) nodesToReplace.push(node);
    nodesToReplace.forEach(node => {
      try {
        const containerId = `textReplace_${Date.now()}_${Math.random()}`;
        const container = document.createElement('span');
        container.id = containerId;
        node.parentNode?.replaceChild(container, node);
        new this.core.SugarCube.Wikifier(null, `<<replace '#${containerId}'>>${actualNewText}<</replace>>`);
      } catch (error) {
        this.log('replaceText:', 'ERROR', error);
        try { 
          if (node.textContent) node.textContent = actualNewText; 
        } catch (e) { }
      }
    });
  }

  replaceLink(oldLink: string | any, newLink: string) {
    const passageContent = document.getElementById('passage-content');
    if (!passageContent) return;
    const targetLink = window.lanSwitch(oldLink);
    const actualNewLink = window.lanSwitch(newLink);
    const links = passageContent.querySelectorAll('.macro-link, .link-internal');
    for (let link of links) {
      if (link.textContent && link.textContent.includes(targetLink)) {
        try {
          const containerId = `linkReplace_${Date.now()}`;
          const container = document.createElement('span');
          container.id = containerId;
          link.parentNode?.replaceChild(container, link);
          new this.core.SugarCube.Wikifier(null, `<<replace '#${containerId}'>>${actualNewLink}<</replace>>`);
          break;
        } catch (error) {
          this.log('replaceLink:', 'ERROR', error)
          try { link.outerHTML = actualNewLink; } catch (e) {}
        }
      }
    }
  }

  add(key: string, handler: (tools: Builder) => void, id?: string) {
    if (this.core.lodash.isNil(key) || !this.core.lodash.isString(key) || !this.core.lodash.isFunction(handler)) {
      this.log('注册失败: 参数无效', 'WARN');
      return false;
    }
    if (!this.store.has(key)) this.store.set(key, []);
    const finalId = id ?? `ts_${random(0, 0xFFFFFFFF)}`;
    this.store.get(key)!.push({ id: finalId, fn: handler });
    this.log(`已注册处理器 [${key}] (ID: ${finalId})`, 'DEBUG');
    return finalId;
  }

  delete(key: string, idOrHandler?: string | ((tools: Builder) => void)) {
    if (!this.store.has(key)) return false;
    if (this.core.lodash.isNil(idOrHandler)) {
      this.store.delete(key);
      this.log(`已清除键值所有处理器 [${key}]`, 'DEBUG');
      return true;
    }
    const Count = this.store.get(key)!.length;
    const isFunction = this.core.lodash.isFunction(idOrHandler);
    const predicate = isFunction ? (h: TextHandler) => h.fn !== idOrHandler : (h: TextHandler) => h.id !== idOrHandler;
    const filtered = this.core.lodash.filter(this.store.get(key)!, predicate);
    if (this.core.lodash.isEmpty(filtered)) {
      this.store.delete(key);
      this.log(`已移除键值所有处理器 [${key}]`, 'DEBUG');
    } else {
      this.store.set(key, filtered);
      const removed = Count - filtered.length;
      if (removed > 0) this.log(`已移除键值 [${key}] 的 ${removed} 个处理器`, 'DEBUG');
    }
    return true;
  }

  clear() {
    const keyCount = this.store.size;
    this.store.clear();
    this.log(`已清除所有键值 (共 ${keyCount} 个)`, 'DEBUG');
  }

  renderFragment(keys: string | string[], context: Record<string, any> = {}): DocumentFragment {
    const fragment = document.createDocumentFragment();
    const tools = new Builder(this, fragment, context);
    const list = Array.isArray(keys) ? keys.slice() : (keys == null ? [] : [keys]);
    for (const key of list) {
      if (!this.store.has(key)) { this.log(`渲染片段: 未找到键值 [${key}]`, 'DEBUG'); continue; }
      const handlers = this.store.get(key)!.slice();
      this.log(`开始渲染键值 [${key}] (${handlers.length} 个处理器)`, 'DEBUG');
      for (const { fn } of handlers) try { fn(tools); } catch (e: any) { this.log(`处理器错误 [${key}]: ${e?.message || e}`, 'ERROR'); }
    }
    return fragment;
  }

  render(macro: any, keys: string | string[]) {
    if (this.core.lodash.isNil(keys)) return;
    try {
      const frag = this.renderFragment(keys, macro);
      const output = macro?.output;
      if (output?.append) {
        output.append(frag);
      } else if (output?.appendChild) {
        output.appendChild(frag);
      } else {
        this.log(`无法找到宏输出目标: ${this.core.lodash.toString(macro)}`, 'WARN');
        console.log(frag);
      }
    } catch (e: any) {
      this.log(`渲染到宏输出失败: ${e?.message || e}`, 'ERROR');
    }
  }

  makeTextOutput(options: { CSV?: boolean } = {}) {
    const cfg = this.core.lodash.defaults({}, options, { CSV: true });
    const self = this;
    return function (this: any) {
      const raw = this.args && this.args.length ? this.args[0] : null;
      let keys: string|string[] | null = raw;
      if (cfg.CSV && this.core.lodash.isString(raw) && raw.includes(',')) keys = this.core.lodash.chain(raw).split(',').map((s: string) => s.trim()).filter(Boolean).value();
      self.render(this, keys as string | string[]);
    };
  }
}

export default htmlTools