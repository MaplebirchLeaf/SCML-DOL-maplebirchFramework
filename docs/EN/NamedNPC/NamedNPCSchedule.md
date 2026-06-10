# NPC Schedule

NPC schedules define where an NPC should be during specific hours, conditions, or special events.

Use:

```javascript
maplebirch.npc.addSchedule(npcName, config);
```

The current API accepts two arguments: the NPC name and either a schedule config object or a builder function.

## Config Object

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    { time: 8, location: 'school' },
    { time: [14, 16], location: 'library' },
    { time: 18, location: 'home' }
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

| Field      | Description                     |
| :--------- | :------------------------------ |
| `time`     | Hour, or `[startHour, endHour]` |
| `location` | Location id                     |

```javascript
daily: [
  { time: 9, location: 'school' },
  { time: [13, 15], location: 'gym' }
];
```

## Special Schedule

`special` is for conditional schedules. When a condition matches, it can override the daily location.

| Field       | Description                                  |
| :---------- | :------------------------------------------- |
| `id`        | Optional schedule id                         |
| `condition` | Function receiving an enhanced date object   |
| `location`  | Location id or function                      |
| `override`  | Prioritize before other special schedules    |
| `before`    | Sort before another special schedule         |
| `after`     | Sort after another special schedule          |
| `insteadOf` | Replace another special schedule in ordering |

```javascript
special: [
  {
    id: 'weekend_park',
    condition: date => date.weekEnd && Weather.name !== 'rain',
    location: 'park'
  }
];
```

## Builder Function

For more complex schedules, pass a function. It receives a `Schedule` instance.

```javascript
maplebirch.npc.addSchedule('Robin', schedule => {
  schedule.at(7, 'home').at([8, 15], 'school').at(16, 'library').at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.name === 'rain') return 'home';
      if (V.money >= 100) return 'mall';
      return 'park';
    },
    { id: 'weekend_activity' }
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

| Argument    | Description                                           |
| :---------- | :---------------------------------------------------- |
| `condition` | Condition function                                    |
| `location`  | Location id, location function, or another `Schedule` |
| `options`   | Special schedule options                              |

```javascript
schedule.when(date => C.npc.Robin?.love >= 30 && date.weekEnd, 'arcade', { id: 'weekend_arcade' });
```

Dynamic location:

```javascript
schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.name === 'rain') return 'home';
    return 'park';
  },
  { id: 'weather_weekend' }
);
```

## Schedule Manager

```javascript
const schedule = maplebirch.npc.Schedule.get('Robin');

console.log(schedule.location);
console.log(maplebirch.npc.Schedule.location);
```

Update a special schedule:

```javascript
maplebirch.npc.Schedule.update('Robin', 'weekend_arcade', {
  location: 'mall'
});
```

Remove a special schedule:

```javascript
maplebirch.npc.Schedule.remove('Robin', 'weekend_arcade');
```

Clear schedules:

```javascript
maplebirch.npc.Schedule.clear('Robin');
maplebirch.npc.Schedule.clearAll();
```

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

`daily` stores locations by hour. `special` schedules are sorted before evaluation; `override: true` schedules are checked before normal special schedules.
