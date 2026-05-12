[中文](README.md) | [English](README.EN.md)

# SCML-DOL-maplebirchFramework

[![Author](https://img.shields.io/badge/By-Vrelnir-purple)](https://vrelnir.blogspot.com/)
[![Game](https://img.shields.io/badge/Game-DoL-purple)](https://gitgud.io/Vrelnir/degrees-of-lewdity)
[![ModLoader](https://img.shields.io/badge/SC2-ModLoader-blue)](https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader)
[![CHS](https://img.shields.io/badge/CHS-DOL--CHS-red)](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
[![Release](https://img.shields.io/github/v/release/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=release)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/MaplebirchLeaf/SCML-DOL-maplebirchFramework/total?label=downloads)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest)
[![Stars](https://img.shields.io/github/stars/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=stars)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/stargazers)
[![Issues](https://img.shields.io/github/issues-raw/MaplebirchLeaf/SCML-DOL-maplebirchFramework?label=issues)](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/issues)

`maplebirchFramework` 是基于 **SugarCube2 ModLoader** 为 **Degrees of Lewdity** 制作的模组开发框架。它主要为其它模组提供更方便的脚本加载、语言与音频导入、区域注入、NPC 注册、战斗按钮、角色图层、转化、动态事件和常用工具函数。

框架的使用重点是“让模组作者少直接改原版内容，多通过稳定接口追加内容”。如果你的模组需要向游戏界面插入新内容、为 NPC 增加数据、注册动态事件，或把多语言、音频、脚本资源整理成统一加载流程，本框架可以作为基础依赖使用。

---

## 目录

- [基本介绍](#基本介绍)
- [安装与依赖](#安装与依赖)
- [脚本加载](#脚本加载)
- [模组加密](#模组加密)
- [推荐写法](#推荐写法)
- [模块与功能](#模块与功能)
- [boot.json 配置](#bootjson-配置)
- [反馈与讨论](#反馈与讨论)
- [更新日志](#更新日志)
- [致谢](#致谢)
- [相关链接](#相关链接)

## 基本介绍

本框架的目标不是替代游戏本体逻辑，而是为模组作者提供一组更稳定、更容易复用的扩展接口。你可以把常见的模组内容拆成不同文件，通过 `boot.json` 统一加载，再在脚本中使用 `maplebirch` 提供的工具注册功能。

和直接修改原版 passage 或 widget 相比，框架更适合“追加式”的模组开发方式：把你的内容注册到框架提供的区域、事件或管理器中，由框架在合适的加载时机合并到游戏里。这样可以让模组文件结构更清楚，也能减少和其它模组互相覆盖同一段原版文本的情况。

适合交给框架处理的内容包括：

- 把模组 JavaScript 文件放入 `script` 或 `module` 中加载。
- 导入模组自带的 `CN` / `EN` 翻译文件。
- 导入模组音频目录，并用音频管理器播放。
- 向游戏选项页、状态栏、菜单、链接区域等位置追加 widget。
- 注册自定义 SugarCube 宏、文本构建器和页面文本处理。
- 注册时间事件、状态事件、天气事件。
- 添加命名 NPC、NPC 状态、NPC 日程、NPC 服装与 NPC 侧边栏显示。
- 添加角色侧边栏图层、面部样式、转化内容。
- 向战斗界面添加自定义动作按钮。
- 为受保护模组读取 `auth.json`，并在首次加载时进行加密验证。
- 使用 `clone`、`merge`、`random`、`either`、`number` 等常用工具函数。

如果你正在制作的是内容型模组，可以优先阅读 `NPC 管理`、`动态事件`、`区域管理` 和 `语言管理`。如果你正在制作 UI 或工具型模组，可以优先阅读 `boot.json 配置`、`SugarCube 宏`、`文本工具` 和 `工具函数`。如果你的模组涉及角色外观或战斗行为，则建议从 `角色管理`、`转化管理` 和 `战斗按钮` 开始。

详细功能用法请参考下方 [模块与功能](#模块与功能) 中的说明文档。对于过早版本的游戏，可以考虑使用 [简易框架](https://github.com/emicoto/SCMLSimpleFramework)。

## 安装与依赖

请从仓库 **Releases** 下载框架文件，并作为 ModLoader 模组加载。

其它模组如果调用了 `maplebirch` 的接口，建议显式声明对本框架的依赖。这样玩家在加载模组时能更容易发现缺少前置的问题，也方便模组加载器按依赖关系安排加载顺序。

依赖本框架的模组可在 `boot.json` 或 `boot.js` 中声明：

```json
"dependenceInfo": [
  {
    "modName": "maplebirch",
    "version": ">=需要的框架版本"
  }
]
```

版本范围请按你的模组实际使用的框架功能填写。README 中不固定写死某个版本，是为了避免框架更新后示例变成过期信息。

## 脚本加载

推荐使用 `maplebirchAddon` 加载依赖框架的 JavaScript 文件：

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^需要的框架版本",
    "params": {
      "script": ["framework.js"]
    }
  }
]
```

一般模组逻辑写入 `script` 即可。只有需要在框架模块注册阶段执行的代码，才放入 `module`。

`script` 的定位是普通模组脚本入口，适合注册 NPC、事件、区域 widget、战斗按钮、角色图层等内容。`module` 的执行时机更早，主要给需要扩展框架模块系统的代码使用；如果你不确定是否需要它，通常就是不需要。

```json
"params": {
  "module": ["module.js"],
  "script": ["framework.js"]
}
```

## 模组加密

框架可以为其它依赖 `maplebirch` 的模组提供加密验证。没有 `auth.json` 的模组会直接放行；带有 `auth.json` 的模组会在首次加载时要求玩家输入作者提供的凭证，验证通过后会记住解出的密码。

受保护模组的根目录可放置 `auth.json`：

```json
{
  "key": "CoolMod",
  "publicKey": {
    "kty": "EC",
    "crv": "P-256",
    "x": "...",
    "y": "..."
  },
  "prompt": {
    "title": "模组加密",
    "label": "Cool Mod 凭证",
    "placeholder": "输入凭证",
    "hint": "请输入作者提供的凭证。"
  }
}
```

`auth.json` 支持的字段如下：

| 字段        | 必填 | 用途                                                   |
| :---------- | :--- | :----------------------------------------------------- |
| `key`       | 是   | 凭证标识                                               |
| `publicKey` | 是   | 校验凭证签名的公钥，支持 JWK 对象或 SPKI base64 字符串 |
| `subject`   | 否   | 凭证绑定对象，默认使用模组名                           |
| `name`      | 否   | 弹窗中显示的模组名称                                   |
| `prompt`    | 否   | 自定义弹窗文案，如 `title`、`label`、`placeholder`、`hint` |
| `date`      | 否   | 日期凭证配置，如 `timezone`、`graceDays`               |

如果需要指定加密配置文件路径，或使用配套工具写入的 guard 校验，可在 `boot.json` 的 `maplebirchAddon.params` 中增加 `auth`：

```json
"params": {
  "auth": {
    "file": "auth.json",
    "guard": {
      "nonce": "...",
      "digest": "..."
    }
  },
  "script": ["framework.js"]
}
```

`guard` 不通过时框架会禁用该模组。密钥生成、凭证生成和 `.zip` 转 `.modpack` 可使用配套工具：[maplebirch-author-tools](https://github.com/MaplebirchLeaf/maplebirch-author-tools)。

## 推荐写法

框架大多数功能都通过全局对象 `maplebirch` 访问。建议把注册代码集中放在一个入口脚本中，例如 `framework.js`：

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.dynamic.regTimeEvent('onDay', 'myMod.dailyCheck', {
  cond: () => V.myMod?.enabled,
  event: () => '<<run setup.myMod.dailyCheck()>>'
});

maplebirch.npc.addStats({
  trust: {
    min: 0,
    max: 100,
    default: 0,
    position: 1
  }
});
```

上面的示例展示了三类常见注册：向选项页插入 widget、注册每日时间事件、给 NPC 添加状态。实际制作模组时，可以把这些内容继续拆到不同文件中，让每个文件只负责一种功能。

如果功能较多，可以按用途拆分文件，例如：

```text
framework.js
modules/npc.js
modules/combat.js
modules/events.js
modules/options.js
```

再在 `boot.json` 中按顺序写入 `script`。

推荐的入口文件可以只负责组织加载顺序和调用各模块初始化函数：

```javascript
setup.myMod ??= {};

setup.myMod.initOptions?.();
setup.myMod.initEvents?.();
setup.myMod.initNPC?.();
setup.myMod.initCombat?.();
```

也可以让每个文件在被加载时直接完成注册。两种方式都可以，选择更适合你模组规模的写法即可。

一般建议：

- 配置类内容优先写入 `boot.json`，如语言、音频、区域 widget、基础 NPC 资源。
- 需要条件判断、函数逻辑、复杂注册时写入 JavaScript 文件。
- 普通模组脚本使用 `script`；确实需要更早执行并参与框架模块扩展时再使用 `module`。
- 命名时尽量带上模组前缀，例如 `myMod.dailyCheck`、`myModTrust`，减少与其它模组冲突。
- 文本、按钮和选项说明尽量使用语言文件或语言宏管理，避免以后补多语言时到处查找硬编码文本。

## 模块与功能

以下文档主要面向其它模组作者，说明框架功能的使用方式：

如果你是第一次使用框架，建议按这个顺序阅读：

1. 先看 [boot.json 配置][BootJson]，确认脚本和资源该怎么加载。
2. 再看 [区域管理][Framework] 和 [事件发射器][EventEmitter]，了解最常见的插入内容和监听时机。
3. 根据模组类型选择阅读 NPC、动态事件、战斗、角色或工具相关文档。
4. 遇到通用代码处理需求时，再查 [工具函数][Utilities]。

- [boot.json 配置][BootJson]
- [工具函数][Utilities]
- [事件发射器][EventEmitter]
- [语言管理][LanguageManager]
- [SugarCube 宏][SugarCubeMacro]
- [音频管理][Audio]
- [动态事件][Dynamic]
  - [状态事件][StateEvents]
  - [时间事件][TimeEvents]
  - [天气事件][WeatherEvents]
- [工具合集][ToolCollection]
  - [变量迁移][Migration]
  - [随机数系统][RandSystem]
  - [文本工具][HtmlTools]
  - [区域管理][Framework]
  - [特质注册][Traits]
  - [地点配置][Location]
  - [纹身注册][Bodywriting]
- [角色管理][Character]
  - [侧边栏图层][CharacterLayer]
  - [转化管理][Transformation]
- [NPC 管理][NamedNPC]
  - [NPC 注册][NamedNPCAdd]
  - [NPC 状态][NamedNPCStats]
  - [NPC 日程][NamedNPCSchedule]
  - [NPC 服装][NamedNPCClothes]
  - [NPC 侧边栏][NamedNPCSidebar]
- [战斗管理][Combat]
  - [战斗按钮][CombatActions]

## boot.json 配置

`maplebirchAddon` 可通过配置处理常见资源和功能：

下面是一个较完整的配置骨架。实际使用时不需要保留所有字段，只写你的模组需要的部分即可。

```json
"addonPlugin": [
  {
    "modName": "maplebirch",
    "addonName": "maplebirchAddon",
    "modVersion": "^需要的框架版本",
    "params": {
      "language": ["CN", "EN"],
      "audio": ["audio"],
      "auth": {
        "file": "auth.json"
      },
      "framework": {
        "addto": "Options",
        "widget": "MyModOptions"
      },
      "npc": {
        "NamedNPC": [],
        "Stats": {},
        "Sidebar": {
          "image": [],
          "clothes": [],
          "config": []
        }
      },
      "script": ["framework.js"]
    }
  }
]
```

| 参数        | 用途                                            |
| :---------- | :---------------------------------------------- |
| `language`  | 导入 `CN` / `EN` 翻译文件，或指定自定义语言文件 |
| `audio`     | 导入模组内的音频目录                            |
| `auth`      | 指定受保护模组的加密配置文件和 guard 校验        |
| `framework` | 添加区域 widget 或注册特质                      |
| `npc`       | 注册 NPC、NPC 状态、NPC 侧边栏图片和服装资源    |
| `module`    | 早期脚本，适合框架模块扩展                      |
| `script`    | 常规模组脚本，推荐多数情况下使用                |

更完整的配置说明见 [boot.json 配置][BootJson]。

## 反馈与讨论

- [Discord](https://discord.com/channels/1103864219620884560/1433136946032410674)
- [百度贴吧](https://tieba.baidu.com/p/10049233469?pid=152986348799&cid=152989487455#152986348799)
- [反馈群：1087715891(maplebirchFrameworks)](https://qm.qq.com/q/B4p8vaj1yo)

## 更新日志

- [完整更新日志](UPDATE.md)

## 致谢

- 感谢 [Lyoko-Jeremie](https://github.com/Lyoko-Jeremie) 制作的 [sugarcube-2-ModLoader](https://github.com/Lyoko-Jeremie/sugarcube-2-ModLoader) 为本框架提供前置支持。
- 感谢 [狐千月](https://github.com/emicoto) 制作的 [简易框架](https://github.com/emicoto/SCMLSimpleFramework) 提供重要框架基础。
- 感谢 [Muromi-Rikka](https://github.com/Muromi-Rikka) 对 [本框架](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework) 的脚本优化。
- 感谢 [苯环](https://github.com/Nephthelana)、[零环](https://github.com/ZeroRing233)、[丧心](https://github.com/MissedHeart) 等模组制作者的内容引导。
- 感谢 [Aoki Utage](https://github.com/AOKIUTAGE)、[miyakoAki4828](https://github.com/miyakoAki4828)、[HCPTangHY](https://github.com/HCPTangHY) 等在美化相关制作上的引导。
- 感谢所有对本框架进行反馈的玩家与作者。

## 相关链接

- <img decoding="async" src="https://gitgud.io/uploads/-/system/user/avatar/9096/avatar.png" width="24" alt=""> <b>游戏作者</b> $\color{purple} {Vrelnir}$
- [Vrelnir 的博客](https://vrelnir.blogspot.com/)
- [英文游戏维基](https://degreesoflewdity.miraheze.org/wiki/Main_Page)
- [中文游戏维基](https://degreesoflewditycn.miraheze.org/wiki)
- [官方 Discord](https://discord.gg/VznUtEh)
- [游戏源码仓库](https://gitgud.io/Vrelnir/degrees-of-lewdity/-/tree/master)
- [原版汉化仓库](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization)
- [汉化仓库贡献者](https://github.com/Eltirosto/Degrees-of-Lewdity-Chinese-Localization/blob/main/CREDITS.md)
- [DoL-Lyra](https://github.com/DoL-Lyra)
- [ModLoader 说明文档](https://modloader.pages.dev/)

[BootJson]: docs/CN/BootJson.md
[Utilities]: docs/CN/Utilities.md
[EventEmitter]: docs/CN/EventEmitter.md
[LanguageManager]: docs/CN/LanguageManager.md
[SugarCubeMacro]: docs/CN/SugarCubeMacro.md
[Audio]: docs/CN/Audio.md
[Dynamic]: docs/CN/Dynamic/
[StateEvents]: docs/CN/Dynamic/StateEvents.md
[TimeEvents]: docs/CN/Dynamic/TimeEvents.md
[WeatherEvents]: docs/CN/Dynamic/WeatherEvents.md
[ToolCollection]: docs/CN/ToolCollection/
[Migration]: docs/CN/ToolCollection/migration.md
[RandSystem]: docs/CN/ToolCollection/randSystem.md
[HtmlTools]: docs/CN/ToolCollection/htmlTools.md
[Framework]: docs/CN/ToolCollection/Framework.md
[Traits]: docs/CN/ToolCollection/Traits.md
[Location]: docs/CN/ToolCollection/Location.md
[Bodywriting]: docs/CN/ToolCollection/Bodywriting.md
[Character]: docs/CN/Character/
[CharacterLayer]: docs/CN/Character/Character.md
[Transformation]: docs/CN/Character/Transformation.md
[NamedNPC]: docs/CN/NamedNPC/
[NamedNPCAdd]: docs/CN/NamedNPC/NamedNPC.md
[NamedNPCStats]: docs/CN/NamedNPC/NamedNPCStats.md
[NamedNPCSchedule]: docs/CN/NamedNPC/NamedNPCSchedule.md
[NamedNPCClothes]: docs/CN/NamedNPC/NamedNPCClothes.md
[NamedNPCSidebar]: docs/CN/NamedNPC/NamedNPCSidebar.md
[Combat]: docs/CN/Combat/
[CombatActions]: docs/CN/Combat/Actions.md
