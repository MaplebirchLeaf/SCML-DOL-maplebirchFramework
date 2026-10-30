# NPC example: meeting and talking in the park

Luna is a librarian who enjoys afternoon walks in the park. Let's give the player a chance to greet her, arrange a chat, and get to know her a little better through their first conversation.

This small scene brings together NPC registration, schedules, trust, and a page notice. All the files are included below, so you can build the example as you read.

It targets vanilla **0.5.12.13**, using its `Park` passage and `<<displayLinks>>` macro as the entry point. Check that insertion point again when adapting it to another game base.

## Prepare three files

```text
my-mod/
├── boot.json
├── framework.js
└── story.twee
```

`boot.json` tells the loader which files to read, `framework.js` registers the character and rules, and `story.twee` contains the scene. Put the three files directly at the ZIP root when packaging; `my-mod/` is only your local working folder.

## 1. Connect the loader

Save this as `boot.json`. The script loads through `params.script`, so leave `scriptFileList` empty to avoid running the same file twice.

`name: "myMod"` identifies the mod. The `nam: 'Luna'` field used later identifies the character. The loader and NPC system use them for different purposes.

```json
{
  "name": "myMod",
  "version": "0.1.0",
  "styleFileList": [],
  "scriptFileList": [],
  "tweeFileList": ["story.twee"],
  "imgFileList": [],
  "additionFile": ["framework.js"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.5.7"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.5.7",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

## 2. Introduce Luna to the framework

Put all five snippets in this section into `framework.js`, in the order shown.

### Remember the arrangement

The player might head home after making plans, or save and return another day. We use `meeting` to remember conversation progress and `noticePending` to remember a notice that has not been shown yet.

Initialization only fills missing fields. An existing arrangement survives startup and loading instead of being reset.

```javascript
function initMyMod(variables) {
  variables.myMod ??= {};
  variables.myMod.luna ??= {};
  variables.myMod.luna.meeting ??= 'none';
  variables.myMod.luna.noticePending ??= false;
}

maplebirch.tool.onInit(() => {
  initMyMod(V);
});

maplebirch.on(':onLoad', save => {
  initMyMod(save.V);
});
```

### Register the character and trust

Define Trust before registering Luna so character creation recognizes `myModTrust`.

Her initial trust is `25`, which her Social card can show after the introduction. The `min` and `max` fields below describe a range; action code still needs to enforce it. The story will keep trust within `0–100`.

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
    pronoun: 'f',
    adult: 1,
    teen: 0,
    age: 25,
    title: 'Librarian',
    description: 'A librarian who enjoys walks in the park',
    hairColour: 'black',
    eyeColour: 'purple',
    myModTrust: 25
  },
  {
    important: true
  }
);
```

### Plan her afternoon

Let her spend the morning at the library, arrive at the park at two, and head home at six:

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 0,
      location: 'home'
    },
    {
      time: 8,
      location: 'library'
    },
    {
      time: 14,
      location: 'park'
    },
    {
      time: 18,
      location: 'home'
    }
  ]
});
```

The schedule returns `library` at `08:00–13:59`, `park` at `14:00–17:59`, and `home` otherwise. These are NPC location labels, not passage titles, and they do not change the player's `$location`.

There is no fixed date for this arrangement. If the player cannot make it today, it remains pending until another visit during Luna's park hours; no expiry handling is needed here.

### Add the park entry

The schedule tells us where Luna is; the page still needs a conversation link. This local patch calls `myModLunaEntry` in the park's ordinary-options branch, just before native navigation links. We will define that widget in the next section.

```javascript
maplebirch.tool.inject({
  locationPassage: {
    Park: [
      {
        src: '<<displayLinks>>',
        applybefore: '<<myModLunaEntry>>\n',
        expected: 1
      }
    ]
  }
});
```

`expected: 1` means the anchor should occur exactly once. If it does not match, check the patch report, game base, and branch. Keeping this check makes changes to the native structure easier to spot.

### Leave a notice after the conversation

The story sets `noticePending` to `true` when the first conversation is complete. This `append` event clears the pending flag and supplies the notice at the end of the conversation page.

```javascript
maplebirch.dynamic.regStateEvent('append', 'myMod:lunaConversation', {
  output: 'myModLunaNotice',
  cond: () => V.myMod?.luna?.noticePending === true,
  action: () => {
    V.myMod.luna.noticePending = false;
  },
  extra: {
    passage: ['My Mod Luna Meeting']
  }
});
```

This code handles the notice only. Trust is granted by the click action below, so drawing the page again does not grant it again.

## 3. Write the scene the player sees

Open `story.twee`. The first passage has the `[widget]` tag and defines the entry and notice widgets. The second is the conversation scene.

The entry appears during Luna's park hours and avoids existing encounters, combat, and states unsuitable for conversation. Once the player makes plans, the link changes to “Meet Luna by the fountain”.

```twine
:: My Mod Luna Widgets [widget]
<<widget "myModLunaEntry">>
  <<if C.npc.Luna
    and maplebirch.npc.Schedule.get('Luna').location is "park"
    and $exposed lte 0
    and $stress lt $stressmax
    and $arousal lt $arousalmax
    and !$combat
    and !$possessed
    and (!$npc or $npc.length is 0)>>
    <<if $myMod.luna.meeting is "planned">>
      <<link "Meet Luna by the fountain" "My Mod Luna Meeting">><</link>>
    <<else>>
      <<link "Greet Luna by the bench" "My Mod Luna Meeting">><</link>>
    <</if>>
    <br>
  <</if>>
<</widget>>

<<widget "myModLunaNotice">>
  <span class="teal">You and Luna know each other a little better after talking. Her trust has increased.</span>
<</widget>>

