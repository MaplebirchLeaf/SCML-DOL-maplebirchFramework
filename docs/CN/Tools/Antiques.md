# 古董注册

用于向博物馆古董系统添加新的古董文本和收藏状态。

> [!IMPORTANT]
> 框架只负责注册文本和默认收藏状态（`notFound`），**不会**提供图标资源、发现剧情或奖励。模组仍需自行提供 `icon` 图标文件、发现剧情以及 `Museum <name>` 段落。

## 使用入口

```javascript
maplebirch.tool.patch.antiques.add(key, config);
```

在启动脚本中注册。框架通过加载时源码补丁，在 `museumAntiqueText` 执行后合并文本，并在捐赠时调用原版 `museumAntiqueStatus`。新游戏及读档只补齐缺失的收集条目，不覆盖已有进度。目标游戏版本若修改了这两个 widget 的源码接点，请检查[补丁报告](../AddonPlugin.md#补丁报告)。

`inject(data)` 是手动合并入口，返回传入的对象。通常无需调用。

## 最小示例

```javascript
maplebirch.tool.patch.antiques.add('antiquemyitem', {
  hint: '温特说：“找一件奇妙的小遗物吧。”',
  museum: '奇妙的遗物陈列在展台上。',
  name: 'Curious Relic',
  cn_name: '奇妙遗物',
  journal: '一件奇妙的小遗物。',
  journalName: '小遗物',
  icon: 'antiques/my-relic.png'
});
```

## 配置字段

| 字段          | 说明                       | 必填   |
| :------------ | :------------------------- | :----- |
| `hint`        | 温特的提示文本             | 是     |
| `museum`      | 古董放入博物馆后的展示文本 | 是     |
| `name`        | 真实名称（用于段落拼接）   | 是     |
| `cn_name`     | 中文显示名称               | 否     |
| `journal`     | 日志描述                   | 是     |
| `journalName` | 日志中使用的名称           | 否     |
| `icon`        | 图标路径                   | 是     |
| `key`         | 数组配置时使用的唯一标识   | 仅数组 |

> [!NOTE]
> `name` 会用于拼接原版入口 `Museum <name>`（即使在中文版中也是如此）。示例保留 `Curious Relic` 和 `Old Coin`，模组须提供 `Museum Curious Relic` 与 `Museum Old Coin` 两个段落；中文显示名称请填写在 `cn_name` 中，其余描述文本可直接写中文。

## 状态流转

古董状态仍由原版 **`<<museumAntiqueStatus key status>>`** 控制。常见状态流转：

```text
notFound -> found -> talk -> museum
```

也存在 **`stolen`**、**`recovered`** 状态。发现古董的剧情需要在 passage 中自行编写：

```twine
<<set $antiquemoney += 4000>>
<<museumAntiqueStatus "antiquemyitem" "found">>
```

## boot.json

对象映射写法，_推荐用于一次注册多个条目_：

```json
{
  "framework": {
    "antiques": {
      "antiquemyitem": {
        "hint": "温特说：“找一件奇妙的小遗物吧。”",
        "museum": "奇妙的遗物陈列在展台上。",
        "name": "Curious Relic",
        "cn_name": "奇妙遗物",
        "journal": "一件奇妙的小遗物。",
        "journalName": "小遗物",
        "icon": "antiques/my-relic.png"
      },
      "antiquemycoin": {
        "hint": "温特说：“找一枚小小的旧硬币吧。”",
        "museum": "旧硬币陈列在一个小展柜中。",
        "name": "Old Coin",
        "cn_name": "旧硬币",
        "journal": "一枚小小的旧硬币。",
        "icon": "antiques/my-coin.png"
      }
    }
  }
}
```

也可以引用 **`.json`**、**`.yaml`** 或 **`.yml`** 文件。文件内部可以使用同样的对象映射格式：

```json
{
  "framework": {
    "antiques": "data/antiques.yaml"
  }
}
```

数组写法也支持，但每一项必须带 **`key`**：

```yaml
- key: antiquemyitem
  hint: '温特说：“找一件奇妙的小遗物吧。”'
  museum: 奇妙的遗物陈列在展台上。
  name: Curious Relic
  cn_name: 奇妙遗物
  journal: '一件奇妙的小遗物。'
  journalName: 小遗物
  icon: antiques/my-relic.png
- key: antiquemycoin
  hint: '温特说：“找一枚小小的旧硬币吧。”'
  museum: 旧硬币陈列在一个小展柜中。
  name: Old Coin
  cn_name: 旧硬币
  journal: '一枚小小的旧硬币。'
  icon: antiques/my-coin.png
```
