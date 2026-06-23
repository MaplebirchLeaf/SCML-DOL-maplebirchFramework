// ./src/SFcompat.ts

import maplebirch from './core';
import { TimeEventType } from './modules/TimeStateWeather/TimeEvents';

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

class SFcompat {
  private static readonly zoneMap: Record<string, string> = {
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

  public static addto(zoneName: string, ...widgets: any[]): void {
    maplebirch.tool.addTo(SFcompat.zoneMap[zoneName] || zoneName, ...widgets);
  }

  private static compatTimeData(timeData: any): CompatTimeData {
    return {
      ...timeData,
      prev: timeData.prevDate || timeData.prev,
      current: timeData.currentDate || timeData.current,
      option: {}
    };
  }

  public static readonly TimeEvent = class TimeEvent {
    private _cond: TimeEventHandler = () => true;
    private _action: TimeEventHandler = () => {};
    private options: CompatTimeEventOptions = { exact: true };
    private registered = false;

    public constructor(
      private readonly type: TimeEventType,
      private readonly eventId: string
    ) {}

    public Cond(handler: TimeEventHandler): this {
      this._cond = handler;
      this.refresh();
      return this;
    }

    public Action(handler: TimeEventHandler): this {
      this._action = handler;
      this.register();
      return this;
    }

    public Once(isOnce = true): this {
      this.options.once = isOnce;
      this.refresh();
      return this;
    }

    public Priority(priority: number): this {
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
        cond: (timeData: any) => !!this._cond(SFcompat.compatTimeData(timeData)),
        action: (timeData: any) => this._action(SFcompat.compatTimeData(timeData))
      });

      this.registered = !!success;
    }
  };
}

(window as any).simpleFrameworks = { addto: SFcompat.addto };
(window as any).TimeEvent = SFcompat.TimeEvent;
