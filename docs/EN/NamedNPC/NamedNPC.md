# NPC Registration

Once you have a character's name, appearance, and title, use `maplebirch.npc.add()` to register them. The framework connects their data to the native new-game, loading, and introduction flows; your scene gives the player a way to meet them.

This page starts with character data and a first meeting, then covers Social and extension settings. For a hands-on route, follow Luna through the [NPC park-meeting example](Example.md), then return here for individual fields.

## Choose a Guide

| Goal                                                                   | Guide                                           |
| :--------------------------------------------------------------------- | :---------------------------------------------- |
| Register a character, arrange a first meeting and read the current NPC | This page                                       |
| Add numeric fields and display them on Social                          | [NPC Stats](NamedNPCStats.md)                   |
| Query where a character should be now                                  | [NPC Schedule](NamedNPCSchedule.md)             |
| Configure interaction outfits or the sidebar wardrobe                  | [NPC Clothes](NamedNPCClothes.md)               |
| Display portraits, artist layers or a PC model                         | [NPC Sidebar](NamedNPCSidebar.md)               |
| Add NPC transformation growth and appearance                           | [NPC Transformation](NamedNPCTransformation.md) |
| Use native cycles and conception rolls                                 | [NPC Pregnancy](NamedNPCPregnancy.md)           |

## Identity and Data Ownership

These examples use `Luna` as the character's `nam`. Use that same identifier, including case, for registration, schedules, wardrobe rules, transformations and pregnancy. A translated display name does not replace it.

| Location                              | Meaning                                                                                          |
| :------------------------------------ | :----------------------------------------------------------------------------------------------- |
| `npcData`, the first `add()` argument | Initial character data such as gender, hairstyle and title                                       |
| `npcConfig`, the second argument      | Framework and Social configuration, such as the affection display cap and important-NPC flag     |
| `translations`, the third argument    | Optional text translations, not saved progress                                                   |
| `C.npc.Luna`                          | Character object in the current save, read or changed during scenes                              |
| `$NPCName` / `V.NPCName`              | Native named-character records maintained by the game and framework                              |
| `$NPCList` / `V.NPCList`              | NPC slots generated for the current encounter, separate from named records                       |
| `$npc` / `V.npc`                      | Named NPCs in the current scene, used by sidebar selection                                       |
| `V.maplebirch.npc.luna`               | Framework extension state for rendering, transformations and fluids; keyed by lowercase NPC name |

Registration records configuration. `C.npc.Luna` may not exist before a new game has created its character records. Resolve the current object when a scene runs; do not retain array indexes or NPC objects across loads. Store your own quest progress under your mod's save object, such as `V.myMod`.

## 1. Register the Character in a Script

Place this in a script loaded by `params.script` in `boot.json`:

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    pronoun: 'f',
    adult: 1,
    teen: 0,
    age: 25,
    title: 'librarian',
    description: 'A librarian who enjoys arranging old books',
    hairColour: 'black',
    eyeColour: 'purple',
    hair_sides_length: 400,
    hair_fringe_length: 200
  },
  {
    love: {
      maxValue: 100
    },
    important: true
  }
);
```

`add()` returns whether registration was accepted; a missing `nam` returns `false`. Repeated registration merges data and configuration for that name. It does not create a location or story link, or mean the player has met the character.

## 2. Arrange the First Meeting

Define scenes in a `.twee` file loaded by ModLoader. Both passages below belong to the example mod. Your mod still needs an entry point, such as a [zone hook](../Tools/Zones.md), through which the player can reach them:

```twine
:: My Mod Library
<<link "Talk to Luna" "My Mod Luna Meeting">><</link>>

:: My Mod Luna Meeting
<<npc "Luna">>
Luna puts down her book and greets you.

<<link "End the conversation" "My Mod Library">>
  <<endevent>>
