# Time Events

## Purpose

Time events run mod logic when game time passes: seconds, minutes, hours, days, weeks, months, years, or time travel.

## Entry Point

```javascript
maplebirch.dynamic.regTimeEvent(type, eventId, options);
```

## Minimal Example

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod:dailyCheck', {
  cond: data => V.myMod?.enabled,
  action: data => {
    setup.myMod.dailyCheck();
  }
});
```

## Common Types

| Type           | Trigger                               |
| :------------- | :------------------------------------ |
| `onSec`        | Seconds passed                        |
| `onMin`        | Minutes passed                        |
| `onHour`       | Hour changed/passed                   |
| `onDay`        | Day changed/passed                    |
| `onWeek`       | Week changed/passed                   |
| `onMonth`      | Month changed/passed                  |
| `onYear`       | Year changed/passed                   |
| `onBefore`     | Before time pass                      |
| `onThread`     | After advancement, before unit events |
| `onAfter`      | After time pass                       |
| `onTimeTravel` | Time travel                           |

## Options

| Field          | Purpose                  |
| :------------- | :----------------------- |
| `cond(data)`   | Whether to run           |
| `action(data)` | Code to run              |
| `priority`     | Higher runs earlier      |
| `once`         | Remove after running     |
| `exact`        | Require exact boundary   |
| `accumulate`   | Accumulated unit trigger |

## Legacy TimeEvent

Some older Simple Framework style mods may use:

```javascript
new TimeEvent('onDay', 'dailyCheck').Cond(data => true).Action(data => {});
```

New code should prefer `maplebirch.dynamic.regTimeEvent()`.

## Callback Data and Time Jumps

`onBefore` runs before vanilla time advancement and only provides `prevDate`, `prev`, `passed`, and `timeStamp`. `onThread` runs after advancement but before unit events. `onAfter` runs after unit events. Normal post-advance callbacks may read `prevDate`, `currentDate`, `changes`, `diffSeconds`, and `exactPoints`.

An `onBefore` callback may change `data.passed` to adjust the number of seconds advanced. Callbacks share this data in priority order, and the framework reads the final value after all callbacks finish. Zero is valid; negative, nonnumeric, or nonfinite values retain the original duration. Vanilla schedules, weather settlement, and subsequent time events all use the accepted duration. This adjustment applies to normal advancement, not time travel.

A pass spanning multiple hours or days supplies data for that pass, rather than automatically invoking the callback once per unit. Use `changes` or `triggeredByAccumulator.count` for bulk settlement. `exact: true` checks whether a unit boundary was crossed. It does not guarantee that the final time is on the hour or at midnight.

One-shot registrations and accumulation counters belong to runtime event objects and are not saved. Store persistent counters in mod variables.
