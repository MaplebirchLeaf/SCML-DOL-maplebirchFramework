# Combat Companions

Adds companion support to ordinary human and beast encounters. Members use current NPC objects from `$NPCName` or `$per_npc`; both sources follow the same flow and stay outside the enemy list. The content mod's Twee widgets handle relationships, support conditions and dialogue.

| Owner       | Responsibilities                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | Store encounter companions, follow native action resolution, handle health and stun, prevent duplicate resolution and clean up at the end |
| Content mod | Decide who is present, provide response widgets, set support conditions and costs, confirm hits and handle later scenes                   |

## Minimal Usage

Confirm that Robin is known and accompanying the player, then call the add macro once after vanilla combat initialization:

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support'>>
```

Call the leave macro when the companion needs to leave early:

```twine
<<companions-leave `C.npc.Robin`>>
```

Ordinary integration only needs the add macro. The framework follows vanilla combat to process actions, support and hit updates, then clears the group when the encounter ends. The leave macro only makes specified characters leave early; no arguments means no action.

Each companion uses one response widget. Basic usage only needs to handle `assist`:

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>>
  <<if _args[0].event is 'assist'>>
    Robin stays close, watching the fight.
  <</if>>
<</widget>>
```

List the widget file in your mod's `tweeFileList`. This example only outputs dialogue. Add support conditions and effects inside this branch as needed; other responses can be added later.

## NPCs and Responses

Vanilla must have created the character's data. Named NPCs must also be known (`init === 1`). Only actual objects from the current containers are accepted; name strings, copies and objects retained from before loading are rejected. Enclose `C.npc.Robin` in backticks when passing it as a Twee macro argument.

The vanilla containers can also be used directly:

```twine
<<companions-add $NPCName[setup.NPCNameList.indexOf('Robin')] 'myMod-robin-support'>>
<<companions-add $per_npc.hacker 'myMod-mickey-support'>>
```

Vanilla `generateMickey` stores Mickey in `$per_npc.hacker`. Supply the response macro name without `<< >>`.

The widget reads the current response data from `_args[0]`:

| Field                                   | Usage                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npc`                                   | Reference to the current native character object; changing its NPC fields changes that character |
| `event`                                 | Event name used to select a response branch                                                      |
| `health`, `healthmax`, `stun`, `damage` | State snapshot for reading; changes do not update the companion record                           |
| `bonus`, `guard`, `heal`                | Set only in `effects` to return the effects currently available                                  |
| `hit`                                   | Set only in `update` to submit a confirmed hit from this action                                  |

| `event`   | Trigger                                               |
| --------- | ----------------------------------------------------- |
| `effects` | Query the effects currently available                 |
| `assist`  | Provide support for this action submission            |
| `update`  | Update state after vanilla enemy actions              |
| `heal`    | Execute treatment selected for this character         |
| `hit`     | Hit while retaining health                            |
| `stun`    | Skipping this support opportunity due to stun         |
| `defeat`  | Health reached zero and support ended                 |
| `leave`   | A specified companion left through `companions-leave` |

`damage` is actual health lost in `hit`/`defeat` responses, and `0` for other responses. Handle only the events needed. Put actual support and treatment costs in `assist` and `heal`, respectively, so queries, hits and departures do not also consume resources. Only `update` reads a returned `hit`; other events do not submit damage.

Use NPC attributes according to their vanilla meanings: `Robin.dom` is confidence and `Kylar.rage` is jealousy. Damage effects should retain the vanilla damage, defeat and targeting flow so individual and shared enemy health stay consistent.

## Support Effects and Treatment

The framework calls `effects` when querying action options, damage and pain. Each query starts with these result fields:

| Field   | Default | Purpose                                                                            |
| ------- | ------- | ---------------------------------------------------------------------------------- |
| `bonus` | `0`     | Nonnegative finite damage bonus ratio; `0.1` adds 10%                              |
| `guard` | `0`     | Pain-gain reduction ratio, limited to `0` through `1`; invalid values count as `0` |
| `heal`  | `false` | Offers treatment only when strictly `true`                                         |

`effects` may run repeatedly. Change only these three snapshot fields: do not modify story variables, spend resources, advance scenes or output dialogue here. The framework resets the defaults for every query, so content needs no cleanup of previous results.

Companions' `bonus` values add together. Vanilla `defiance` damage is multiplied by `1 + total bonus`, then follows the remaining vanilla multipliers, multi-enemy distribution and defeat flow. Pain-reduction multipliers compose as `× (1 - guard)` for each companion. Reduction only modifies pain-increasing `pain` macro calls during combat; pain recovery and direct script calls to `statChange.pain()` retain their vanilla behavior.

Eligible companions offer treatment in vanilla mouth actions. The framework checks mouth availability, underwater and silenced states, and rechecks the character and conditions when executing. Selecting treatment uses that character's support for this action submission: that character supplies no damage bonus, pain reduction or `assist`, while other companions continue normally. After one treatment, its default action returns to vanilla rest so another turn does not automatically spend more resources.

Write treatment dialogue, recovery and resource costs in `heal`. Use vanilla `pain` and its indicator macros, retaining vanilla minimum pain. The companion framework does not define a separate PC health pool.

## Complete Twee Example

The widget below replaces the minimal example under the same name. The example has four parts: joining the encounter, recording a hit, handling responses and recovering afterward.

### 1. Join the Encounter

The following `$myModSupport` is example progress owned by the content mod, rather than a vanilla variable or universal framework ability stat. It tracks support effort, remaining treatments and whether rest is needed. The encounter must first establish that Robin is accompanying the player; run this after vanilla combat initialization:

```twine
<<if !$myModSupport>>
  <<set $myModSupport to { effort: 0, treatments: 2, needsRest: false }>>
