## NPC注册

### 基本介绍

NPC 系统允许模组制作者在游戏中添加自定义的非玩家角色(NPC)。通过此系统，您可以定义角色的外貌、性格、关系状态、日程安排和特殊能力。
_可通过 `maplebirch.npc.add` 或 `maplebirchFrameworks.addNPC` 来进行模组NPC的注册。_

---

### 基本语法

```javascript
maplebirch.npc.add(
  npcData, // NPC基础数据
  npcConfig, // NPC配置
  translations // 翻译数据
);
```

### NPC基础数据 (NPCData)

| 属性               | 类型                   | 说明                    | 默认值    |
| :----------------- | :--------------------- | :---------------------- | :-------- |
| `nam`              | string                 | **必需**，NPC的唯一名称 | -         |
| `gender`           | 'm'/'f'/'h'/'n'/'none' | 性别                    | 随机      |
| `title`            | string                 | 称呼/头衔               | 'none'    |
| `description`      | string                 | 描述文本                | NPC名称   |
| `type`             | string                 | NPC类型                 | 'human'   |
| `adult`            | number                 | 是否为成人 (1/0)        | 随机      |
| `teen`             | number                 | 是否为青少年 (1/0)      | 随机      |
| `age`              | number                 | 年龄                    | 0         |
| `insecurity`       | string                 | 不安全感类型            | 随机      |
| `chastity`         | object                 | 贞操带状态              | {}        |
| `virginity`        | object                 | 处女状态                | 完整      |
| `hair_side_type`   | string                 | 侧发类型                | 'default' |
| `hair_fringe_type` | string                 | 前发类型                | 'default' |
| `hair_position`    | string                 | 头发位置                | 'back'    |
| `hairlength`       | number                 | 头发长度                | 随机      |
| `eyeColour`        | string                 | 眼睛颜色                | 随机      |
| `hairColour`       | string                 | 头发颜色                | 随机      |
| `bottomsize`       | number                 | 臀部大小                | 随机      |
| `skincolour`       | number                 | 肤色                    | 0         |
| `init`             | number                 | 初始化状态              | 0         |
| `intro`            | number                 | 介绍状态                | 0         |
| `penis`            | string                 | 阴茎状态                | 根据性别  |
| `penissize`        | number                 | 阴茎大小                | 根据性别  |
| `vagina`           | string                 | 阴道状态                | 根据性别  |
| `breastsize`       | number                 | 胸部大小                | 根据性别  |
| `ballssize`        | number                 | 睾丸大小                | 根据性别  |
| `outfits`          | string[]               | 服装列表                | 默认服装  |
| `pregnancy`        | any                    | 怀孕状态                | null      |

#### 性别说明

- `'m'`: 男性
- `'f'`: 女性
- `'h'`: 人妖/双性
- `'n'`: 中性
- `'none'`: 无性别

#### 随机权重

- 男性: 47%
- 女性: 47%
- 人妖: 5%
- 中性: 1%

#### 不安全感类型

- `'weak'` : 虚弱/无力
- `'looks'`: 外貌/外表
- `'ethics'`: 道德/伦理
- `'skill'`: 技能/能力

#### 眼睛颜色

- 紫色、深蓝、浅蓝、琥珀色、榛色、绿色、红色、粉色、灰色、浅灰、青柠绿

#### 头发颜色

- 红色、黑色、棕色、浅棕色、金色、铂金色、草莓金、姜黄色

---

### 基本NPC创建

```javascript
// 创建简单的NPC
maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    title: '月光女巫',
    description: '居住在森林深处的神秘女巫',
    age: 25,
    hairColour: 'platinumblond',
    eyeColour: 'purple',
    breastsize: 3,
    outfits: ['witch_robes', 'casual_dress']
  },
  {
    love: { maxValue: 100 },
    important: true,
    loveInterest: true
  }
);
```

#### 复杂NPC定义

