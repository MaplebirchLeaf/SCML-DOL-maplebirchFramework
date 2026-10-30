# Combat Companions

Adds automatic cover and distraction to vanilla human and beast encounters. Companions use current characters from `$NPCName` or `$per_npc` and stay outside the enemy list. The framework handles turns, health, stun and end cleanup; content owns presence, support conditions and dialogue.

## Basic Usage

The scene first establishes that the character is known, available and accompanying the player. Call once after vanilla combat initialization:

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support'>>
```

Add the response widget file to the mod's `tweeFileList`. This example grants 10% more damage and 10% less pain gain, with dialogue when support actually runs:

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>>
  <<switch _args[0].event>>
    <<case 'effects'>>
      <<set _args[0].bonus to 0.1>>
      <<set _args[0].guard to 0.1>>
    <<case 'assist'>>
      <<lanSwitch 'Your companion watches your flank.' '同伴留意着你的侧后方。'>>
    <<case 'update'>>
      <<if _myModRobinHit>>
        <<set _args[0].hit to _myModRobinHit>>
        <<unset _myModRobinHit>>
      <</if>>
  <</switch>>
<</widget>>
```

Automatic support follows vanilla action resolution. Content need not add characters again on every passage render or call internal turn methods. For a dedicated active action, use the existing [combat action](Actions.md) interface.

## Characters and Responses

Named NPCs must be known (`init === 1`). Only actual objects in the current containers are accepted; name strings, copies and references retained from before loading are rejected. Enclose `C.npc.Robin` in backticks when passing it as a Twee macro argument. The vanilla containers can also be used directly:

```twine
<<companions-add $NPCName[setup.NPCNameList.indexOf('Robin')] 'myMod-robin-support'>>
<<companions-add $per_npc.hacker 'myMod-mickey-support'>>
```

Vanilla `generateMickey` stores Mickey in `$per_npc.hacker`. Both character sources follow the same flow. Supply the response macro name without `<< >>`.

The widget reads the response from `_args[0]`:

| Field                                   | Purpose                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `npc`                                   | Current native character reference; changing its fields changes that character |
| `event`                                 | Current response event                                                         |
| `health`, `healthmax`, `stun`, `damage` | Read-only state snapshot; changing these does not update the companion record  |
| `bonus`, `guard`                        | Return current support effects in `effects` only                               |
| `hit`                                   | Submit this action's confirmed hit in `update` only                            |

| Event     | Timing                                              |
| --------- | --------------------------------------------------- |
| `effects` | Query current support effects                       |
| `assist`  | Provide support for this submission                 |
| `update`  | Update after native enemy actions and status output |
| `hit`     | Hit while retaining health                          |
| `stun`    | Skip this support opportunity due to stun           |
| `defeat`  | Health reached zero and support ended               |
| `leave`   | Leave early through `companions-leave`              |

`effects` may be queried repeatedly. Set only `bonus` and `guard`; do not change story progress, spend resources or output dialogue. Both default to `0` on every query: `bonus` is a nonnegative finite ratio; `guard` is limited to `0` through `1`, with invalid values treated as `0`. Put dialogue and actual costs in `assist`, adding other responses when the scene needs them.

Companions' `bonus` values add together. Vanilla `defiance` damage is multiplied by `1 + total bonus`, then follows the remaining vanilla multipliers, multi-enemy distribution and defeat flow. Pain reduction multiplies by `1 - guard` for each companion. It only affects positive combat `pain` macro calls, not pain recovery or scripts that write pain directly. Content must integrate custom damage at its proper resolution point, keeping individual and shared enemy health consistent.

Use NPC attributes according to their vanilla meanings: `Robin.dom` is confidence and `Kylar.rage` is jealousy.

## Hits, Stun and Departure

The add macro's third argument sets maximum health. It defaults to `100` and must be a positive finite number. Companion health is independent of enemy health and DoLX enemy difficulty multipliers.

`_myModRobinHit` in the example is a temporary variable owned by the content. Only after the scene confirms that Robin was actually hit, record the result before this submission's `stateman`:

```twine
<<set _myModRobinHit to [8, 1]>>
```

The returned `hit` in `update` is `[damage, stun]`, with stun optional. Damage must be nonnegative and finite; it directly reduces companion health, capped at the remaining health, without `pain`'s ×4 conversion. Stun must be a nonnegative safe integer; the higher of the existing and new values is retained. Each valid support opportunity reduces it by one and skips that opportunity, including the decrease from `1` to `0`. `damage` in `hit`/`defeat` responses is actual health lost; it is `0` for other events.

For several hits in one submission, the scene combines damage and retains the highest stun before returning the result. Leave `hit` unset without a confirmed hit; the framework does not randomly select companions as enemy targets. The original hit branch rebuilds temporary results when loading replays the passage, without a separate persistent story record.

Specify one or several characters for early departure:

```twine
<<companions-leave `C.npc.Robin` $per_npc.hacker>>
```

No arguments or no valid characters means no action. Adding a character twice does not stack support. Rejoining preserves the encounter's health, stun, widget and settlement records; health reaching zero prevents rejoining this encounter. Each character's `leave` response runs once per submission. Zero health only stops support; content owns the aftermath.

## Turns and Saves

- Submissions follow native history moments. Another `Engine.play()` is a new turn even with the same passage name; `Engine.show()` redraws without repeating support, costs or stun consumption.
- Support runs after `effectsman`; updates run after enemy actions and `stateman` status output. Displaying `stateman` alone does not settle hits. Confirmed hits following this turn's support may settle once during the ending, without adding another support action.
- Character identities, response widgets, health, stun and settlement records are saved. Characters are resolved from the current native containers after loading. Native entry snapshots and passage replay are retained, without catch-up turns for time spent away from the game.
- `combatinit`, `endcombat` and `endevent` automatically clear the group. Repeated cleanup invokes no additional companion responses. Read any needed aftermath result before native end macros; cleanup does not delete characters from `$NPCName` or `$per_npc`.
- Character and combat conditions are rechecked before each companion acts. Frozen, replay, possessed, pending-transition and stunned states provide no new support. This entry point covers ordinary human/beast encounters; content still decides eligibility in complex mixed encounters.

## Script API

Located at `maplebirch.combat.companions`. Prefer the two macros above for Twee integration.

| API                                 | Return Value and Purpose                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| `add(npc, widget, healthmax = 100)` | Whether adding succeeded                                             |
| `leave(...npcs)`                    | Responses for specified departures                                   |
| `get(npc)`                          | State snapshot, including departed members; otherwise `undefined`    |
| `members`                           | Snapshots of valid companions still active in the encounter          |
| `damage(amount)`                    | Returns damage with companion bonuses; does not deduct enemy health  |
| `pain(amount, modifier = 4)`        | Returns pain with companion reduction; does not change pain directly |