<</if>>
<<if !$myModSupport.needsRest>>
  <<companions-add `C.npc.Robin` 'myMod-robin-support'>>
<</if>>
```

### 2. Record a Confirmed Hit

Only after the encounter has confirmed that Robin was actually hit, record a temporary result in that hit-settlement branch, before the current `stateman` call, for example:

```twine
<<set _myModRobinHit to [8, 1]>>
```

The encounter owns hit detection and damage sources. Run the assignment above only after confirming a hit. The response widget consumes the temporary value in `update`, then the framework applies damage and triggers `hit` or `defeat`.

### 3. Define the Response Widget

Damage bonuses and pain protection fall as effort rises. Active treatment spends a treatment and adds more effort; reaching the limit makes the companion leave early:

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>><<if _args[0].event is 'effects'>><<silently>>
  <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5>>
    <<set _args[0].bonus to 0.15 * (1 - $myModSupport.effort / 5)>>
    <<set _args[0].guard to 0.2 * (1 - $myModSupport.effort / 5)>>
    <<set _args[0].heal to $myModSupport.treatments gt 0 and $pain gt 0>>
  <</if>>
<</silently>><<else>>
  <<switch _args[0].event>>
    <<case 'update'>>
      <<if _myModRobinHit>>
        <<set _args[0].hit to _myModRobinHit>>
        <<unset _myModRobinHit>>
      <</if>>
    <<case 'assist'>>
      <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5>>
        <<set $myModSupport.effort += 1>>
        Robin stays close, watching the fight.
      <</if>>
    <<case 'heal'>>
      <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5 and $myModSupport.treatments gt 0 and $pain gt 0>>
        <<set $myModSupport.treatments -= 1>>
        <<set $myModSupport.effort += 2>>
        Robin helps you tend to your injuries.
        <<pain -5 1>><<lpain>>
      <</if>>
    <<case 'leave' 'defeat'>>
      <<if $myModSupport and !$myModSupport.needsRest>>
        <<set $myModSupport.needsRest to true>>
        <<if _args[0].event is 'defeat'>>
          Robin can no longer keep fighting.
        <<else>>
          Robin steps back to catch a breath.
        <</if>>
      <</if>>
  <</switch>>
  <<if (_args[0].event is 'assist' or _args[0].event is 'heal') and $myModSupport and !$myModSupport.needsRest and $myModSupport.effort gte 5>>
    <<companions-leave _args[0].npc>>
  <</if>>
<</if>><</widget>>
```

`hit` and `stun` still settle without dedicated branches; add reactions as needed. `needsRest` prevents duplicate departure progress and lets later scenes know that the character needs rest.

### 4. Clear the Rest State on Recovery

Clear the rest state only when recovery actually completes at the content's existing rest or follow-up scene:

