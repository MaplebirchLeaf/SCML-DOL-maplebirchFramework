# Combat Actions

## Purpose

`maplebirch.combat.CombatAction` adds modded action buttons to vanilla combat action lists, and can also attach the matching combat reaction text.

The button itself is shown through the vanilla `generateCombatAction` flow. When the action is selected, the framework injects the configured `effect` into the matching action section of vanilla `effectsman`.

## Entry Point

```javascript
maplebirch.combat.CombatAction.reg(config);
```

You can register multiple actions at once:

```javascript
maplebirch.combat.CombatAction.reg(configA, configB, configC);
```

## Minimal Example

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.quickStrike',
  actionType: 'leftaction',
  cond: () => V.stamina >= 20,
  display: () => 'Quick strike',
  value: () => 'myModQuickStrike',
  color: 'brat',
  difficulty: () => '<span class="green">(Easy)</span>',
  effect: '<<myModQuickStrikeEffect>>'
});
```

Then define a normal Twine widget for the text and effects:

```twine
:: My Mod Combat Effects [widget]
<<widget "myModQuickStrikeEffect">>
  You strike with your left hand.
  <<stamina -20>>
<</widget>>
```

When the player selects this action, `$leftaction` becomes `myModQuickStrike`. During `effectsman`, the framework generates and runs a block similar to:

```twine
<<if $leftaction is "myModQuickStrike">>
  <<set $leftaction to 0>><<set $leftactiondefault to "myModQuickStrike">>
  <<myModQuickStrikeEffect>>
<</if>>
```

## Config

| Field          | Required | Description                                            |
| :------------- | :------- | :----------------------------------------------------- |
| `id`           | Yes      | Unique action id; a mod prefix is recommended          |
| `actionType`   | Yes      | Target action list                                     |
| `cond(ctx)`    | Yes      | Button visibility                                      |
| `display(ctx)` | Yes      | Text shown on the button/list option                   |
| `value(ctx)`   | Yes      | Value written into `$leftaction`, `$rightaction`, etc. |
| `effect`       | No       | Twine text or function executed in `effectsman`        |
| `color`        | No       | Button/list color, default `white`                     |
| `difficulty`   | No       | Difficulty or hint text shown near the action          |
| `combatType`   | No       | Combat type filter, default `Default`                  |
| `order`        | No       | Sort value, default `-4`; lower values appear earlier  |

Most fields except `id` and `actionType` may be functions. Functions receive a `ctx` object.

## actionType

| Value          | Meaning    |
| :------------- | :--------- |
| `leftaction`   | Left hand  |
| `rightaction`  | Right hand |
| `feetaction`   | Feet       |
| `mouthaction`  | Mouth      |
| `penisaction`  | Penis      |
| `vaginaaction` | Vagina     |
| `anusaction`   | Anus       |
| `chestaction`  | Chest      |
| `thighaction`  | Thighs     |

The same action can be registered to multiple lists:

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.guard',
  actionType: ['leftaction', 'rightaction'],
  cond: () => V.stamina >= 10,
  display: () => 'Guard',
  value: () => 'myModGuard',
  effect: '<<myModGuardEffect>>'
});
```

## effect

`effect` is the Twine content that runs after the action is selected. The recommended form is a widget call:

```javascript
effect: '<<myModGuardEffect>>';
```

It can also be a function:

```javascript
effect: ctx => (ctx.actionType === 'leftaction' ? '<<myModLeftGuardEffect>>' : '<<myModRightGuardEffect>>');
```

The framework wraps the `effect` in an action check, resets the corresponding action variable to `0`, and updates the default action:

```twine
<<set $leftaction to 0>>
<<set $leftactiondefault to "action value">>
```

Put more complex default-action handling, targeting, skill cost, or branching text inside your own effect widget.

## Injection Position

Vanilla combat reaction text is hardcoded in `effectsman`, but actions are roughly grouped by body/action section. The framework injects mod effects into the matching section:

- `leftaction` / `rightaction`: hand action section
- `feetaction`: feet action section
- `mouthaction`: mouth action section
- `vaginaaction`: vagina action section
- `anusaction`: anus action section
- `thighaction`: thigh action section
- `penisaction`: penis action section
- `chestaction`: chest action section

This keeps a left-hand action reaction near the hand-action text instead of appending it to the end of the whole combat output.

## Full Example

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.moonlightHeal',
  actionType: 'chestaction',
  combatType: 'Default',
  cond: () => {
    const hour = Time.hour;
    return V.myMod?.moonBlessing && (hour >= 18 || hour <= 6);
  },
  display: () => (Time.hour >= 0 && Time.hour <= 3 ? 'Moonlight heal (strong)' : 'Moonlight heal'),
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

## Notes

- `value` should not collide with vanilla actions or other mods. A mod prefix is recommended.
- Keep `cond` lightweight and avoid changing game state inside it.
- `effect` may output text, call macros, update variables, spend stamina, or change NPC state.
- Set `combatType` if the action is only valid in a specific combat type.
