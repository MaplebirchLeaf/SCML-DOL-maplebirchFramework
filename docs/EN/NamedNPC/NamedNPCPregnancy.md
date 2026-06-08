# NPC Pregnancy

NPC pregnancy support is a bridge into the vanilla pregnancy system. It does not turn one species into another.

The system is bidirectional:

- An NPC can impregnate the PC.
- The PC can impregnate an NPC.

The same pregnancy type and generator are used for both directions.

## NPC Data

Set `pregnancy.enabled` on NPCs that should join the pregnancy system. Set `pregnancy.type` to the pregnancy species used by sperm records and pregnancy generation.

```javascript
maplebirch.npc.add({
  nam: 'Plant Girl',
  type: 'plant',
  gender: 'f',
  vagina: 'clothed',
  penis: 'none',
  pregnancy: {
    enabled: true,
    type: 'plant'
  }
});
```

## Add Type

Custom pregnancy types are registered in script. Adding a type only lets the framework keep that type in pregnancy filters. It does not create pregnancy data by itself.

```javascript
maplebirch.npc.addPregnancy('plant');
```

## Full Registration

A custom type needs at least a `generator`. Other callbacks are optional, but they make remaining-day display, child activity, and baby wording work cleanly.

```javascript
maplebirch.npc.addPregnancy('plant', {
  generator(mother, father, fatherKnown, genital) {
    const pcIsMother = mother === 'pc';
    const pcIsFather = father === 'pc';

    return {
      type: 'plant',
      timer: 0,
      timerEnd: pcIsMother ? random(120, 180) : random(160, 220),
      fetus: [
        {
          type: 'plant',
          mother,
          father,
          fatherKnown: fatherKnown || pcIsFather,
          genital,
          birthId: 0,
          childId: `plant-${mother}-${father}-${Time.days}`,
          gender: 'f',
          features: {},
          localVariables: {}
        }
      ]
    };
  },

  eta(pregnancy) {
    return pregnancy.timerEnd ? Math.floor(pregnancy.timerEnd - pregnancy.timer) : null;
  },

  birth: {
    birthLocation: 'forest',
    location: 'home'
  },

  childActivity(childId, child) {
    return random(0, 1) ? 'sleeping' : 'sprouting';
  },

  text: {
    single: 'seedling',
    multiple: 'seedlings'
  }
});
```

## Config Fields

| Field | Type | Purpose |
| :--- | :--- | :--- |
| `generator` | `(mother, father, fatherKnown, genital) => pregnancy` | Creates pregnancy data and installs it into `window.pregnancyGenerator[type]`. |
| `birth` | Object or `(type, pregnancy) => object` | Registers default birth and child locations for this custom type. |
| `eta` | `(pregnancy) => number \| null` | Overrides `window.pregnancyDaysEta()` for this custom type. |
| `childActivity` | `(childId, child) => string \| null \| false \| void` | Overrides `<<updateChildActivity>>` for children of this custom type. |
| `text` | Object or `(pregnancy, count, target) => string` | Overrides `<<pregnancyBabyText>>` wording for this custom type. |

## Callback Parameters

### `generator(mother, father, fatherKnown, genital)`

| Parameter | Meaning |
| :--- | :--- |
| `mother` | Pregnant side. It can be `'pc'` or a named NPC name. |
| `father` | Impregnating side. It can be `'pc'` or a named NPC name. |
| `fatherKnown` | Whether the father is known to the pregnancy record. |
| `genital` | Pregnancy location. Usually `'vagina'`; PC pregnancy can also pass another vanilla genital key. |

`mother === 'pc'` means an NPC made the PC pregnant. `father === 'pc'` means the PC made an NPC pregnant.

The returned object must contain a non-empty `fetus` array. If it should progress into vanilla birth and child systems, keep the structure close to vanilla pregnancy objects.

### `eta(pregnancy)`

