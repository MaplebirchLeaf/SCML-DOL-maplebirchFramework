# 战斗按钮

## 用途

`maplebirch.combat.CombatAction` 用于向原版战斗动作列表添加模组按钮，并为按钮补充对应的战斗反应文本。

按钮本身会通过原版的 `generateCombatAction` 显示；动作被选择后，框架会把 `effect` 注入到原版 `effectsman` 的对应动作区域中执行。

## 入口

```javascript
maplebirch.combat.CombatAction.reg(config);
```

可以一次注册多个：

```javascript
maplebirch.combat.CombatAction.reg(configA, configB, configC);
```

## 最小示例

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.quickStrike',
  actionType: 'leftaction',
  cond: () => V.stamina >= 20,
  display: () => '快速打击',
  value: () => 'myModQuickStrike',
  color: 'brat',
  difficulty: () => '<span class="green">(Easy)</span>',
  effect: '<<myModQuickStrikeEffect>>'
});
```

再写一个普通 Twine widget 处理实际文本和效果：

```twine
:: My Mod Combat Effects [widget]
<<widget "myModQuickStrikeEffect">>
  You strike with your left hand.
  <<stamina -20>>
<</widget>>
```

当玩家选中这个按钮后，`$leftaction` 会变成 `myModQuickStrike`。进入 `effectsman` 时，框架会在手部动作区生成并执行类似这样的片段：

```twine
<<if $leftaction is "myModQuickStrike">>
  <<set $leftaction to 0>><<set $leftactiondefault to "myModQuickStrike">>
  <<myModQuickStrikeEffect>>
<</if>>
```

## 配置字段

| 字段 | 必填 | 说明 |
| :--- | :--- | :--- |
| `id` | 是 | 动作唯一标识，建议带模组名前缀 |
| `actionType` | 是 | 要添加到哪个动作列表 |
| `cond(ctx)` | 是 | 返回 `true` 时显示按钮 |
| `display(ctx)` | 是 | 按钮显示文本 |
| `value(ctx)` | 是 | 选中后写入 `$leftaction` 等动作变量的值 |
| `effect` | 否 | 选中该动作后在 `effectsman` 中执行的 Twine 文本或函数 |
| `color` | 否 | 按钮/列表颜色，默认 `white` |
| `difficulty` | 否 | 按钮旁边的难度或提示文本 |
| `combatType` | 否 | 限定战斗类型，默认 `Default` |
| `order` | 否 | 排序值，默认 `-4`，越小越靠前 |

除 `id`、`actionType` 外，多数字段都支持函数。函数会收到 `ctx` 参数。

## actionType

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

同一动作可以注册到多个动作列表：

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.guard',
  actionType: ['leftaction', 'rightaction'],
  cond: () => V.stamina >= 10,
  display: () => '格挡',
  value: () => 'myModGuard',
  effect: '<<myModGuardEffect>>'
});
```

## effect

`effect` 用于填写动作被选中后要执行的 Twine 内容。推荐写成一个 widget：

```javascript
effect: '<<myModGuardEffect>>'
```

也可以写成函数：

```javascript
effect: ctx => ctx.actionType === 'leftaction' ? '<<myModLeftGuardEffect>>' : '<<myModRightGuardEffect>>'
```

框架会自动为 `effect` 外层包上动作判断，并把对应动作变量设回 `0`，同时更新默认动作：

```twine
<<set $leftaction to 0>>
<<set $leftactiondefault to "动作 value">>
```

如果需要更复杂的默认动作、目标处理、技能消耗或文本分支，请放进你自己的 effect widget 中。

## 注入位置

原版的战斗反应集中写在 `effectsman` 中，但不同部位的动作大致分区。框架会把模组动作注入到对应大区：

- `leftaction` / `rightaction`：手部动作区
- `feetaction`：脚部动作区
- `mouthaction`：嘴部动作区
- `vaginaaction`：阴道动作区
- `anusaction`：肛门动作区
- `thighaction`：大腿动作区
- `penisaction`：阴茎动作区
- `chestaction`：胸部动作区

这样左手动作的反应不会被丢到整段战斗文本末尾。

## 完整示例

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.moonlightHeal',
  actionType: 'chestaction',
  combatType: 'Default',
  cond: () => {
    const hour = Time.hour;
    return V.myMod?.moonBlessing && (hour >= 18 || hour <= 6);
  },
  display: () => Time.hour >= 0 && Time.hour <= 3 ? '月光治疗（强）' : '月光治疗',
  value: () => 'myModMoonlightHeal',
  color: 'green',
  difficulty: () => '<span class="green">(Safe)</span>',
  effect: '<<myModMoonlightHealEffect>>',
  order: 2
});
```

```twine
:: My Mod Combat Effects [widget]
<<widget "myModMoonlightHealEffect">>
  <span class="green">Moonlight gathers across your chest.</span>
  <<health 5>>
  <<pain -2>>
<</widget>>
```

## 注意事项

- `value` 不要和原版动作或其他模组动作重复，建议带模组名前缀。
- `cond` 只建议做显示判断，不要在里面修改游戏状态。
- `effect` 中可以写文本，也可以调用宏、修改变量、消耗体力、改变 NPC 状态。
- 如果动作只适用于特殊战斗，请设置 `combatType`。
