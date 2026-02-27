## 特质注册 (Traits)

### 基本介绍

`Traits` 是框架提供的角色特质管理系统，允许模组制作者添加自定义的角色特质。

_可通过 `maplebirch.tool.other.addTraits()` 或快捷接口 `maplebirchFrameworks.addTraits()` 访问。_

---

### 核心功能

#### **添加特质 (addTraits)**

- 添加一个或多个自定义特质
- **@param**: `...traits` (TraitConfig[]): 特质配置对象数组
- **@return**: void
- **@example**:
  ```javascript
  // 添加一个简单特质
  maplebirch.tool.other.addTraits({
    title: 'General Traits',
    name: 'brave',
    colour: 'green',
    has: () => V.courage > 50,
    text: '勇敢的战士，无所畏惧'
  });
  ```

---

### 特质配置对象 (TraitConfig)

| 属性     | 类型             | 说明                                           |
| :------- | :--------------- | :--------------------------------------------- |
| `title`  | string           | 特质分类标题                                   |
| `name`   | string/function  | 特质名称，可以是字符串或返回字符串的函数       |
| `colour` | string/function  | 特质颜色，可以是字符串或返回字符串的函数       |
| `has`    | boolean/function | 是否拥有该特质，可以是布尔值或返回布尔值的函数 |
| `text`   | string/function  | 特质描述文本，可以是字符串或返回字符串的函数   |

#### **内置分类表**

框架会自动将英文分类名翻译为中文：

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

**注意**: 如果使用未在表中定义的分类名，会直接使用原分类名。

---

### 在 boot.json 中注册特质

除了通过 JavaScript API 注册特质外，框架还支持在 `boot.json` 文件中通过 `addonPlugin` 配置来批量注册特质。

#### **配置结构**

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^2.7.0",
  "params": {
    "framework": [
      {
        "traits": [
          {
            "title": "General Traits",
            "name": "heroic",
            "colour": "orange",
            "has": true,
            "text": "英雄气概，领导力强"
          },
          {
            "title": "Special Traits",
            "name": "arcane_affinity",
            "colour": "purple",
            "has": false,
            "text": "对魔法有特殊亲和力"
          }
        ]
      }
    ]
  }
}
```

#### **动态值的配置**

在 boot.json 中，`has`、`colour`、`text` 等属性可以是字符串形式的 JavaScript 表达式，会在运行时求值：

```json
{
  "traits": [
    {
      "title": "General Traits",
      "name": "wealthy",
      "colour": "yellow",
      "has": "V.gold > 10000",
      "text": "function() { return '财富: ' + V.gold + ' 金币'; }"
    }
  ]
}
```

**注意**: 字符串表达式会在游戏上下文中求值，可以访问 `V`、`Time`、`Weather` 等全局对象。

---

### 完整使用示例

#### **示例1：静态特质**

```javascript
// 添加静态特质(始终显示)
maplebirch.tool.other.addTraits({
  title: 'General Traits',
  name: 'quick_learner',
  colour: 'blue',
  has: true, // 始终拥有
  text: '快速学习者，技能获取速度+20%'
});
```

#### **示例2：动态特质**

```javascript
// 添加动态特质(根据游戏状态变化)
maplebirch.tool.other.addTraits({
  title: 'Medicinal Traits',
  name: 'poison_resistance',
  colour: () => {
    // 根据抗性等级显示不同颜色
    const level = V.poisonResistance || 0;
    if (level >= 80) return 'green';
    if (level >= 50) return 'yellow';
    return 'red';
  },
  has: () => {
    // 只有抗性大于0时才显示
    return (V.poisonResistance || 0) > 0;
  },
  text: () => {
    // 动态描述文本
    const level = V.poisonResistance || 0;
    return `毒抗 ${level}% - ${getResistanceDescription(level)}`;
  }
});
```

#### **示例3：条件特质**

```javascript
// 只在特定条件下显示的特质
maplebirch.tool.other.addTraits({
  title: 'Special Traits',
  name: 'moon_caller',
  colour: 'purple',
  has: () => {
    // 只有在满月之夜且是法师职业时才显示
    return Weather.moonPhase === 'full' && V.playerClass === 'mage' && V.hasMoonRitual === true;
  },
  text: '满月呼唤者，在满月之夜魔力增强'
});
```

#### **示例4：在 boot.json 中批量注册特质**

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^2.7.0",
  "params": {
    "framework": [
      {
        "traits": [
          {
            "title": "General Traits",
            "name": "strong",
            "colour": "brown",
            "has": "V.strength > 70",
            "text": "力量过人，物理攻击+15%"
          },
          {
            "title": "General Traits",
            "name": "agile",
            "colour": "teal",
            "has": "V.dexterity > 70",
            "text": "身手敏捷，闪避率+10%"
          },
          {
            "title": "School Traits",
            "name": "honor_student",
            "colour": "yellow",
            "has": "V.grades >= 90",
            "text": "优等生，学校声誉+20"
          },
          {
            "title": "Trauma Traits",
            "name": "battle_scarred",
            "colour": "grey",
            "has": "V.battlesWon > 10",
            "text": "身经百战，战斗经验丰富"
          }
        ]
      }
    ]
  }
}
```
