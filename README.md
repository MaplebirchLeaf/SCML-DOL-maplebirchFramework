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

- [**工具函数**](docs/Utilities.md)
- [**事件发射器**](docs/EventEmitter.md)
- [**语言管理**](docs/LanguageManager.md)
- [**模块系统**](docs/ModuleSystem.md)
- [**动态事件**](docs/Dynamic/)
  - [状态事件](docs/Dynamic/StateEvents.md)
  - [时间事件](docs/Dynamic/TimeEvents.md)
  - [天气事件](docs/Dynamic/WeatherEvents.md)
- [**工具合集**](docs/ToolCollection/)
  - [变量迁徙](docs/ToolCollection/migration.md)
  - [随机数系统](docs/ToolCollection/randSystem.md)
  - [文本工具](docs/ToolCollection/htmlTools.md)
  - [区域管理](docs/ToolCollection/Framework.md)
  - [特质注册](docs/ToolCollection/Traits.md)
  - [地点配置](docs/ToolCollection/Location.md)
  - [纹身注册](docs/ToolCollection/Bodywriting.md)
- [**SugarCube宏**](docs/SugarCubeMacro.md)
- [**音频管理**](docs/Audio.md)
- [**角色管理**](docs/Character/)
  - [侧边栏图层](docs/Character/Character.md)
  - [转化管理](docs/Character/Transformation.md)
- [**NPC管理**](docs/NamedNPC/)
  - [NPC注册](docs/NamedNPC/NamedNPC.md)
  - [NPC状态](docs/NamedNPC/NamedNPCStats.md)
  - [NPC日程](docs/NamedNPC/NamedNPCSchedule.md)
  - [NPC服装](docs/NamedNPC/NamedNPCClothes.md)
  - [NPC侧边栏](docs/NamedNPC/NamedNPCSidebar.md)
- [**战斗管理**](docs/Combat/)
  - [战斗按钮](docs/Combat/Actions.md)
  - [战斗异装](docs/Combat/Reaction.md)
  - [战斗对话](docs/Combat/Speech.md)

## 反馈与讨论



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
