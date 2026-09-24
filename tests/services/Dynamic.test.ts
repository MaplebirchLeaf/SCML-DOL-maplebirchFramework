import './runtime';
import { expect, mock, test } from 'bun:test';
import type DoLDynamic from '../../src/modules/DoL/Dynamic';

mock.module('../../src/core', () => ({ default: {} }));

const [{ default: Emitter }, { TimeManager }, { WeatherManager }] = await Promise.all([
  import('../../src/infra/Emitter'),
  import('../../src/modules/TimeStateWeather/TimeEvents'),
  import('../../src/modules/TimeStateWeather/WeatherEvents')
]);

test('time travel emits a time event and Weather refreshes itself before the call returns', () => {
  const originals = new Map(['V', 'Time', 'Weather', 'document', '$'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const originalDateTime = Object.getOwnPropertyDescriptor(window, 'DateTime');
  const calls: string[] = [];
  class DateTimeStub {
    public readonly timeStamp: number;
    public readonly year = 2026;
    public readonly month = 9;
    public readonly day = 24;
    public readonly hour = 12;
    public readonly minute = 0;
    public readonly second = 0;
    public readonly weekDay = 5;

    public constructor(value: number | DateTimeStub) {
      this.timeStamp = typeof value === 'number' ? value : value.timeStamp;
    }

    public compareWith(): object {
      return {};
    }

    public static isLeapYear(): boolean {
      return false;
    }
  }
  const weatherObj = { keypointsArr: [1], fogKeypoints: [2] };
  const clock = {
    date: new DateTimeStub(10),
    setDate(date: DateTimeStub) {
      this.date = date;
    }
  };
  const weather = {
    WeatherGeneration: {
      updateWeather(date: DateTimeStub) {
        calls.push(`weather:${date.timeStamp}`);
        weatherObj.keypointsArr.push(3);
      }
    },
    FogGeneration: {
      generateFogKeypoints(points: number[]) {
        calls.push(`fog:${points.join(',')}`);
      }
    },
    Observables: {
      checkForUpdate() {
        calls.push('observables');
      }
    }
  };
  const events = new Emitter();
  const core = { on: events.on.bind(events), trigger: events.trigger.bind(events) };
  const dynamic = { core, log() {} } as unknown as DoLDynamic;
  for (const [name, value] of Object.entries({ V: { weatherObj }, Time: clock, Weather: weather, document: {}, $: () => ({ on() {} }) })) {
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  Object.defineProperty(window, 'DateTime', { value: DateTimeStub, configurable: true });
  try {
    const time = new TimeManager(dynamic);
    Object.assign(dynamic, { Time: time });
    const weatherManager = new WeatherManager(dynamic);
    core.on(':timeChange', () => calls.push('time change'));
    core.on(':onWeather', () => calls.push('weather event'));
    weatherManager.register('mod:clear', { priority: 10, once: true, condition: () => true, onEnter: () => calls.push('weather rule') });
    time.register('onTimeTravel', 'mod:travel', { action: () => calls.push('mod travel') });
    expect(time.timeTravel({ target: new DateTimeStub(20) as unknown as DateTime })).toBe(true);
    expect(weatherObj).toEqual({ keypointsArr: [3], fogKeypoints: [] });
    expect(calls).toEqual(['weather:20', 'fog:3', 'observables', 'weather rule', 'weather event', 'time change', 'mod travel']);
    weather.WeatherGeneration.updateWeather = () => {
      throw new Error('weather failed');
    };
    expect(time.timeTravel({ target: new DateTimeStub(30) as unknown as DateTime })).toBe(false);
    expect(clock.date.timeStamp).toBe(20);
    expect(weatherObj).toEqual({ keypointsArr: [3], fogKeypoints: [] });
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (originalDateTime) Object.defineProperty(window, 'DateTime', originalDateTime);
    else Reflect.deleteProperty(window, 'DateTime');
  }
});

test('character pre and post processors retain order and isolate failing hooks', async () => {
  const [{ default: Character }, { default: Diagnostics }] = await Promise.all([import('../../src/modules/Character'), import('../../src/infra/Diagnostics')]);
  const checks: string[] = [];
  const core = { host: { modLoader: undefined }, once() {}, tool: { define() {}, defineS() {} }, var: { check: () => checks.push('check') } };
  const character = new Character(core as never);
  const model = { name: 'main' } as CanvasModel;
  character.use('pre', () => checks.push('first'), 'main');
  character.use(
    'pre',
    () => {
      throw new Error('processor failed');
    },
    'main'
  );
  character.use('pre', () => checks.push('last'), 'main');
  character.use('post', () => checks.push('post'), 'main');
  new Diagnostics().reset();
  character.process('pre', {} as CanvasModelOptionsData, model);
  expect(checks).toEqual(['check', 'first', 'last']);
  expect(new Diagnostics().errors).toEqual(expect.arrayContaining([expect.objectContaining({ scope: 'hooks', message: 'Hook execution failed: pre:2' })]));
  character.process('post', {} as CanvasModelOptionsData, model);
  expect(checks.at(-1)).toBe('post');
  const before = checks.length;
  character.process('pre', {} as CanvasModelOptionsData, { name: 'other' } as CanvasModel);
  expect(checks).toHaveLength(before);
});