<</link>>
```

`<<npc "Luna">>` uses native encounter generation. Its first call runs `initnpc` and adds the character to the current scene list. Use native `<<initnpc "Luna">>` when only first-meeting initialization is needed, without occupying an encounter slot. Keep macro names and capitalization as shown.

`<<endevent>>` ends the encounter and clears its slots. Put it on the exit that actually ends the scene. Do not reset `init` on every render or rewrite `$NPCList` and `$npc` merely to display a portrait.

## 3. Read the Current Character During a Scene

After NPC records are loaded, use `C.npc.Luna`. Identifiers with spaces use bracket access, such as `C.npc['Black Wolf']`.

```twine
<<if C.npc.Luna and C.npc.Luna.init is 1>>
  Luna's title is <<= C.npc.Luna.title>>.
<</if>>
```

`init === 1` means native first-meeting initialization is complete. See [NPC Stats](NamedNPCStats.md) for initial values, changes and display. Native `npcincr` has character and stat whitelists; registering an NPC does not automatically extend them.

## Character Data Fields

Only `nam` is required. The following are common fields; image-related identifiers must exist in the target game or your mod's resources.

| Field                                     | Type and default                                | Meaning                                                                            |
| :---------------------------------------- | :---------------------------------------------- | :--------------------------------------------------------------------------------- |
| `nam`                                     | Required `string`                               | Stable character identifier                                                        |
| `gender`                                  | `'m' / 'f' / 'h' / 'n' / 'none'`, random        | Body gender                                                                        |
| `pronoun`                                 | `'m' / 'f' / 'i' / 'n' / 't'`                   | Defaults from gender; `h` randomly chooses male or female pronouns                 |
| `title`                                   | `string`, `'none'`                              | Title                                                                              |
| `description`                             | `string`, character identifier                  | Short description                                                                  |
| `fullDescription`                         | Optional `string`                               | Full description                                                                   |
| `type`                                    | `string`, `'human'`                             | Native species; separate from NPC transformation configuration                     |
| `adult`, `teen`                           | `number`, `0 / 1`                               | Age-group flags; randomly selected when neither is supplied                        |
| `age`                                     | `number`, `0`                                   | Age; also set the age-group flags explicitly                                       |
| `insecurity`                              | `'weak' / 'looks' / 'ethics' / 'skill'`, random | Native insecurity type                                                             |
| `hair_side_type`, `hair_fringe_type`      | `string`, `'default'`                           | Native main-hair and fringe identifiers                                            |
| `hair_position`                           | `string`, `'back'`                              | Hair position                                                                      |
| `hair_sides_length`, `hair_fringe_length` | `number`, each `200`                            | Independent numeric lengths; see [Sidebar](NamedNPCSidebar.md#hair-lengths)        |
| `eyeColour`, `hairColour`                 | `string`, random                                | Native colour IDs such as `'purple'` and `'black'`                                 |
| `bottomsize`, `skincolour`                | `number`                                        | Bottom size and native skin data; default to a random size and `0`, respectively   |
| `penis`, `vagina`                         | `string`                                        | Body-part state, generated from body gender by default                             |
| `penissize`, `breastsize`, `ballssize`    | `number`                                        | Sizes, generated from body gender by default                                       |
| `penisdesc`, `breastdesc`                 | `string`                                        | Body descriptions; omitted values use generated descriptions                       |
| `chastity`                                | `{ penis, vagina, anus }`                       | Native device IDs; defaults to empty strings                                       |
| `virginity`                               | `Record<string, boolean>`                       | Native first-experience flags; supply the complete set your story needs            |
| `outfits`                                 | `string[]`                                      | Native interaction outfit-set names; the gender's default set is also added        |
| `pregnancy`                               | `NPCPregnancyState`, `{}`                       | Native cycle and switch state, not an array of pregnancy records                   |
| `pregnancyAvoidance`                      | Optional `number`                               | Contraception tendency; preferably set through pregnancy configuration             |
| `init`, `intro`                           | `number`, each `0`                              | Native initialization and introduction state, normally maintained by native scenes |

Omitted gender currently uses weights of `47%` male, `47%` female, `5%` hermaphrodite and `1%` neutral. `'none'` means no gender. Pronoun `i` means it, `n` singular they and `t` plural they. Body gender and pronouns are separate fields.

Colour and hairstyle strings are resource IDs. Each hair length independently defaults to `200` when missing, nonnumeric or nonfinite. A saved `0` is retained, and changing one length does not change the other.

## Social and Romance Configuration

| Field                  | Meaning                                                                                                     |
| :--------------------- | :---------------------------------------------------------------------------------------------------------- |
| `love`                 | Native Social card affection configuration, such as `{ maxValue: 100 }`; does not clamp assignments         |
| `important`, `special` | Boolean or synchronous predicate, adding the character to the corresponding Social categories               |
| `loveInterest`         | Boolean or function, declaring eligibility for the native love-interest list; does not start a relationship |
| `romance`              | Synchronous predicates; `isPossibleLoveInterest(name)` returns true when all pass                           |
| `loveAlias`            | An `[English, Chinese]` array, or a function returning a string or that array                               |

These flags do not generate romance scenes. Social cards read `important` and `special` during rendering, while initialization also collects category and love-interest lists. Put changing romance eligibility in `romance`; registration results are not story progress.

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna'
  },
  {
    loveInterest: true,
    romance: [() => C.npc.Luna?.init === 1, () => V.myMod?.lunaRomanceUnlocked === true],
    loveAlias: () => 'Trust'
  }
);
```

