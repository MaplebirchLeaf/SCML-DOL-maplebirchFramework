## 战斗按钮

### 基本介绍

战斗按钮系统允许模组制作者在战斗界面中添加自定义的战斗动作，包括攻击、防御、特殊技能、互动选项等。每个按钮可以有自己的显示条件、效果、颜色和难度提示。  
_可通过 `maplebirch.combat.CombatAction.reg` 或 `maplebirchFrameworks.addAction` 来注册战斗按钮。_

---

### 重要限制

#### actionType 限制

actionType 只能是以下预设值之一：

| 类型           | 说明     | 对应部位 |
| :------------- | :------- | :------- |
| `leftaction`   | 左手动作 | 左手     |
| `rightaction`  | 右手动作 | 左手     |
| `feetaction`   | 脚部动作 | 脚       |
| `mouthaction`  | 嘴部动作 | 嘴       |
| `penisaction`  | 阴茎动作 | 阴茎     |
| `vaginaaction` | 阴道动作 | 阴道     |
| `anusaction`   | 肛门动作 | 肛门     |
| `chestaction`  | 胸部动作 | 胸部     |
| `thighaction`  | 大腿动作 | 大腿     |

#### combatType 限制

combatType 只能是以下预设值之一：

| 类型       | 说明             |
| :--------- | :--------------- |
| `Default`  | 默认战斗类型     |
| `Self`     | 自我战斗(自慰等) |
| `Struggle` | 挣扎战斗         |
| `Swarm`    | 群战             |
| `Vore`     | 吞噬战斗         |
| `Machine`  | 机械战斗         |
| `Tentacle` | 触手战斗         |

---

### 注册战斗按钮

#### 基本语法

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'custom_attack',
  actionType: 'leftaction', // 或 ['leftaction','rightaction']
  cond: ctx => V.player.health > 0 && V.player.hasWeapon,
  display: ctx => (V.player.weaponType === 'sword' ? '剑击' : '攻击'),
  value: ctx => 'customAttack',
  color: 'white',
  difficulty: '简单',
  combatType: 'Default',
  order: 0
});

// 注册多个按钮
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
  id: string,
  actionType: string | string[],
  cond: (ctx) => boolean,
  display: string | (ctx) => string,
  value: any,
  color?: string | (ctx) => string,
  difficulty?: string | (ctx) => string,
  combatType?: string | (ctx) => string,
  order?: number | (ctx) => number
}
```

- 基本战斗按钮

```javascript
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

maplebirch.combat.CombatAction.reg({
  id: 'fire_ball',
  actionType: 'rightaction',
  cond: ctx => V.player.magic >= 30 && V.player.mana >= 20,
  display: ctx => `火球术 (消耗 20 魔力)`,
  value: 'fireBall',
  color: ctx => (V.player.mana >= 20 ? 'orange' : 'gray'),
  difficulty: '高伤害，消耗魔力',
  combatType: 'Default',
  order: 2
});
```

- 条件复杂的按钮

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'kick_attack',
  actionType: 'feetaction',
  cond: ctx => V.player.equipment.shoes && V.player.stamina >= 15 && !V.player.status?.restrained,
  display: '踢击',
  value: 'kickAttack',
  color: 'def',
  difficulty: '中等伤害，可能击倒敌人',
  combatType: 'Default',
  order: 1
});

maplebirch.combat.CombatAction.reg({
  id: 'lover_kiss',
  actionType: 'mouthaction',
  cond: ctx => V.NPCList.some(npc => npc.relationship === 'lover' && npc.health > 0) && (C.npc.Robin?.love >= 50 || C.npc.Kylar?.love >= 50),
  display: '恋人亲吻',
  value: 'loverKiss',
  color: 'pink',
  difficulty: '恢复生命，提升士气',
  combatType: 'Default'
});
```

- 动态显示按钮

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'moonlight_heal',
  actionType: 'chestaction',
  cond: ctx => {
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

- 特殊战斗类型按钮

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'self_care',
  actionType: 'leftaction',
  cond: ctx => V.player.health < 50,
  display: '自我护理',
  value: 'selfCare',
  color: 'green',
  difficulty: '缓慢恢复生命',
  combatType: 'Self'
});

maplebirch.combat.CombatAction.reg({
  id: 'break_free',
  actionType: 'struggle_action',
  cond: ctx => V.player.strength >= 20,
  display: '挣脱束缚',
  value: 'breakFree',
  color: 'red',
  difficulty: '尝试挣脱束缚',
  combatType: 'Struggle'
});

maplebirch.combat.CombatAction.reg({
  id: 'tentacle_resist',
  actionType: 'rightaction',
  cond: ctx => V.player.willpower >= 30,
  display: '抵抗触手',
  value: 'tentacleResist',
  color: 'blue',
  difficulty: '抵抗触手的侵蚀',
  combatType: 'Tentacle'
});
```

#### 颜色系统

- 内置颜色：`white`, `red`, `green`, `blue`, `yellow`, `orange`, `purple`, `pink`, `gray`, `silver`, `gold`, `def`, `meek`, `sub`, `brat`
- 动态颜色示例

```javascript
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

#### 难度提示

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