```twine
<<if $myModSupport and $myModSupport.needsRest>>
  <<set $myModSupport.effort to 0>>
  <<set $myModSupport.needsRest to false>>
<</if>>
```

Replenish treatments at an actual supply scene using that content's payment or item consumption. The content owns relationship requirements, departure conditions and follow-up scenes, retaining the existing NPC schedule.

## Health, Hits and Leaving

The add macro's optional third argument is maximum health. It defaults to `100` and must be a positive finite number. Companion health is independent of vanilla enemy NPC health and DoLX enemy difficulty multipliers:

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support' 100>>
```

After vanilla enemy actions and `stateman` status output, the framework runs this submission's `update` for each active companion. The submission must first settle `effectsman`, then reach `stateman` after enemy actions; displaying combat status alone does not trigger an update. Content that has confirmed a hit can set `_args[0].hit` to `[damage, stun]`, such as `[8, 1]`. Stun is optional; `[8]` adds no stun. If enemy actions trigger an ending after this submission's support, confirmed hits still settle once without granting another support action.

Damage must be nonnegative and finite. It applies directly to companion health, capped at the remaining health, without vanilla `pain`'s ×4 conversion. Stun must be a nonnegative safe integer; the higher of the new and existing values is retained. Each valid support opportunity reduces it by one and skips that opportunity, including a decrease from `1` to `0`. Leave `hit` unset when no hit was confirmed; the framework does not automatically make enemies target companions.

For several hits in one submission, the content combines damage and retains the highest stun before passing the result to that submission's `update`. Keep hit results in temporary passage variables, which clear for the next action submission and are rebuilt by the original hit branch when loading. They do not belong in persistent story progress.

The leave macro accepts multiple characters and only makes the listed companions leave early. With no arguments or no valid characters, it does nothing:

```twine
<<companions-leave `C.npc.Robin` $per_npc.hacker>>
```

Adding the same character twice does not stack support. Rejoining after leaving preserves the original widget, health, maximum, stun and deduplication records; it cannot revive a character whose health reached zero in this encounter. Each character's `leave` response runs once per action submission.

## Turns and Saves

- The framework distinguishes action submissions by the current native history moment. A new `Engine.play()` creates a new moment even when the passage name stays the same. `Engine.show()` creates no new moment, so redrawing does not repeat support, spend resources or consume stun.
- The framework begins with vanilla action submission, runs support after `effectsman` and updates state after enemy actions and `stateman` status output. Content needs no per-passage calls to internal turn interfaces. Each character can support or treat once in a submission; leaving early and rejoining does not reset that allowance.
- The framework saves character identities, response widgets, health, stun and settlement records. Characters are resolved from the current vanilla containers after loading. Response snapshots are passed to widgets temporarily, with the previous temporary variable restored afterward.
- Saves retain the vanilla snapshot from before passage execution. Loading replays the current passage once and the framework settles that submission again; redrawing does not become a new action, and time spent away from the game does not cause catch-up turns.
- `combatinit`, `endcombat` and `endevent` automatically clear the companion group. Repeated cleanup adds no settlement. Vanilla `endcombat` also calls `endevent` internally. An individual early departure retains the encounter record, and redrawing does not consume extra stun.
- Vanilla `endevent` clears current encounter NPC slots and phases, not character records in `$NPCName` or `$per_npc`.
- Character and combat checks run before each member acts. No effects are supplied after combat ends, during a pending transition, replay, frozen state or possession, or when the character is stunned or invalid. Treatment execution rechecks its conditions.

This entry point covers the vanilla human/beast action flow. Unconscious simulations, struggle, tentacle and swarm modes have no separate integration, and content must still determine eligibility in complex mixed encounters.

## Script API

These interfaces belong to `maplebirch.combat.companions`. Prefer the two macros above for Twee content.

| API                                 | Return Value and Purpose                                          |
| ----------------------------------- | ----------------------------------------------------------------- |
| `add(npc, widget, healthmax = 100)` | Whether adding succeeded                                          |
| `leave(...npcs)`                    | Responses for specified departures; no arguments means no action  |
| `get(npc)`                          | State snapshot, including departed members; otherwise `undefined` |
| `members`                           | Snapshots of valid companions still active in the encounter       |
