## 战斗按钮

### 基本介绍

战斗按钮系统允许模组制作者在战斗界面中添加自定义的战斗动作，包括攻击、防御、特殊技能、互动选项等。每个按钮可以有自己的显示条件、效果、颜色和难度提示。
_可通过 `maplebirch.combat.CombatAction.reg`或 `maplebirchFrameworks.addAction` 来注册战斗按钮。_

---

### 重要限制

#### actionType 限制

actionType 只能是以下预设值之一：
| 类型 | 说明 | 对应部位 |
| :--- | :--- | :--- |
| `leftaction` | 左手动作 | 左手 |
| `rightaction` | 右手动作 | 右手 |
| `feetaction` | 脚部动作 | 脚 |
| `mouthaction` | 嘴部动作 | 嘴 |
| `penisaction` | 阴茎动作 | 阴茎 |
| `vaginaaction` | 阴道动作 | 阴道 |
| `anusaction` | 肛门动作 | 肛门 |
| `chestaction` | 胸部动作 | 胸部 |
| `thighaction` | 大腿动作 | 大腿 |

#### combatType 限制

combatType 只能是以下预设值之一：
| 类型 | 说明 |
| :--- | :--- |
| `Default` | 默认战斗类型 |
| `Self` | 自我战斗(自慰等) |
| `Struggle` | 挣扎战斗 |
| `Swarm` | 群战 |
| `Vore` | 吞噬战斗 |
| `Machine` | 机械战斗 |
| `Tentacle` | 触手战斗 |

---

### 注册战斗按钮

#### 基本语法

```javascript
// 注册单个战斗按钮
maplebirch.combat.CombatAction.reg({
  id: 'custom_attack',
  actionType: 'leftaction', // 必须是预设的 actionType
  cond: ctx => {
    // 显示条件
    return V.player.health > 0 && V.player.hasWeapon;
  },
  display: ctx => {
    // 显示文本
    return V.player.weaponType === 'sword' ? '剑击' : '攻击';
  },
  value: ctx => {
    // 按钮对应的值
    return 'customAttack';
  },
  color: 'white', // 或函数返回颜色
  difficulty: '简单', // 或函数返回难度提示
  combatType: 'Default', // 必须是预设的 combatType
  order: 0 // 显示顺序
});

// 注册多个战斗按钮
maplebirch.combat.CombatAction.reg(
  {
    id: 'defensive_stance',
    actionType: 'rightaction',
    cond: ctx => V.player.stamina >= 20,
    display: '防御姿态',
    value: 'defensiveStance',
    color: 'blue',
    difficulty: '中等',
    combatType: 'Default'
  },
  {
    id: 'healing_potion',
    actionType: 'mouthaction',
    cond: ctx => V.player.inventory.healing_potion > 0,
    display: ctx => `治疗药水 (剩余: ${V.player.inventory.healing_potion})`,
    value: 'useHealingPotion',
    color: 'green',
    difficulty: '容易',
    combatType: 'Default'
  }
);
```

#### 按钮配置结构

```javascript
{
  id: string,                          // 唯一标识符
  actionType: string,                 // 必须是预设的 actionType
  cond: (ctx) => boolean,             // 显示条件函数
  display: string | (ctx) => string,  // 显示文本
  value: any,                         // 按钮对应的值
  color?: string | (ctx) => string,   // 颜色
  difficulty?: string | (ctx) => string, // 难度提示
  combatType?: string | (ctx) => string, // 必须是预设的 combatType
  order?: number | (ctx) => number    // 显示顺序
}
```

---

### 基本战斗按钮

```javascript
// 注册简单的攻击按钮(使用左手)
maplebirch.combat.CombatAction.reg({
  id: 'quick_strike',
  actionType: 'leftaction',
  cond: ctx => V.player.agility >= 10,
  display: '快速打击',
  value: 'quickStrike',
  color: 'yellow',
  difficulty: '较快但伤害较低',
  combatType: 'Default'
});

// 注册魔法攻击按钮(使用右手)
maplebirch.combat.CombatAction.reg({
  id: 'fire_ball',
  actionType: 'rightaction',
  cond: ctx => V.player.magic >= 30 && V.player.mana >= 20,
  display: ctx => {
    const manaCost = 20;
    return `火球术 (消耗 ${manaCost} 魔力)`;
  },
  value: 'fireBall',
  color: ctx => (V.player.mana >= 20 ? 'orange' : 'gray'),
  difficulty: '高伤害，消耗魔力',
  combatType: 'Default',
  order: 2
});
```

#### 条件复杂的按钮

