// ./src/modules/Dynamic.ts

import maplebirch, { type MaplebirchCore, createlog } from '../core';
import { TimeManager, TimeEventOptions, TimeTravelOptions } from './TimeStateWeather/TimeEvents';
import { StateManager, StateEventOptions } from './TimeStateWeather/StateEvents';
import { WeatherManager, WeatherEventOptions, WeatherTypeConfig, WeatherException } from './TimeStateWeather/WeatherEvents';

class DynamicManager {
  public readonly Time: TimeManager;
  public readonly State: StateManager;
  public readonly Weather: WeatherManager;
  public readonly log: ReturnType<typeof createlog>;

  public constructor(readonly core: MaplebirchCore) {
    this.log = createlog('dynamic');
    this.Time = Object.seal(new TimeManager(this));
    this.State = Object.seal(new StateManager(this));
    this.Weather = Object.seal(new WeatherManager(this));
  }

  public regTimeEvent(type: string, eventId: string, options: TimeEventOptions): boolean {
    return this.Time.register(type, eventId, options);
  }

  public delTimeEvent(type: string, eventId: string): boolean {
    return this.Time.unregister(type, eventId);
  }

  public timeTravel(options: TimeTravelOptions = {}): boolean {
    return this.Time.timeTravel(options);
  }

  public get TimeEvents() {
    return (this.Time as any).timeEvents;
  }

  public regStateEvent(type: string, eventId: string, options: StateEventOptions): boolean {
    return this.State.register(type, eventId, options);
  }

  public delStateEvent(type: string, eventId: string): boolean {
    return this.State.unregister(type, eventId);
  }

  public trigger(type: 'gate' | 'append'): string {
    return this.State.trigger(type);
  }

  public get StateEvents() {
    return (this.State as any).stateEvents;
  }

  public regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean {
    return this.Weather.register(eventId, options);
  }

  public delWeatherEvent(eventId: string): boolean {
    return this.Weather.unregister(eventId);
  }

  public addWeather(data: WeatherException | WeatherTypeConfig): boolean | void {
    return this.Weather.addWeatherData(data);
  }

  public async Init(): Promise<void> {
    this.Time.init();
    this.State.init();
    this.Weather.init();
  }
}

maplebirch.register('dynamic', Object.seal(new DynamicManager(maplebirch)), ['addon']);

export default DynamicManager;
