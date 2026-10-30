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

The examples use the registered character Luna. Use `addSchedule()` for her complete initial schedule and `Schedule.get('Luna').when(...)` to append an activity; both are shown below.

**Calling `addSchedule('Luna', ...)` again replaces her entire framework schedule.** It returns the newly created `Schedule`.

The config-object and builder examples are alternative complete definitions. Choose one initial schedule, then use the later API examples as needed. Do not register the same special-rule ID twice for one character.

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
      condition: date => Weather.precipitation === 'rain' && date.hour >= 18,
      location: 'home',
      override: true
    }
  ]
});
```

## Daily Schedule

`daily` is for fixed hourly locations.

Think of `daily` as “Luna goes here starting at this hour.” You need not fill all 24 hours: empty hours inherit the nearest preceding record.

For the schedule above, when no special rule matches:

| Query time         | Location  | Why                                           |
| :----------------- | :-------- | :-------------------------------------------- |
| 12:00              | `school`  | Inherits the 08:00 record                     |
| 14:00–16:59        | `library` | `[14, 16]` fills hours 14, 15 and 16          |
| 17:00              | `library` | No new record, so the preceding one continues |
| 18:00              | `home`    | Uses the new 18:00 record                     |
| 02:00 next morning | `home`    | Searches backward across midnight to 18:00    |

A later assignment replaces an earlier one at the same hour. Hours must be integers from `0` through `23`. Split overnight ranges rather than writing `[21, 5]`. A completely empty day returns an empty string.

| Field      | Description                     |
| :--------- | :------------------------------ |
| `time`     | Hour, or `[startHour, endHour]` |
| `location` | Location id                     |

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 9,
      location: 'school' // school
    },
    {
      time: [13, 15],
      location: 'gym' // gym
    }
  ]
});
// The range includes hours 13, 14 and 15; later hours remain at the gym.
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
maplebirch.npc.addSchedule('Luna', {
  daily: [{ time: 0, location: 'home' }], // Fallback daily location.
  special: [
    {
      id: 'weekend_park',
      condition: date => date.weekEnd && Weather.precipitation !== 'rain',
      location: 'park' // Visit the park on a dry weekend.
    },
    {
      id: 'weekend_arcade',
      condition: date => date.weekEnd && (C.npc.Luna?.love ?? 0) >= 30,
      location: 'arcade',
      insteadOf: 'weekend_park' // Prefer the arcade with enough love; keep the park rule.
    }
  ]
});
```

This example checks `weekend_arcade` before `weekend_park` and chooses the first match:

- Weekend and love at least `30`: visit the arcade.
- Weekend, love below `30`, and no rain: the park rule can still match.
- Neither matches: use the daily schedule, which is home here.

Thus `insteadOf` means “try this one first,” not “delete the old rule.” `before`, `after` and `insteadOf` order the same character's non-override rules. Rules with `override: true` form a higher-priority group, checked in registration order. Keep IDs unique within each character.

**To skip an activity, return `false` from `condition`.** Once it matches, returning an empty string from `location` does not try the next rule. Dynamic locations should return a location string or child `Schedule`.

## Builder Function

For more complex schedules, pass a function. It receives a `Schedule` instance.

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(7, 'home').at([8, 15], 'school').at(16, 'library').at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.precipitation === 'rain') return 'home';
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
const schedule = maplebirch.npc.Schedule.get('Luna'); // Retrieve Luna's schedule without replacing other entries.
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
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(date => (C.npc.Luna?.love ?? 0) >= 30 && date.weekEnd, 'arcade', {
  id: 'weekend_arcade'
});
```

Dynamic location:

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.precipitation === 'rain') return 'home';
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
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(
  date => {
    // Inspect true/false while debugging; remove console.table from the finished script.
    console.table({
      atNine: date.isAt(9), // Only 09:00, not 09:01.
      atHalfPastTwo: date.isAt([14, 30]), // Only 14:30; this array means hour and minute.
      afterNoon: date.isAfter(12), // After 12:00, excluding 12:00.
      beforeSix: date.isBefore(18), // Before 18:00, excluding 18:00.
      daytime: date.isBetween(9, 17), // 09:00–17:00, both endpoints included.
      morning: date.isBetween([8, 30], [12, 0]), // 08:30–12:00, both endpoints included.
      selectedHours: date.isHour(8, 12, 18), // Any minute in hour 8, 12 or 18.
      schoolHours: date.isHourBetween(9, 16), // Any minute in hours 9 through 16.
      firstHalfHour: date.isMinuteBetween(0, 30) // Minutes 0 through 30 of each hour.
    });

    return date.isBetween([8, 30], [12, 0]);
  },
  'park',
  { id: 'myMod:morningPark' }
);
```

The example logs each check when querying the schedule. Remove `console.table()` for the finished script and keep the final `return` to visit the park from 08:30 through 12:00.

The two array forms differ: `schedule.at([14, 16], ...)` fills **hours 14 through 16**, while `date.isAt([14, 30])` matches only **14:30**.

Date comparisons do not wrap midnight automatically. Append an overnight activity like this:

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');
schedule.when(
  date => date.isHour(21, 22, 23, 0, 1, 2, 3, 4, 5), // 21:00 through 05:59 next morning.
  'home',
  { id: 'myMod:nightHome' }
);
```

`date.hour >= 21 || date.hour <= 5` expresses the same range.

`daily` stores locations by hour. `special` schedules are sorted before evaluation; `override: true` schedules are checked before normal special schedules.
