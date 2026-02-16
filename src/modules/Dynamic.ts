// ./src/modules/Dynamic.ts

import maplebirch, { MaplebirchCore, createlog } from '../core';
import { TimeManager, TimeEventOptions, TimeTravelOptions } from './TimeStateWeather/TimeEvents';
import { StateManager, StateEventOptions } from './TimeStateWeather/StateEvents';
import { WeatherManager, WeatherEventOptions, WeatherTypeConfig, WeatherException } from './TimeStateWeather/WeatherEvents';

class DynamicManager {
  readonly Time: TimeManager;
  readonly State: StateManager;
  readonly Weather: WeatherManager;
  readonly log: ReturnType<typeof createlog>;

  constructor(readonly core: MaplebirchCore) {
    this.log = createlog('dynamic');
    this.Time = Object.seal(new TimeManager(this));
    this.State = Object.seal(new StateManager(this));
    this.Weather = Object.seal(new WeatherManager(this));
  }

  regTimeEvent(type: string, eventId: string, options: TimeEventOptions): boolean {
    return this.Time.register(type, eventId, options);
  }

  delTimeEvent(type: string, eventId: string): boolean {
    return this.Time.unregister(type, eventId);
  }

  timeTravel(options: TimeTravelOptions = {}): boolean {
    return this.Time.timeTravel(options);
  }

  get TimeEvents() {
    return (this.Time as any).timeEvents;
  }

  regStateEvent(type: string, eventId: string, options: StateEventOptions): boolean {
    return this.State.register(type, eventId, options);
  }

  delStateEvent(type: string, eventId: string): boolean {
    return this.State.unregister(type, eventId);
  }

  trigger(type: 'interrupt' | 'overlay'): string {
    return this.State.trigger(type);
  }

  get StateEvents() {
    return (this.State as any).stateEvents;
  }

  regWeatherEvent(eventId: string, options: WeatherEventOptions): boolean {
    return this.Weather.register(eventId, options);
  }

  delWeatherEvent(eventId: string): boolean {
    return this.Weather.unregister(eventId);
  }

  addWeather(data: WeatherException | WeatherTypeConfig): boolean | void {
    return this.Weather.addWeatherData(data);
  }

  async preInit(): Promise<void> {
    this.core.once(':passagestart', () => {
      this.Time.init();
      this.State.init();
      this.Weather.init();
    });
  }
}

(function (maplebirch): void {
  'use strict';
  void maplebirch.register('dynamic', Object.seal(new DynamicManager(maplebirch)), ['addon']);
})(maplebirch);

export default DynamicManager;
