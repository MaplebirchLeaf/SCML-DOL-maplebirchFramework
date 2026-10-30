# 开局成就加成

`maplebirch.tool.patch.featBoosts.add(key, config)` 把模组加成加入原版的成就加成菜单，使用原版的成就、V 币预算、购买等级与退款界面。

## 注册

请在启动时注册，早于原版的 `setupFeatBoosts` 初始化。使用模组前缀区分加成标识。

```javascript
maplebirch.tool.patch.featBoosts.add('myMod:boost', {
  name: '示例加成',
  required: ['Thief'],
  cost: 60,
  max: 1,
  missing: '获得所需成就后解锁此加成。',
  text: '新周目开始时获得示例特质。',
  upgrade: '在新周目开始时解锁此特质。',
  effect: '<<myModFeatBoost>>'
});
```

`effect` 是 Twee 源码，可调用模组已有的 widget。示例中的 `myModFeatBoost` 需由模组定义并载入。

| 字段            | 说明                                                                |
| --------------- | ------------------------------------------------------------------- |
| `name`          | 菜单中的加成名称，必填                                              |
| `required`      | 成就标识数组，拥有其中任意一项即可解锁，默认无前置                  |
| `cost`          | 每级所需 V 币，必填，非负安全整数                                   |
| `max`           | 解锁后的购买上限，非负安全整数                                      |
| `maxMultiplier` | 每项已获得的前置成就提供的购买次数，正安全整数，指定 `max` 时不使用 |
| `exclusive`     | 与此加成互斥的另一项加成标识                                        |
| `missing`       | 尚未解锁时的提示                                                    |
| `text`          | 加成说明                                                            |
| `upgrade`       | 购买区域的效果说明                                                  |
| `effect`        | 新周目执行的 Twee 源码                                              |

未指定 `max` 时，上限为已获得的前置成就数量乘以 `maxMultiplier` (默认 1)。无前置时按一项计算。`name`、`missing`、`text`、`upgrade` 可为字符串或返回字符串的函数，展示时经 `maplebirch.auto()` 翻译。

## JSON 配置

也可在 `boot.json` 的 `framework` 中单独配置：

```json
{
  "framework": [
    {
      "featBoosts": "data/feat-boosts.json"
    }
  ]
}
```

`data/feat-boosts.json` 使用以加成标识为键的对象，或每项带 `key` 的数组：

```json
{
  "myMod:boost": {
    "name": "示例加成",
    "required": ["Thief"],
    "cost": 60,
    "max": 1,
    "effect": "<<myModFeatBoost>>"
  }
}
```

配置也支持 YAML、内联数据和文件路径数组，详见 [boot.json 配置](../BootJson.md#framework注册数据文件)。

## 结算

框架包装原版的两个宏：

- `setupFeatBoosts`：原版初始化后补充模组加成。普通重开保留购买，原版导入与重置流程重新计算上限并清空购买。
- `applyFeatBoosts`：在原版清理加成数据前执行已购买的 `effect`。

购买、退款和展示不会授予玩法效果。`effect` 随原版有成就点的新周目加成流程执行，当前角色不会在购买时提前获得效果。