```javascript
// 需要特定装备的按钮(使用脚)
maplebirch.combat.CombatAction.reg({
  id: 'kick_attack',
  actionType: 'feetaction',
  cond: ctx => {
    // 需要鞋子
    if (!V.player.equipment.shoes) return false;

    // 需要足够的体力
    if (V.player.stamina < 15) return false;

    // 不能在束缚状态
    if (V.player.status?.restrained) return false;

    return true;
  },
  display: '踢击',
  value: 'kickAttack',
  color: 'def',
  difficulty: '中等伤害，可能击倒敌人',
  combatType: 'Default',
  order: 1
});

// 需要特定关系的按钮(使用嘴)
maplebirch.combat.CombatAction.reg({
  id: 'lover_kiss',
  actionType: 'mouthaction',
  cond: ctx => {
    // 需要有恋人在场
    const loverPresent = V.NPCList.some(npc => npc.relationship === 'lover' && npc.health > 0);

    // 需要好感度足够
    const hasEnoughLove = C.npc.Robin?.love >= 50 || C.npc.Kylar?.love >= 50;

    return loverPresent && hasEnoughLove;
  },
  display: '恋人亲吻',
  value: 'loverKiss',
  color: 'pink',
  difficulty: '恢复生命，提升士气',
  combatType: 'Default'
});
```

#### 动态显示按钮

```javascript
// 根据时间变化的按钮(使用胸部)
maplebirch.combat.CombatAction.reg({
  id: 'moonlight_heal',
  actionType: 'chestaction',
  cond: ctx => {
    // 只在夜晚有效
    const hour = Time.hour;
    return hour >= 18 || hour <= 6;
  },
  display: ctx => {
    const hour = Time.hour;
    const power = hour >= 0 && hour <= 3 ? 3 : 1.5;
    return `月光治疗 (${power}x 效果)`;
  },
  value: 'moonlightHeal',
  color: 'silver',
  difficulty: '夜晚治疗效果加倍',
  combatType: 'Default',
  order: 3
});

// 根据天气变化的按钮(使用大腿)
maplebirch.combat.CombatAction.reg({
  id: 'thunder_squeeze',
  actionType: 'thighaction',
  cond: ctx => Weather.name === 'storm',
  display: '雷电夹击',
  value: 'thunderSqueeze',
  color: 'purple',
  difficulty: '暴风雨天气可用，高伤害',
  combatType: 'Default'
});
```

#### 特殊战斗类型按钮

```javascript
// 只在自我战斗中显示的按钮
maplebirch.combat.CombatAction.reg({
  id: 'self_care',
  actionType: 'leftaction',
  cond: ctx => V.player.health < 50,
  display: '自我护理',
  value: 'selfCare',
  color: 'green',
  difficulty: '缓慢恢复生命',
  combatType: 'Self' // 只在自我战斗中显示
});

// 只在挣扎战斗中显示的按钮
maplebirch.combat.CombatAction.reg({
  id: 'break_free',
  actionType: 'struggle_action',
  cond: ctx => V.player.strength >= 20,
  display: '挣脱束缚',
  value: 'breakFree',
  color: 'red',
  difficulty: '尝试挣脱束缚',
  combatType: 'Struggle' // 只在挣扎战斗中显示
});

// 只在触手战斗中显示的按钮
maplebirch.combat.CombatAction.reg({
  id: 'tentacle_resist',
  actionType: 'rightaction',
  cond: ctx => V.player.willpower >= 30,
  display: '抵抗触手',
  value: 'tentacleResist',
  color: 'blue',
  difficulty: '抵抗触手的侵蚀',
  combatType: 'Tentacle' // 只在触手战斗中显示
});
```

---

### 颜色系统

#### 内置颜色

- `white`: 白色
- `red`: 红色
- `green`: 绿色
- `blue`: 蓝色
- `yellow`: 黄色
- `orange`: 橙色
- `purple`: 紫色
- `pink`: 粉色
- `gray`: 灰色
- `silver`: 银色
- `gold`: 金色
- `def`: 防御色
- `meek`: 温和色
- `sub`: 服从色
- `brat`: 顽皮色

#### 动态颜色

```javascript
// 根据状态动态改变颜色(使用肛门)
maplebirch.combat.CombatAction.reg({
  id: 'desperate_escape',
  actionType: 'anusaction',
  cond: ctx => V.player.health <= 30,
  display: '绝望逃脱',
  value: 'desperateEscape',
  color: ctx => {
    if (V.player.health <= 10) return 'red';
    if (V.player.health <= 20) return 'orange';
    return 'yellow';
  },
  difficulty: '生命值越低成功率越高',
  combatType: 'Default',
  order: 0
});
```

---

### 难度提示

