# 快速开始

本页适合第一次为 DoL 制作依赖 `maplebirch` 的模组。先让一个脚本成功运行，再按需要阅读各功能页。

## 1. 声明依赖并加载脚本

在模组的 `boot.json` 中加入以下字段（示例只展示相关部分）：

```json
{
  "dependenceInfo": [{ "modName": "maplebirch", "version": ">=5.0.0" }],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.0.0",
      "params": { "script": ["framework.js"] }
    }
  ]
}
```

> [!IMPORTANT]
> `framework.js` 是模组 ZIP 内的路径，不是电脑上的绝对路径。依赖版本应改为你的模组实际测试过的最低框架版本。

大多数模组代码写在 `script` 中。只有需要参与框架早期模块扩展时才使用 `module`；完整字段见 [boot.json 配置](BootJson.md)。

## 2. 在脚本中调用公开接口

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

这里的 `MyModOptions` 需由模组提供为 SugarCube widget。`on()` 监听框架事件，`tool.addTo()` 将 widget 加到选项区域。详细用法见[事件](Events.md)与[区域添加](Tools/Zones.md)。

> [!TIP]
> 优先用 `maplebirch` 的短入口，例如 `on()`、`t()`、`define()`、`with()`、`wikify()`、`log()`；只在需要高级能力时进入 `services`、`infra` 或 `host`。

为自定义事件、注册项、翻译键等命名时，推荐 `myMod:用途`（例如 `myMod:dailyCheck`）；`V.myMod` 是变量对象名，不按此规则改写。

## 3. 按用途继续阅读

| 想做什么            | 下一页                                                                     |
| :------------------ | :------------------------------------------------------------------------- |
| 拆分中英文文本      | [翻译与多文件导入](Translator.md)                                          |
| 在页面添加内容      | [区域添加](Tools/Zones.md)                                                 |
| 响应游戏状态变化    | [状态事件](Dynamic/StateEvents.md)                                         |
| 添加 NPC 数据或衣柜 | [NPC 注册](NamedNPC/NamedNPC.md) / [NPC 服装](NamedNPC/NamedNPCClothes.md) |
| 检查错误与加载顺序  | [模块与诊断](Modules.md)                                                   |

> [!WARNING]
> 静态构建和类型检查不能代替在目标 DoL、SugarCube 与 ModLoader 版本中实际加载模组。首次接入时先确认脚本执行，再逐项添加功能。

[返回文档导航](README.md)
