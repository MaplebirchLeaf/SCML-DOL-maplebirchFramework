# Combat Actions

## Purpose

`maplebirch.combat.CombatAction` adds modded action buttons to vanilla combat action lists, and can also attach the matching combat reaction text.

Buttons use the vanilla `generateCombatAction` flow. In a human encounter, `effect` runs in the matching section of `effectsman`. With `combatType` set, effects for struggle, swarm, vore, machine and tentacle encounters run in their respective effect widgets.

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
  id: 'myMod:quickStrike',
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
| `combatType`   | No       | Combat type or array of types, default `Default`       |
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
  id: 'myMod:guard',
  actionType: ['leftaction', 'rightaction'],
  cond: () => V.stamina >= 10,
  display: () => 'Guard',
  value: () => 'myModGuard',
  effect: '<<myModGuardEffect>>'
});
```

## effect

Encounter types expose different lists: struggle has left hand, right hand, feet and mouth; swarm and machine have left hand, right hand and feet; vore has left and right hand; tentacle has left hand, right hand, feet, mouth, penis, vagina, anus and chest. Register only for lists the vanilla encounter generates.

Use `combatType: ['Default', 'Struggle']` when one action belongs in several encounters.

## Modify a Vanilla Button

Target an existing action by its original value. This changes its label, visibility or list position without replacing vanilla resolution:

```javascript
maplebirch.combat.CombatAction.modify({
  id: 'myMod:askLabel',
  actionType: 'mouthaction',
  value: 'ask',
  display: ctx => `Request: ${ctx.label}`,
  order: 0
});
```

`cond(ctx)` hides the option when it returns `false`. `order` is a zero-based position among the original options, and `ctx.label` is the original label. To modify an option inside the Ask dropdown, use `actionType: 'ask'` and its `$askAction` value. The original request resolution remains unchanged.

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

Other encounters run the mod action once at the start of their effect widget, then continue vanilla resolution. Tentacle effects run in the outer `effectstentacles` widget, not once per tentacle.

## Full Example

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod:moonlightHeal',
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
