# 古董注册

用于向博物馆古董系统添加新的古董文本和收藏状态。

## 使用入口

```javascript
maplebirch.tool.patch.antiques.add(key, config);
```

在启动脚本中注册。框架在 `museumAntiqueText` 执行后合并文本，在捐赠时调用原版 `museumAntiqueStatus`，无需修改 widget 源码。新游戏及读档只补齐缺失的收集条目，不覆盖已有进度。

`inject(data)` 是手动合并入口，返回传入的对象；通常无需调用。古董的资源、发现剧情及 `Museum <name>` 段落仍由 Mod 提供。

## 最小示例

```javascript
maplebirch.tool.patch.antiques.add('antiquemyitem', {
  hint: '"For a curious little relic," Winter says.',
  museum: 'The curious relic rests on a pedestal.',
  name: 'Curious Relic',
  cn_name: '奇妙遗物',
  journal: '"A curious little relic."',
  journalName: 'Small relic',
  icon: 'antiques/my-relic.png'
});
```

## 配置字段

| 字段          | 说明                       |
| :------------ | :------------------------- |
| `hint`        | Winter 提示文本            |
| `museum`      | 古董放入博物馆后的展示文本 |
| `name`        | 真实名称                   |
| `cn_name`     | 中文显示名称，可选         |
| `journal`     | 日志描述                   |
| `journalName` | 日志中使用的名称，可选     |
| `icon`        | 图标路径                   |
| `key`         | 数组配置时使用的唯一标识   |

## 状态流转

古董状态仍由原版 **`<<museumAntiqueStatus key status>>`** 控制。常见状态：

```text
notFound -> found -> talk -> museum
```

也存在 **`stolen`**、**`recovered`**。框架只负责注册文本和默认状态，_不负责定义发现地点或奖励_。

发现古董的剧情仍需要在 passage 中自行写：

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
        "hint": "\"For a curious little relic,\" Winter says.",
        "museum": "The curious relic rests on a pedestal.",
        "name": "Curious Relic",
        "cn_name": "奇妙遗物",
        "journal": "\"A curious little relic.\"",
        "journalName": "Small relic",
        "icon": "antiques/my-relic.png"
      },
      "antiquemycoin": {
        "hint": "\"For a small old coin,\" Winter says.",
        "museum": "The old coin rests in a small display case.",
        "name": "Old Coin",
        "cn_name": "旧硬币",
        "journal": "\"A small old coin.\"",
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
  hint: '"For a curious little relic," Winter says.'
  museum: The curious relic rests on a pedestal.
  name: Curious Relic
  cn_name: 奇妙遗物
  journal: '"A curious little relic."'
  journalName: Small relic
  icon: antiques/my-relic.png
- key: antiquemycoin
  hint: '"For a small old coin," Winter says.'
  museum: The old coin rests in a small display case.
  name: Old Coin
  cn_name: 旧硬币
  journal: '"A small old coin."'
  icon: antiques/my-coin.png
```
