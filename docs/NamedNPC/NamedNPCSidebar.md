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
  "modVersion": "^3.1.0",
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
  "modVersion": "^3.1.0",
  "params": {
    "npc": {
      "Sidebar": {
        "image": ["Elara", "Merlin", "Draven"],  // 静态侧边栏NPC，读取 img/ui/nnpc/<npcName>/ 目录中的图片

        "clothes": [
          "data/npc/elven_clothes.yaml",
          "data/npc/wizard_wardrobe.json"
        ], // 动态模型模式使用的NPC服装配置

        "config": [
          "data/npc/elara_sidebar.yaml",
          "data/npc/merlin_sidebar.json"
        ] // 动态模型图层配置
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
    - {
        img: 'img/npc/elara/blush.png',
        zIndex: 12,
        cond: "C.npc.Elara.mood === 'shy' || C.npc.Elara.mood === 'happy'"
      }

  # 上半身服装
  upper:

    # 当NPC穿 elven_robe 时显示
    - {
        img: 'img/npc/elara/top_default.png',
        zIndex: 15,
        cond: "maplebirch.npc.Clothes.worn('Elara').upper.name === 'elven_robe'"
      }

  # 下半身服装
  lower:

    # 当NPC穿 elven_skirt 时显示
    - {
        img: 'img/npc/elara/skirt_default.png',
        zIndex: 10,
        cond: "maplebirch.npc.Clothes.worn('Elara').lower.name === 'elven_skirt'"
      }
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
        "cond": "maplebirch.npc.Clothes.worn('Elara').upper.name === 'elven_robe'"
      }
    ],

    "lower": [
      {
        "img": "img/npc/elara/skirt_default.png",
        "zIndex": 10,
        "cond": "maplebirch.npc.Clothes.worn('Elara').lower.name === 'elven_skirt'"
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
