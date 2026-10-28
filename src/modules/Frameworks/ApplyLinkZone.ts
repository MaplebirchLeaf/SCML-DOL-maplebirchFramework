// ./src/modules/Frameworks/ApplyLinkZone.ts

import maplebirch, { type MaplebirchCore } from '../../core';
import type { ScopedLog } from '../../infra/Diagnostics';
interface CustomZone {
  position: number;
  macro: string;
}

interface LinkZoneConfig {
  containerId: string;
  linkSelector: string;
  beforeMacro: () => string;
  afterMacro: () => string;
  customMacro: () => CustomZone[];
  zoneStyle: Partial<CSSStyleDeclaration>;
  onBeforeApply?: (() => void) | null;
  onAfterApply?: ((result: boolean, config: LinkZoneConfig) => void) | null;
  debug: boolean;
}

const ICON_TAGS = 'img, picture, svg, canvas';
const LINK_TAGS = 'a, .macro-link, .link-internal';
const BLOCK_TAGS = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
const BLOCK_DISPLAYS = ['block', 'flex', 'grid', 'table', 'table-row', 'table-cell'];

class LinkZoneManager {
  declare public static readonly apply: (config?: Partial<LinkZoneConfig>) => boolean;
  declare public static readonly add: (config: LinkZoneConfig, customZones: CustomZone[]) => void;
  declare public static readonly defaultConfig: LinkZoneConfig;
  public firstLink: Element | null = null;
  public lastLink: Element | null = null;
  public links: Element[] = [];

  public readonly log: ScopedLog;

  public constructor(
    readonly containerId = 'passage-content',
    readonly linkSelector = '.macro-link',
    logger: ScopedLog
  ) {
    this.log = logger;
  }

  public detect(): boolean {
    this.firstLink = null;
    this.lastLink = null;
    this.links = [];
    const container = document.getElementById(this.containerId);
    if (!container) return false;
    this.links = Array.from(container.querySelectorAll(this.linkSelector)).filter(link => this.visible(link));
    if (this.links.length === 0) return false;
    this.firstLink = this.links[0];
    this.lastLink = this.links[this.links.length - 1];
    return true;
  }

  public applyZones(config: LinkZoneConfig, customZones: CustomZone[]): boolean {
    if (!this.detect()) {
      if (config.debug) this.log('[link] 没有找到可见链接', 'DEBUG');
      return false;
    }
    this.applyBefore(config);
    this.applyAfter(config);
    for (const zone of customZones) this.applyCustom(zone.position, config);
    return true;
  }

  private applyBefore(config: LinkZoneConfig): void {
    if (!this.firstLink) return;
    const zone = this.zone('beforeLinkZone', config);
    const { breakNode, anchor } = this.findBefore(this.firstLink);
    this.insertAfterBreak(zone, breakNode, anchor);
    if (config.debug) this.log('应用链接前区域', 'DEBUG', zone);
  }

  private applyAfter(config: LinkZoneConfig): void {
    const container = document.getElementById(this.containerId);
    if (!this.lastLink || !container) return;
    const zone = this.zone('afterLinkZone', config);
    container.append(zone);
    if (config.debug) this.log('应用链接后区域', 'DEBUG', zone);
  }

  private applyCustom(position: number, config: LinkZoneConfig): void {
    const index = position < 0 ? this.links.length + position : position;
    if (!Number.isInteger(position) || index < 0 || index >= this.links.length) return;
    const target = this.links[index];
    if (!target) {
      this.log(`[link] 未找到位置 ${position} 的链接`, 'WARN');
      return;
    }
    const zone = this.zone(null, config);
    const { breakNode, anchor } = this.findBefore(target);
    zone.dataset.linkZonePosition = String(position);
    this.insertAfterBreak(zone, breakNode, anchor);
    if (config.debug) this.log(`[link] 在位置 ${position} 的链接前插入区域`, 'DEBUG', target);
  }

  private zone(id: string | null, config: LinkZoneConfig): HTMLElement {
    const zone = document.createElement('div');
    if (id) zone.id = id;
    Object.assign(zone.style, config.zoneStyle);
    return zone;
  }

  private insertAfterBreak(zone: HTMLElement, breakNode: ChildNode | null, anchor: ChildNode): void {
    if (!breakNode) {
      anchor.before(zone);
      return;
    }

    if (breakNode.nodeType !== Node.TEXT_NODE) {
      breakNode.after(zone);
      return;
    }

    const text = breakNode.textContent || '';
    const index = text.lastIndexOf('\n');

    if (index === -1) {
      breakNode.after(zone);
      return;
    }

    breakNode.textContent = text.slice(0, index + 1);
    breakNode.after(zone, document.createTextNode(text.slice(index + 1)));
  }

