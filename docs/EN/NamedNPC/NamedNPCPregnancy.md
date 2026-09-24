# NPC Pregnancy

`maplebirch.npc.Pregnancy` registers named NPCs with the original 0.5.12.13 pregnancy system and provides cycle configuration, story queries, and conception rolls. The original game continues to own pregnancy records, time progression, child generation, and birth.

Call `add()` while loading your mod script; query state or roll for conception only after the game has initialized and loaded the NPC. Check `maplebirch.npc.Pregnancy.available` before calling: `get()` and `tryConceive()` throw if the original pregnancy API is unavailable or the NPC name is unknown.

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

Static configuration can also go in [`npc.Pregnancy` in `boot.json`](../BootJson.md#npc). Do not configure different cycles for the same NPC in both places. `canBePregnant` and `canImpregnatePlayer` add NPCs to original content lists; they do not remove existing entries.

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

`days` and `fertileLeadDays` must be positive integers or ordered positive-integer ranges. `dangerousDay` requires `days` and cannot exceed the shortest cycle. Invalid configurations throw from `add()`.

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

`pregnancies` contains the active records returned by the original game. `fertility` is the original current fertility multiplier from `0` through `1`. `progress` is the first active pregnancy's progress from `0` through `1`, or `null`. `dueDate` is an original game timestamp, and `belly` uses the original belly-size calculation.

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

`donor` defaults to player `pc`; `fertility` defaults to `1` and must be finite and non-negative. If omitted, `orifice` is selected from the NPC's body data; specify it explicitly for a particular story scene. `aware` and `donorKnown` record the player's knowledge of the pregnancy and donor, respectively; they do not inform every character. Each call requests one original conception roll, so invoke it only when the corresponding story event occurs.

The NPC and donor must use an original reproductive species: `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk`, or `harpy`. The framework does not add child species or replace original combat conception, daily progression, or birth.
