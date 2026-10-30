# NPC 注册

给人物准备好姓名、外貌和头衔后，就可以用 `maplebirch.npc.add()` 把她登记到框架。框架会接上原版的新游戏、读档和初遇流程；我们再为她安排场景，让玩家真正见到她。

这一页从人物资料和初遇开始，后面再介绍社交与扩展配置。喜欢边看边做的话，可以先打开[NPC 公园约见与交谈实例](Example.md)，跟着露娜的场景走一遍，再回来查具体字段。

## 相关指南怎么选

| 要完成的事                         | 文档                                  |
| :--------------------------------- | :------------------------------------ |
| 注册人物、安排初遇、读取当前人物   | 本页                                  |
| 添加自定义数值并显示在社交页       | [NPC 数值](NamedNPCStats.md)          |
| 查询人物此时应在哪里               | [NPC 日程](NamedNPCSchedule.md)       |
| 配置互动服装或侧边栏衣柜           | [NPC 服装与衣柜](NamedNPCClothes.md)  |
| 显示静态立绘、画师分层图或 PC 模型 | [NPC 侧边栏](NamedNPCSidebar.md)      |
| 为 NPC 增加转化成长和外观          | [NPC 转化](NamedNPCTransformation.md) |
| 接入原版周期与受孕判定             | [NPC 怀孕](NamedNPCPregnancy.md)      |

## 人物标识与数据边界

以下示例统一使用 `Luna` 作为人物的 `nam`。注册、日程、衣柜、转化和怀孕都用这个标识，大小写保持一致。中文姓名“露娜”是显示文本，不用于替换标识。

| 位置                           | 保存或表示什么                                         |
| :----------------------------- | :----------------------------------------------------- |
| `npcData`，即 `add()` 的第一项 | 初始人物资料，如性别、发型、头衔                       |
| `npcConfig`，即第二项          | 框架及社交展示配置，如好感上限、重要人物标记           |
| `translations`，即第三项       | 可选的文本翻译，不是存档状态                           |
| `C.npc.Luna`                   | 当前存档中的人物对象，适合在剧情执行时读取与修改       |
| `$NPCName` / `V.NPCName`       | 原版命名 NPC 档案数组，由原版和框架维护                |
| `$NPCList` / `V.NPCList`       | 当前遭遇生成的 NPC 槽位，不等同于人物档案数组          |
| `$npc` / `V.npc`               | 当前场景中的命名 NPC 名单，侧边栏以它选择人物          |
| `V.maplebirch.npc.luna`        | 框架管理的侧边栏、转化、体液等扩展状态，键为小写人物名 |

注册脚本只登记配置。新游戏尚未创建人物档案时，`C.npc.Luna` 可能不存在。剧情里使用当前对象，不要长期缓存数组索引或读档前的人物引用。模组自己的任务进度放在自己的存档对象中，例如 `V.myMod`。

## 1. 在脚本中注册人物

将以下代码放到 `boot.json` 的 `params.script` 所加载的脚本中：

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    pronoun: 'f',
    adult: 1,
    teen: 0,
    age: 25,
    title: '图书管理员',
    description: '一位喜欢整理旧书的图书管理员',
    hairColour: 'black',
    eyeColour: 'purple',
    hair_sides_length: 400,
    hair_fringe_length: 200
  },
  {
    love: {
      maxValue: 100
    },
    important: true
  }
);
```

`add()` 返回是否接受注册，缺少 `nam` 时返回 `false`。同名注册会合并资料和配置。它不创建相遇地点、不生成剧情链接，也不代表玩家已经认识该人物。

## 2. 在剧情中安排初遇

在由 ModLoader 加载的 `.twee` 文件中定义场景。下面两个 passage 都属于示例模组；实际模组还需通过[区域添加](../Tools/Zones.md)等入口让玩家能够进入：

```twine
:: My Mod Library
<<link "和露娜交谈" "My Mod Luna Meeting">><</link>>

:: My Mod Luna Meeting
<<npc "Luna">>
露娜放下手中的书，向你打了声招呼。

<<link "结束交谈" "My Mod Library">>
  <<endevent>>
<</link>>
```

`<<npc "Luna">>` 使用原版遭遇生成流程，首次调用时会执行 `initnpc`，并把人物加入当前场景名单。单独需要初遇初始化、但不需要占用遭遇槽位时，可使用原版 `<<initnpc "Luna">>`。这两个宏的名称大小写按示例填写。

`<<endevent>>` 结束当前遭遇并清理槽位。将它放在场景真正结束的出口中。不要在每次绘制页面时把 `init` 设回 `0`，也不要仅为显示立绘随意改写 `$NPCList` 或 `$npc`。

## 3. 在剧情中读取当前人物

NPC 已载入后可用 `C.npc.Luna`。带空格的标识使用下标，例如 `C.npc['Black Wolf']`。

```twine
<<if C.npc.Luna and C.npc.Luna.init is 1>>
  露娜的头衔是：<<= C.npc.Luna.title>>。
