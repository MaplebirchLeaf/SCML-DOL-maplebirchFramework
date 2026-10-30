# Mod author documentation

[Project home](../../README.EN.md) · [中文](../CN/README.md)

Whether you are adding a character, a scene, or an Options section, [Getting started](GettingStarted.md) gives you a small feature to run first. Then choose the topics you need below. If you already know the framework, go straight to the [boot.json reference](BootJson.md) or the relevant API page.

## Reading the examples

Ordinary examples use English here and Chinese in the Chinese guide. Both languages appear together when a page explains translation or a multilingual API. Write single-language content directly, then add [translation support](Translator.md) or [language macros](Macros.md#language) when you need switching.

Examples combine framework APIs, SugarCube syntax, and game variables. Knowing where each comes from makes them easier to follow:

| Content in an example               | Owner and usage                                                 |
| :---------------------------------- | :-------------------------------------------------------------- |
| `maplebirch.*`                      | Framework APIs described on each topic page                     |
| `<<widget>>`, `<<link>>`, `<<set>>` | SugarCube syntax for `.twee` files loaded by ModLoader          |
| `V`, `C.npc`, `Time`, `<<pain>>`    | Game runtime variables or APIs required by the DoL examples     |
| `myMod`, `My Mod ...`, `myMod...`   | Example mod IDs, passages or widgets that your mod must provide |

JavaScript usually goes in a file listed under `params.script` in `boot.json`; compile TypeScript examples first. `V.myMod` and `$myMod` in Twee refer to the same saved data. `setup` belongs to the current runtime and is not saved with the game.

Keep the code's API names, configuration keys, native IDs, and paths. Fields tied to a particular language, such as `cn_name` and `writ_cn`, have their own explanations in the topic pages.

## Learn through a complete feature

Once [Getting started](GettingStarted.md) shows your script log and widget, read [From an example to a complete feature](Development.md) for file organization, saved progress, and action results.

For a hands-on path, open the [NPC park-meeting example](NamedNPC/Example.md). Starting with three files, it follows character registration, a schedule, a scene entry, and a conversation, then checks progress after loading. Add wardrobes, artwork, transformations, and other topics when the basic scene works; you do not need everything at once.

## Everyday mod development

| Goal                                                   | Guide                                                        |
| :----------------------------------------------------- | :----------------------------------------------------------- |
| Load scripts, translations, audio, and fixed resources | [boot.json configuration](BootJson.md)                       |
| Translate text and split language files                | [Translator](Translator.md)                                  |
| Listen for or trigger events                           | [Events](Events.md)                                          |
| Add widgets to a page                                  | [Zones](Tools/Zones.md)                                      |
| Define macros or work with SugarCube text              | [SugarCube macros](Macros.md) / [HTML tools](Tools/Text.md)  |
| Play music, effects, and ambience                      | [Audio](Audio.md)                                            |
| Use general helpers                                    | [Utilities](Utilities.md) / [Random system](Tools/Random.md) |

## DoL content extensions

### Game state and passages

- [Time events](Dynamic/TimeEvents.md) · [State events](Dynamic/StateEvents.md) · [Weather events](Dynamic/WeatherEvents.md)
- [Patch registration](Tools/Patches.md): consider passage or script patching only when a zone hook cannot do the job.
- [Locations](Tools/Location.md) · [Variable migration](Tools/Migration.md)

### Characters and combat

- [Character layers](Character/Character.md) · [Face styles](Character/FaceStyle.md) · [Transformations](Character/Transformation.md) · [Transformation hints](Character/TransformHint.md)
- [NPC registration](NamedNPC/NamedNPC.md) · [Stats](NamedNPC/NamedNPCStats.md) · [Schedules](NamedNPC/NamedNPCSchedule.md)
- [NPC clothes and wardrobe](NamedNPC/NamedNPCClothes.md) · [Sidebar](NamedNPC/NamedNPCSidebar.md) · [Transformations](NamedNPC/NamedNPCTransformation.md) · [Pregnancy](NamedNPC/NamedNPCPregnancy.md)
- [Combat actions](Combat/Actions.md)
- [Combat companions](Combat/Companions.md)

### Data registration

- [Traits](Tools/Traits.md)
- [Tips](Tools/Tips.md)
- [Bodywriting](Tools/Bodywriting.md)
- [Starting feat boosts](Tools/FeatBoosts.md)
- [Foodstuff](Tools/Foodstuff.md)
- [Pills](Tools/Pills.md)
- [Fishing](Tools/Fishing.md)
- [Antiques](Tools/Antiques.md)

## Advanced and optional services

- [Modules and diagnostics](Modules.md): for framework extensions or investigating load failures.
- [AddonPlugin integration](AddonPlugin.md): for custom loading behavior or plugin-level capabilities.
- [AI Repair](../../README.EN.md#ai-repair): player configuration, previews and repair memories; [state targets and limits](AddonPlugin.md#ai-repair-state-permissions) explain automatically discovered save fields and operation bounds.
- [Mod encryption](Encryption.md): for authors publishing encrypted mods.
- [Cloud save](CloudSave.md): requires player-owned storage; ordinary content mods do not need it.

> [!NOTE]
> `services`, `infra`, and `host` are advanced entry points. Most mods should use top-level methods such as `maplebirch.on/once/off/after/trigger`, `t/auto`, `idb/define/with`, and `log`.
