# NPC Pregnancy

NPC pregnancy support is only a bridge into the vanilla pregnancy system. It does not turn one species into another.

The system is bidirectional:

- An NPC can impregnate the PC.
- The PC can impregnate an NPC.

The same pregnancy type and generator are used for both directions.

## NPC Data

Set `pregnancy.enabled` on the NPC that should join the pregnancy system. Set `pregnancy.type` to the pregnancy species used by sperm records and pregnancy generation.

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

Adding a type only lets the framework keep this type in pregnancy filters. It does not create pregnancy data by itself. Custom pregnancy types are registered in script:

```javascript
maplebirch.npc.addPregnancy('plant');
```

## Full Registration

A custom type needs at least a `generator`. To make birth location, remaining-day display, child activities, and baby text work cleanly, register a full config object.

The `generator` receives the same arguments as vanilla generators:

| Argument | Meaning |
| :--- | :--- |
| `mother` | The pregnant side. It can be `'pc'` or an NPC name. |
| `father` | The impregnating side. It can be `'pc'` or an NPC name. |
| `fatherKnown` | Whether the father is known. |
| `genital` | Pregnancy location, usually `'vagina'`. |

`mother === 'pc'` means an NPC made the PC pregnant. `father === 'pc'` means the PC made an NPC pregnant.

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

  birth: {
    birthLocation: 'forest',
    location: 'home'
  },

  eta(pregnancy) {
    return pregnancy.timerEnd ? Math.floor(pregnancy.timerEnd - pregnancy.timer) : null;
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

The returned object must contain a non-empty `fetus` array. Other fields should follow the structure expected by the vanilla birth and child systems if the pregnancy needs to progress into normal children.

Registered fields:

| Field | Vanilla Area | Purpose |
| :--- | :--- | :--- |
| `generator` | `window.pregnancyGenerator[type]` | Creates pregnancy data. |
| `birth` | Framework helper registry | Stores default birth locations for mod events or future birth UI integration. |
| `eta` | `window.pregnancyDaysEta()` | Adds remaining-day display for custom pregnancy types. |
| `childActivity` | `<<updateChildActivity>>` | Assigns daily activities for children of custom types. |
| `text` | `<<pregnancyBabyText>>` | Replaces generic `baby/babies` wording for custom types. |

## Vanilla Touch Points

The framework touches only the original entry points needed by custom types:

| Original Entry | Original Role | Framework Role |
| :--- | :--- | :--- |
| `setup.pregnancy.typesEnabled` | Filters valid sperm types in `recordSperm`. | Adds custom pregnancy types. |
| `window.pregnancyGenerator` | Stores vanilla pregnancy generators. | Adds custom generators. |
| `window.recordSperm` | Records sperm from Twine events and combat. | Fills `spermType` for custom named NPCs before calling vanilla logic. |
| `npcPregnancyCycle()` | Advances NPC pregnancies and attempts NPC conception each day. | Runs vanilla first, then attempts custom-type NPC conception. |
| `<<playerPregnancyAttempt>>` | Attempts PC pregnancy. | Handles custom sperm, otherwise delegates to vanilla macro. |
| `<<namedNpcPregnancy>>` | Makes a named NPC pregnant. | Handles custom mother/father type combinations, otherwise delegates to vanilla macro. |
| `window.pregnancyDaysEta()` | Displays remaining pregnancy days. | Uses registered `eta` for custom types. |
| `<<updateChildActivity>>` | Updates child daily activity. | Uses registered `childActivity` for custom child types. |
| `<<pregnancyBabyText>>` | Outputs baby/pup/chick text. | Uses registered `text` for custom types. |

`defaultBirthLocations()` and `giveBirthToChildren()` are closure functions inside vanilla `pregnancy.js`, so the framework does not directly replace them. `birth` is therefore a registry/helper for mod-side event code and later UI hooks, not an automatic replacement of vanilla birth routing.

## Vanilla Route

Vanilla `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk`, and `harpy` keep using vanilla logic. The framework route only handles custom types that vanilla code would filter out.
