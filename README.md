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

**`maplebirchFramework`** 是基于 **_SugarCube 2 ModLoader_**、面向 **_Degrees of Lewdity_** 模组制作者的扩展框架。它提供脚本与资源加载、翻译、音频、区域注入、NPC、角色、战斗和动态事件等公开接口，也提供可选的模组加密与自托管云存档服务。

框架的使用重点是：**少直接改原版内容，多通过公开接口追加内容。** 如果你的模组要扩展界面、NPC 或游戏事件，或想把多语言、音频和脚本资源纳入统一加载流程，可以将它作为基础依赖。

> [!TIP]
> 初次使用，先读[快速开始](docs/CN/GettingStarted.md)；需要查具体字段或功能时，再进入[模组制作者文档](docs/CN/README.md)。本页保留项目介绍与常见用法，不要求从头读完所有专题。

---

## 目录

- [基本介绍](#基本介绍)
- [安装与依赖](#安装与依赖)
- [脚本加载](#脚本加载)
- [框架服务](#框架服务)
  - [模组加密](#模组加密)
  - [云存档](#云存档)
- [推荐写法](#推荐写法)
- [类型包](#类型包)
- [模块与功能](#模块与功能)
- [boot.json 配置](#bootjson-配置)
- [反馈与讨论](#反馈与讨论)
- [更新日志](#更新日志)
- [致谢](#致谢)
- [相关链接](#相关链接)

## 基本介绍

本框架的目标不是替代游戏本体逻辑，而是为模组作者提供一组更稳定、更容易复用的扩展接口。你可以把常见的模组内容拆成不同文件，通过 **`boot.json`** 统一加载，再在脚本中使用 **`maplebirch`** 提供的工具注册功能。

和直接修改原版 passage 或 widget 相比，框架更适合“追加式”的模组开发方式：把你的内容注册到框架提供的区域、事件或管理器中，由框架在合适的加载时机合并到游戏里。这样可以让模组文件结构更清楚，也能减少和其它模组互相覆盖同一段原版文本的情况。

适合交给框架处理的内容包括：

- 把模组 JavaScript 文件放入 `script` 或 `module` 中加载。
- 导入模组自带的 `CN` / `EN` 翻译文件。
- 导入模组音频目录，并用音频管理器播放。
- 向游戏选项页、状态栏、菜单、链接区域等位置追加 widget。
- 注册自定义 SugarCube 宏、文本构建器和页面文本处理。
- 注册时间事件、状态事件、天气事件。
- 添加命名 NPC、NPC 状态、NPC 日程、NPC 服装、NPC 侧边栏、NPC 转化与 NPC 怀孕扩展。
- 添加角色侧边栏图层、面部样式、转化内容。
- 向战斗界面添加自定义动作按钮。
- 为依赖框架的模组提供加密壳授权、凭证校验与本地安全记忆。
- 通过自建 Cloudflare Worker 与私有 R2 桶同步本地槽位和存档导出码。
- 使用 `maplebirch.utils.clone(source)`、`Object.merge()`、`list.contains()`、`list.either()`、`Math.clamp()` 等常用工具函数。

**按模组类型选择入口：** 内容模组可从 [NPC 管理][NamedNPCAdd]、[动态事件][StateEvents]、[区域管理][Framework] 和[翻译][Translator]开始；UI 或工具模组可从 [boot.json][BootJson]、[SugarCube 宏][SugarCubeMacro]、[文本工具][HtmlTools]开始；角色外观和战斗内容可查[角色图层][CharacterLayer]、[转化管理][Transformation]、[战斗行动][CombatActions]。

详细功能用法请参考下方 [模块与功能](#模块与功能) 中的说明文档。对于过早版本的游戏，可以考虑使用 [简易框架](https://github.com/emicoto/SCMLSimpleFramework)。

## 安装与依赖

请从仓库 [**Releases**](https://github.com/MaplebirchLeaf/SCML-DOL-maplebirchFramework/releases/latest) 下载框架文件，并作为 **ModLoader 模组**加载。

其它模组如果调用了 `maplebirch` 的接口，建议显式声明对本框架的依赖。这样玩家在加载模组时能更容易发现缺少前置的问题，也方便模组加载器按依赖关系安排加载顺序。

依赖本框架的模组可在 `boot.json` 中声明：

```json
"dependenceInfo": [
  {
    "modName": "maplebirch",
    "version": ">=需要的框架版本"
  }
]
```

版本范围请按你的模组实际使用的框架功能填写。README 中不固定写死某个版本，是为了避免框架更新后示例变成过期信息。

> [!IMPORTANT]
> `@scml-dol-maplebirch/types` 只提供编辑器补全；玩家仍须加载框架本体。依赖版本请以你实际测试的最低版本为准。

## 脚本加载

推荐使用 **`maplebirchAddon`** 加载依赖框架的 JavaScript 文件：

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

**大多数模组只需 `script`。** 只有需要在框架模块注册阶段执行的代码，才放入 `module`。

**`script`** 的定位是普通模组脚本入口，适合注册 NPC、事件、区域 widget、战斗按钮、角色图层等内容。**`module`** 的执行时机更早，主要给需要扩展框架模块系统的代码使用；_如果你不确定是否需要它，通常就是不需要_。

```json
"params": {
  "module": ["module.js"],
  "script": ["framework.js"]
}
```

## 框架服务

除模组开发接口外，还有两项**可选服务**：**模组加密**保护发布的模组内容；**云存档**把玩家本地存档同步到玩家自己部署的云端。一般内容模组不必配置它们。

### 模组加密

框架本体不加密。需要发布加密模组时，可使用配套工具生成加密壳；框架的 `CredentialVault` 在加载阶段验证凭证，并在解密成功后交由 ModLoader 加载。

配套工具：[DOL Mod Protection Tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools)

玩家首次加载时输入凭证；验证失败或关闭输入界面时，框架会禁用该加密模组。加密包的生成步骤、文件布局和发布要求以[配套工具说明](https://github.com/MaplebirchLeaf/dol-mod-protection-tools)为准。

框架验证时使用的 `auth.json` 至少包含公钥标识与公钥：

```json
{
  "key": "main",
  "publicKey": "BASE64_SPKI_PUBLIC_KEY"
}
```

可选字段包括 `subject`、`name`、`prompt` 和 `date`。完整说明见配套工具仓库 README。

完整的玩家流程、作者配置与有效期规则见 [模组加密文档](docs/CN/Encryption.md)。

### 云存档

云存档可把 DoL 的本地 IndexedDB 槽位和存档导出码同步到**玩家自己部署**的 Cloudflare Worker + R2。游戏设置中会增加「云存档」标签页，填写 Worker 地址与访问令牌后即可上传、下载或删除远端槽位。

> [!WARNING]
> 框架不提供公共存档服务器。上传内容是明文 JSON；请使用 HTTPS、足够随机的令牌，并保持 R2 桶私有。令牌默认不持久化，但玩家勾选“在此设备上记住访问令牌”后会保存到浏览器本地存储。详见[云存档文档](docs/CN/CloudSave.md)。

## 推荐写法

框架大多数功能都通过全局对象 **`maplebirch`** 访问。建议把注册代码集中放在一个入口脚本中，例如 **`framework.js`**：

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.dynamic.regTimeEvent('onDay', 'myMod:dailyCheck', {
  cond: () => V.myMod?.enabled,
  action: () => setup.myMod?.dailyCheck?.()
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

**一般建议：**

- 配置类内容优先写入 `boot.json`，如语言、音频、区域 widget、基础 NPC 资源。
- 需要条件判断、函数逻辑、复杂注册时写入 JavaScript 文件。
- 普通模组脚本使用 `script`；确实需要更早执行并参与框架模块扩展时再使用 `module`。
- 命名时尽量带上模组前缀，例如 `myMod.dailyCheck`、`myModTrust`，减少与其它模组冲突。
- 文本、按钮和选项说明尽量使用语言文件或语言宏管理，避免以后补多语言时到处查找硬编码文本。

## 类型包

如果你的模组使用 TypeScript 或希望在编辑器中获得 `maplebirch` API 补全，可以安装框架的类型声明包：

```bash
npm install -D @scml-dol-maplebirch/types
```

然后在 `tsconfig.json` 中加入：

```json
{
  "compilerOptions": {
    "types": ["@types/twine-sugarcube", "@scml-dol-maplebirch/types"],
    "skipLibCheck": true
  }
}
```

这个包只提供类型声明，不包含框架运行时代码；玩家仍然需要在 ModLoader 中加载 `maplebirchFramework` 本体。类型包版本建议与模组依赖的框架版本保持接近。

## 模块与功能

以下文档主要面向模组作者。完整的按任务导航见[中文文档目录](docs/CN/README.md)；下面保留各功能的直达链接。

如果你是第一次使用框架，建议按这个顺序阅读：

1. 先看[快速开始](docs/CN/GettingStarted.md)，再查 [boot.json 配置][BootJson]，确认脚本和资源该怎么加载。
2. 再看 [区域管理][Framework] 和 [事件发射器][EventEmitter]，了解最常见的插入内容和监听时机。
3. 根据模组类型选择阅读 NPC、动态事件、战斗、角色或工具相关文档。
4. 遇到通用代码处理需求时，再查 [工具函数][Utilities]。

- [boot.json 配置][BootJson]
- [工具函数][Utilities]
- [事件发射器][EventEmitter]
- [翻译服务][Translator]
- [SugarCube 宏][SugarCubeMacro]
- [音频管理][Audio]
- [进阶服务](docs/CN/README.md#进阶服务)
  - [模组加密](docs/CN/Encryption.md)
  - [云存档](docs/CN/CloudSave.md)
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
  - [小贴士注册][Tips]
  - [地点配置][Location]
  - [纹身注册][Bodywriting]
  - [食物注册][Foodstuff]
  - [钓鱼扩展][Fishing]
  - [古董注册][Antiques]
- [角色管理][Character]
  - [侧边栏图层][CharacterLayer]
  - [转化管理][Transformation]
- [NPC 管理][NamedNPC]
  - [NPC 注册][NamedNPCAdd]
  - [NPC 状态][NamedNPCStats]
  - [NPC 日程][NamedNPCSchedule]
  - [NPC 服装][NamedNPCClothes]
  - [NPC 侧边栏][NamedNPCSidebar]
  - [NPC 转化][NamedNPCTransformation]
  - [NPC 怀孕][NamedNPCPregnancy]
- [战斗管理][Combat]
  - [战斗按钮][CombatActions]

## boot.json 配置

**`maplebirchAddon`** 可通过配置处理常见资源和功能。此处是配置速览；字段细节与多语言文件拆分方式请查[boot.json 配置][BootJson]。

最小配置只需要声明脚本。按需增加其它字段，不必复制空的 `npc`、`framework` 等配置：

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

| 参数        | 用途                                                |
| :---------- | :-------------------------------------------------- |
| `language`  | 导入 `CN` / `EN` 翻译；同一语言可按顺序指定多个文件 |
| `audio`     | 导入模组 ZIP 内的音频目录                           |
| `framework` | 添加区域 widget，注册 DoL 内容扩展                  |
| `npc`       | 注册 NPC、状态、侧边栏、转化及怀孕配置              |
| `module`    | 早期脚本，适合框架模块扩展                          |
| `script`    | 常规模组脚本，推荐多数情况下使用                    |

更完整的配置说明见 [boot.json 配置][BootJson]。

> [!NOTE]
> 音频文件还须在模组 `boot.json` 的 `additionFile` 中列出；只设置 `params.audio` 不会把文件打进模组包。

## 反馈与讨论

- [Discord](https://discord.com/channels/1103864219620884560/1433136946032410674)
- [反馈交流群(1087715891)](https://qm.qq.com/q/B4p8vaj1yo) **_[maplebirchFrameworks]_**
- [百度贴吧](https://tieba.baidu.com/p/10049233469?pid=152986348799&cid=152989487455#152986348799)

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
[EventEmitter]: docs/CN/Events.md
[Translator]: docs/CN/Translator.md
[SugarCubeMacro]: docs/CN/Macros.md
[Audio]: docs/CN/Audio.md
[Dynamic]: docs/CN/Dynamic/
[StateEvents]: docs/CN/Dynamic/StateEvents.md
[TimeEvents]: docs/CN/Dynamic/TimeEvents.md
[WeatherEvents]: docs/CN/Dynamic/WeatherEvents.md
[ToolCollection]: docs/CN/Tools/
[Migration]: docs/CN/Tools/Migration.md
[RandSystem]: docs/CN/Tools/Random.md
[HtmlTools]: docs/CN/Tools/Text.md
[Framework]: docs/CN/Tools/Zones.md
[Traits]: docs/CN/Tools/Traits.md
[Tips]: docs/CN/Tools/Tips.md
[Location]: docs/CN/Tools/Location.md
[Bodywriting]: docs/CN/Tools/Bodywriting.md
[Foodstuff]: docs/CN/Tools/Foodstuff.md
[Fishing]: docs/CN/Tools/Fishing.md
[Antiques]: docs/CN/Tools/Antiques.md
[Character]: docs/CN/Character/
[CharacterLayer]: docs/CN/Character/Character.md
[Transformation]: docs/CN/Character/Transformation.md
[NamedNPC]: docs/CN/NamedNPC/
[NamedNPCAdd]: docs/CN/NamedNPC/NamedNPC.md
[NamedNPCStats]: docs/CN/NamedNPC/NamedNPCStats.md
[NamedNPCSchedule]: docs/CN/NamedNPC/NamedNPCSchedule.md
[NamedNPCClothes]: docs/CN/NamedNPC/NamedNPCClothes.md
[NamedNPCSidebar]: docs/CN/NamedNPC/NamedNPCSidebar.md
[NamedNPCTransformation]: docs/CN/NamedNPC/NamedNPCTransformation.md
[NamedNPCPregnancy]: docs/CN/NamedNPC/NamedNPCPregnancy.md
[Combat]: docs/CN/Combat/
[CombatActions]: docs/CN/Combat/Actions.md