This supplements the earlier registration. Your mod owns `lunaRomanceUnlocked`. Without explicit `romance` predicates, a love-interest NPC defaults to looking for `'romance'` in `<lowercase name without spaces>Seen`; custom stories should normally supply explicit conditions.

`loveAlias` also provides a dedicated bilingual array API:

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna'
  },
  {
    loveAlias: ['Trust', '信任']
  }
);
```

## Translation Data

Write ordinary titles and descriptions directly in English. For bilingual names, the third argument maps each text key to `{ EN, CN }`; a `Map` with the same structure also works:

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna',
    title: 'librarian'
  },
  {},
  {
    Luna: {
      EN: 'Luna',
      CN: '露娜'
    },
    librarian: {
      EN: 'Librarian',
      CN: '图书管理员'
    }
  }
);
```

Use `maplebirch.auto('Luna')` for display, retaining `Luna` for registration and lookup. See [Translator](../Translator.md) for translation files.

## boot.json Registration

The following is one entry in `addonPlugin`. Choose it or script registration for the same initial character data:

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "npc": {
      "NamedNPC": [
        [
          {
            "nam": "Luna",
            "gender": "f",
            "adult": 1,
            "teen": 0,
            "title": "librarian"
          },
          {
            "love": {
              "maxValue": 100
            },
            "important": true
          },
          {
            "Luna": {
              "EN": "Luna",
              "CN": "露娜"
            }
          }
        ]
      ]
    }
  }
}
```

Each entry is `[npcData, npcConfig, translations]`; the last two arguments are optional. Use `{}` for the second argument when supplying only the third. JSON holds booleans and ordinary data; register callbacks in scripts. See [boot.json Configuration](../BootJson.md) for the full loading structure.

## New Games, Loading and Updates

- NPCs join the native new-game character table, and loading adds newly registered characters. Registration is separate from the story's first-meeting initialization.
- After a new mod NPC has met the player, saved fields are retained and registration fills only missing fields. Use registration for initial values and change the current saved object for story-driven titles, outfits and relationships.
- Overrides to native NPCs apply only explicitly registered fields and are reapplied to the new objects after loading. Random constructor defaults do not replace unrelated native data.
- Repeated `add()` calls merge registered data and configuration. They do not create new encounters. Other subsystems, such as schedules, have their own replacement rules.
- `V.maplebirch.npc.luna.location` and `.clothes` are query properties backed by schedules and the sidebar wardrobe. Assigning them does not move or dress the character.

## Troubleshooting

| Symptom                               | Check                                                                           |
| :------------------------------------ | :------------------------------------------------------------------------------ |
| No `C.npc.Luna`                       | Script loading, completion of the character table and consistent `nam`          |
| No Social entry                       | First-meeting initialization and the intended category flags                    |
| Portrait registered but sidebar empty | Current scene generation, the sidebar display toggle and graphic selection      |
| Stat exists but has no icon           | Display name, `value`, icons and requirements; see [Stats](NamedNPCStats.md)    |
| New schedule creates no meeting link  | Schedules return location labels; your mod still supplies scenes and links      |
| Progress resets on load               | Repeated initial-value assignments or scene resolution during rendering/loading |
