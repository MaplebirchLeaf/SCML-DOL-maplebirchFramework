# From an example to a complete feature

The awkward parts of mod development often lie between APIs: a registered character has no way to meet the player, a reward can be claimed again after reopening a page, or an older save lacks a field that a new game already has.

This page connects those pieces through one small feature. Start with [Getting started](GettingStarted.md) to confirm that scripts and widgets load. Keep the [NPC park-meeting example](NamedNPC/Example.md) open if you want complete files to compare against.

## Describe the player's path first

Start with the player's actions before choosing APIs: meet Luna in the park, arrange to talk when free, then gain a little trust through the conversation. Once that path is clear, it is easier to see what the code needs to remember.

| Current state  | Player action                            | New state  | Settlement                                |
| :------------- | :--------------------------------------- | :--------- | :---------------------------------------- |
| Not introduced | Enter the greeting scene                 | Introduced | Native `npc` initializes the character    |
| No arrangement | Agree to talk when free                  | Planned    | Change story state and return to the park |
| Planned        | Meet and complete the first conversation | Completed  | Add `5` trust and queue a notice          |
| Completed      | Talk again or redraw                     | Completed  | Preserve existing values                  |

Reopening a page should preserve progress; trust should increase when the conversation is completed. That gives us two requirements: a saved completion flag and another eligibility check inside the click action.

## Give each file a clear role

A feature can span several kinds of file. Begin with this division, then split scripts further as the mod grows:

| File or object                  | Contents                                                     | When it is used                             |
| :------------------------------ | :----------------------------------------------------------- | :------------------------------------------ |
| `boot.json`                     | Dependencies, script order, Twee and resource paths          | ModLoader loads the mod                     |
| `framework.js`                  | NPC, stat, schedule, event, and zone registrations           | Register on each startup                    |
| A `[widget]` passage in `.twee` | Reusable UI and story widgets                                | Called by a page or zone after registration |
| A regular `.twee` passage       | Scenes, choices, action settlement, and exits                | The player enters the scene                 |
| `setup.myMod`                   | Functions, constant tables, runtime configuration            | Rebuilt on startup; not saved               |
| `V.myMod` / `$myMod`            | Quest progress, claimed flags, mod settings                  | Saved with that playthrough                 |
| `C.npc.Luna`                    | Character relationships and custom stats in the current save | Query after character records exist         |

If `params.script` already loads `framework.js`, leave it out of `scriptFileList` to avoid running it twice. Widget definitions belong in a passage tagged `[widget]`, with its file listed in `tweeFileList`.

`myMod`, `Luna`, and `My Mod ...` are example names. Update registrations, queries, and link targets together when using your own names. Keep quest progress in your own `V.myMod` too, so it stays separate from other mods and native objects such as `$daily`.

## Separate registration from saved defaults

Registration tells the framework which characters, events, and rules the mod provides on each startup. The player's progress should come back from the save. Keeping these jobs separate avoids resetting the story while loading scripts.

This pattern can be used in your own mod. The function fills missing defaults and can be called at startup and when loading:

```javascript
function initMyMod(variables) {
  variables.myMod ??= {};
  variables.myMod.settings ??= {};
  variables.myMod.settings.enabled ??= true;
  variables.myMod.quest ??= {};
  variables.myMod.quest.rewardClaimed ??= false;
}

maplebirch.tool.onInit(() => {
  initMyMod(V);
});

maplebirch.on(':onLoad', save => {
  initMyMod(save.V);
});
```

If the player sets `enabled` to `false`, another call leaves it off. Claimed rewards stay claimed too. An older save may lack newly added fields, which is why the load callback fills them as well.