:: My Mod Luna Meeting
<<npc "Luna">>
Current trust: <<= C.npc.Luna.myModTrust>>.
<br><br>

<<switch $myMod.luna.meeting>>
  <<case "none">>
    Luna waves from beside the bench. She suggests sitting by the fountain for a chat when you have time.
    <br>
    <<link "Agree to meet here for a chat" "Park">>
      <<if $myMod.luna.meeting is "none">>
        <<set $myMod.luna.meeting to "planned">>
      <</if>>
      <<endevent>>
    <</link>>
  <<case "planned">>
    Luna is waiting by the fountain. You find a quiet place to sit together.
    <br>
    <<link "Introduce yourself and talk about recent events" "My Mod Luna Meeting">>
      <<if $myMod.luna.meeting is "planned">>
        <<set C.npc.Luna.myModTrust to Math.clamp(C.npc.Luna.myModTrust + 5, 0, 100)>>
        <<set $myMod.luna.meeting to "completed">>
        <<set $myMod.luna.noticePending to true>>
      <</if>>
    <</link>>
  <<case "completed">>
    Luna recognizes you and smiles. You have already had your first conversation.
<</switch>>

<br><br>
<<link "Finish talking and return to the park" "Park">>
  <<endevent>>
<</link>>
```

On the first visit, `<<npc "Luna">>` uses the native introduction and encounter slot. Later visits use the same saved character rather than resetting trust to `25`. `<<endevent>>` cleans up the encounter when the player leaves.

Notice the two steps inside the links: making plans sets `meeting` to `planned` and returns to the park; meeting and introducing yourself grants trust and sets it to `completed`. Leaving early keeps the arrangement without completing the conversation.

Two flags have different jobs here: `C.npc.Luna.init` records native character initialization, while `$myMod.luna.meeting` records our story progress. Keeping them separate lets you add later conversations without repeating the introduction. Preserve any location-specific restrictions when moving the scene elsewhere.

## 4. Package it and meet her in the game

Once the files are ready, run this in their directory, or select the three files in an archive tool to create a ZIP. Import the resulting mod package into ModLoader and try the scene with a separate test save.

```bash
zip myMod.mod.zip boot.json framework.js story.twee
```

Start in the park between two and six in the afternoon, in a branch where ordinary actions are available, then follow this path:

| Action                                                  | Expected result                                                        |
| :------------------------------------------------------ | :--------------------------------------------------------------------- |
| Enter the ordinary park-options branch at `14:00–17:59` | Greeting link appears                                                  |
| Check before `14:00` or after `18:00`                   | Schedule is not `park`; link is hidden                                 |
| First greeting                                          | Native introduction completes; `meeting` remains `none`; trust is `25` |
| Agree to talk                                           | State is `planned`; return to the park; trust remains `25`             |
| Save, leave the park, load that save                    | Arrangement remains; the meeting link appears during park hours        |
| Meet and introduce yourself                             | State is `completed`; trust is `30`; familiarity notice appears        |
| Re-enter or redraw                                      | Trust remains `30`; the first-conversation reward option is absent     |
| Finish talking, save, restart, and load                 | Completed state and `30` trust persist                                 |
| Open Social                                             | Luna's important-character card shows Trust and its icons              |

Loading a save made before arranging or completing the meeting restores that earlier progress. Going home, passing a night, or restarting does not automatically turn `planned` into `completed`.

One detail about notices: the flag is cleared as the framework prepares the notice, but native loading may replay it from the saved page. That does not grant trust again, because trust changes in the click action.

### When the result is different

Inspect these values in the browser console. They read state without changing the save:

```javascript
(() => {
  const { Story, Macro } = maplebirch.host.sugarcube.require();
  console.log(V.myMod?.luna);
  console.log(C.npc.Luna?.init, C.npc.Luna?.myModTrust);
  console.log(maplebirch.npc.Schedule.get('Luna').location);
  console.log(Story.has('My Mod Luna Meeting'), Macro.has('myModLunaEntry'));
})();
```

If the character, passage, and widget exist, check the patch report, current schedule, and entry conditions in that order. If the character is missing, return to registration and load order. Let native code manage character records and encounter slots; clearing `$NPCName`, writing `$NPCList` yourself, or resetting `init` cannot replace diagnosis.

## Give her more to do

Once the basic conversation works, add the features you need. These extensions can share the same character ID and story progress without registering another NPC.

| Addition                                         | Integration point                                                                         | Guide                                                            |
| :----------------------------------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| A special schedule, such as staying home in rain | Add `when()` to the existing schedule; keep querying it for entry                         | [NPC schedules](NamedNPCSchedule.md)                             |
| Romance eligibility                              | Register `romance`; change your unlock flag in actual story actions                       | [NPC registration](NamedNPC.md#social-and-romance-configuration) |
| Clothes matching the schedule                    | Register `wear()` rules for `library`, `park`, and `home` after wardrobe readiness        | [NPC clothes](NamedNPCClothes.md)                                |
| Artwork                                          | Provide images/model resources; enable the sidebar and select Luna's graphic in the scene | [NPC sidebar](NamedNPCSidebar.md)                                |
| Transformation growth                            | Register definitions on startup; call `build()` in successful actions                     | [NPC transformations](NamedNPCTransformation.md)                 |
| Cycles and conception                            | Register configuration on startup; attempt conception in an eligible scene                | [NPC pregnancy](NamedNPCPregnancy.md)                            |
| Daily conversation                               | Add a separate daily conversation flag; retain the first-conversation completion state    | [Time events](../Dynamic/TimeEvents.md)                          |

Before release, play through the scene in the game, translation, and mod combinations you intend to support, especially checking that the park entry remains in the correct native branch.

[Back to NPC registration](NamedNPC.md) · [Development workflow](../Development.md)
