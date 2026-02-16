// ./src/modules/Frameworks/applyLinkZone.ts

import { MaplebirchCore, createlog } from '../../core';
import maplebirch from '../../core';
import { merge } from '../../utils';

interface LinkZoneConfig {
  containerId: string;
  linkSelector: string;
  beforeMacro: () => string;
  afterMacro: () => string;
  customMacro: () => { position: number; macro: string }[];
  zoneStyle: Partial<CSSStyleDeclaration>;
  onBeforeApply?: () => void;
  onAfterApply?: (result: boolean, config: LinkZoneConfig) => void;
  debug: boolean;
}

const log = createlog('link');

class LinkZoneManager {
  firstLink: Element | null = null;
  lastLink: Element | null = null;
  allLinks: Element[] = [];
  lineBreakBeforeFirstLink: ChildNode | null = null;
  containerId: string;
  linkSelector: string;
  readonly log: ReturnType<typeof createlog>;
  private readonly _: typeof maplebirch.lodash;

  constructor(containerId: string = 'passages', linkSelector: string = '.macro-link', logger: typeof log) {
    this.log = logger;
    this.containerId = containerId;
    this.linkSelector = linkSelector;
    this._ = maplebirch.lodash;
    this._resetState();
  }

  private _resetState(): void {
    this.firstLink = null;
    this.lastLink = null;
    this.allLinks = [];
    this.lineBreakBeforeFirstLink = null;
  }

  detectLinks(): {
    firstLink: Element;
    lastLink: Element;
    totalLinks: number;
    lineBreakBeforeFirstLink: Node | null;
  } | null {
    this._resetState();
    const container = document.getElementById(this.containerId);
    if (!container) return null;
    const allLinks = container.querySelectorAll(this.linkSelector);
    this.allLinks = this._.filter(Array.from(allLinks), (link: Element) => this._isElementVisible(link));
    if (this._.isEmpty(this.allLinks)) return null;
    this.firstLink = this._.first(this.allLinks);
    this.lastLink = this._.last(this.allLinks);
    this._detectLineBreakBeforeFirstLink();
    return {
      firstLink: this.firstLink!,
      lastLink: this.lastLink!,
      totalLinks: this.allLinks.length,
      lineBreakBeforeFirstLink: this.lineBreakBeforeFirstLink
    };
  }

  private _detectLineBreakBeforeFirstLink(): void {
    if (!this.firstLink) return;
    let node = this.firstLink.previousSibling;
    while (node) {
      if (this._isLineBreakNode(node)) {
        this.lineBreakBeforeFirstLink = node;
        return;
      }
      node = node.previousSibling;
    }
  }

  private _isLineBreakNode(node: Node): boolean {
    if (!node) return false;
    if (node.nodeType === Node.TEXT_NODE) return /\n/.test((node as Text).textContent || '');
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (this._.includes(['BR', 'HR'], element.nodeName)) return true;
      const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
      if (this._.includes(blockTags, element.nodeName)) return true;
      const display = getComputedStyle(element).display;
      return this._.includes(['block', 'flex', 'grid', 'table', 'table-row', 'table-cell'], display);
    }
    return false;
  }

  private _isElementVisible(element: Element): boolean {
    if (!element || !(element as any).getBoundingClientRect) return false;
    const { display, visibility, opacity } = getComputedStyle(element);
    if (display === 'none' || visibility === 'hidden' || opacity === '0') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private _createZoneElement(id: string | null, config: LinkZoneConfig): HTMLElement {
    const zone = document.createElement('div');
    if (id) zone.id = id;
    Object.assign(zone.style, config.zoneStyle);
    return zone;
  }

  private _applyCustomLinkZone(position: number, config: LinkZoneConfig): HTMLElement | null {
    if (position < 0 || position >= this.allLinks.length) return null;
    const targetLink = this.allLinks[position];
    if (!targetLink) {
      this.log(`[link] 未找到位置 ${position} 的链接`, 'WARN');
      return null;
    }

    const zone = this._createZoneElement(null, config);
    zone.setAttribute('data-link-zone-position', position.toString());

    let lineBreakNode: ChildNode | null = null;
    let node = targetLink.previousSibling;
    while (node) {
      if (this._isLineBreakNode(node)) {
        lineBreakNode = node;
        break;
      }
      node = node.previousSibling;
    }

    if (lineBreakNode) {
      if (lineBreakNode.nodeType === Node.TEXT_NODE) {
        const content = (lineBreakNode as Text).textContent || '';
        const breakIndex = content.lastIndexOf('\n');
        if (breakIndex === -1) {
          lineBreakNode.after(zone);
        } else {
          const beforeText = content.substring(0, breakIndex + 1);
          const afterText = content.substring(breakIndex + 1);
          (lineBreakNode as Text).textContent = beforeText;
          lineBreakNode.after(zone, document.createTextNode(afterText));
        }
      } else {
        lineBreakNode.after(zone);
      }
    } else {
      targetLink.before(zone);
    }

    this.log(`[link] 在位置 ${position} 的链接前插入区域（ID: ${zone.id}）`, 'DEBUG', targetLink);
    return zone;
  }

  applyZones(config: LinkZoneConfig): boolean {
    const results = this.detectLinks();
    if (!results) {
      if (config.debug) this.log('[link] 没有找到可见链接', 'DEBUG');
      return false;
    }
    this._applyBeforeLinkZone(config);
    this._applyAfterLinkZone(config);
    const macroArray = this._.isArray(config.customMacro()) ? config.customMacro() : [];
    if (!this._.isEmpty(macroArray)) this._.forEach(macroArray, (zoneConfig: { position: number }) => this._applyCustomLinkZone(zoneConfig.position, config));
    return true;
  }

  private _applyBeforeLinkZone(config: LinkZoneConfig): void {
    if (!this.firstLink || !this.lineBreakBeforeFirstLink) return;
    const zone = this._createZoneElement('beforeLinkZone', config);

    if (this.lineBreakBeforeFirstLink.nodeType === Node.TEXT_NODE) {
      const content = (this.lineBreakBeforeFirstLink as Text).textContent || '';
      const breakIndex = content.lastIndexOf('\n');
      if (breakIndex === -1) {
        this.lineBreakBeforeFirstLink.after(zone);
      } else {
        const beforeText = content.substring(0, breakIndex + 1);
        const afterText = content.substring(breakIndex + 1);
        (this.lineBreakBeforeFirstLink as Text).textContent = beforeText;
        this.lineBreakBeforeFirstLink.after(zone, document.createTextNode(afterText));
      }
    } else {
      this.lineBreakBeforeFirstLink.after(zone);
    }

    if (config.debug) this.log('应用链接前区域', 'DEBUG', zone);
  }

  private _applyAfterLinkZone(config: LinkZoneConfig): void {
    if (!this.lastLink) return;
    const zone = this._createZoneElement('afterLinkZone', config);
    this.lastLink.after(zone);
    if (config.debug) this.log('应用链接后区域', 'DEBUG', zone);
  }
}

