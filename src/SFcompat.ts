// ./src/SFcompat.ts

import maplebirch from './core';

interface CompatTimeData {
  prevDate?: DateTime;
  prev?: DateTime;
  currentDate?: DateTime;
  current?: DateTime;
  option?: Record<string, any>;
  [key: string]: any;
}

interface CompatTimeEventOptions {
  once?: boolean;
  exact?: boolean;
  priority?: number;
}

type TimeEventHandler = (timeData: CompatTimeData) => boolean | void;

const zoneMap: Record<string, string> = {
  ModStatusBar: 'StatusBar',
  ModMenuBig: 'MenuBig',
  ModMenuSmall: 'MenuSmall',
  iModInit: 'Init',
  iModHeader: 'Header',
  iModFooter: 'Footer',
  iModOptions: 'Options',
  iModCheats: 'Cheats',
  iModFame: 'Fame',
  iModStatist: 'Statistics',
  iModReady: 'State',
  iModExtraStatist: 'Statistics',
  iModInformation: 'Information',
  ExtraLinkZone: 'AfterLinkZone',
  ModCaptionAfterDescription: 'CaptionAfterDescription'
};

function addto(zoneName: string, ...widgets: any[]): void {
  maplebirch.tool.addTo(zoneMap[zoneName] || zoneName, ...widgets);
}

function compatTimeData(timeData: any): CompatTimeData {
  return {
    ...timeData,
    prev: timeData.prevDate || timeData.prev,
    current: timeData.currentDate || timeData.current,
    option: {}
  };
}

class TimeEvent {
  private cond: TimeEventHandler = () => true;
  private action: TimeEventHandler = () => {};
  private options: CompatTimeEventOptions = { exact: true };
  private registered = false;

  constructor(
    private readonly type: string,
    private readonly eventId: string
  ) {}

  Cond(handler: TimeEventHandler): this {
    this.cond = handler;
    this.refresh();
    return this;
  }

  Action(handler: TimeEventHandler): this {
    this.action = handler;
    this.register();
    return this;
  }

  once(isOnce = true): this {
    this.options.once = isOnce;
    this.refresh();
    return this;
  }

  priority(priority: number): this {
    this.options.priority = priority;
    this.refresh();
    return this;
  }

  private refresh(): void {
    if (!this.registered) return;
    maplebirch.dynamic.delTimeEvent(this.type, this.eventId);
    this.registered = false;
    this.register();
  }

  private register(): void {
    const success = maplebirch.dynamic.regTimeEvent(this.type, this.eventId, {
      ...this.options,
      cond: timeData => !!this.cond(compatTimeData(timeData)),
      action: timeData => this.action(compatTimeData(timeData))
    });
    this.registered = success;
  }
}

(() => {
  'use strict';
  (window as any).simpleFrameworks = { addto };
  (window as any).TimeEvent = TimeEvent;
})();
