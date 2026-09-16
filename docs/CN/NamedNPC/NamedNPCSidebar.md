## NPC侧边栏

### 基本介绍

NPC 侧边栏系统允许模组制作者为自定义 NPC 添加侧边栏显示功能，包括静态图片显示和基于游戏内服装系统的动态模型渲染。

---

### 侧边栏显示模式

#### 两种显示模式

1. **静态图片模式**: 显示预先绘制的 NPC 静态图片
2. **动态模型模式**: 基于游戏内服装系统动态渲染 NPC 模型

---

### 静态图片模式

#### 图片放置位置

```
img/ui/nnpc/[npc_name]/[image_name].[png|jpg|gif]
```

**兼容 DOLP（DOL+）深层目录结构**：

```
img/ui/nnpc/[npc_name]/[gender]/[skin_tone]/[image_name].[png|jpg|gif]
```

- `[gender]`: `male` / `female`，按 NPC 当前性别动态解析（男性为 `male`，其余为 `female`）
- `[skin_tone]`: `dark` / `pale`，按侧边栏设置中的皮肤明暗（`skin_type`）动态映射（含 `dark` 时为 `dark`，其余为 `pale`）
- 目录名兼容 `black_wolf`（snake_case）、`black-wolf`（kebab-case）、`black wolf`（空格）三种形式，自动归一化为 NPC 名称

框架扫描 `img/ui/nnpc` 文件夹时会同时识别上述两种结构；渲染时优先匹配当前 NPC 性别与肤色的深层路径，缺失时自动回退到同名图片的其它可用路径（DOLP 素材中 `fools`、`monster` 等额外目录里的同名图片也能通过回退机制选用）。

---

### 动态模型发型长度

NPC 各自保存数值字段 `hair_sides_length`（主体）与 `hair_fringe_length`（刘海）。渲染时分别按 `0 / 200 / 400 / 600 / 800 / 1000` 映射为 `short / shoulder / chest / navel / thighs / feet`，`0` 是有效长度。额外背发仅使用主体长度。两个数值各自默认 200；缺失、类型不对或非有限数值时由构造与 NPCUtils 校验恢复默认值，不转换旧字段。修改任一长度不会改变另一项。

```javascript
Object.assign(C.npc['Ivory Wraith'], {
  hair_side_type: 'ruffled',
  hair_fringe_type: 'sideswept braid',
  hair_sides_length: 800,
  hair_fringe_length: 200
});
```

### 动态模型体液显示

NPC 侧边栏动态模型可以显示原版玩家模型使用的体液与滴落图层。框架会把状态存在 `V.maplebirch.npc[name].fluids`，不改动原版 `V.player.bodyliquid`。每个部位保存二元组 `[goo, semen]`：第 `0` 项为爱液／黏液，第 `1` 项为精液，不保存 `nectar`。

```javascript
maplebirch.npc.fluids.add('Robin', 'mouth', 2, 'semen');
maplebirch.npc.fluids.add('Robin', 'vagina', 1, 'goo');
maplebirch.npc.fluids.set('Robin', 'face', 3, 'semen');
maplebirch.npc.fluids.reduce('Robin', 'mouth', 1, 'semen');
maplebirch.npc.fluids.combined('Robin', 'mouth'); // goo + semen，未限制合计值
maplebirch.npc.fluids.clear('Robin', 'vagina', 'goo');
maplebirch.npc.fluids.clear('Robin', 'face');
maplebirch.npc.fluids.clear('Robin');
```

可用部位与原版身体液体槽一致：`vagina`、`vaginaoutside`、`anus`、`mouth`、`penis`、`chest`、`face`、`hair`、`bottom`、`feet`、`leftarm`、`rightarm`、`neck`、`thigh`、`tummy`。两种液体各自限制在 `0～5`；渲染时将合计限制在 `0～5`，转换为原版 `drip_*` 与 `cum_*` 参数，不改变保存值。`penis`、`hair`、`bottom`、`vaginaoutside` 没有对应的原版侧边栏体液图层，仅保存数据。

`set`、`add`、`reduce` 省略类型时默认操作 `semen`。`clear` 省略类型时清除两种液体，省略部位时清除所有部位；每小时两项各自衰减。旧存档的数字值无法还原来源，自动迁入 `[旧值, 0]`（`goo`），缺少部位自动补 `[0, 0]`。读取单类数值请使用数组下标，读取合计请用 `combined`，不能再把整个部位当作数字。

框架不自动判定高潮或液体来源，调用方负责按剧情更新等级。滴液遮罩会覆盖完整动画精灵图，保留原版滴落间隔；这些等级共用原版体液素材，不区分精液和爱液的外观。

