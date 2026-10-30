# NPC Pregnancy

`maplebirch.npc.Pregnancy` integrates named NPCs with the native 0.5.12.13 pregnancy API. It provides content-list registration, cycle configuration, queries and conception rolls. Native code still owns pregnancy records, time progression, child generation and birth.

## Registration and Runtime Boundaries

- Call `add()` from your loading script to register configuration.
- Query or roll only after game and character-record initialization.
- `available` checks for native API functions, not character existence, enabled cycles or conception eligibility.
- Check both `available` and the current character, such as `C.npc.Luna`. Missing APIs or unknown characters make `get()` and `tryConceive()` throw.

`NPCData.pregnancy` contains cycle and switch state. It is separate from the active records in `get().pregnancies`; do not put the record array in the character's `pregnancy` field.

## Registration

Use the character's `nam`, matching [NPC Registration](NamedNPC.md):

```javascript
maplebirch.npc.add({
  nam: 'Luna',
  gender: 'f',
  adult: 1,
  teen: 0,
  type: 'human'
});

maplebirch.npc.Pregnancy.add('Luna', {
  canBePregnant: true,
  canImpregnatePlayer: false,
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

The list flags only add a character to native content lists; they do not remove existing members. They do not change anatomy, bypass content settings or generate pregnancy/birth scenes.

| Option                  | Default | Meaning                                                       |
| :---------------------- | :------ | :------------------------------------------------------------ |
| `canBePregnant`         | `true`  | Add to the native carrier-content list                        |
| `canImpregnatePlayer`   | `false` | Add to the native player-impregnation content list            |
| `cycle.days`            | Native  | Fixed cycle days or `[minimum, maximum]`                      |
| `cycle.dangerousDay`    | Native  | Positive-integer danger day, no later than the shortest cycle |
| `cycle.fertileLeadDays` | Native  | Fixed positive fertile lead or a random range                 |
| `cycle.pills`           | Native  | `'contraceptive'`, `'fertility'` or `null`                    |
| `cycle.analEnabled`     | Native  | Native anal pregnancy switch                                  |
| `cycle.avoidance`       | Native  | Finite contraception tendency from `0` through `100`          |

`days` and `fertileLeadDays` accept positive integers or two positive integer endpoints with minimum no greater than maximum. `dangerousDay` requires `days`. Invalid configuration throws from `add()`, which returns the service itself. Registering the same character again replaces its configuration.

Cycle configuration applies once per character in each save. An existing cycle retains its current day, clamped to the new range if necessary; a newly initialized cycle may randomize its starting day. Later loads do not reset it, and changed registration does not reconfigure an already initialized cycle. Native flows maintain saved cycles and switches.

## Static boot.json Configuration

Place this structure inside `maplebirchAddon`'s `params`:

```json
{
  "npc": {
    "Pregnancy": {
      "Luna": {
        "canBePregnant": true,
        "cycle": {
          "days": 28,
          "dangerousDay": 14
        }
      }
    }
  }
}
```

Choose one registration entry point for the same cycle to avoid conflicting values. See [boot.json Configuration](../BootJson.md#npc) for the outer structure. `npc.Pregnancy` does not replace character registration through `npc.NamedNPC`.

## Queries

Run after character data is loaded:

```javascript
if (maplebirch.npc.Pregnancy.available && C.npc.Luna) {
  const status = maplebirch.npc.Pregnancy.get('Luna');
  console.log(status.cycle.enabled, status.progress, status.dueDate);
}
```

| Result field                                           | Meaning                                                                  |
| :----------------------------------------------------- | :----------------------------------------------------------------------- |
| `cycle.enabled`                                        | Whether the native cycle is enabled                                      |
| `cycle.day`, `days`, `dangerousDay`, `fertileLeadDays` | Current cycle data; missing numbers are `null`                           |
| `cycle.fertility`                                      | Current native fertility multiplier from `0` through `1`                 |
| `cycle.pills`, `analEnabled`, `avoidance`              | Medication, anal switch and avoidance; absent avoidance is `null`        |
| `pregnancies`                                          | Native active-pregnancy record array                                     |
| `progress`                                             | First active pregnancy's progress from `0` through `1`, otherwise `null` |
| `dueDate`                                              | First active pregnancy's native timestamp, otherwise `null`              |
| `belly`                                                | Native belly-size calculation                                            |

Use results for story queries. Do not fabricate conception, delivery or knowledge by editing the returned data; use native APIs for those changes.

## Story Conception Roll

Request one native roll only after the corresponding event actually occurs in your story:

```javascript
const record = maplebirch.npc.Pregnancy.tryConceive('Luna', {
  donor: 'pc',
  orifice: 'vagina',
  depth: 'deep',
  location: V.location,
  fertility: 1,
  aware: true,
  donorKnown: true
});
```

Check the runtime requirements first. Success returns a native pregnancy record; an unsuccessful roll returns `null`. Every call makes a new roll, so keep it out of display, schedule and repeatedly evaluated condition callbacks.

| Argument       | Default and meaning                                                                                         |
| :------------- | :---------------------------------------------------------------------------------------------------------- |
| `donor`        | Defaults to `'pc'`; other named donors must exist in native character records                               |
| `donorSpecies` | Player defaults to `'human'`; a named donor defaults to its base `type`; specify unusual sources explicitly |
| `orifice`      | `'vagina'` or `'anus'`, chosen from anatomy if omitted; incompatible anatomy returns `null`                 |
| `depth`        | `'outside' / 'imminent' / 'deep'`, passed to native checks                                                  |
| `location`     | Location passed to the native record                                                                        |
| `fertility`    | Defaults to `1`; finite and nonnegative, not a guaranteed success probability                               |
| `aware`        | Records player knowledge of this pregnancy                                                                  |
| `donorKnown`   | Records player knowledge of the donor, not universal character knowledge                                    |

Native chance, cycle, pills, content settings, infertility and existing-pregnancy checks remain. `canImpregnatePlayer` does not turn this into an API for impregnating the player: `tryConceive(name)` always names the NPC carrier.

Supported native reproductive species are `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk` and `harpy`. NPC transformation identity does not automatically change the base `type` or this species selection. The framework adds no child species and does not replace native combat rolls, daily progression or delivery.