const applyLinkZone = ((core: MaplebirchCore) => {
  'use strict';

  const defaultConfig: LinkZoneConfig = {
    containerId: 'passage-content',
    linkSelector: '.macro-link',
    beforeMacro: () => core.tool.zone.play('BeforeLinkZone'),
    afterMacro: () => core.tool.zone.play('AfterLinkZone'),
    customMacro: () => core.tool.zone.play('CustomLinkZone'),
    zoneStyle: {
      display: 'none',
      verticalAlign: 'top'
    } as Partial<CSSStyleDeclaration>,
    onBeforeApply: null,
    onAfterApply: null,
    debug: false
  };

  function apply(userConfig: Partial<LinkZoneConfig> = {}): boolean {
    const config = merge({} as LinkZoneConfig, defaultConfig, userConfig);
    config.onBeforeApply?.();
    const linkZone = new LinkZoneManager(config.containerId, config.linkSelector, log);
    const result = linkZone.applyZones(config);
    if (result) addContentToZones(config);
    config.onAfterApply?.(result, config);
    return result;
  }

  function addContentToZones(config: LinkZoneConfig): void {
    defaultZone('beforeLinkZone', config.beforeMacro, config);
    defaultZone('afterLinkZone', config.afterMacro, config);
    const macroArray = core.lodash.isArray(config.customMacro()) ? config.customMacro() : [];
    if (!core.lodash.isEmpty(macroArray)) {
      core.lodash.forEach(macroArray, (zoneConfig: { position: number; macro: string }) => {
        const { position } = zoneConfig;
        customZone(position, zoneConfig.macro, config);
      });
    }
  }

  function defaultZone(zoneId: string, macro: (() => void | string) | string, config: LinkZoneConfig): void {
    const element = document.getElementById(zoneId);
    if (!element) return;
    processMacroContent(element, macro, config);
  }

  function customZone(position: number, macro: string, config: LinkZoneConfig): void {
    const element = document.querySelector(`[data-link-zone-position='${position}']`);
    if (!element) return;
    processMacroContent(element, macro, config);
  }

  function processMacroContent(element: Element, macro: (() => void | string) | string, config: LinkZoneConfig): void {
    let macroContent: string | void;
    if (core.lodash.isFunction(macro)) {
      try {
        macroContent = (macro as () => string)();
      } catch (error: any) {
        log(`[link] 执行宏函数出错: ${error.message}`, 'ERROR');
        return;
      }
    } else {
      macroContent = macro;
    }

    if (!macroContent) {
      element.innerHTML = '';
      (element as HTMLElement).style.display = 'none';
      return;
    }

    const tempContainer = document.createElement('div');
    if (core.lodash.isFunction(void $.wiki)) {
      ($(tempContainer) as any).wiki(macroContent);
    } else if (typeof Wikifier !== 'undefined') {
      new core.SugarCube.Wikifier(tempContainer, macroContent as string);
    } else {
      tempContainer.innerHTML = macroContent as string;
    }

    element.innerHTML = '';
    element.append(...tempContainer.childNodes);
    element.querySelectorAll('script').forEach((script: HTMLScriptElement) => {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      script.replaceWith(newScript);
    });
    if (element.childNodes.length > 0) {
      (element as HTMLElement).style.display = 'block';
    } else {
      (element as HTMLElement).style.display = 'none';
    }
    if (config.debug) log('[link] 添加内容到区域', 'DEBUG', macroContent);
  }

  Object.defineProperties(LinkZoneManager, {
    apply: { value: apply },
    add: { value: addContentToZones },
    defaultConfig: { get: () => defaultConfig }
  });

  core.once(':storyready', () => {
    document.getElementById('beforeLinkZone')?.remove();
    document.getElementById('afterLinkZone')?.remove();
    document.querySelectorAll('[data-link-zone-position]').forEach(zone => zone.remove());
    apply({ debug: true });
  });

  core.on(':passagedisplay', () => apply(), 'applylinkzone');

  return LinkZoneManager;
})(maplebirch);

export default applyLinkZone;
