// ./src/modules/Frameworks/ApplyLinkZone.ts

import maplebirch, { type MaplebirchCore, createlog } from '../../core';
import { merge } from '../../utils';

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

const log = createlog('link');

class LinkZoneManager {
  public firstLink: Element | null = null;
  public lastLink: Element | null = null;
  public links: Element[] = [];
  public breakBeforeFirst: ChildNode | null = null;

  public readonly log: ReturnType<typeof createlog>;

  public constructor(
    readonly containerId = 'passage-content',
    readonly linkSelector = '.macro-link',
    logger: typeof log = log
  ) {
    this.log = logger;
  }

  public detect(): boolean {
    this.firstLink = null;
    this.lastLink = null;
    this.links = [];
    this.breakBeforeFirst = null;
    const container = document.getElementById(this.containerId);
    if (!container) return false;
    this.links = Array.from(container.querySelectorAll(this.linkSelector)).filter(link => this.visible(link));
    if (this.links.length === 0) return false;
    this.firstLink = this.links[0];
    this.lastLink = this.links[this.links.length - 1];
    this.breakBeforeFirst = this.findBreakBefore(this.firstLink);
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
    if (!this.firstLink || !this.breakBeforeFirst) return;
    const zone = this.zone('beforeLinkZone', config);
    this.insertAfterBreak(zone, this.breakBeforeFirst, this.firstLink);
    if (config.debug) this.log('应用链接前区域', 'DEBUG', zone);
  }

  private applyAfter(config: LinkZoneConfig): void {
    if (!this.lastLink) return;
    const zone = this.zone('afterLinkZone', config);
    this.lastLink.after(zone);
    if (config.debug) this.log('应用链接后区域', 'DEBUG', zone);
  }

  private applyCustom(position: number, config: LinkZoneConfig): void {
    if (position < 0 || position >= this.links.length) return;
    const target = this.links[position];
    if (!target) {
      this.log(`[link] 未找到位置 ${position} 的链接`, 'WARN');
      return;
    }
    const zone = this.zone(null, config);
    const breakNode = this.findBreakBefore(target);
    zone.dataset.linkZonePosition = String(position);
    this.insertAfterBreak(zone, breakNode, target);
    if (config.debug) this.log(`[link] 在位置 ${position} 的链接前插入区域`, 'DEBUG', target);
  }

  private zone(id: string | null, config: LinkZoneConfig): HTMLElement {
    const zone = document.createElement('div');
    if (id) zone.id = id;
    Object.assign(zone.style, config.zoneStyle);
    return zone;
  }

  private insertAfterBreak(zone: HTMLElement, breakNode: ChildNode | null, fallback: Element): void {
    if (!breakNode) {
      fallback.before(zone);
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

  private findBreakBefore(element: Element): ChildNode | null {
    let node = element.previousSibling;

    while (node) {
      if (this.isBreak(node)) return node;
      node = node.previousSibling;
    }

    return null;
  }

  private isBreak(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return /\n/.test(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    const nodeName = element.nodeName;
    const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE'];
    const blockDisplays = ['block', 'flex', 'grid', 'table', 'table-row', 'table-cell'];
    if (nodeName === 'BR' || nodeName === 'HR') return true;
    if (blockTags.includes(nodeName)) return true;
    return blockDisplays.includes(getComputedStyle(element).display);
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
    const config = merge({} as LinkZoneConfig, defaultConfig, userConfig);
    const zoneStyle: Partial<CSSStyleDeclaration> = {};
    Object.assign(zoneStyle, defaultConfig.zoneStyle);
    if (userConfig.zoneStyle) Object.assign(zoneStyle, userConfig.zoneStyle);
    config.zoneStyle = zoneStyle;
    const customMacro = config.customMacro();
    const customZones = Array.isArray(customMacro) ? customMacro : [];
    config.onBeforeApply?.();
    document.getElementById('beforeLinkZone')?.remove();
    document.getElementById('afterLinkZone')?.remove();
    document.querySelectorAll('[data-link-zone-position]').forEach(zone => zone.remove());
    const manager = new LinkZoneManager(config.containerId, config.linkSelector, log);
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
    const wiki = ($(container) as any).wiki;
    if (typeof wiki === 'function') {
      ($(container) as any).wiki(macro);
    } else if (core.SugarCube?.Wikifier) {
      new core.SugarCube.Wikifier(container, macro);
    } else {
      container.innerHTML = macro;
    }
    html.append(...Array.from(container.childNodes));
    html.querySelectorAll('script').forEach(script => {
      const replacement = document.createElement('script');
      replacement.textContent = script.textContent;
      script.replaceWith(replacement);
    });
    html.style.display = html.childNodes.length > 0 ? 'block' : 'none';
    if (config.debug) log('[link] 添加内容到区域', 'DEBUG', macro);
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
