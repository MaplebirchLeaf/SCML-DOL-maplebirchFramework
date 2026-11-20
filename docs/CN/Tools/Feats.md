# 成就定义

模组可以通过启动脚本或 `boot.json` 添加成就。框架在 StoryInit 将定义加入原版 `setup.feats`。

## 启动脚本

在 StoryInit 前调用 `maplebirch.tool.patch.feats.add(id, config)`。

```javascript
const { feats } = maplebirch.tool.patch;

feats.add('MyMod First Delivery', {
  title: ['First Delivery', '首次交付'],
  description: ['Complete your first delivery.', '完成首次交付。'],
  difficulty: 1,
  series: 'myMod:deliveries'
});
```

使用稳定的成就 ID。相同 ID 以首次登记的有效定义为准，原版已有定义优先。

## JSON 配置

也可以在 `boot.json` 的 `maplebirchAddon` 配置中，将 `framework` 放入 `params`。

```json
{
  "framework": [
    {
      "feats": "data/feats.json"
    }
  ]
}
```

`data/feats.json` 可以使用以成就 ID 为键的对象，也可以使用每项带 `key` 的数组。以下两项成就属于同一系列。

```json
{
  "MyMod First Delivery": {
    "title": ["First Delivery", "首次交付"],
    "description": ["Complete your first delivery.", "完成首次交付。"],
    "difficulty": 1,
    "series": "myMod:deliveries"
  },
  "MyMod Ten Deliveries": {
    "title": ["Ten Deliveries", "十次交付"],
    "description": ["Complete ten deliveries.", "完成十次交付。"],
    "difficulty": 2,
    "series": "myMod:deliveries"
  }
}
```

配置也支持 YAML、内联数据和文件路径数组。参见 [boot.json 配置](../BootJson.md#framework注册数据文件)。

## 字段

| 字段                | 说明                                      |
| ------------------- | ----------------------------------------- |
| `title`             | 成就标题，必填                            |
| `description`       | 成就说明，必填                            |
| `difficulty`        | 原版难度，必填，整数 1 至 5               |
| `series`            | 系列 ID，省略时独立显示                   |
| `filter`            | 筛选分类数组，默认为 `['All', 'General']` |
| `hidden`            | 为 `true` 时在获得前隐藏，可选            |
| `softLockable`      | 为 `true` 时受原版软模式锁定限制，可选    |
| `pregnancyLockable` | 为 `true` 时受原版怀孕设置锁定限制，可选  |

`title` 和 `description` 支持字符串或 `[英文, 中文]`。双语文本随游戏语言切换。

自定义 `filter` 时，加入 `All` 才会在「显示全部」中列出。

## 系列

同系列成就使用相同的 `series` 和 `filter`，按进度从早到晚添加。在当前筛选下，原版成就页只显示该系列中首个符合显示条件的未获得成就。

## 授予成就

在剧情达到对应条件时，通过原版宏授予成就。宏的参数使用定义中的 ID。

```twine
<<earnFeat "MyMod First Delivery">>
```

相关文档

- [Patch 注册](Patches.md)
- [开局成就加成](FeatBoosts.md)