#### 静态提示

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'precise_shot',
  actionType: 'rightaction',
  cond: ctx => V.player.accuracy >= 15,
  display: '精准射击',
  value: 'preciseShot',
  color: 'green',
  difficulty: '高命中，中等伤害',
  combatType: 'Default'
});
```

#### 动态提示

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'calculated_risk',
  actionType: 'leftaction',
  cond: ctx => V.player.intelligence >= 20,
  display: '计算风险',
  value: 'calculatedRisk',
  color: 'blue',
  difficulty: ctx => {
    const successRate = Math.min(90, V.player.intelligence * 3);
    return `成功率: ${successRate}%，高回报`;
  },
  combatType: 'Default'
});
```

---

### 完整示例

#### 示例1：魔法师战斗按钮

```javascript
// 注册魔法师专用按钮
maplebirch.tool.onInit(() => {
  // 火球术(右手)
  maplebirch.combat.CombatAction.reg({
    id: 'fireball',
    actionType: 'rightaction',
    cond: ctx => V.player.class === 'mage' && V.player.mana >= 25,
    display: ctx => `火球术 (消耗 25 魔力)`,
    value: 'fireball',
    color: ctx => (V.player.mana >= 25 ? 'orange' : 'gray'),
    difficulty: '对单个敌人造成高额火焰伤害',
    combatType: 'Default',
    order: 1
  });

  // 冰霜新星(左手)
  maplebirch.combat.CombatAction.reg({
    id: 'frost_nova',
    actionType: 'leftaction',
    cond: ctx => V.player.class === 'mage' && V.player.mana >= 40,
    display: ctx => `冰霜新星 (消耗 40 魔力)`,
    value: 'frostNova',
    color: ctx => (V.player.mana >= 40 ? 'lightblue' : 'gray'),
    difficulty: '冻结所有敌人一回合',
    combatType: 'Default',
    order: 2
  });

  // 魔法护盾(胸部)
  maplebirch.combat.CombatAction.reg({
    id: 'magic_shield',
    actionType: 'chestaction',
    cond: ctx => V.player.class === 'mage' && V.player.mana >= 20,
    display: ctx => `魔法护盾 (消耗 20 魔力)`,
    value: 'magicShield',
    color: ctx => (V.player.mana >= 20 ? 'blue' : 'gray'),
    difficulty: '吸收下三次攻击的伤害',
    combatType: 'Default',
    order: 0
  });

  // 魔力汲取(嘴)
  maplebirch.combat.CombatAction.reg({
    id: 'mana_siphon',
    actionType: 'mouthaction',
    cond: ctx => V.player.class === 'mage' && V.player.mana <= 50,
    display: '魔力汲取',
    value: 'manaSiphon',
    color: 'purple',
    difficulty: '从敌人身上汲取魔力',
    combatType: 'Default',
    order: 3
  });
});
```

#### 示例2：特殊战斗类型按钮

```javascript
// 注册特殊战斗类型的按钮
maplebirch.combat.CombatAction.reg(
  // 自我战斗专用按钮
  {
    id: 'self_stimulation',
    actionType: 'penisaction',
    cond: ctx => V.player.gender === 'm',
    display: '自我刺激',
    value: 'selfStimulation',
    color: 'pink',
    difficulty: '获得快感，但会分心',
    combatType: 'Self',
    order: 0
  },
  {
    id: 'self_reflection',
    actionType: 'mouthaction',
    cond: ctx => V.player.willpower >= 20,
    display: '自我反思',
    value: 'selfReflection',
    color: 'blue',
    difficulty: '恢复理智，降低快感',
    combatType: 'Self',
    order: 1
  },

  // 挣扎战斗专用按钮
  {
    id: 'struggle_arms',
    actionType: 'leftaction',
    cond: ctx => V.player.strength >= 15,
    display: '手臂挣扎',
    value: 'struggleArms',
    color: 'red',
    difficulty: '尝试挣脱手臂束缚',
    combatType: 'Struggle',
    order: 0
  },
  {
    id: 'struggle_legs',
    actionType: 'feetaction',
    cond: ctx => V.player.agility >= 15,
    display: '腿部挣扎',
    value: 'struggleLegs',
    color: 'green',
    difficulty: '尝试挣脱腿部束缚',
    combatType: 'Struggle',
    order: 1
  },

  // 触手战斗专用按钮
  {
    id: 'resist_tentacle',
    actionType: 'rightaction',
    cond: ctx => V.player.willpower >= 25,
    display: '抵抗触手',
    value: 'resistTentacle',
    color: 'purple',
    difficulty: '抵抗触手侵蚀',
    combatType: 'Tentacle',
    order: 0
  },
  {
    id: 'tentacle_embrace',
    actionType: 'thighaction',
    cond: ctx => V.player.corruption >= 30,
    display: '接受触手',
    value: 'tentacleEmbrace',
    color: 'pink',
    difficulty: '获得快感，但会被进一步侵蚀',
    combatType: 'Tentacle',
    order: 1
  }
);
```
