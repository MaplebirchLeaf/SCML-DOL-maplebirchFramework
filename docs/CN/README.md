# 模组制作者文档

[项目首页](../../README.md) · [English](../EN/README.md)

准备给游戏加一个人物、一段剧情，或是自己的选项页？可以从[快速开始](GettingStarted.md)写出第一个能运行的小功能，再按需要翻阅下面的专题。已经熟悉框架时，也可以直接查 [boot.json 配置](BootJson.md)和对应接口。

## 如何阅读示例

普通中文示例直接写中文，英文指南则使用英文；讲解翻译和多语言接口时，才会把两种语言放在一起。自己的内容也可以这样写，需要切换语言时再接入[翻译服务](Translator.md)或[语言宏](Macros.md#language)。

示例里会同时出现框架接口、SugarCube 语法和游戏变量。先认清它们来自哪里，阅读起来会轻松一些：

| 示例中的内容                        | 所属范围与写法                                         |
| :---------------------------------- | :----------------------------------------------------- |
| `maplebirch.*`                      | 框架接口，按专题页说明调用                             |
| `<<widget>>`、`<<link>>`、`<<set>>` | SugarCube 语法，写在由 ModLoader 加载的 `.twee` 文件中 |
| `V`、`C.npc`、`Time`、`<<pain>>`    | 游戏运行时提供的变量或接口，DoL 专题中的示例依赖它们   |
| `myMod`、`My Mod ...`、`myMod...`   | 示例模组的标识、段落或 widget，需要由自己的模组提供    |

JavaScript 通常写进 `boot.json` 的 `params.script` 所指定的文件；TypeScript 示例需要先编译。`V.myMod` 和 Twee 里的 `$myMod` 是同一份存档数据，`setup` 中的内容则留在本次运行中，不随存档保存。

API 名称、配置键、原版标识和文件路径保留代码中的写法。像 `cn_name`、`writ_cn` 这样与固定语言有关的字段，会在对应专题中单独说明。

## 按完整功能学习

在[快速开始](GettingStarted.md)里看到脚本日志和自己的 widget 后，可以继续读[从示例到完整功能](Development.md)，了解文件怎么分、进度放在哪里，以及行动完成后怎样保存结果。

想边看边做，可以打开 [NPC 公园约见与交谈实例](NamedNPC/Example.md)。它从三个文件开始，带你走过注册人物、安排日程、加入入口和完成交谈，再检查读档后的进度。衣柜、立绘和转化等专题可以等基本场景跑通后再加入，不必一次全部接入。

## 日常开发

| 需要完成的事                   | 文档                                                   |
| :----------------------------- | :----------------------------------------------------- |
| 加载脚本、语言、音频和固定资源 | [boot.json 配置](BootJson.md)                          |
| 翻译文本与拆分语言文件         | [翻译服务](Translator.md)                              |
| 监听或触发事件                 | [事件](Events.md)                                      |
| 向页面区域添加 widget          | [区域添加](Tools/Zones.md)                             |
| 声明宏或操作 SugarCube 文本    | [SugarCube 宏](Macros.md) / [HTML 工具](Tools/Text.md) |
| 播放音乐、音效与环境音         | [音频](Audio.md)                                       |
| 使用通用函数                   | [实用工具](Utilities.md) / [随机系统](Tools/Random.md) |

## DoL 内容扩展

### 游戏状态与页面

- [时间事件](Dynamic/TimeEvents.md) · [状态事件](Dynamic/StateEvents.md) · [天气事件](Dynamic/WeatherEvents.md)
- [Patch 注册](Tools/Patches.md)：只有区域添加不够用时，再考虑修改原版 passage 或脚本。
- [地点配置](Tools/Location.md) · [变量迁移](Tools/Migration.md)

### 人物与战斗

- [角色图层](Character/Character.md) · [角色转化](Character/Transformation.md) · [转化选项提示](Character/TransformHint.md)
- [NPC 注册](NamedNPC/NamedNPC.md) · [数值](NamedNPC/NamedNPCStats.md) · [日程](NamedNPC/NamedNPCSchedule.md)
- [NPC 服装与衣柜](NamedNPC/NamedNPCClothes.md) · [侧边栏](NamedNPC/NamedNPCSidebar.md) · [转化](NamedNPC/NamedNPCTransformation.md) · [怀孕](NamedNPC/NamedNPCPregnancy.md)
- [战斗行动](Combat/Actions.md)
- [战斗同伴](Combat/Companions.md)

### 数据注册

- [特质](Tools/Traits.md)
- [小贴士](Tools/Tips.md)
- [身体涂鸦](Tools/Bodywriting.md)
- [开局成就加成](Tools/FeatBoosts.md)
- [食物](Tools/Foodstuff.md)
- [药片](Tools/Pills.md)
- [钓鱼](Tools/Fishing.md)
- [古董](Tools/Antiques.md)

## 进阶服务

- [模块与诊断](Modules.md)：需要扩展框架模块或排查加载问题时阅读。
- [AddonPlugin 接入](AddonPlugin.md)：需要控制加载过程或复用插件能力时阅读。
- [AI 修复](../../README.md#ai-修复)：玩家配置、预览与修复记忆，[变量修复目标与限制](AddonPlugin.md#ai-修复的状态权限)说明自动发现的存档字段和操作范围。
- [模组加密](Encryption.md)：只适用于计划发布加密模组的作者。
- [云存档](CloudSave.md)：玩家自行部署存储端。普通内容模组不需要此功能。

> [!NOTE]
> 专题页中的 `services`、`infra`、`host` 是高级入口。一般模组优先使用 `maplebirch.on/once/off/after/trigger`、`t/auto`、`idb/define/with` 和 `log` 等顶层方法。
