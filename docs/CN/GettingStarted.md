# 快速开始

先做一个能立刻看到效果的最小模组：在控制台输出一条日志，并在游戏选项页显示“我的模组”。只要这两处都出现，就说明 ModLoader、框架和你的文件已经接通了。

## 1. 准备目录与 `boot.json`

最小模组只需要放在压缩包根目录的 3 个文件：

```text
MyMod.mod.zip
├── boot.json
├── framework.js
└── widgets.twee
```

把下面的配置保存为 `boot.json`（完整实战见 [NPC 公园约见实例](NamedNPC/Example.md)）：

```json
{
  "name": "myMod",
  "version": "0.1.0",
  "styleFileList": [],
  "scriptFileList": [],
  "tweeFileList": ["widgets.twee"],
  "imgFileList": [],
  "additionFile": ["framework.js"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.5.7"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.5.7",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

> [!WARNING]
> **不要把 `framework.js` 同时写进 `scriptFileList` 和 `params.script`**，否则脚本会被执行两次。通过 `params.script` 加载时，只需把它列入 `additionFile` 让 ModLoader 打包进压缩包即可。

> [!NOTE]
>
> - `tweeFileList`、`additionFile` 和 `params.script` 填的都是 **ZIP 内的相对路径**，不要写电脑上的绝对路径。
> - 依赖版本号按你实际测试通过的最低框架版本填写；需要更早接入框架模块时可改用 `module`（全部字段见 [boot.json 配置](BootJson.md)）。

## 2. 写脚本与界面 widget

在 `framework.js` 中写入：

```javascript
maplebirch.on(
  ':storyready',
  () => {
    maplebirch.log('MyMod 已就绪');
  },
  'myMod startup'
);

maplebirch.tool.addTo('Options', 'MyModOptions');
```

- `maplebirch.on(':storyready', ...)`：等故事环境就绪后输出日志。
- `maplebirch.tool.addTo('Options', 'MyModOptions')`：把名为 `MyModOptions` 的 widget 挂到框架预置的 `Options`（选项页）区域。

接着在 `widgets.twee` 中定义这个 widget：

```twine
:: My Mod Options [widget]
<<widget "MyModOptions">>
  <h3>我的模组</h3>
  <p>模组选项已载入。</p>
<</widget>>
```

## 3. 打包并确认接通

将这 3 个文件直接打包进 `.mod.zip` 根目录并加载进游戏：

1. 按 `F12` 打开浏览器控制台（Console），能看到 `MyMod 已就绪`，说明脚本已执行。
2. 打开游戏内的 **选项（Options）** 页面，能看到“我的模组”，说明 Twee 与区域注入已接通。

> [!TIP]
> 平时优先使用 `maplebirch.on()`、`t()`、`define()`、`with()`、`log()` 等顶层短入口；只有需要底层能力时再调用 `services`、`infra` 或 `host`。事件名、注册名和翻译键建议统一加上自己的模组前缀（如 `myMod:dailyCheck`），避免和原版或其他模组撞名；存档变量继续放在 `V.myMod` 下。

## 4. 接下来去哪里

| 想做什么            | 对应文档                                                                     |
| :------------------ | :--------------------------------------------------------------------------- |
| 把一个功能串成剧情  | [从示例到完整功能](Development.md) / [NPC 公园约见实例](NamedNPC/Example.md) |
| 拆分中英文文本      | [翻译与多文件导入](Translator.md)                                            |
| 在更多页面插入内容  | [区域添加](Tools/Zones.md)                                                   |
| 响应时间或状态变化  | [状态事件](Dynamic/StateEvents.md)                                           |
| 添加 NPC 数据或衣柜 | [NPC 注册](NamedNPC/NamedNPC.md) / [NPC 服装](NamedNPC/NamedNPCClothes.md)   |
| 排查报错与加载顺序  | [模块与诊断](Modules.md)                                                     |

[返回文档导航](README.md)
