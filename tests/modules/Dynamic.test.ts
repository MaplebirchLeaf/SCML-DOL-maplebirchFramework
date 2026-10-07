import '../support/runtime';
import { expect, mock, test } from 'bun:test';
import type DoLDynamic from '../../src/modules/DoL/Dynamic';
import type { TimeData } from '../../src/modules/TimeStateWeather/TimeEvents';

mock.module('../../src/core', () => ({ default: {} }));

const [{ default: Emitter }, { TimeManager }, { WeatherManager }, { vanillaTime }] = await Promise.all([
  import('../../src/infra/Emitter'),
  import('../../src/modules/TimeStateWeather/TimeEvents'),
  import('../../src/modules/TimeStateWeather/WeatherEvents'),
  import('../../src/modules/TimeStateWeather/Time')
]);

class PassingDateTime {
  public timeStamp: number;

  public constructor(value: number | PassingDateTime) {
    this.timeStamp = typeof value === 'number' ? value : value.timeStamp;
  }

  private get calendar(): Date {
    return new Date(Date.UTC(2026, 11, 31) + this.timeStamp * 1000);
  }

  public get year(): number {
    return this.calendar.getUTCFullYear();
  }

  public get month(): number {
    return this.calendar.getUTCMonth() + 1;
  }

  public get day(): number {
    return this.calendar.getUTCDate();
  }

  public get hour(): number {
    return this.calendar.getUTCHours();
  }

  public get minute(): number {
    return this.calendar.getUTCMinutes();
  }

  public get weekDay(): number {
    return this.calendar.getUTCDay() + 1;
  }

  public addSeconds(seconds: number): this {
    this.timeStamp += seconds;
    return this;
  }

  public compareWith(other: PassingDateTime): object {
    return { seconds: other.timeStamp - this.timeStamp };
  }

  public static isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
}

