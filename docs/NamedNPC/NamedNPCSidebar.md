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
        "image": ["Elara", "Merlin", "Draven"],  // NPC名称，推荐小写，画师模型配置图片路径还是 ui/nnpc/<npcName>/
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
- name: 'Elara' # NPC名称
  body: 'img/npc/elara/body.png' # 基础身体图片

  # 头部图层
  head:
    - { img: 'img/npc/elara/hair.png', zIndex: 5 }
    - { img: 'img/npc/elara/ears.png', zIndex: 7 }

  # 面部图层
  face:
    - { img: 'img/npc/elara/face_default.png', zIndex: 10 }
    - { img: 'img/npc/elara/blush.png', zIndex: 12, cond: "C.npc.Elara.mood === 'shy' || C.npc.Elara.mood === 'happy'" }

  # 上半身服装
  upper:
    - { img: 'img/npc/elara/top_default.png', zIndex: 15, cond: "maplebirch.npc.Clothes.worn('Elara').upper.name === 'elven_robe'" }

  # 下半身服装
  lower:
    - { img: 'img/npc/elara/skirt_default.png', zIndex: 10, cond: "maplebirch.npc.Clothes.worn('Elara').lower.name === 'elven_skirt'" }
```

#### 服装配置文件 (YAML)

```yaml
# data/npc/elven_clothes.yaml
# 服装套装定义
elven_robes:
  upper: { name: 'elven_robe', colour: 'silver' }
  lower: { name: 'elven_skirt', colour: 'forest_green' }
  head: { name: 'silver_tiara' }

hunting_gear:
  upper: { name: 'leather_vest', colour: 'brown' }
  lower: { name: 'riding_pants', colour: 'dark_brown' }
  head: { name: 'leather_hood' }

# NPC服装注册
Elara:
  forest: 'elven_robes'
  hunting_grounds:
    key: 'hunting_gear'
    cond: 'V.time.hour >= 6 && V.time.hour <= 18'
  '*': 'elven_robes' # 默认服装
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
