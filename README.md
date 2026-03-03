# SCML-DOL-maplebirchFramework

`maplebirchFramework` 是基于 **Sugarcube2 ModLoader** 为 **Degrees-of-Lewdity** 游戏设计的模块化开发框架，旨在能够为游戏扩展模组的开发提供一些便利，让开发者能够更轻松地构建和维护模组内容。

---

## 目录

- [基本介绍](#基本介绍)
- [安装与依赖](#安装与依赖)
- [模块与功能](#模块与功能)
- [反馈与讨论](#反馈与讨论)
- [更新日志](#更新日志)
- [致谢](#致谢)
- [相关链接](#相关链接)

## 基本介绍

- 本框架适用于 **`Degrees-of-Lewdity`** 游戏本体，并尽量适配于最新版本。(版本不适配时，请**自行修改**以适配历史游戏版本)
- 对于 **`Degrees-of-Lewdity`** 过早的游戏版本，可使用[**简易框架**](https://github.com/emicoto/SCMLSimpleFramework)来进行平替。
- 框架提供了对于修改 **`Degrees-of-Lewdity`** 游戏本体部分内容的**简易修改方法**(**侧边栏按钮等区域**、**简易NPC注册**、**战斗按钮注册**、**侧边栏人模图层注册**)，除此之外还有其余功能(**NPC侧边栏模型注册**)。
- 对于依赖的框架的 **`JavaScript`文件** 可采用框架提供的插件在 `boot.json` 中填写。

## 安装与依赖

- **下载方式** : 在侧边／底部的 **Releases** 中下载对于框架文件。
- **模组加载器依赖声明(可选)** : 在模组 `boot.js` 文件中 `dependenceInfo` 区域添加下方内容。

```json
"dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=3.0.0"
    }
  ]
```

- **`boot.json`中的文件加载**(推荐): 对于使用了框架功能的 **`JavaScript`文件** 推荐在插件 `addonPlugin` 区域填写路径加载。

```json
"addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": "^3.1.0",
      "params": {
        "module": [
          "maplebirch.js" // 紧随模组加载器inject_early完成时机之后的处理，非必要不推荐使用
        ],
        "script": [
          "framework.js" // 模组加载器addonPlugin处理完成时机处理，推荐在此处填写你的JavaScript文件路径
        ]
      }
    }
  ]
```

## 模块与功能

- [**工具函数**][Utilities]
- [**事件发射器**][EventEmitter]
- [**语言管理**][LanguageManager]
- [**模块系统**][ModuleSystem]
- [**动态事件**][Dynamic]
  - [状态事件][StateEvents]
  - [时间事件][TimeEvents]
  - [天气事件][WeatherEvents]
- [**工具合集**][ToolCollection]
  - [变量迁徙][Migration]
  - [随机数系统][RandSystem]
  - [文本工具][HtmlTools]
  - [区域管理][Framework]
  - [特质注册][Traits]
  - [地点配置][Location]
  - [纹身注册][Bodywriting]
- [**SugarCube宏**][SugarCubeMacro]
- [**音频管理**][Audio]
- [**角色管理**][Character]
  - [侧边栏图层][CharacterLayer]
  - [转化管理][Transformation]
- [**NPC管理**][NamedNPC]
  - [NPC注册][NamedNPCAdd]
  - [NPC状态][NamedNPCStats]
  - [NPC日程][NamedNPCSchedule]
  - [NPC服装][NamedNPCClothes]
  - [NPC侧边栏][NamedNPCSidebar]
- [**战斗管理**][Combat]
  - [战斗按钮][CombatActions]
  - [战斗反应][CombatReaction]
  - [战斗对话][CombatSpeech]

## 反馈与讨论

- [Discord](https://discord.com/channels/1103864219620884560/1433136946032410674)
- [百度贴吧](https://tieba.baidu.com/p/10049233469?pid=152986348799&cid=152989487455#152986348799)
- [反馈群: 1087715891(maplebirchFrameworks)](https://qm.qq.com/q/B4p8vaj1yo)

## 更新日志

- [完整更新日志](UPDATE.md) - 查看所有版本历史记录

## 致谢

- 感谢 [Lyoko-Jeremie](https://github.com/Lyoko-Jeremie) 制作的 [sugarcube-2-ModLoader](https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader) 为本模组提供了前置的基础支持。
- 感谢 [狐千月](https://github.com/emicoto) 制作的 [简易框架](https://github.com/emicoto/SCMLSimpleFramework) 提供了重要的模组基础和制作灵感。
- 感谢 [Muromi-Rikka](https://github.com/Muromi-Rikka) 对 [本框架](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework) 的代码优化。
- 感谢 [苯环](https://github.com/Nephthelana) 、 [零环](https://github.com/ZeroRing233) 、 [丧心](https://github.com/MissedHeart) 等模组制作者的代码引导。
- 感谢 [Aoki Utage](https://github.com/AOKIUTAGE) 、 [miyakoAki4828](https://github.com/miyakoAki4828) 、 [HCPTangHY](https://github.com/HCPTangHY) 等在美化相关的制作引导。
- 感谢 其它更多对于本框架进行反馈的游玩者们。

## 相关链接

- [Vrelnir 的博客](https://vrelnir.blogspot.com/)
- [英文游戏维基](https://degreesoflewdity.miraheze.org/wiki/Main_Page)
- [中文游戏维基](https://degreesoflewditycn.miraheze.org/wiki)
- [官方 Discord](https://discord.gg/VznUtEh)
- [游戏源码仓库](https://gitgud.io/Vrelnir/degrees-of-lewdity/-/tree/master)
- [原版汉化仓库](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
  - [汉化仓库贡献者](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization/blob/main/CREDITS.md)
- [DoL-Lyra](https://github.com/DoL-Lyra)
- [Modloader说明文档](https://modloader.pages.dev/)

[Utilities]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Utilities.md
[EventEmitter]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/EventEmitter.md
[LanguageManager]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/LanguageManager.md
[ModuleSystem]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ModuleSystem.md
[Dynamic]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Dynamic/
[StateEvents]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Dynamic/StateEvents.md
[TimeEvents]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Dynamic/TimeEvents.md
[WeatherEvents]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Dynamic/WeatherEvents.md
[ToolCollection]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/
[Migration]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/migration.md
[RandSystem]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/randSystem.md
[HtmlTools]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/htmlTools.md
[Framework]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/Framework.md
[Traits]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/Traits.md
[Location]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/Location.md
[Bodywriting]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/ToolCollection/Bodywriting.md
[SugarCubeMacro]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/SugarCubeMacro.md
[Audio]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Audio.md
[Character]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Character/
[CharacterLayer]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Character/Character.md
[Transformation]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Character/Transformation.md
[NamedNPC]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/
[NamedNPCAdd]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/NamedNPC.md
[NamedNPCStats]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/NamedNPCStats.md
[NamedNPCSchedule]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/NamedNPCSchedule.md
[NamedNPCClothes]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/NamedNPCClothes.md
[NamedNPCSidebar]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/NamedNPC/NamedNPCSidebar.md
[Combat]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Combat/
[CombatActions]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Combat/Actions.md
[CombatReaction]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Combat/Reaction.md
[CombatSpeech]: https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/blob/main/docs/Combat/Speech.md
