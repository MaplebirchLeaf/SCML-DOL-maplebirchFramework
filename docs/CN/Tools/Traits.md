# 特质注册

特质注册允许模组向原版角色特质面板添加自定义特质，通过 `maplebirch.tool.patch.traits.add(...traits)` 访问。

> [!IMPORTANT]
> 此接口只注册特质的显示条件与说明文本，**不会**自动赋予能力加成。描述中提到的任何数值效果都需要模组另行实现。示例中的勇气、毒抗和职业等字段均由模组维护在 `V.myMod` 中，并非原版变量。

## 使用入口

```javascript
maplebirch.tool.patch.traits.add(...traits);
```

支持一次传入一个或多个特质配置对象。`title` 与 `name` 为必填；若重复注册相同的 `title` 和 `name`，后一次注册会覆盖先前的条目。

## 最小示例

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  name: '快速学习者',
  colour: 'blue',
  has: true,
  text: '快速学习者，技能获取速度+20%'
});
```

## 特质配置对象 (TraitConfig)

| 字段      | 类型             | 说明                                       |
| :-------- | :--------------- | :----------------------------------------- |
| `title`   | string           | 特质分类标题，必填                         |
| `name`    | string/function  | 特质名称，必填，可为字符串或无参数函数     |
| `replace` | string/RegExp    | 可选，同分类中要覆盖的原特质名称或匹配正则 |
| `colour`  | string/function  | 特质颜色，默认 `""`                        |
| `has`     | boolean/function | 是否拥有该特质，默认 `false`               |
| `text`    | string/function  | 特质描述文本，默认 `""`                    |

## 已知分类与覆盖

`replace` 在渲染前匹配名称并保留原特质位置：字符串为精确匹配，正则可同时兼容中英文原版名称。未指定或未匹配到时，仍按 `name` 覆盖同名条目或追加到分类末尾。若已有特质的名称为函数，仅在该特质拥有（`has` 为真）时读取返回值进行匹配，隐藏特质的名称函数不会提前执行。此字段仅用于脚本注册：

```javascript
maplebirch.tool.patch.traits.add({
  title: 'General Traits',
  replace: /^(?:Rite of Promise:|承诺仪式：)/,
  name: () => '承诺仪式：' + maplebirch.auto('Robin'),
  colour: 'blue',
  has: () => V.myMod?.promised,
  text: '一份得到神殿认可的承诺。'
});
```

内置分类沿用下表中的英文键名，框架会自动翻译为中文：

| 英文分类名          | 中文翻译 |
| :------------------ | :------- |
| `General Traits`    | 一般特质 |
| `Medicinal Traits`  | 医疗特质 |
| `Special Traits`    | 特殊特质 |
| `School Traits`     | 学校特质 |
| `Trauma Traits`     | 创伤特质 |
| `NPC Traits`        | NPC特质  |
| `Hypnosis Traits`   | 催眠特质 |
| `Acceptance Traits` | 接纳特质 |

> [!NOTE]
> 如果使用未在表中定义的分类名，框架会按原分类名创建或匹配分类。

## 动态特质示例

```javascript
maplebirch.tool.patch.traits.add({
  title: 'Medicinal Traits',
  name: '毒素抗性',
  colour: () => {
    const level = V.myMod?.poisonResistance ?? 0;
    if (level >= 80) return 'green';
    if (level >= 50) return 'yellow';
    return 'red';
  },
  has: () => (V.myMod?.poisonResistance ?? 0) > 0,
  text: () => `毒抗 ${V.myMod?.poisonResistance ?? 0}%`
});
```

## boot.json

除了脚本 API，也可在 `boot.json` 的 `params.framework` 中通过数组批量注册 `traits`：

```json
{
  "params": {
    "framework": [
      {
        "traits": [
          {
            "title": "General Traits",
            "name": "强壮",
            "colour": "brown",
            "has": "V.myMod?.strength > 70",
            "text": "力量过人，物理攻击+15%"
          },
          {
            "title": "School Traits",
            "name": "优等生",
            "colour": "yellow",
            "has": "V.myMod?.grades >= 90",
            "text": "优等生，学校声誉+20"
          }
        ]
      }
    ]
  }
}
```

在 `boot.json` 中，`has` 支持布尔值或 JavaScript 条件表达式，`name`、`colour`、`text` 为普通字符串（需要动态名称、颜色或描述时请使用脚本注册）。

> [!CAUTION]
> `boot.json` 中的字符串 `has` 表达式会在游戏上下文中求值（可访问 `V`、`Time`、`Weather` 等全局对象），请仅填写可信代码。

也可以引用 `.json`、`.yaml` 或 `.yml` 文件：

```json
{
  "params": {
    "framework": {
      "traits": "data/traits.yaml"
    }
  }
}
```
