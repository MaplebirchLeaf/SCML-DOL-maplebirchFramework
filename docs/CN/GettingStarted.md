# 快速开始

先做一个很小的功能：让游戏加载自己的脚本，再在选项页显示“我的模组”。看到这两个结果，就说明 ModLoader、框架和你的文件已经接上了。

## 1. 声明依赖并加载脚本

在已有模组的 `boot.json` 中加入下面这些字段。这里展示的是接入框架需要的部分；想从完整文件开始，可以对照 [NPC 实例](NamedNPC/Example.md)。

```json
{
  "tweeFileList": ["widgets.twee"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.2.0"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.2.0",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

`framework.js` 和 `widgets.twee` 都是 **ZIP 内的路径**。打包时让它们与配置对应即可，不用填写电脑上的绝对路径。依赖版本也要按自己的实测结果，填写实际支持的最低框架版本。

日常模组代码放在 `script` 中就够了。需要参与更早的框架模块扩展时，再使用 `module`，完整字段可以查 [boot.json 配置](BootJson.md)。

## 2. 在脚本中调用公开接口

打开 `framework.js`，写入：

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

这里做了两件事：用 `on()` 等故事准备完成后输出一条日志，再用 `tool.addTo()` 给选项区域登记一个 widget 名称。

页面还需要知道这个 widget 里有什么。把下面的定义放进 `widgets.twee`：

```twine
:: My Mod Options [widget]
<<widget "MyModOptions">>
  <h3>我的模组</h3>
  <p>模组选项已载入。</p>
<</widget>>
```

现在把两个文件连同 `boot.json` 一起打包，在目标游戏中加载。日志里应出现“MyMod 已就绪”，选项页里应看到“我的模组”。前者说明脚本执行了，后者说明 Twee 和区域入口也接通了。

这几步里，`tweeFileList` 交给 ModLoader 读取，`params.script` 和 `tool.addTo()` 由框架处理。想了解它们各自还能做什么，可以继续看[事件](Events.md)和[区域添加](Tools/Zones.md)。

日常调用可以沿用 `maplebirch.on()`、`t()`、`define()`、`with()`、`log()` 这样的短入口，需要高级能力时再进入 `services`、`infra` 或 `host`。自己的事件、注册项和翻译键可以带上模组前缀，例如 `myMod:dailyCheck`；`V.myMod` 仍然保留普通变量对象的名字。

## 3. 按用途继续阅读

有了一个能显示的小功能，就可以挑自己感兴趣的部分继续写了：

| 想做什么            | 下一页                                                                     |
| :------------------ | :------------------------------------------------------------------------- |
| 拆分中英文文本      | [翻译与多文件导入](Translator.md)                                          |
| 在页面添加内容      | [区域添加](Tools/Zones.md)                                                 |
| 响应游戏状态变化    | [状态事件](Dynamic/StateEvents.md)                                         |
| 添加 NPC 数据或衣柜 | [NPC 注册](NamedNPC/NamedNPC.md) / [NPC 服装](NamedNPC/NamedNPCClothes.md) |
| 检查错误与加载顺序  | [模块与诊断](Modules.md)                                                   |

如果想把几个接口连成一段剧情，接着读[开发流程](Development.md)，或直接做一遍 [NPC 公园约见实例](NamedNPC/Example.md)。最后记得在自己使用的 DoL、SugarCube 和 ModLoader 版本里实际加载并操作；构建和类型检查能帮助检查代码，页面效果和流程还需要在游戏里确认。

[返回文档导航](README.md)