**路径说明**:

- `[npc_name]`: NPC 名称(小写，如：luna, draven)
- `[image_name]`: 图片名称，将在游戏中作为显示选项

例如：

```
img/ui/nnpc/luna/default.png
img/ui/nnpc/luna/happy.png
img/ui/nnpc/luna/angry.png
```

当 `boot.json` 中注册了 `luna` 后，以上图片会自动作为侧边栏可选图片。

---

### 在 boot.json 中配置

#### 基本结构

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^需要的框架版本",
  "params": {
    "npc": {
      "Sidebar": {
        "image": ["luna", "draven"] // NPC名称，推荐小写，画师模型配置图片路径还是 ui/nnpc/<npcName>/
      }
    }
  }
}
```

#### 完整示例

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^需要的框架版本",
  "params": {
    "npc": {
      "Sidebar": {
        "image": ["Elara", "Merlin", "Draven"], // NPC名称，推荐小写，画师模型配置图片路径还是 ui/nnpc/<npcName>/
        "clothes": ["data/npc/elven_clothes.yaml", "data/npc/wizard_wardrobe.json"], // PC模型模式下NPC的服装数据，取自PC身上的衣着
        "config": ["data/npc/elara_sidebar.yaml", "data/npc/merlin_sidebar.json"] // 动态的画师模型配置
      }
    }
  }
}
```

#### 配置字段说明

| 字段      | 类型     | 说明                                   |
| :-------- | :------- | :------------------------------------- |
| `image`   | string[] | NPC 名称列表，系统自动加载其侧边栏图片 |
| `clothes` | string[] | 服装配置文件路径(YAML/JSON)            |
| `config`  | string[] | 侧边栏图层配置文件路径(YAML/JSON)      |

---

### 配置文件示例

#### 侧边栏图层配置 (YAML)

```yaml
# data/npc/elara_sidebar.yaml

- name: 'Elara' # NPC名称，需要与NPC系统中的ID一致

  body: 'img/npc/elara/body.png' # 基础身体图片，所有图层的基础

  # 头部图层
  head:
    # 头发图层
    - { img: 'img/npc/elara/hair.png', zIndex: auto } # auto 表示自动计算图层顺序

    # 耳朵图层
    - { img: 'img/npc/elara/ears.png', zIndex: 7 }

  # 面部图层
  face:
    # 默认表情
    - { img: 'img/npc/elara/face_default.png', zIndex: 10 }

    # 条件图层：当NPC心情为 shy 或 happy 时显示
    - { img: 'img/npc/elara/blush.png', zIndex: 12, cond: "C.npc.Elara.mood === 'shy' || C.npc.Elara.mood === 'happy'" }

  # 上半身服装
  upper:
    # 当NPC穿 elven_robe 时显示
    - { img: 'img/npc/elara/top_default.png', zIndex: 15, cond: "maplebirch.npc.Clothes.wardrobe.worn('Elara').upper.name === 'elven_robe'" }

  # 下半身服装
  lower:
    # 当NPC穿 elven_skirt 时显示
    - { img: 'img/npc/elara/skirt_default.png', zIndex: 10, cond: "maplebirch.npc.Clothes.wardrobe.worn('Elara').lower.name === 'elven_skirt'" }
```

**说明**：

- `body` 为基础层
- `head / face / upper / lower` 为逻辑图层组
- `zIndex` 控制图层叠放顺序
- `cond` 为条件表达式，返回 `true` 时图层才会渲染

---

#### 侧边栏图层配置 (JSON)

```json
[
  {
    "name": "Elara", // NPC名称
    "body": "img/npc/elara/body.png", // 基础身体

    "head": [
      { "img": "img/npc/elara/hair.png", "zIndex": "auto" },
      { "img": "img/npc/elara/ears.png", "zIndex": 7 }
    ],

    "face": [
      { "img": "img/npc/elara/face_default.png", "zIndex": 10 },
      {
        "img": "img/npc/elara/blush.png",
        "zIndex": 12,
        "cond": "C.npc.Elara.mood === 'shy' || C.npc.Elara.mood === 'happy'"
      }
    ],

    "upper": [
      {
        "img": "img/npc/elara/top_default.png",
        "zIndex": 15,
        "cond": "maplebirch.npc.Clothes.wardrobe.worn('Elara').upper.name === 'elven_robe'"
      }
    ],

    "lower": [
      {
        "img": "img/npc/elara/skirt_default.png",
        "zIndex": 10,
        "cond": "maplebirch.npc.Clothes.wardrobe.worn('Elara').lower.name === 'elven_skirt'"
      }
    ]
  }
]
```

---

#### 服装配置文件 (YAML)

