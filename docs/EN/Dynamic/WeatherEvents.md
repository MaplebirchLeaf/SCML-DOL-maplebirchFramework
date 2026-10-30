# Weather events

A rain notice can begin in `onEnter` and finish in `onExit`. Weather events follow the moments a condition becomes active or inactive, making them useful for behavior that starts and ends with the weather.

Register in a loading script, then let weather-change notifications drive the checks. They are not minute-by-minute or render-by-render checks; use time or state events for logic tied only to time or location.

`maplebirch.dynamic.Weather` also offers weather-data and renderer integration. Those have different roles from event callbacks and are covered separately below.

## 1. A directly usable event

Put this in a script loaded through `params.script`:

```javascript
maplebirch.dynamic.regWeatherEvent('myMod:rainyDay', {
  condition: () => Weather.precipitation === 'rain',
  onEnter: () => {
    maplebirch.log('The rain condition became active');
  },
  onExit: () => {
    maplebirch.log('The rain condition is no longer active');
  },
  priority: 5
});
```

Watch the log first to see when the event enters and exits. If it is already raining on startup, the first check counts as entry too; registration itself does not call the callbacks immediately.

| Two consecutive checks | Result               |
| :--------------------- | :------------------- |
| Inactive → active      | Run `onEnter` once   |
| Active → active        | Do not enter again   |
| Active → inactive      | Run `onExit` once    |
| Inactive → inactive    | Run neither callback |

IDs are unique. A duplicate returns `false` without replacing the existing event. Remove an event with:

```javascript
maplebirch.dynamic.delWeatherEvent('myMod:rainyDay');
```

Removal clears the event and its runtime active record; it **does not call `onExit`**. Clean up any applied effect before explicitly unregistering it.

## 2. Cold nights: express midnight wrapping explicitly

For a more specific event, suppose we want cold autumn or winter nights: clear or partly cloudy, at most `5` degrees, from 20:00 until before 06:00. Built-in fields and `condition` can describe that together:

```javascript
maplebirch.dynamic.regWeatherEvent('myMod:coldNight', {
  weather: ['clear', 'lightClouds'],
  temp: {
    max: 5
  },
  season: ['winter', 'autumn'],
  condition: () => Time.hour >= 20 || Time.hour < 6,
  onEnter: () => {
    maplebirch.log('Cold-night conditions became active');
  },
  onExit: () => {
    maplebirch.log('Cold-night conditions ended');
  }
});
```

`{ min: 20, max: 6 }` is an ordinary inclusive interval, not a wrapped interval. No normal hour can be both at least `20` and at most `6`. Use `||` for the two parts, as above, with `06:00` explicitly excluded.

Checks are driven by weather notifications. A condition based only on time, quests, or location needs an appropriate check when that state changes; a weather event alone does not guarantee execution precisely at `20:00`. Prefer [time events](TimeEvents.md) for time-only conditions and [state events](StateEvents.md) for page conditions.

## 3. Options and matching fields

| Option        | Meaning                                                      |
| :------------ | :----------------------------------------------------------- |
| `condition()` | Read-only eligibility check; defaults to true                |
| `onEnter()`   | Synchronous entry callback                                   |
| `onExit()`    | Synchronous exit callback                                    |
| `priority`    | Descending check order; defaults to `0`                      |
| `once`        | Remove immediately after first entry; no later exit callback |

Built-in fields:

| Field                   | Source                                    |
| :---------------------- | :---------------------------------------- |
| `weather`               | `Weather.name`                            |
| `temp`                  | `Weather.temperature`                     |
| `precip`                | `Weather.precipitation`                   |
| `season`, `hour`        | `Time.season`, `Time.hour`                |
| `dayState`              | `Weather.dayState`                        |
| `bloodMoon`, `freezing` | `Weather.bloodMoon`, `Weather.isFreezing` |
| `overcast`, `fog`       | `Weather.overcast`, `Weather.fog`         |

`weather` uses native weather-type names such as `clear`, `lightClouds`, and `lightPrecipitation`. Use `precip` or `Weather.precipitation` for `none`, `rain`, or `snow`.

A scalar uses strict equality; an array accepts any listed value; `{ min, max }` is inclusive and permits either bound to be omitted. Additional fields search same-name properties in `V`, `T`, `Weather`, then `Time`, using the first non-`undefined` value. Dotted paths are not resolved.

All fields and `condition` must match. Query your own nested state directly in `condition`, such as `V.myMod?.weatherQuest === 'active'`, rather than moving quest flags to the native variables root for field matching.

## 4. Active state and saves

The previous active state lives in a runtime set, not the save. A matching first check after restart can enter again. Loading a different save within one runtime does not restore that save's active set either.

Query `Weather` directly when you need the current weather. A saved boolean maintained only through `onEnter`/`onExit` can disagree with the runtime active record after loading.

For a one-time weather quest, store completion in your own saved object and check it in the entry callback. `once: true` only controls this runtime; it does not replace that flag and is unsuitable for effects that rely on `onExit` to undo their changes.

## 5. Renderer layers and effects

These APIs accept actual layer/effect names and fields from the target game's renderer:

```javascript
maplebirch.dynamic.Weather.addLayer(layerName, patch, 'merge');
maplebirch.dynamic.Weather.addEffect(effectName, patch, 'merge');
```

This is the interface form: replace `layerName`, `effectName`, and `patch` with verified configuration. The framework does not define generic `damageRate`, `particleColor`, `animation.speed`, or weather-damage behavior. Adding invented fields does not make the renderer or combat system read them.

Modes `replace` (default), `merge`, and `concat` use the framework's cover, merge, and append helpers. These modes modify the matching native layer/effect object; `replace` does not recreate the entire renderer.

Register early through the recommended `script` loader. Matching layer modifications are applied and consumed during layer creation. Effect modifications look up objects in the native effects table and clear the queue after processing. Missing effects are not created automatically; late registration does not guarantee an existing layer is immediately updated.

## 6. Custom weather and date exceptions

Both use `maplebirch.dynamic.addWeather(data)`, with different structures:

| Data           | Required contents                                                                                                                                     | Destination                            |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| Weather type   | `name`, `value`, four-season `probability`, `cloudCount.small/large` functions, `tanningModifier`, `overcast`, `precipitationIntensity`, `visibility` | `setup.WeatherGeneration.weatherTypes` |
| Date exception | `date()` returning a date, `duration`, an existing `weatherType`, optional `temperature`                                                              | `setup.WeatherExceptions`              |

A type may also provide `iconType`. Units, valid values, and resource names follow the target version's native generation and renderer implementation. A new weather name does not supply icons, particles, audio, or damage; prepare the resources and verify native fields before integration.

Register data during script loading; initialization later adds it to the native configuration. Duplicate weather-type names are skipped; exceptions are appended. A return value of `true` or `undefined` reflects the registration kind, not whether the weather has occurred. Late registration does not automatically rerun initialization.

## Verification path

Start with the log event: inactive → active → still active → inactive should enter and exit once each. Then check startup while already active, loading, restarting, removal, `once`, and midnight wrapping. For visuals, separately verify that the target layer/effect exists and the renderer reads the modified fields.

[Development workflow](../Development.md) · [Time events](TimeEvents.md) · [State events](StateEvents.md)
