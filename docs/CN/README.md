# 模组制作者文档

[项目首页](../../README.md) · [English](../EN/README.md)

这份文档按“先运行，再扩展”的顺序组织。只需阅读与你的模组相关的专题；配置字段和返回行为以各专题页为准。

> [!TIP]
> 第一次使用？从[快速开始](GettingStarted.md)入手，再查阅[boot.json 配置](BootJson.md)。示例优先使用 `maplebirch` 顶层短接口。

文中的提示标注有固定含义：**TIP** 是推荐写法，**NOTE** 补充背景，**IMPORTANT** 是必须满足的前提，**WARNING** 提醒可能导致功能失效的情况。

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

### 数据注册

- [特质](Tools/Traits.md) · [小贴士](Tools/Tips.md) · [身体文字](Tools/Bodywriting.md)
- [食物](Tools/Foodstuff.md) · [钓鱼](Tools/Fishing.md) · [古董](Tools/Antiques.md)

## 进阶服务

- [模块与诊断](Modules.md)：需要扩展框架模块或排查加载问题时阅读。
- [AddonPlugin 接入](AddonPlugin.md)：需要控制加载过程或复用插件能力时阅读。
- [模组加密](Encryption.md)：只适用于计划发布加密模组的作者。
- [云存档](CloudSave.md)：玩家自行部署存储端；普通内容模组不需要此功能。

> [!NOTE]
> 专题页中的 `services`、`infra`、`host` 是高级入口。一般模组优先使用 `maplebirch.on/once/off/after/trigger`、`t/auto`、`idb/define/with`、`wikify` 和 `log` 等顶层方法。