<</if>>
```

`init === 1` 表示已完成原版初遇初始化。自定义数值的初始值、修改和显示方式见 [NPC 数值](NamedNPCStats.md)。原版 `npcincr` 有人物和属性白名单，注册新 NPC 不会自动扩展这些白名单。

## 人物资料字段

除 `nam` 外都可省略。下表列出常用字段；与图片相关的标识须在目标游戏或模组资源中实际存在。

| 字段                                      | 类型与默认值                                  | 含义                                                        |
| :---------------------------------------- | :-------------------------------------------- | :---------------------------------------------------------- |
| `nam`                                     | `string`，必填                                | 稳定的人物标识                                              |
| `gender`                                  | `'m' / 'f' / 'h' / 'n' / 'none'`，随机        | 身体性别                                                    |
| `pronoun`                                 | `'m' / 'f' / 'i' / 'n' / 't'`                 | 代词，默认由性别决定；`h` 默认随机选择男女代词              |
| `title`                                   | `string`，`'none'`                            | 头衔                                                        |
| `description`                             | `string`，人物标识                            | 简短描述                                                    |
| `fullDescription`                         | `string`，可选                                | 完整描述                                                    |
| `type`                                    | `string`，`'human'`                           | 原版种族，不能用它替代 NPC 转化配置                         |
| `adult`、`teen`                           | `number`，`0 / 1`                             | 年龄组标记，均未指定时随机选择                              |
| `age`                                     | `number`，`0`                                 | 年龄；指定年龄时也应明确年龄组标记                          |
| `insecurity`                              | `'weak' / 'looks' / 'ethics' / 'skill'`，随机 | 原版不安全感类型                                            |
| `hair_side_type`、`hair_fringe_type`      | `string`，`'default'`                         | 主体头发与刘海的原版发型标识                                |
| `hair_position`                           | `string`，`'back'`                            | 头发位置                                                    |
| `hair_sides_length`、`hair_fringe_length` | `number`，各 `200`                            | 两个独立的数值长度，见[侧边栏](NamedNPCSidebar.md#发型长度) |
| `eyeColour`、`hairColour`                 | `string`，随机                                | 原版颜色标识，如 `'purple'`、`'black'`                      |
| `bottomsize`、`skincolour`                | `number`                                      | 臀部大小与原版肤色数据，默认分别为随机值与 `0`              |
| `penis`、`vagina`                         | `string`                                      | 部位状态，默认按身体性别生成                                |
| `penissize`、`breastsize`、`ballssize`    | `number`                                      | 部位尺寸，默认按身体性别生成                                |
| `penisdesc`、`breastdesc`                 | `string`                                      | 部位描述；省略时沿用框架生成逻辑                            |
| `chastity`                                | `{ penis, vagina, anus }`                     | 原版贞操装置标识，默认均为空字符串                          |
| `virginity`                               | `Record<string, boolean>`                     | 原版各类初次状态；提供时应填写剧情需要的完整项目            |
| `outfits`                                 | `string[]`                                    | 原版互动服装套装名，会补入该性别的默认套装                  |
| `pregnancy`                               | `NPCPregnancyState`，`{}`                     | 原版周期与开关状态，不是妊娠记录数组                        |
| `pregnancyAvoidance`                      | `number`，可选                                | 避孕倾向，建议通过怀孕配置设置                              |
| `init`、`intro`                           | `number`，各 `0`                              | 原版初始化与介绍状态，一般交给原版剧情维护                  |

性别省略时，当前权重为男性 `47%`、女性 `47%`、双性 `5%`、中性 `1%`。`'none'` 表示无性别。代词中的 `i` 对应 it，`n` 对应单数 they，`t` 对应复数 they；身体性别与代词是两个字段。

颜色与发型名是原版资源标识，不能写中文译名。两个头发长度缺失、非数字或非有限值时各自恢复为 `200`，有效的 `0` 会保留，修改一项不会改变另一项。

## 社交与恋爱配置

| 字段                   | 含义                                                                 |
| :--------------------- | :------------------------------------------------------------------- |
| `love`                 | 原版社交卡片的好感配置，例如 `{ maxValue: 100 }`；不自动限制赋值范围 |
| `important`、`special` | 布尔值或同步判断函数，加入相应社交展示分类                           |
| `loveInterest`         | 布尔值或函数，声明可进入原版恋爱对象名单；不会自动建立恋爱关系       |
| `romance`              | 同步判断函数数组，全部为真时 `isPossibleLoveInterest(name)` 返回真   |
| `loveAlias`            | `[英文, 中文]` 数组，或返回字符串／该数组的函数                      |

这些标记不生成恋爱剧情。`important`、`special` 的社交卡片配置在绘制时会读取，恋爱名单还会在初始化等阶段收集。持续变化的恋爱资格应写入 `romance`，不要把一次性注册结果当作剧情进度。

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna'
  },
  {
    loveInterest: true,
    romance: [() => C.npc.Luna?.init === 1, () => V.myMod?.lunaRomanceUnlocked === true],
    loveAlias: () => '信任'
  }
);
```

