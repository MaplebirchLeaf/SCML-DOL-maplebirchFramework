# NPC Schedule

NPC schedules define where an NPC should be at a given time, condition, or special event.

Use:

```javascript
maplebirch.npc.addSchedule(npcName, scheduleConfig, location, id, options);
```

## Basic Usage

```javascript
maplebirch.npc.addSchedule('Luna', 9, 'school');
maplebirch.npc.addSchedule('Luna', [14, 16], 'library');

maplebirch.npc.addSchedule(
  'Luna',
  date => date.weekEnd && date.hour >= 10,
  'park',
  'weekend_park'
);
```

## Signature

```javascript
addSchedule(
  npcName,
  scheduleConfig,
  location,
  id,
  options
);
```

| Argument | Description |
| :--- | :--- |
| `npcName` | NPC name |
| `scheduleConfig` | Hour, hour range, or condition function |
| `location` | Location string or function |
| `id` | Optional schedule id |
| `options` | Special ordering or override behavior |

## Fixed Time

```javascript
maplebirch.npc.addSchedule('Robin', 8, 'school');
maplebirch.npc.addSchedule('Robin', 12, 'cafeteria');
maplebirch.npc.addSchedule('Robin', [18, 22], 'home');
```

## Conditional Schedule

```javascript
maplebirch.npc.addSchedule(
  'Alex',
  date => date.weekEnd && date.weather === 'sunny',
  'farm_field',
  'sunny_weekend'
);

maplebirch.npc.addSchedule(
  'Whitney',
  date => C.npc.Whitney?.love >= 30 && date.weekEnd && date.hour >= 18,
  'arcade',
  'weekend_arcade'
);
```

## Dynamic Location

```javascript
maplebirch.npc.addSchedule(
  'Robin',
  date => date.weekEnd,
  date => {
    if (date.weather === 'rain') return 'home';
    if (V.money >= 100) return 'mall';
    return 'park';
  },
  'robin_weekend'
);
```

## Options

```javascript
maplebirch.npc.addSchedule(
  'Doctor',
  date => V.emergency,
  'hospital_emergency_room',
  'emergency_call',
  { override: true }
);

maplebirch.npc.addSchedule(
  'Robin',
  date => C.npc.Robin?.health < 30,
  'hospital',
  'robin_sick',
  { insteadOf: 'school_day' }
);
```

Common options:

| Option | Description |
| :--- | :--- |
| `override` | Override other schedules |
| `insteadOf` | Replace a specific schedule |
| `before` | Run before another schedule |
| `after` | Run after another schedule |

## Schedule Manager

```javascript
const robinSchedule = maplebirch.npc.Schedule.get('Robin');

console.log(robinSchedule.location);
console.log(maplebirch.npc.Schedule.location);

maplebirch.npc.Schedule.remove('Robin', 'weekend_mall');
maplebirch.npc.Schedule.clear('Robin');
```

The date object passed to schedule functions includes helpers such as `weekEnd`, `schoolDay`, `spring`, `summer`, `night`, `weather`, `isHour()`, `isBetween()`, `isAfter()`, and `isBefore()`.
