## NPC状态

### 基本介绍

NPC 状态系统允许模组制作者为 NPC 添加自定义的数值属性，例如好感度、信任度、压力值、特殊能力等级等。这些状态会显示在 NPC 的侧边栏中，并可通过游戏逻辑进行修改。
_可通过 `maplebirch.npc.addStats` 或 `maplebirchFrameworks.addNPCStats` 来进行状态的注册。_

---

### 基本语法

```javascript
// 添加单个状态
maplebirch.npc.addStats({
  magic_affinity: {
    min: 0,
    max: 100,
    default: 0,
    position: 3
  }
});

// 添加多个状态
maplebirch.npc.addStats({
  strength: { min: 1, max: 20, default: 1 },
  intelligence: { min: 1, max: 20, default: 1 },
  charisma: { min: 1, max: 20, default: 1 }
});
```

#### 状态配置结构

```javascript
{
  [statName]: {
    min: number,           // 最小值
    max: number,           // 最大值
    default: number,       // 默认值
    position?: number | 'first' | 'last',  // 显示位置
    [key: string]: any     // 其他自定义属性
  }
}
```

#### 状态属性说明

| 属性       | 类型                  | 说明                 | 必需 |
| :--------- | :-------------------- | :------------------- | :--- |
| `min`      | number                | 状态的最小值         | 是   |
| `max`      | number                | 状态的最大值         | 是   |
| `default`  | number                | 状态的默认初始值     | 是   |
| `position` | number/'first'/'last' | 在总状态中的索引位置 | 否   |

#### 位置参数说明

- `number`: 具体的插入位置索引(0 = 最前面)
- `'first'`: 插入到第一个位置
- `'last'`: 插入到最后一个位置

---

### 基本状态定义

```javascript
// 添加好感度状态
maplebirch.npc.addStats({
  favor: {
    min: 0,
    max: 100,
    default: 0,
    position: 1
  }
});

// 添加多个状态
maplebirch.npc.addStats({
  trust: {
    min: 0,
    max: 50,
    default: 0,
    position: 2
  },
  corruption: {
    min: 0,
    max: 100,
    default: 0,
    position: 3
  }
});
```

### 在 boot.json 中配置

#### 配置结构

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "npc": {
      "Stats": {
        "stat_name_1": {
          /* 状态配置 */
        },
        "stat_name_2": {
          /* 状态配置 */
        }
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
      "Stats": {
        "magic_affinity": {
          "min": 0,
          "max": 100,
          "default": 0,
          "position": 5
        },
        "combat_skill": {
          "min": 0,
          "max": 20,
          "default": 1,
          "position": 6
        },
        "loyalty": {
          "min": 0,
          "max": 100,
          "default": 10,
          "position": 7,
          "hiddenEffect": "increases_damage"
        }
      }
    }
  }
}
```

---

### 与NPC数据的集成

#### 状态与NPC创建

```javascript
// 创建NPC时定义状态

// 先添加状态定义
maplebirch.npc.addStats({
  arcane_knowledge: {
    min: 0,
    max: 100,
    default: 25,
    position: 4
  },
  spell_resistance: {
    min: 0,
    max: 50,
    default: 10,
    position: 5
  }
});

// 再创建使用这些状态的NPC
maplebirch.npc.add(
  {
    nam: 'Merlin',
    gender: 'm',
    title: '大法师',
    description: '古老的魔法师，掌握着禁忌的知识',
    age: 300
  },
  {
    love: { maxValue: 200 }
  }
);

// 设置NPC的初始状态值
const merlinIndex = setup.NPCNameList.indexOf('Merlin');
V.NPCName[merlinIndex].arcane_knowledge = 85;
V.NPCName[merlinIndex].spell_resistance = 40;
```
