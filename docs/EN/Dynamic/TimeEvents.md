# Time events

A daily help reset or a progress update after every ten hours can start with a time event. Register the rule as the script loads; the framework checks which events apply when the game advances time.

Those hours are **game time**. Leaving a page open for a real-world hour does not trigger `onHour` by itself.

Start with a daily reset below, then explore accumulated time and time travel. The examples keep progress in `V.myMod.time`; see the [development workflow](../Development.md) if saved-state initialization is still unfamiliar.

## 1. Registration and execution order

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod:newDay', {
  action: data => {
    maplebirch.log(
      `The game date is now ${data.currentDate.year}-${data.currentDate.month}-${data.currentDate.day}`
    );
  },
  exact: true,
  priority: 5
});
```

IDs must be unique within a type. A duplicate returns `false` without replacing the existing event. Removal requires both type and ID:

```javascript
maplebirch.dynamic.delTimeEvent('onDay', 'myMod:newDay');
```

Normal advancement runs in this order:

```text
onBefore → native time advancement → onThread
         → onYear → onMonth → onWeek → onDay → onHour → onMin → onSec
         → onAfter
```

Unit events run only when their elapsed-time or boundary conditions apply; accumulated events are described below. Higher `priority` runs earlier within the same type. It cannot move `onAfter` ahead of `onBefore`.

| Type                                   | Purpose                                                             |
| :------------------------------------- | :------------------------------------------------------------------ |
| `onBefore`                             | Read the old date and optionally adjust this advancement's duration |
| `onThread`                             | Process the new time before unit events                             |
| `onSec`, `onMin`, `onHour`             | Process second, minute, or hour changes                             |
| `onDay`, `onWeek`, `onMonth`, `onYear` | Process calendar boundaries or larger units                         |
| `onAfter`                              | Process after all unit events                                       |
| `onTimeTravel`                         | Process time travel separately from normal advancement              |

## 2. Elapsed time versus crossed boundaries

A default unit event checks when at least one complete unit elapsed or its boundary was crossed. `exact: true` requires a boundary crossing; it does not require ending exactly on that boundary.

| One advancement | `changes.hour` | `exactPoints.hour` | `onHour` behavior                                                  |
| :-------------- | :------------- | :----------------- | :----------------------------------------------------------------- |
| `10:10 → 10:30` | `0`            | `false`            | Ordinary event does not run; an accumulator can still collect time |
| `10:50 → 11:10` | `0`            | `true`             | Checks once, including with `exact: true`                          |
| `10:10 → 13:10` | `3`            | `true`             | Checks once, not three separate executions                         |

An advancement from `23:50` to `00:10` the next day crosses a day boundary but ends at minute `10`. Requiring `hour === 0 && minute === 0` would miss it. Base daily resets on crossing the date boundary rather than ending at midnight.

`currentDate` is the final date. Processing production for three elapsed days requires your mod to define its own catch-up behavior; one callback does not supply three separate historical dates.

## 3. Complete example: reset a daily usage flag

Prepare these saved fields in `framework.js`; the later examples use them too:

```javascript
function initMyModTime(variables) {
  variables.myMod ??= {};
  variables.myMod.time ??= {};
  variables.myMod.time.helpUsed ??= false;
  variables.myMod.time.elapsedSeconds ??= 0;
  variables.myMod.time.rewardCount ??= 0;
  variables.myMod.time.halfDuration ??= false;
}

maplebirch.tool.onInit(() => {
  initMyModTime(V);
});

maplebirch.on(':onLoad', save => {
  initMyModTime(save.V);
});
```

Register this in the same script:

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod:resetHelp', {
  action: () => {
    V.myMod.time.helpUsed = false;
  },
  exact: true
});
```

The actual successful help action sets `$myMod.time.helpUsed = true`; check it both for link visibility and on click. The next normal advancement across a day resets it. Crossing three days still needs only one reset here because no rewards are being backfilled.

`helpUsed` is saved; event registration is rebuilt on startup. Time travel only triggers `onTimeTravel` and will not run this daily reset. If your feature permits a reset through time travel, implement that policy explicitly in a travel event.

## 4. Count each accumulated ten-hour interval

This uses the framework accumulator after the initialization above:

```javascript
maplebirch.dynamic.regTimeEvent('onHour', 'myMod:elapsedReward', {
  action: data => {
    V.myMod.time.rewardCount += data.triggeredByAccumulator.count;
  },
  accumulate: {
    unit: 'hour',
    target: 10
  }
});
```

Advancing `25` hours at once gives `count: 2` and leaves `5` hours in the accumulator. This only records settlement count; implement actual money or item effects in this branch when needed.

Before choosing this version, consider where the remainder lives:

- Its remainder lives in the event object, not the save. Restarting loses it; switching saves does not switch to a save-specific remainder.
- Time accumulates even when `cond` is false. At the threshold, the count is consumed before checking eligibility. This does not mean “count only time while the condition holds”.
- Seconds through weeks accumulate elapsed seconds; months and years use calendar differences. Time travel does not feed these normal unit accumulators.

