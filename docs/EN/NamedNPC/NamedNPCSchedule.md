# NPC Schedule

NPC schedules define where an NPC should be during specific hours, conditions, or special events.

Use:

```javascript
maplebirch.npc.addSchedule(npcName, config);
```

The current API accepts two arguments: the NPC name and either a schedule config object or a builder function.

## What a Schedule Controls

A schedule returns a string label for where this NPC should be now. The sidebar wardrobe reads it, and your scenes can query it. It does not create meeting links, call `npc`, add to current `$npc`, or replace native character-specific schedule functions.

Your mod defines labels such as `library` and `home`. Match them in wardrobe rules or scene checks; they need not equal passage titles. Register schedules in scripts; there is no corresponding `boot.json` schedule field.

`addSchedule()` returns a new `Schedule` and **replaces the character's entire previous framework schedule**. To append a special rule, call `Schedule.get(name).when(...)` instead of registering a second full schedule. Examples below use the mod character `Luna`.

## Config Object

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 8,
      location: 'school'
    },
    {
      time: [14, 16],
      location: 'library'
    },
    {
      time: 18,
      location: 'home'
    }
  ],
  special: [
    {
      id: 'rainy_night',
      condition: date => Weather.name === 'rain' && date.hour >= 18,
      location: 'home',
      override: true
    }
  ]
});
```

## Daily Schedule

`daily` is for fixed hourly locations.

One hour records a location starting at that time, rather than making it valid for only that hour. Queries search backward from the current hour for the nearest record, wrapping across midnight. A completely empty day returns an empty string. `[14, 16]` fills hours 14, 15 and 16; later empty hours still inherit the last record.

With `8 → school`, `14 → library`, `18 → home`, noon is still school, 17:00 is still library, and early next morning inherits home. Later assignments replace the same hour. Ranges use integer endpoints from `0` through `23`, with start no later than end; split ranges crossing midnight.

| Field      | Description                     |
| :--------- | :------------------------------ |
| `time`     | Hour, or `[startHour, endHour]` |
| `location` | Location id                     |

```javascript
daily: [
  {
    time: 9,
    location: 'school'
  },
  {
    time: [13, 15],
    location: 'gym'
  }
];
```

## Special Schedule

`special` is for conditional schedules. When a condition matches, it can override the daily location.

| Field       | Description                                |
| :---------- | :----------------------------------------- |
| `id`        | Optional schedule id                       |
| `condition` | Function receiving an enhanced date object |
| `location`  | Location id or function                    |
| `override`  | Prioritize before other special schedules  |
| `before`    | Sort before another special schedule       |
| `after`     | Sort after another special schedule        |
| `insteadOf` | Sort before the specified special schedule |

```javascript
special: [
  {
    id: 'weekend_park',
    condition: date => date.weekEnd && Weather.name !== 'rain',
    location: 'park'
  }
];
```

The first matching special rule wins. `insteadOf` affects ordering without deleting its target; the target can still match when the earlier rule does not. Relative `before/after/insteadOf` ordering applies to the same character's non-override rules. Override rules form the first group in registration order. Keep IDs unique within each character's schedule.

Dynamic locations should return a valid string or a child `Schedule`. Returning an empty string or an unconfigured location after a condition matches does not try the next special rule. Put skip conditions in `condition`.

## Builder Function

For more complex schedules, pass a function. It receives a `Schedule` instance.

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(7, 'home').at([8, 15], 'school').at(16, 'library').at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.name === 'rain') return 'home';
      if (V.money >= 100) return 'mall';
      return 'park';
    },
    {
      id: 'weekend_activity'
    }
  );
});
```

## Schedule.at()

```javascript
schedule.at(time, location);
```

| Argument   | Description                     |
| :--------- | :------------------------------ |
| `time`     | Hour, or `[startHour, endHour]` |
| `location` | Location id                     |

```javascript
schedule.at(8, 'school');
schedule.at([19, 22], 'dormitory');
```

## Schedule.when()

```javascript
schedule.when(condition, location, options);
```

| Argument    | Description                                                     |
| :---------- | :-------------------------------------------------------------- |
| `condition` | Condition function                                              |
| `location`  | Location string or callback returning a string/child `Schedule` |
| `options`   | Special schedule options                                        |

```javascript
schedule.when(date => C.npc.Luna?.love >= 30 && date.weekEnd, 'arcade', {
  id: 'weekend_arcade'
});
```

Dynamic location:

```javascript
schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.name === 'rain') return 'home';
    return 'park';
  },
  {
    id: 'weather_weekend'
  }
);
```

## Schedule Manager

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

console.log(schedule.location);
console.log(maplebirch.npc.Schedule.location);
```

Update a special schedule:

```javascript
maplebirch.npc.Schedule.update('Luna', 'weekend_arcade', {
  location: 'mall'
});
```

Remove a special schedule:

```javascript
maplebirch.npc.Schedule.remove('Luna', 'weekend_arcade');
```

Clear schedules:

```javascript
maplebirch.npc.Schedule.clear('Luna');
maplebirch.npc.Schedule.clearAll();
```

`get(name)` creates an empty schedule when absent. `update/remove/clear` return that character's `Schedule`; missing IDs are not added by `update/remove`. `clearAll()` removes every framework NPC schedule, including other mods' registrations. Ordinary extensions should remove only their own entries.

Definitions live in runtime and are rebuilt when scripts reload. Keep persistent quest state in your mod's saved variables and read it in predicates. Queries and redraws can repeat callbacks; do not advance time or story progress in them.

## Enhanced Date

Schedule conditions and dynamic locations receive an enhanced date object based on `DateTime` and `Time`.

Common properties:

| Property                                  | Description                                         |
| :---------------------------------------- | :-------------------------------------------------- |
| `schoolDay`                               | Whether it is a school day                          |
| `weekEnd`                                 | Whether it is a weekend                             |
| `spring` / `summer` / `autumn` / `winter` | Current season                                      |
| `dawn` / `daytime` / `dusk` / `night`     | Current day state                                   |
| `schedule`                                | A new `Schedule` instance for nested schedule logic |

Common methods:

```javascript
date.isAt(9);
date.isAt([14, 30]);
date.isAfter(12);
date.isBefore(18);
date.isBetween(9, 17);
date.isBetween([8, 30], [12, 0]);
date.isHour(8, 12, 18);
date.isHourBetween(9, 16);
date.isMinuteBetween(0, 30);
```

`at([14, 16], ...)` takes an hour range; `date.isAt([14, 30])` means **14:30**. `isAt(9)` matches only 09:00. `isAfter/isBefore` are strict; `isBetween/isHourBetween/isMinuteBetween` include endpoints. Date comparison helpers do not wrap midnight automatically; split overnight conditions or use `||`.

`daily` stores locations by hour. `special` schedules are sorted before evaluation; `override: true` schedules are checked before normal special schedules.
