import BaseDynamic from '../Dynamic';
import type { StateEventOptions, StateManager } from '../State';
import { TimeManager, type TimeEventOptions, type TimeTravelOptions, type TimeEventType } from '../TimeStateWeather/TimeEvents';
import { WeatherManager, type WeatherEventOptions, type WeatherTypeConfig, type WeatherException } from '../TimeStateWeather/WeatherEvents';

type DynamicTask = (...args: any[]) => any;

export default class DoLDynamic extends BaseDynamic {
  public get State(): StateManager {
    return this.get('State') as StateManager;
  }

  public get Time(): TimeManager {
    return this.get('Time') as TimeManager;
  }

  public get Weather(): WeatherManager {
    return this.get('Weather') as WeatherManager;
  }

  public regStateEvent(type: 'gate' | 'append', eventId: string, options: StateEventOptions): boolean {
    return this.State.register(type, eventId, options);
  }

  public delStateEvent(type: 'gate' | 'append', eventId: string): boolean {
    return this.State.unregister(type, eventId);
  }

  public trigger(type: 'gate' | 'append'): string {
    return this.State.trigger(type);
  }

  public get StateEvents(): StateManager['events'] {
    return this.State.events;
  }

  public regTimeEvent(type: TimeEventType, eventId: string, options: TimeEventOptions): boolean {
    return this.Time.register(type, eventId, options);
  }

  public delTimeEvent(type: TimeEventType, eventId: string): boolean {
    return this.Time.unregister(type, eventId);
  }

  public timeTravel(options: TimeTravelOptions = {}): boolean {
    return this.Time.timeTravel(options);
  }

  public get TimeEvents(): TimeManager['events'] {
    return this.Time.events;
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

  public override Init(): void {
    super.Init();
    Dynamic.task = (fn: DynamicTask, name: string) => this.fixDynamicTask(fn, name);
  }

  private fixDynamicTask(fn: DynamicTask, name: string): DynamicTask {
    const task = (...args: any[]) => {
      try {
        return fn.apply(this, args);
      } catch (error) {
        console.error(`[Dynamic.task] Error in task '${name}':`, error);
        return null;
      }
    };
    Object.defineProperty(task, 'toString', { value: () => name, writable: true, configurable: true });
    if (Dynamic.stage === Dynamic.Stage.Settled) {
      try {
        task();
      } catch (error) {
        console.warn('Encountered an unexpected critical error while performing a dynamic render task', name, error);
      }
    } else {
      Dynamic.tasks.push(task);
    }
    return task;
  }
}