  private findBefore(element: Element): { breakNode: ChildNode | null; anchor: ChildNode } {
    const anchor = this.leadingIcon(element);
    if (!anchor) return this.findBreakBefore(element);
    const previous = anchor.previousSibling;
    if (!previous) return this.findBreakBefore(anchor);
    return { breakNode: this.isBreak(previous) ? previous : null, anchor };
  }

  private findBreakBefore(start: ChildNode): { breakNode: ChildNode | null; anchor: ChildNode } {
    const container = document.getElementById(this.containerId);
    let anchor = start;

    while (anchor !== container) {
      const parent = anchor.parentElement;
      if (!parent) break;
      let previous = anchor.previousSibling;
      while (previous) {
        if (!this.isIcon(previous) && this.isBreak(previous)) return { breakNode: previous, anchor };
        anchor = previous;
        previous = anchor.previousSibling;
      }
      if (parent === container) break;
      anchor = parent;
    }

    return { breakNode: null, anchor };
  }

  private leadingIcon(element: Element): ChildNode | null {
    let anchor: ChildNode = element;
    let icon = false;
    let previous = anchor.previousSibling;
    while (previous) {
      if (this.isIcon(previous)) icon = true;
      else if (!this.isWhitespace(previous)) break;
      anchor = previous;
      previous = anchor.previousSibling;
    }
    return icon ? anchor : null;
  }

  private isWhitespace(node: Node): boolean {
    return node.nodeType === Node.TEXT_NODE && !(node.textContent || '').trim();
  }

  private isIcon(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    if (element.matches(LINK_TAGS) || element.querySelector(LINK_TAGS)) return false;
    if ((element.textContent || '').trim()) return false;
    if (element.matches(ICON_TAGS)) return true;
    if (/icon/i.test(element.getAttribute('class') || '')) return true;
    if (/icon/i.test(element.getAttribute('id') || '')) return true;
    const children = Array.from(element.children);
    return children.length > 0 && children.every(child => this.isIcon(child));
  }

  private isBreak(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return /\n/.test(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    if (element.nodeName === 'BR' || element.nodeName === 'HR') return true;
    if (BLOCK_TAGS.includes(element.nodeName)) return true;
    return BLOCK_DISPLAYS.includes(getComputedStyle(element).display);
  }

  private visible(element: Element): boolean {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
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
    },
    onBeforeApply: null,
    onAfterApply: null,
    debug: false
  };

  function apply(userConfig: Partial<LinkZoneConfig> = {}): boolean {
    const config = Object.merge<LinkZoneConfig>(defaultConfig, userConfig);
    config.zoneStyle = Object.merge<Partial<CSSStyleDeclaration>>(defaultConfig.zoneStyle, userConfig.zoneStyle ?? {});
    const customMacro = config.customMacro();
    const customZones = Array.isArray(customMacro) ? customMacro : [];
    config.onBeforeApply?.();
    document.getElementById('beforeLinkZone')?.remove();
    document.getElementById('afterLinkZone')?.remove();
    document.querySelectorAll('[data-link-zone-position]').forEach(zone => zone.remove());
    const manager = new LinkZoneManager(config.containerId, config.linkSelector, core.tool.log);
    const result = manager.applyZones(config, customZones);
    if (result) fillZones(config, customZones);
    config.onAfterApply?.(result, config);
    return result;
  }

  function fillZones(config: LinkZoneConfig, customZones: CustomZone[]): void {
    fill(document.getElementById('beforeLinkZone'), config.beforeMacro(), config);
    fill(document.getElementById('afterLinkZone'), config.afterMacro(), config);
    for (const zone of customZones) fill(document.querySelector(`[data-link-zone-position='${zone.position}']`), zone.macro, config);
  }

  function fill(element: Element | null, macro: string, config: LinkZoneConfig): void {
    if (!element) return;
    const html = element as HTMLElement;
    html.innerHTML = '';
    if (!macro) {
      html.style.display = 'none';
      return;
    }
    const container = document.createElement('div');
    const wiki = $(container).wiki;
    if (typeof wiki === 'function') {
      $(container).wiki(macro);
    } else if (core.host.sugarcube.runtime?.Wikifier) {
      new (core.host.sugarcube.require().Wikifier)(container, macro);
    } else {
      container.innerHTML = macro;
    }
    html.append(...Array.from(container.childNodes));
    html.querySelectorAll('script').forEach(script => {
      const replacement = document.createElement('script');
      replacement.textContent = script.textContent;
      script.replaceWith(replacement);
    });
    html.style.display = html.childElementCount > 0 || html.textContent?.trim() ? 'block' : 'none';
    if (config.debug) core.tool.log('[link] 添加内容到区域', 'DEBUG', macro);
  }

  Object.defineProperties(LinkZoneManager, {
    apply: { value: apply },
    add: { value: fillZones },
    defaultConfig: { get: () => defaultConfig }
  });

  core.once(':storyready', () => apply({ debug: true }));
  core.on(':passagedisplay', () => apply(), 'applylinkzone');

  return LinkZoneManager;
})(maplebirch);

export default applyLinkZone;