function withTimePass(
  action: (time: InstanceType<typeof TimeManager>, clock: { date: PassingDateTime; pass: (seconds: number) => unknown }, transport: { passed: number[]; dates: number[] }, changes: TimeData[]) => void
): void {
  const originals = new Map(['V', 'Time'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const originalDateTime = Object.getOwnPropertyDescriptor(window, 'DateTime');
  const originalHandlers = new Map((['pass', 'timeTravel'] as const).map(name => [name, Object.getOwnPropertyDescriptor(vanillaTime, name)]));
  const transport = { passed: [] as number[], dates: [] as number[] };
  const changes: TimeData[] = [];
  const clock = {
    date: new PassingDateTime(86390),
    pass(seconds: number): unknown {
      transport.passed.push(seconds);
      this.date.addSeconds(seconds);
      V.timeStamp = this.date.timeStamp;
      return `vanilla:${seconds}`;
    },
    setDate(date: PassingDateTime) {
      transport.dates.push(date.timeStamp);
      this.date = new PassingDateTime(date);
      V.timeStamp = date.timeStamp;
    }
  };
  Object.defineProperty(globalThis, 'V', { value: { timeStamp: clock.date.timeStamp }, configurable: true });
  Object.defineProperty(globalThis, 'Time', { value: clock, configurable: true });
  Object.defineProperty(window, 'DateTime', { value: PassingDateTime, configurable: true });
  try {
    const events = new Emitter();
    events.on(':timeChange', (data: TimeData) => changes.push(data));
    const time = new TimeManager({ log() {}, core: { trigger: events.trigger.bind(events) } } as unknown as DoLDynamic);
    time.Init();
    action(time, clock, transport, changes);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    if (originalDateTime) Object.defineProperty(window, 'DateTime', originalDateTime);
    else Reflect.deleteProperty(window, 'DateTime');
    for (const [name, descriptor] of originalHandlers) {
      if (descriptor) Object.defineProperty(vanillaTime, name, descriptor);
      else Reflect.deleteProperty(vanillaTime, name);
    }
  }
}

test('onBefore shares elapsed seconds by priority and uses the result for transport, boundaries and accumulation', () => {
  withTimePass((time, clock, transport, changes) => {
    const before: number[] = [];
    const thread: TimeData[] = [];
    const after: TimeData[] = [];
    const boundaries: string[] = [];
    const accumulated: [number | undefined, number | undefined][] = [];
    time.register('onBefore', 'double', {
      priority: 1,
      action: data => {
        before.push(data.passed!);
        data.passed! *= 2;
      }
    });
    time.register('onBefore', 'add-once', {
      priority: 2,
      once: true,
      action: data => {
        before.push(data.passed!);
        data.passed! += 50;
      }
    });
    time.register('onThread', 'thread', {
      action: data => {
        thread.push(data);
      }
    });
    time.register('onAfter', 'after', {
      action: data => {
        after.push(data);
      }
    });
    for (const type of ['onYear', 'onMonth', 'onDay', 'onHour', 'onMin'] as const)
      time.register(type, type, {
        exact: true,
        action: () => {
          boundaries.push(type);
        }
      });
    time.register('onWeek', 'two-minutes', {
      accumulate: { unit: 'min', target: 2 },
      action: data => {
        accumulated.push([data.passed, data.triggeredByAccumulator?.count]);
      }
    });

    expect(clock.pass(10)).toBe('vanilla:120');
    expect(before).toEqual([10, 60]);
    expect(time.events.onBefore.has('add-once')).toBe(false);
    expect(transport).toEqual({ passed: [120], dates: [] });
    expect(clock.date.timeStamp).toBe(86510);
    expect(changes[0]).toMatchObject({
      passed: 120,
      diffSeconds: 120,
      sec: 120,
      direction: 'forward',
      prevDate: { timeStamp: 86390 },
      currentDate: { timeStamp: 86510 },
      detailedDiff: { seconds: 120 },
      changes: { sec: 120, min: 2, hour: 0, day: 0, week: 0, month: 1, year: 1 },
      exactPoints: { min: true, hour: true, day: true, week: false, month: true, year: true }
    });
    expect(thread[0]).toBe(changes[0]);
    expect(after[0]).toBe(changes[0]);
    expect(boundaries).toEqual(['onYear', 'onMonth', 'onDay', 'onHour', 'onMin']);

    clock.pass(10);
    clock.pass(50);
    expect(before).toEqual([10, 60, 10, 50]);
    expect(transport).toEqual({ passed: [120, 20, 100], dates: [] });
    expect(changes.map(data => [data.passed, data.diffSeconds, data.changes?.sec])).toEqual([
      [120, 120, 120],
      [20, 20, 20],
      [100, 100, 100]
    ]);
    expect(thread).toEqual(changes);
    expect(after).toEqual(changes);
    expect(accumulated).toEqual([
      [120, 1],
      [100, 1]
    ]);
  });
});

test('native pass result and extra elapsed time survive event wrapping and repeated initialization', () => {
  withTimePass((time, clock, transport, changes) => {
    vanillaTime.pass = seconds => {
      transport.passed.push(seconds);
      clock.date.addSeconds(seconds + 60);
      V.timeStamp = clock.date.timeStamp;
      return 'modded pass';
    };
    time.Init();
    expect(clock.pass(30)).toBe('modded pass');
    expect(clock.date.timeStamp).toBe(86480);
    expect(transport).toEqual({ passed: [30], dates: [] });
    expect(changes[0]).toMatchObject({ passed: 30, diffSeconds: 90 });
  });
});

test.each([
  [0, 0],
  [-1, 30],
  [NaN, 30],
  [undefined, 30],
  [Infinity, 30],
  ['60', 30]
])('onBefore accepts zero and ignores invalid elapsed seconds: %p', (replacement, expected) => {
  withTimePass((time, clock, transport, changes) => {
    const stages: number[] = [];
    time.register('onBefore', 'replace', {
      action: data => {
        data.passed = replacement as number;
      }
    });
    time.register('onThread', 'thread', {
      action: data => {
        stages.push(data.passed!);
      }
    });
    time.register('onAfter', 'after', {
      action: data => {
        stages.push(data.passed!);
      }
    });
    clock.pass(30);
    expect(transport).toEqual({ passed: [expected], dates: [] });
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ passed: expected, diffSeconds: expected, changes: { sec: expected } });
    expect(stages).toEqual([expected, expected]);
    if (expected === 0) expect(Object.values(changes[0].exactPoints!)).toEqual([false, false, false, false, false, false]);
  });
});

