# Combat Actions

## Purpose

Combat actions add mod options to vanilla combat action lists. The registration only adds the selectable action; your mod still needs to handle the selected `value` in combat logic.

## Entry Point

```javascript
maplebirch.combat.CombatAction.reg(config);
```

## Minimal Example

```javascript
maplebirch.combat.CombatAction.reg({
  id: 'myMod.quickStrike',
  actionType: 'leftaction',
  cond: () => V.stamina >= 20,
  display: () => 'Quick strike',
  value: () => 'myModQuickStrike'
});
```

## Config

| Field | Purpose |
| :--- | :--- |
| `id` | Unique action id |
| `actionType` | Target action list |
| `cond(ctx)` | Visibility |
| `display(ctx)` | Text shown to player |
| `value(ctx)` | Stored action value |
| `color` | Optional color |
| `difficulty` | Optional hint text |
| `combatType` | Optional combat type |
| `order` | Optional sort order |

## Common actionType Values

| Value | Meaning |
| :--- | :--- |
| `leftaction` | Left hand |
| `rightaction` | Right hand |
| `feetaction` | Feet |
| `mouthaction` | Mouth |
| `penisaction` | Penis |
| `vaginaaction` | Vagina |
| `anusaction` | Anus |
| `chestaction` | Chest |
| `thighaction` | Thigh |
