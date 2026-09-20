# NPC Pregnancy

`maplebirch.npc.Pregnancy` registers named NPCs with the original 0.5.12.13 pregnancy system and provides cycle configuration, story queries, and conception rolls. The original game continues to own pregnancy records, time progression, child generation, and birth.

## Registration

The registration key is the NPC's `nam`; it does not use a mod prefix.

```javascript
maplebirch.npc.add({ nam: 'Example', gender: 'f', type: 'human' });

maplebirch.npc.Pregnancy.add('Example', {
  canBePregnant: true,
  canImpregnatePlayer: true,
  cycle: {
    days: [26, 30],
    dangerousDay: 14,
    fertileLeadDays: [4, 6],
    pills: null,
    analEnabled: true,
    avoidance: 50
  }
});
```

| Option                  | Default  | Purpose                                       |
| :---------------------- | :------- | :-------------------------------------------- |
| `canBePregnant`         | `true`   | Adds completed carrier content                |
| `canImpregnatePlayer`   | `false`  | Adds completed player-impregnation content    |
| `cycle.days`            | Original | Fixed cycle length or `[minimum, maximum]`    |
| `cycle.dangerousDay`    | Original | Ovulation danger day                          |
| `cycle.fertileLeadDays` | Original | Fixed fertile lead or a random range          |
| `cycle.pills`           | Original | `contraceptive`, `fertility`, or `null`       |
| `cycle.analEnabled`     | Original | Enables the original anal pregnancy check     |
| `cycle.avoidance`       | Original | Contraception tendency from `0` through `100` |

Cycle configuration is applied once. Existing saves retain their current cycle day, clamped when it exceeds the new cycle length. Later loads do not reset the cycle or overwrite saved switches.

## Story State

```javascript
const pregnancy = maplebirch.npc.Pregnancy.get('Example');
```

The result groups the values commonly needed by a story:

```javascript
{
  cycle: {
    enabled,
    day,
    days,
    dangerousDay,
    fertileLeadDays,
    fertility,
    pills,
    analEnabled,
    avoidance
  },
  pregnancies,
  progress,
  dueDate,
  belly
}
```

`fertility` is the original current fertility multiplier from `0` through `1`. `progress` is the first active pregnancy's progress from `0` through `1`, or `null`. `dueDate` is an original game timestamp, and `belly` uses the original belly-size calculation.

## Story Conception Roll

After a custom story explicitly describes internal ejaculation, it can request one original NPC conception roll:

```javascript
const record = maplebirch.npc.Pregnancy.tryConceive('Example', {
  donor: 'pc',
  orifice: 'vagina',
  depth: 'deep',
  location: V.location,
  fertility: 1,
  aware: true,
  donorKnown: true
});
```

The method returns the original pregnancy record on success and `null` otherwise. It retains the original chance, cycle, pills, content settings, infertility list, and existing-pregnancy checks; it does not force conception.

The NPC and donor must use an original reproductive species: `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk`, or `harpy`. The framework does not add child species or replace original combat conception, daily progression, or birth.