**If the ten-hour progress belongs to the save, replace the preceding version with this one. Do not register both.** It saves both the remainder and settlement count:

```javascript
maplebirch.dynamic.regTimeEvent('onAfter', 'myMod:elapsedReward', {
  action: data => {
    const state = V.myMod.time;
    const period = 10 * maplebirch.dynamic.Time.TimeConstants.secondsPerHour;
    state.elapsedSeconds += Math.max(0, data.diffSeconds ?? 0);
    const count = Math.floor(state.elapsedSeconds / period);
    state.elapsedSeconds %= period;
    state.rewardCount += count;
  }
});
```

This counts normally advanced game time, not real offline time. Each advancement updates the remainder, and loading restores saved progress. One `25`-hour advancement and five `5`-hour advancements give the same result. To restrict it to training or work, identify the actual actions whose duration counts; the location after advancement does not prove that the entire interval was spent working.

## 5. Adjust a normal action's duration

Using the initialized `halfDuration` option, this halves the duration of normal advancement:

```javascript
maplebirch.dynamic.regTimeEvent('onBefore', 'myMod:halfDuration', {
  cond: () => V.myMod?.time?.halfDuration === true,
  action: data => {
    data.passed = data.passed / 2;
  }
});
```

Your settings UI or story controls the flag, which defaults to `false`. `onBefore` only provides `prevDate`, `prev`, `passed`, and `timeStamp`; `currentDate` is not available yet.

All `onBefore` callbacks share the same data and modify it in priority order. The final valid `passed` is supplied to native time handling. `0` is valid; a negative, nonnumeric, or nonfinite final value falls back to the original duration. This example affects all normal advancement. For a specific action, have that action provide an explicit context and check it in `cond`. It does not change time-travel targets.

## 6. Time travel

Call this only from an actual action after the game's time system is ready:

```javascript
maplebirch.dynamic.timeTravel({
  addDays: 2,
  addHours: 6
});
```

It requests a relative jump and returns whether it completed. Do not place it directly at the top level of a registration script: that would attempt a jump on every load.

To record the latest jump, register this separately:

```javascript
maplebirch.dynamic.regTimeEvent('onTimeTravel', 'myMod:recordTravel', {
  action: data => {
    V.myMod.time.lastTravel = {
      from: data.prevDate.timeStamp,
      to: data.currentDate.timeStamp,
      direction: data.direction
    };
  }
});
```

Only numbers and strings are saved here, rather than runtime `DateTime` objects as quest history. Travel does not replay normal events such as `onDay` and `onHour`, nor simulate every story event in the skipped interval.

| Parameter                                                                  | Behavior                                                                             |
| :------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| `target`                                                                   | A valid `DateTime`; takes precedence when supplied                                   |
| `year`, `month`, `day`, `hour`, `minute`, `second`                         | Set part of an absolute date; omitted components retain current values               |
| `addYears`, `addMonths`, `addDays`, `addHours`, `addMinutes`, `addSeconds` | Relative offsets, including negatives; used only without `target` or absolute fields |

Do not mix absolute and relative fields expecting both to apply. The target must be within the game's supported date range.

## Configuration and callback reference

| Option         | Meaning                                                                                            |
| :------------- | :------------------------------------------------------------------------------------------------- |
| `action(data)` | Synchronously handle this change                                                                   |
| `cond(data)`   | Read-only eligibility check; defaults to true                                                      |
| `priority`     | Descending order within a type; defaults to `0`                                                    |
| `once`         | Remove this runtime registration after triggering; not a saved flag                                |
| `exact`        | Require crossing the corresponding unit boundary                                                   |
| `accumulate`   | `{ unit, target }`; unit is `sec/min/hour/day/week/month/year`; target is floored and at least `1` |

Callbacks after normal advancement can read these fields. Types mark some fields optional; `onBefore` does not contain the full result:

| Data                           | Meaning                                                                                                      |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `prevDate`, `currentDate`      | Dates before and after; `prev` and `current` are aliases                                                     |
| `passed`                       | Adopted advancement duration in seconds                                                                      |
| `diffSeconds`, `sec`           | Actual signed date difference; negative for backward travel                                                  |
| `changes`                      | Complete units of absolute elapsed time for seconds through weeks; calendar differences for months and years |
| `min/hour/day/week/month/year` | Corresponding values from `changes`                                                                          |
| `exactPoints`                  | Boundary-crossing flags for minutes through years                                                            |
| `weekday`                      | `[weekdayBefore, weekdayAfter]`                                                                              |
| `detailedDiff`                 | Native date comparison result                                                                                |
| `direction`                    | `forward` or `backward`                                                                                      |
| `triggeredByAccumulator`       | Accumulated trigger's `unit`, `target`, and `count`                                                          |

## Verify boundaries

With a separate save, check advancement within an hour, across an hour with less than one hour elapsed, across several hours, across midnight, saving/restarting/loading, and forward/backward travel. Check settlement counts for long jumps and save-specific remainder behavior. Avoid repeatedly experimenting with jump rewards in a real playthrough.

[State events](StateEvents.md) can turn these flags into page notices or scenes; grant rewards at actual settlement.
