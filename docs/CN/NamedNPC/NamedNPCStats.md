# NPC 数值与社交显示

让露娜拥有一项“信任”，并在社交页显示出来，需要把几件小事接好：数值存在人物档案里，行动决定它怎么变化，社交卡片负责把结果画出来。

`maplebirch.npc.addStats()` 用来登记这项数值和显示配置。下面就用同一个 `myModTrust`，从初始值一路写到交谈后加点。

## 先分清三层

| 层次                                 | 负责什么                                                      |
| :----------------------------------- | :------------------------------------------------------------ |
| 人物数据，如 `C.npc.Luna.myModTrust` | 保存当前数值，随原版 NPC 档案存档                             |
| `default`、`min`、`max`              | 默认值及模组可读取的范围元数据；`min`、`max` 不会自动限制赋值 |
| `name`、`value`、`activeIcon` 等     | 提供给原版社交卡片的显示配置，不自动产生玩法效果              |

数值定义会供所有命名 NPC 共用，给字段名带上模组前缀，就容易与其他内容区分。人物初始化和读档时，框架会用 `default` 补齐缺失或非有限的数值，省略时用 `0`；已有的有限数值会保留。

## 完整脚本示例

在模组加载脚本中，先登记数值，再注册使用它的 NPC：

```javascript
maplebirch.npc.addStats({
  myModTrust: {
    min: 0,
    max: 100,
    default: 0,
    position: 2,
    name: '信任',
    value: () => T.npcData?.myModTrust ?? 0,
    minValue: 0,
    maxValue: 100,
    activeIcon: 'img/ui/sym-love.png',
    inactiveIcon: 'img/ui/sym-love-empty.png',
    color: 'teal',
    requirements: () => T.npcData?.nam === 'Luna'
  }
});

maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    adult: 1,
    teen: 0,
    title: '图书管理员',
    myModTrust: 25
  },
  {
    important: true
  }
);
```

社交页会依次绘制不同人物，所以 `value` 和 `requirements` 都在绘制时读取 `T.npcData`，而不是注册时就固定到露娜身上。其他人物得到默认值 `0`，露娜从 `25` 开始，这个条目也只在她的卡片上出现。

露娜完成[原版初遇](NamedNPC.md#2-在剧情中安排初遇)后，社交页的重要人物卡片才能按原版条件显示。仅设置 `position` 不会自动创建名称、读取数值或选择图标。

## 数值与排列字段

所有配置字段在类型上均可选，实际使用时应明确提供所需数值和显示信息。

| 字段              | 用途                                                                                 |
| :---------------- | :----------------------------------------------------------------------------------- |
| `default`         | 首次生成或修复缺失／非有限数值时的默认值，省略时为 `0`                               |
| `min`、`max`      | 范围元数据，模组修改时可读取；不自动限制当前值                                       |
| `position`        | 加入原版重要人物的状态列表，数值索引从 `0` 开始，也支持 `'first'`、`'last'`、`false` |
| `position: false` | 不自动加入重要人物状态列表，仍登记数值定义                                           |

省略 `position` 时，框架会在原版列表靠后的位置插入。原版普通卡片只显示少量固定数值，重要人物卡片还保留尾部项目供特殊人物使用。需要可靠展示新增数值时，按示例使用重要人物和明确的前部索引，不能把 `'last'` 理解成所有人物都会显示的最后一格。

同名 `addStats()` 合并配置。它不是为每个 NPC 分别登记一项，也不是重置已有存档的接口。

## 原版社交显示字段

| 字段                         | 用途                                                     |
| :--------------------------- | :------------------------------------------------------- |
| `name`                       | 显示名称                                                 |
| `value`                      | 当前显示值，通常用函数读取 `T.npcData`                   |
| `minValue`、`maxValue`       | 原版进度条的显示范围，与存储范围元数据 `min`、`max` 分开 |
| `activeIcon`、`inactiveIcon` | 完整图标路径，未指定 `inactiveIcon` 时沿用原版描边处理   |
| `color`                      | 原版进度条颜色名，如 `'teal'`                            |
| `iconOrientation`            | 原版图标排列方向，如 `'vertical'`                        |
| `requirements`               | 是否允许显示，不修改数值                                 |

`value`、`name`、图标、颜色、方向和 `requirements` 可用同步函数，在每次卡片处理时求值。判断与显示回调只读取状态，避免因重绘反复修改进度。

原版卡片还会检查人物已初遇、数据字段大于 `0`、是否为重要人物等条件。因此 `requirements: true` 不会强制显示值为 `0` 的条目。配置中的自定义字段（例如自行附加的玩法说明）也不会自动变成技能效果。

## 在剧情中修改数值

沿用[完整实例](Example.md)已经初始化的 `$myMod.luna.meeting`：只有已约好碰面时才能完成初次交谈，结算放在点击分支中，并显式限制数值范围。

```twine
<<if C.npc.Luna and $myMod.luna.meeting is "planned">>
  <<link "完成初次交谈" "My Mod Luna Meeting">>
    <<if $myMod.luna.meeting is "planned">>
      <<set C.npc.Luna.myModTrust to Math.clamp((C.npc.Luna.myModTrust ?? 0) + 5, 0, 100)>>
      <<set $myMod.luna.meeting to "completed">>
      <<set $myMod.luna.noticePending to true>>
    <</if>>
  <</link>>
<</if>>
```

这里复用实例的变量和目标 passage，是结算片段，不是另一个完整剧情。交谈完成标记与信任一起保存，反复打开页面不会再次增加信任。原版 `npcincr` 有人物与属性白名单，不能假定它支持新人物或新数值。不要在注册脚本中立即寻找 `$NPCName` 索引并赋值；新游戏尚未建表时会找不到人物，重复加载时还可能覆盖进度。

需要初始值时，像前面的 `myModTrust: 25` 一样放入 NPC 注册资料。要让构造器识别该自定义数值，脚本中先调用 `addStats()`，再调用 `add()`。

## boot.json 数据配置

静态定义可写在 `params.npc.Stats` 中。以下片段只登记一个不自动展示的数值：

```json
{
  "npc": {
    "Stats": {
      "myModTrust": {
        "min": 0,
        "max": 100,
        "default": 0,
        "position": false
      }
    }
  }
}
```

此对象放在 `maplebirchAddon` 的 `params` 中，完整结构见 [boot.json 配置](../BootJson.md)。需要动态显示时，在脚本中补充前述 `value`、图标、条件与排列配置。JSON 不能直接写函数，也不会把函数字符串当作显示回调执行。

## 验证接入

1. 新游戏中进入露娜的初遇场景，确认 `C.npc.Luna.myModTrust` 为 `25`。
2. 打开社交页，确认只有露娜的重要人物卡片显示该条目，且图标存在。
3. 通过实际行动改变数值，再打开社交页确认刷新；只重绘页面不应再次加点。
4. 保存并读档，确认数值保留；已有有限值不应变回初始值。
