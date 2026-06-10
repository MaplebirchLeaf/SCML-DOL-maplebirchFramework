# Time Events

## Purpose

Time events run mod logic when game time passes: seconds, minutes, hours, days, weeks, months, years, or time travel.

## Entry Point

```javascript
maplebirch.dynamic.regTimeEvent(type, eventId, options);
```

## Minimal Example

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod.dailyCheck', {
  cond: data => V.myMod?.enabled,
  action: data => {
    setup.myMod.dailyCheck();
  }
});
```

## Common Types

| Type           | Trigger              |
| :------------- | :------------------- |
| `onSec`        | Seconds passed       |
| `onMin`        | Minutes passed       |
| `onHour`       | Hour changed/passed  |
| `onDay`        | Day changed/passed   |
| `onWeek`       | Week changed/passed  |
| `onMonth`      | Month changed/passed |
| `onYear`       | Year changed/passed  |
| `onBefore`     | Before time pass     |
| `onAfter`      | After time pass      |
| `onTimeTravel` | Time travel          |

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