| Parameter | Meaning |
| :--- | :--- |
| `pregnancy` | Current pregnancy object. For PC pregnancy this is usually `V.sexStats[genital].pregnancy`; for NPC pregnancy this is `C.npc[name].pregnancy`. |

Return remaining days, or `null` when no clean display is available.

### `birth`

`birth` can be a plain object:

```javascript
birth: {
  birthLocation: 'forest',
  location: 'home'
}
```

It can also be a resolver:

```javascript
birth(type, pregnancy) {
  return {
    birthLocation: type === 'plant' ? 'forest' : 'unknown',
    location: pregnancy?.npcAwareOf ? 'home' : 'forest'
  };
}
```

| Parameter | Meaning |
| :--- | :--- |
| `type` | Registered pregnancy type, such as `'plant'`. |
| `pregnancy` | Optional pregnancy object passed by framework callers. |

| Returned Field | Meaning |
| :--- | :--- |
| `birthLocation` | Where birth happened. Vanilla stores this on each child as `V.children[childId].birthLocation`. |
| `location` | Where the child currently belongs after birth. Vanilla stores this on each child as `V.children[childId].location`. |

The registered data is read with `maplebirch.npc.Pregnancy.birthLocation(type, pregnancy)`. Vanilla `giveBirthToChildren()` uses `location` to call `setKnowsAboutPregnancy()` for places such as `home`, `wolf_cave`, and `tower`, and later systems also query child `location` / `birthLocation`.

### `childActivity(childId, child)`

| Parameter | Meaning |
| :--- | :--- |
| `childId` | Key used in `V.children`. |
| `child` | The child object at `V.children[childId]`. It normally contains fields such as `type`, `born`, `localVariables`, and vanilla child data. |

Return a string to write `child.localVariables.activity`. Return `null`, `false`, or `undefined` to mark the callback handled without changing activity.

### `text(pregnancy, count, target)`

| Parameter | Meaning |
| :--- | :--- |
| `pregnancy` | Pregnancy object being displayed. |
| `count` | Display count. The framework uses `1` unless vanilla awareness flags reveal multiples. |
| `target` | Optional display target passed by `<<pregnancyBabyText>>`; usually `undefined`, `'pc'`, or a named NPC name. |

## Runtime Touch Points

| Entry | Vanilla Role | Framework Role |
| :--- | :--- | :--- |
| `setup.pregnancy.typesEnabled` | Filters valid sperm types in `recordSperm`. | Adds custom pregnancy types. |
| `window.pregnancyGenerator` | Stores vanilla pregnancy generators. | Adds custom generators. |
| `window.recordSperm` | Records sperm from Twine events and combat. | Fills `spermType` for custom named NPCs before calling vanilla logic. |
| `maplebirch.dynamic.regTimeEvent('onDay', 'NPCPregnancyCycle', ...)` | Framework time event. | Runs the custom NPC conception pass once per crossed day. |
| `<<playerPregnancyAttempt>>` | Attempts PC pregnancy. | Handles custom sperm, otherwise delegates to vanilla macro. |
| `<<namedNpcPregnancy>>` | Makes a named NPC pregnant. | Handles custom mother/father type combinations, otherwise delegates to vanilla macro. |
| `window.pregnancyDaysEta()` | Displays remaining pregnancy days. | Uses registered `eta` for custom types. |
| `<<updateChildActivity>>` | Updates child daily activity. | Uses registered `childActivity` for custom child types. |
| `<<pregnancyBabyText>>` | Outputs baby/pup/chick text. | Uses registered `text` for custom types. |

`defaultBirthLocations()` and `giveBirthToChildren()` are closure functions inside vanilla `pregnancy.js`, so the framework does not directly replace them yet. The `birth` registry exists so custom birth handling can avoid falling back to vanilla `unknown` locations.

## Vanilla Route

Vanilla `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk`, and `harpy` keep using vanilla logic. The framework route only handles custom types that vanilla code would filter out.