下面示例基于游戏原始服装结构进行简化展示。  
由于完整配置较长，示例中会 **省略部分 slot 内部字段**（例如 `over_upper` 内的完整属性）。

```yaml
# 默认裸体配置（示例节选）
naked:
  over_upper:
    index: 0
    slot: over_upper
    name: naked
    name_cap: Naked
    cn_name_cap: 赤裸
    variable: naked
    reveal: 1000
    exposed: 2
    type:
      - naked
    description: 一丝不挂
    # ... 这里省略了完整的衣物参数定义

  over_lower:
    index: 0
    slot: over_lower
    name: naked
    reveal: 1000
    vagina_exposed: 1
    anus_exposed: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  upper:
    index: 0
    slot: upper
    name: naked
    reveal: 1000
    exposed: 2
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  lower:
    index: 0
    slot: lower
    name: naked
    reveal: 1000
    vagina_exposed: 1
    anus_exposed: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  under_upper:
    index: 0
    slot: under_upper
    name: naked
    exposed: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  under_lower:
    index: 0
    slot: under_lower
    name: naked
    exposed: 1
    vagina_exposed: 1
    anus_exposed: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  head:
    index: 0
    slot: head
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  face:
    index: 0
    slot: face
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  neck:
    index: 0
    slot: neck
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  hands:
    index: 0
    slot: hands
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  legs:
    index: 0
    slot: legs
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  feet:
    index: 0
    slot: feet
    name: naked
    reveal: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段

  genitals:
    index: 0
    slot: genitals
    name: naked
    reveal: 1
    vagina_exposed: 1
    anus_exposed: 1
    type:
      - naked
    description: 一丝不挂
    # ... 省略其余字段
```

---

#### 服装配置文件 (JSON)

下面示例为与上方 YAML 示例对应的 **JSON 格式服装配置**。  
由于完整服装定义较长，示例中 **省略了部分 slot 内部字段**（例如 `over_upper`、`upper` 等内部的完整属性）。

```json
{
  "naked": {
    "over_upper": {
      "index": 0,
      "slot": "over_upper",
      "name": "naked",
      "name_cap": "Naked",
      "cn_name_cap": "赤裸",
      "variable": "naked",
      "reveal": 1000,
      "exposed": 2,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 这里省略完整服装字段 */
    },

    "over_lower": {
      "index": 0,
      "slot": "over_lower",
      "name": "naked",
      "reveal": 1000,
      "vagina_exposed": 1,
      "anus_exposed": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "upper": {
      "index": 0,
      "slot": "upper",
      "name": "naked",
      "reveal": 1000,
      "exposed": 2,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "lower": {
      "index": 0,
      "slot": "lower",
      "name": "naked",
      "reveal": 1000,
      "vagina_exposed": 1,
      "anus_exposed": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "under_upper": {
      "index": 0,
      "slot": "under_upper",
      "name": "naked",
      "exposed": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "under_lower": {
      "index": 0,
      "slot": "under_lower",
      "name": "naked",
      "exposed": 1,
      "vagina_exposed": 1,
      "anus_exposed": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "head": {
      "index": 0,
      "slot": "head",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "face": {
      "index": 0,
      "slot": "face",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "neck": {
      "index": 0,
      "slot": "neck",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "hands": {
      "index": 0,
      "slot": "hands",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "legs": {
      "index": 0,
      "slot": "legs",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "feet": {
      "index": 0,
      "slot": "feet",
      "name": "naked",
      "reveal": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    },

    "genitals": {
      "index": 0,
      "slot": "genitals",
      "name": "naked",
      "reveal": 1,
      "vagina_exposed": 1,
      "anus_exposed": 1,
      "type": ["naked"],
      "description": "一丝不挂"
      /* ... 省略其余字段 */
    }
  }
}
```

---

### 示例1：完整的NPC侧边栏配置

```
fantasyMod/
├── img/
│   └── ui/
│       └── nnpc/
│           ├── elara/
│           │   ├── portrait.png
│           │   ├── casual.png
│           │   ├── formal.png
│           │   └── battle.png
│           └── draven/
│               ├── default.png
│               ├── armored.png
│               └── injured.png
├── data/
│   └── npc/
│       ├── elara_sidebar.yaml
│       ├── draven_sidebar.yaml
│       ├── elven_clothes.yaml
│       └── warrior_wardrobe.yaml
└── boot.json
```

### 剧情出现条件

侧边栏模型与设置候选列表都以原版 `V.npc` 为依据，仅保留已知命名 NPC。`<<npc "Name">>` 生成、事件结束清空名单后，模型按当前名单选择；服装日程只决定配装，不增加或移除在场人物。