```javascript
// 创建复杂的NPC
maplebirch.npc.add(
  {
    nam: 'Draven',
    gender: 'm',
    title: '佣兵队长',
    description: '经验丰富的佣兵，右眼有一道明显的伤疤',
    adult: 1,
    insecurity: 'skill',
    chastity: { penis: 'chastity_belt', vagina: '', anus: '' },
    virginity: { penile: false, vaginal: true, anal: false },
    hair_side_type: 'short',
    hair_fringe_type: 'messy',
    hairlength: 300,
    eyeColour: 'light grey',
    hairColour: 'black',
    penissize: 4,
    breastsize: 0,
    ballssize: 3,
    outfits: ['mercenary_armor', 'casual_clothes', 'formal_wear']
  },
  {
    love: { maxValue: 150 },
    important: true,
    special: true,
    romance: [() => V.completedDravenQuest, () => V.dravenTrust >= 50],
    loveAlias: ['忠诚', 'Loyalty']
  }
);
```

#### 翻译数据

```javascript
// 添加带翻译的NPC
const translations = new Map();
translations.set('Luna', { EN: 'Luna', CN: '露娜' });
translations.set('月光女巫', { EN: 'Moonlight Witch', CN: '月光女巫' });

maplebirch.npc.add(
  {
    nam: 'Luna',
    description: '居住在森林深处的神秘女巫'
  },
  {
    love: { maxValue: 100 }
  },
  translations
);
```

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
      "NamedNPC": [
        [
          {
            /* npcData */
          },
          {
            /* npcConfig */
          },
          {
            /* translations */
          }
        ]
      ]
    }
  }
}
```

### 完整示例

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "npc": {
      "NamedNPC": [
        [
          {
            "nam": "Elara",
            "gender": "f",
            "title": "精灵弓箭手",
            "description": "森林的守护者，箭术高超",
            "age": 120,
            "eyeColour": "green",
            "hairColour": "lightbrown",
            "breastsize": 2,
            "outfits": ["elven_armor", "hunting_gear"]
          },
          {
            "love": { "maxValue": 120 },
            "important": true,
            "loveInterest": false
          },
          {
            "Elara": { "EN": "Elara", "CN": "伊拉娜" },
            "精灵弓箭手": { "EN": "Elven Archer", "CN": "精灵弓箭手" }
          }
        ],
        [
          {
            "nam": "Kael",
            "gender": "m",
            "title": "矮人铁匠",
            "description": "脾气暴躁但手艺精湛的矮人铁匠",
            "adult": 1,
            "hairColour": "ginger",
            "penissize": 2,
            "ballssize": 3
          },
          {
            "love": { "maxValue": 80 },
            "special": true
          }
        ]
      ],
      "Stats": {
        "magic_affinity": {
          "min": 0,
          "max": 100,
          "default": 0,
          "position": 5
        }
      }
    }
  }
}
```

---

## NPC配置 (NPCConfig)

### 配置选项

| 属性            | 类型                         | 说明              |
| :-------------- | :--------------------------- | :---------------- |
| `love`          | object                       | 好感度配置        |
| `love.maxValue` | number                       | 最大好感度值      |
| `loveAlias`     | [string, string] 或 function | 好感度别名(中/英) |
| `important`     | boolean 或 function          | 是否为重要NPC     |
| `special`       | boolean 或 function          | 是否为特殊NPC     |
| `loveInterest`  | boolean 或 function          | 是否为可恋爱对象  |
| `romance`       | Function[]                   | 恋爱条件函数数组  |

### 示例配置

```javascript
{
  // 好感度配置
  love: { maxValue: 100 },

  // 好感度别名(静态)
  loveAlias: ['好感', 'Affection'],

  // 好感度别名(动态)
  loveAlias: () => {
    const trustLevel = V.playerTrust || 0;
    return trustLevel > 50 ? ['信赖', 'Trust'] : ['好感', 'Affection'];
  },

  // 重要NPC
  important: true,

  // 动态重要NPC
  important: () => {
    return V.hasCompletedMainQuest || false;
  },

  // 特殊NPC
  special: false,

  // 可恋爱对象
  loveInterest: true,

  // 恋爱条件
  romance: [
    () => V.npcMet >= 5,
    () => V.npcTrust >= 30,
    () => !V.npcBetrayed
  ]
}
```
