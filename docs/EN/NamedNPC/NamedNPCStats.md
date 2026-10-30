# NPC Stats and Social Display

Giving Luna a Trust stat on Social takes a few connected pieces: the character record stores its value, actions change it, and the card displays the result.

Use `maplebirch.npc.addStats()` to register the field and its display settings. The examples follow the same `myModTrust` from an initial value through a conversation that increases it.

## Three Separate Layers

| Layer                                           | Responsibility                                                       |
| :---------------------------------------------- | :------------------------------------------------------------------- |
| Character data, such as `C.npc.Luna.myModTrust` | Current value saved with the native character record                 |
| `default`, `min`, `max`                         | Default and range metadata; `min` and `max` do not clamp assignments |
| `name`, `value`, `activeIcon`, etc.             | Native Social card display, without automatic gameplay effects       |

Definitions are shared across named NPCs. A mod prefix keeps custom field names distinct from other content. Initialization and loading fill missing or nonfinite values with `default`, or `0` when omitted, while retaining existing finite values.

## Complete Script Example

Register the stat before the character in your mod's loading script:

```javascript
maplebirch.npc.addStats({
  myModTrust: {
    min: 0,
    max: 100,
    default: 0,
    position: 2,
    name: 'Trust',
    value: () => T.npcData?.myModTrust ?? 0,
    minValue: 0,
    maxValue: 100,
    activeIcon: 'img/ui/sym-love.png',
    inactiveIcon: 'img/ui/sym-love-empty.png',
    color: 'teal',
    requirements: () => T.npcData?.nam === 'Luna'
  }
});

maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    adult: 1,
    teen: 0,
    title: 'librarian',
    myModTrust: 25
  },
  {
    important: true
  }
);
```

`T.npcData` is the character whose native Social card is being rendered. Read it inside `value` and `requirements`, rather than evaluating it during registration. This gives every NPC a default of `0`, starts Luna at `25`, and displays the stat only on her card.

Luna must complete [native first-meeting initialization](NamedNPC.md#2-arrange-the-first-meeting) before the important-NPC card appears under native conditions. `position` alone does not create a label, read the value or choose an icon.

## Numeric and Ordering Fields

All fields are optional in the type contract. Supply the values and display information your feature needs.

| Field             | Purpose                                                                                                    |
| :---------------- | :--------------------------------------------------------------------------------------------------------- |
| `default`         | Value used at creation or when repairing missing/nonfinite data; defaults to `0`                           |
| `min`, `max`      | Range metadata available to your mod; does not constrain the current value                                 |
| `position`        | Insert into the native important-NPC stat list; accepts a zero-based index, `'first'`, `'last'` or `false` |
| `position: false` | Register the definition without automatically adding it to that list                                       |

Omitting `position` inserts near the end of the native list. Ordinary cards show a small fixed set of stats, while important cards reserve trailing entries for special NPCs. For a visible custom stat, use an important NPC and an explicit early index as above. `'last'` does not guarantee a visible final slot for every character.

Repeated `addStats()` calls merge definitions with the same name. Definitions are shared, not registered separately for each character, and do not reset existing saves.

## Native Social Display Fields

| Field                        | Purpose                                                              |
| :--------------------------- | :------------------------------------------------------------------- |
| `name`                       | Display label                                                        |
| `value`                      | Displayed value, usually read from `T.npcData` through a callback    |
| `minValue`, `maxValue`       | Native progress-bar range, separate from stored `min`/`max` metadata |
| `activeIcon`, `inactiveIcon` | Full image paths; omitted inactive icons use native outlining        |
| `color`                      | Native bar colour, such as `'teal'`                                  |
| `iconOrientation`            | Native icon orientation, such as `'vertical'`                        |
| `requirements`               | Display eligibility, without changing the value                      |

`value`, `name`, icons, colour, orientation and `requirements` accept synchronous callbacks evaluated during card processing. Keep display and eligibility callbacks free of state changes so a redraw cannot repeat progress.

Native cards also check first-meeting state, whether the underlying stat is greater than `0`, and the card category. `requirements: true` does not force a zero-valued stat to appear. Additional metadata does not automatically implement abilities or effects.

## Change Values During Scenes

Use the `$myMod.luna.meeting` state initialized in the [complete example](Example.md). Only a planned meeting can complete the first conversation; settle it on click and clamp the value explicitly.

```twine
<<if C.npc.Luna and $myMod.luna.meeting is "planned">>
  <<link "Complete the first conversation" "My Mod Luna Meeting">>
    <<if $myMod.luna.meeting is "planned">>
      <<set C.npc.Luna.myModTrust to Math.clamp((C.npc.Luna.myModTrust ?? 0) + 5, 0, 100)>>
      <<set $myMod.luna.meeting to "completed">>
      <<set $myMod.luna.noticePending to true>>
    <</if>>
  <</link>>
<</if>>
```

This settlement fragment reuses the example's state and target passage; it is not a separate complete story. Conversation completion and trust are saved together, so reopening the page does not grant trust again. Native `npcincr` has character and stat whitelists; do not assume it supports a new character or field. Avoid immediately finding a `$NPCName` index and assigning initial values in the loading script. The new-game table may not exist yet, and repeated loading could overwrite progress.

Put initial values in character registration, such as `myModTrust: 25` above. Call `addStats()` before `add()` so the constructor recognizes that custom numeric field.

## boot.json Data

Static definitions can go in `params.npc.Stats`. This fragment registers a stat without automatically displaying it:

```json
{
  "npc": {
    "Stats": {
      "myModTrust": {
        "min": 0,
        "max": 100,
        "default": 0,
        "position": false
      }
    }
  }
}
```

Place this object inside `maplebirchAddon`'s `params`; see [boot.json Configuration](../BootJson.md). Add dynamic `value`, icons, requirements and ordering in a script when display is needed. JSON cannot contain callbacks, and function strings are not executed as display callbacks.

## Verify the Integration

1. Start a game and enter Luna's first meeting; confirm `C.npc.Luna.myModTrust` is `25`.
2. Open Social and check the stat and icon appear only on Luna's important-NPC card.
3. Change the value through the actual action and reopen Social. Redrawing alone must not add points again.
4. Save and load; confirm finite saved values remain instead of returning to their initial values.