Use `save.V` inside the load callback: global `V` still refers to the game state before loading. See [Save and Load](Events.md#save-and-load). `??=` only handles missing or `null` values. Repair invalid types and rename fields in [migration files](Tools/Migration.md), then fill defaults.

## Queries read; actions settle

Pages can redraw more often than expected. Social cards, wardrobes, schedules, and layers may query data repeatedly, and `cond` can run more than once. Use those callbacks to read the current situation. Put points, money, quest progress, and conception attempts in the actual action so they are not repeated by a redraw.

This example uses the preceding initialization and assumes the player has already met Luna:

```twine
<<if C.npc.Luna and !$myMod.quest.rewardClaimed>>
  <<link "Claim the quest's trust reward" "My Mod Reward">>
    <<if C.npc.Luna and !$myMod.quest.rewardClaimed>>
      <<set C.npc.Luna.myModTrust to Math.clamp((C.npc.Luna.myModTrust ?? 0) + 5, 0, 100)>>
      <<set $myMod.quest.rewardClaimed to true>>
    <</if>>
  <</link>>
<</if>>
```

The outer `if` controls the link; the inner check confirms eligibility again when clicked. After adding trust, it records `rewardClaimed`, so reopening the page does not grant another reward. Loading a save made before claiming restores that earlier progress.

This fragment demonstrates the reward only; your mod still needs to define `My Mod Reward`. See the [NPC example](NamedNPC/Example.md) for a complete scene.

An event's `once: true` option is useful too, but it only removes the registration from the current runtime. Use a saved flag to remember what happened in a particular save; the option does not limit progress in other saves either.

## Choose the appropriate integration

For content in Options or a status area, start with a [zone widget](Tools/Zones.md) and provide its definition and display conditions. A story entry also needs prerequisites, a target passage, and exit handling. When no suitable zone exists, consider a local [source patch](Tools/Patches.md).

Use [time events](Dynamic/TimeEvents.md) for changes as time passes, and [state events](Dynamic/StateEvents.md) for a notice or scene waiting for a page check. Decide how the former handles a long interval; give the latter a condition, output, and any required exit.

For NPC content, a [schedule](NamedNPC/NamedNPCSchedule.md) answers where the character is now, while your story supplies the encounter. The [sidebar](NamedNPC/NamedNPCSidebar.md) needs artwork or model resources, current scene presence, and display settings. Fixed food, trait, and similar definitions use the relevant [data registration](README.md#data-registration) API alongside resources and gameplay code. Registering a trait does not implement its effect; registering a transformation does not grant growth points.

Source patches need one more check: a passing `expected` count confirms the number of matches. Inspect the native branch to ensure combat, fainting, opening-hour, and quest restrictions still apply. With another translation or fork, check that structure before adjusting the anchor.

## Verify in order

Walk a simple path first: load, use the feature, complete the action, enter again, then save and load. Confirm it on the target version alone before adding the mods and forks you intend to support; this makes new problems easier to trace.

| Stage              | Expected observation                               | Check first if it fails                                 |
| :----------------- | :------------------------------------------------- | :------------------------------------------------------ |
| Load               | Script runs once; widgets and passages exist       | ZIP paths, `boot.json`, dependencies, duplicate loading |
| First use          | Correct defaults; introduction initializes once    | Registration order, saved defaults, native `npc` call   |
| Action             | Only successful actions change state               | Click callback, reward branch, repeat protection        |
| Re-entry           | Completed progress and values remain               | Defaults being assigned in page content                 |
| Save and load      | Saved progress returns                             | `save.V`, serializable data, stale character references |
| Earlier save       | Missing fields are filled; progress remains        | Defaults and centralized migrations                     |
| Fork compatibility | Native prerequisites still work; resources display | Source anchors, patch reports, actual fork resources    |

Follow the same order when diagnosing: did the file load, was registration accepted, did the condition match, did the action run, and what was displayed? [Modules and diagnostics](Modules.md) and [patch reports](AddonPlugin.md#patch-reports) help identify lifecycle and source-adaptation results. Record the versions you actually exercised; successful registration still needs a complete playable path.

## Which examples are complete?

A complete example includes its file layout and all contents, so you can get it running first. Topic fragments help explain one API; look for the characters, state, artwork, and passages they rely on.

If a fragment contains ellipses, an undefined helper, or partial configuration, supply those pieces before using it in your mod. That keeps the example focused while making the remaining work clear.

[Back to documentation](README.md)