此例在已有注册上补充配置，`lunaRomanceUnlocked` 由模组自己的剧情维护。未提供 `romance` 时，可恋爱人物会使用原版风格的 `<小写且去空格的姓名>Seen` 中是否包含 `'romance'` 作为默认条件；自定义故事建议显式提供条件。

`loveAlias` 的数组格式是专门的双语 API，需要时才使用：

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna'
  },
  {
    loveAlias: ['Trust', '信任']
  }
);
```

## 翻译数据

普通头衔和描述可直接写中文。需要双语名称时，第三项以文本键为外层，每个键的值为 `{ EN, CN }`；也支持同结构的 `Map`：

```javascript
maplebirch.npc.add(
  {
    nam: 'Luna',
    title: '图书管理员'
  },
  {},
  {
    Luna: {
      EN: 'Luna',
      CN: '露娜'
    },
    图书管理员: {
      EN: 'Librarian',
      CN: '图书管理员'
    }
  }
);
```

姓名显示时使用 `maplebirch.auto('Luna')`；注册和查询仍使用 `Luna`。翻译文件的格式见[翻译服务](../Translator.md)。

## boot.json 写法

以下是 `addonPlugin` 数组中的一个配置项，与脚本注册同一份人物资料的方式二选一：

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": ">=5.2.0",
  "params": {
    "npc": {
      "NamedNPC": [
        [
          {
            "nam": "Luna",
            "gender": "f",
            "adult": 1,
            "teen": 0,
            "title": "图书管理员"
          },
          {
            "love": {
              "maxValue": 100
            },
            "important": true
          },
          {
            "Luna": {
              "EN": "Luna",
              "CN": "露娜"
            }
          }
        ]
      ]
    }
  }
}
```

每个条目依次为 `[npcData, npcConfig, translations]`，后两项可省略。需要跳过第二项而提供第三项时，第二项写 `{}`。JSON 中使用布尔值与普通数据，回调函数放在脚本注册中。完整加载配置见 [boot.json 配置](../BootJson.md)。

## 新游戏、读档与更新

- 人物在原版新游戏建表时接入，读档时补齐新登记的 NPC。注册不等于初遇，初遇仍由剧情中的原版宏执行。
- 新增 NPC 完成初遇后，已存在的存档字段会保留，注册资料只补缺失字段。注册代码适合提供初始值，剧情改名、换装或关系变化应修改当前存档对象。
- 修改原版 NPC 时，只应用明确登记的字段；读档后的新对象会重新应用。构造器的随机默认值不会覆盖未登记的原版字段。
- 同名 `add()` 合并登记数据和配置。反复执行注册不会自动生成一场新相遇；日程等其它子系统各有自己的替换规则。
- `V.maplebirch.npc.luna.location` 和 `.clothes` 是查询属性，分别读取日程和侧边栏衣柜，不能通过给它们赋值来搬动人物或换装。

## 常见问题

| 现象                       | 先检查什么                                                          |
| :------------------------- | :------------------------------------------------------------------ |
| `C.npc.Luna` 不存在        | 注册脚本是否加载，游戏人物建表是否完成，`nam` 是否一致              |
| 社交页没有人物             | 是否已执行初遇，`important` 等配置是否符合预期                      |
| 注册了头像但侧栏空白       | 当前场景是否生成该人物，框架侧边栏显示及图像选择是否开启            |
| 自定义数值有数据但没有图标 | 是否提供显示名称、`value`、图标与条件，见[数值页](NamedNPCStats.md) |
| 改日程后没有新剧情入口     | 日程只返回地点标签，遇见人物的场景与链接仍由内容模组提供            |
| 读档后进度被重置           | 是否在页面渲染或每次加载时重写初始值，是否重复执行剧情结算          |