test.each([-1, NaN, Infinity, undefined, '30'])('invalid original elapsed seconds do not trigger listeners or transport: %p', input => {
  withTimePass((time, clock, transport, changes) => {
    const before = mock(() => {});
    time.register('onBefore', 'before', { once: true, action: before });
    expect(clock.pass(input as number)).toBeUndefined();
    expect(before).not.toHaveBeenCalled();
    expect(time.events.onBefore.has('before')).toBe(true);
    expect(transport).toEqual({ passed: [], dates: [] });
    expect(changes).toHaveLength(0);
    expect(clock.date.timeStamp).toBe(86390);
  });
});

test.each([false, true])('time travel updates Weather once and rolls back failed changes, native handler: %p', native => {
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
    if (native)
      Object.assign(clock, {
        timeTravel(this: typeof clock, date: DateTimeStub) {
          weatherObj.keypointsArr = [];
          weatherObj.fogKeypoints = [];
          this.setDate(date);
          weather.WeatherGeneration.updateWeather(date);
          weather.FogGeneration.generateFogKeypoints(weatherObj.keypointsArr);
          return 'native travel';
        }
      });
    const time = new TimeManager(dynamic);
    time.Init();
    Object.assign(dynamic, { Time: time });
    const weatherManager = new WeatherManager(dynamic);
    core.on(':timeChange', () => calls.push('time change'));
    core.on(':onWeather', () => calls.push('weather event'));
    weatherManager.register('mod:clear', { priority: 10, once: true, condition: () => true, onEnter: () => calls.push('weather rule') });
    time.register('onTimeTravel', 'mod:travel', { action: () => calls.push('mod travel') });
    if (native) expect((clock as typeof clock & { timeTravel: (date: DateTimeStub) => unknown }).timeTravel(new DateTimeStub(20))).toBe('native travel');
    else expect(time.timeTravel({ target: new DateTimeStub(20) as unknown as DateTime })).toBe(true);
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

test('weather initialization releases consumed inputs after a failure and preserves the unfinished queue', () => {
  const originals = new Map(['setup', 'document', '$'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const exceptions: object[] = [];
  const weatherTypes: object[] = [];
  let rejectException = true;
  let rejectType = false;
  const secondType = {
    get name() {
      if (rejectType) throw new Error('type failed');
      return 'second';
    }
  };
  Object.defineProperty(globalThis, 'setup', {
    value: { WeatherExceptions: exceptions, WeatherGeneration: { weatherTypes } },
    configurable: true
  });
  Object.defineProperty(globalThis, 'document', { value: {}, configurable: true });
  Object.defineProperty(globalThis, '$', { value: () => ({ on() {} }), configurable: true });
  exceptions.push = (...items) => {
    if (rejectException && exceptions.length === 1) throw new Error('exception failed');
    return Array.prototype.push.apply(exceptions, items);
  };
  try {
    const weather = new WeatherManager({ log() {}, core: { on() {} }, Time: { onTravel() {} } } as unknown as DoLDynamic);
    const queues = weather as unknown as { Exceptions: object[]; WeatherTypes: object[] };
    weather.addWeatherData({ date: () => ({}) as DateTime, duration: 1, weatherType: 'first' });
    weather.addWeatherData({ date: () => ({}) as DateTime, duration: 1, weatherType: 'second' });
    weather.addWeatherData({ name: 'first' } as never);
    weather.addWeatherData(secondType as never);
    rejectType = true;
    expect(() => weather.Init()).toThrow('exception failed');
    expect(queues.Exceptions).toHaveLength(1);
    expect(queues.WeatherTypes).toHaveLength(2);
    rejectException = false;
    expect(() => weather.Init()).toThrow('type failed');
    expect(exceptions).toHaveLength(2);
    expect(queues.Exceptions).toHaveLength(0);
    expect(queues.WeatherTypes).toEqual([secondType]);
    rejectType = false;
    weather.Init();
    expect(exceptions).toHaveLength(2);
    expect(weatherTypes).toHaveLength(2);
    expect(queues.WeatherTypes).toHaveLength(0);
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
