# Mod author documentation

[Project home](../../README.EN.md) · [中文](../CN/README.md)

These guides follow the path from a running script to specific extensions. Read only the topics your mod needs; each topic page is the reference for its fields and behavior.

> [!TIP]
> New to the framework? Start with [Getting started](GettingStarted.md), then use the [boot.json reference](BootJson.md). Examples prefer short `maplebirch` entry points.

Callouts have distinct meanings: **TIP** recommends a practice, **NOTE** adds context, **IMPORTANT** marks a prerequisite, and **WARNING** identifies a likely failure mode.

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

- [Character layers](Character/Character.md) · [Transformations](Character/Transformation.md) · [Transformation hints](Character/TransformHint.md)
- [NPC registration](NamedNPC/NamedNPC.md) · [Stats](NamedNPC/NamedNPCStats.md) · [Schedules](NamedNPC/NamedNPCSchedule.md)
- [NPC clothes and wardrobe](NamedNPC/NamedNPCClothes.md) · [Sidebar](NamedNPC/NamedNPCSidebar.md) · [Transformations](NamedNPC/NamedNPCTransformation.md) · [Pregnancy](NamedNPC/NamedNPCPregnancy.md)
- [Combat actions](Combat/Actions.md)

### Data registration

- [Traits](Tools/Traits.md) · [Tips](Tools/Tips.md) · [Bodywriting](Tools/Bodywriting.md)
- [Foodstuff](Tools/Foodstuff.md) · [Fishing](Tools/Fishing.md) · [Antiques](Tools/Antiques.md)

## Advanced and optional services

- [Modules and diagnostics](Modules.md): for framework extensions or investigating load failures.
- [AddonPlugin integration](AddonPlugin.md): for custom loading behavior or plugin-level capabilities.
- [Mod encryption](Encryption.md): for authors publishing encrypted mods.
- [Cloud save](CloudSave.md): requires player-owned storage; ordinary content mods do not need it.

> [!NOTE]
> `services`, `infra`, and `host` are advanced entry points. Most mods should use top-level methods such as `maplebirch.on/once/off/after/trigger`, `t/auto`, `idb/define/with`, and `log`.
