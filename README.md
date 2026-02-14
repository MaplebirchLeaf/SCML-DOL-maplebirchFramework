# SCML-DOL-maplebirchFramework
`maplebirchFramework` 是基于 **Sugarcube2 ModLoader** 为 **Degrees-of-Lewdity** 游戏设计的模块化开发框架，旨在能够为游戏扩展模组的开发提供一些便利，让开发者能够更轻松地构建和维护模组内容。
***
## 目录
- [基本介绍](#基本介绍)
- [安装与依赖](#安装与依赖)
- [反馈与讨论](#反馈与讨论)
- [致谢](#致谢)

## 基本介绍
- 本框架适用于  **`Degrees-of-Lewdity`** 游戏本体，并尽量适配与最新版本。(版本不适配时，请**自行修改**以适配历史游戏版本)
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
## 反馈与讨论

## 致谢