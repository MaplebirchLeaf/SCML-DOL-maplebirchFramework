## 战斗按钮

### 用途

战斗按钮用于向原版战斗界面的动作列表中追加模组动作。适合添加新的攻击、防御、挣扎、特殊互动或模组技能。

战斗按钮只负责把动作显示到战斗界面，并把选中的 `value` 写入对应的动作变量。动作被选择后产生什么效果，仍需要模组在自己的战斗逻辑中处理。

---

### 入口

```javascript
maplebirch.combat.CombatAction.reg(config);
```

可一次注册多个：

```javascript
maplebirch.combat.CombatAction.reg(configA, configB, configC);
```

---

### 最小示例

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.quickStrike',
  actionType: 'leftaction',
  cond: () => V.stamina >= 20,
  display: () => '快速打击',
  value: () => 'myModQuickStrike'
});
```

这会在 `leftaction` 动作列表中追加一个显示为 `快速打击` 的选项，选中后对应值为 `myModQuickStrike`。

---

### 配置结构

```javascript
{
  id: string,
  actionType: string | string[],
  cond: (ctx) => boolean,
  display: (ctx) => string,
  value: (ctx) => any,
  color?: string | (ctx) => string,
  difficulty?: string | (ctx) => string,
  combatType?: string | (ctx) => string,
  order?: number | (ctx) => number
}
```

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | 是 | 动作唯一标识，建议带模组名前缀 |
| `actionType` | 是 | 要追加到哪个动作列表 |
| `cond` | 是 | 是否显示该动作 |
| `display` | 是 | 按钮显示文本 |
| `value` | 是 | 选中后写入动作变量的值 |
| `color` | 否 | 动作颜色，默认 `white` |
| `difficulty` | 否 | 难度/提示文本，默认空字符串 |
| `combatType` | 否 | 限定战斗类型，默认 `Default` |
| `order` | 否 | 排序值，默认 `-4` |

除 `id`、`actionType` 外，大多数字段都支持函数。函数会收到 `ctx` 参数。

---

### actionType

`actionType` 决定动作被追加到哪一组原版动作中。常见值包括：

| 值 | 说明 |
| :--- | :--- |
| `leftaction` | 左手动作 |
| `rightaction` | 右手动作 |
| `feetaction` | 脚部动作 |
| `mouthaction` | 嘴部动作 |
| `penisaction` | 阴茎动作 |
| `vaginaaction` | 阴道动作 |
| `anusaction` | 肛门动作 |
| `chestaction` | 胸部动作 |
| `thighaction` | 大腿动作 |

同一个动作可注册到多个动作列表：

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.guard',
  actionType: ['leftaction', 'rightaction'],
  cond: () => V.stamina >= 10,
  display: () => '格挡',
  value: () => 'myModGuard'
});
```

---

### combatType

`combatType` 用于限制动作出现在哪类战斗中。

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.selfCare',
  actionType: 'leftaction',
  combatType: 'Self',
  cond: () => V.health < 80,
  display: () => '整理状态',
  value: () => 'myModSelfCare'
});
```

默认值是 `Default`。当 `combatType` 为 `Default` 时，该动作可作为通用动作参与匹配。

如果需要动态判断：

```javascript
combatType: () => (V.myMod?.specialEncounter ? 'Special' : 'Default')
```

---

### 显示条件

`cond` 返回 `true` 时动作才会显示。

```javascript
cond: () => V.stamina >= 20 && !V.leftarmdisabled
```

建议在 `cond` 中只写轻量判断，不要执行会改变游戏状态的逻辑。

---

### 显示文本和值

`display` 是玩家看到的文本，`value` 是动作变量实际保存的值。

```javascript
display: () => `快速打击 (${V.stamina})`,
value: () => 'myModQuickStrike'
```

`value` 不应和原版动作值或其它模组动作值冲突。建议加模组名前缀。

---

### 颜色和难度提示

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.powerAttack',
  actionType: 'rightaction',
  cond: () => V.stamina >= 40,
  display: () => '重击',
  value: () => 'myModPowerAttack',
  color: () => (V.stamina >= 80 ? 'green' : 'yellow'),
  difficulty: () => '消耗体力，伤害较高'
});
```

`color` 会影响动作列表样式。`difficulty` 用于按钮附近的难度或提示显示。

---

### 排序

`order` 数值越小，动作越靠前。

```javascript
order: -10
```

默认值为 `-4`。如果多个模组都添加动作，建议使用较明确的排序值，避免位置不可预期。

---

### 完整示例

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.moonlightHeal',
  actionType: 'chestaction',
  combatType: 'Default',
  cond: () => {
    const hour = Time.hour;
    return V.myMod?.moonBlessing && (hour >= 18 || hour <= 6);
  },
  display: () => {
    const strong = Time.hour >= 0 && Time.hour <= 3;
    return strong ? '月光治疗（强）' : '月光治疗';
  },
  value: () => 'myModMoonlightHeal',
  color: () => 'silver',
  difficulty: () => '夜晚可用，恢复少量状态',
  order: 2
});
```

---

### 补充说明

- `id` 和 `value` 都建议带模组名前缀。
- `cond`、`display`、`value`、`color`、`difficulty`、`combatType`、`order` 的函数不应抛出错误；框架会捕获错误并记录警告，但该动作可能无法正常显示。
- `cond` 中不要修改游戏状态，只做判断。
- 注册按钮后，还需要在模组自己的战斗逻辑中处理该 `value` 对应的实际效果。
- 如果动作只适用于特定战斗，请设置 `combatType`，避免出现在不合适的界面。
