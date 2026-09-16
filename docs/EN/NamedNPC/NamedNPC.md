# Named NPC

## Purpose

Named NPC registration adds mod NPCs to the framework NPC system. It can define NPC data, options, translations, stats, schedules, clothes, and sidebar display through related modules.

## Entry Point

```javascript
maplebirch.npc.add(npcData, npcConfig, translations);
```

## Minimal Example

```javascript
maplebirch.npc.add(
  {
    nam: 'Example',
    name: 'Example',
    title: 'traveller',
    gender: 'f'
  },
  {},
  {
    CN: {
      Example: '示例'
    },
    EN: {
      Example: 'Example'
    }
  }
);
```

## Related APIs

```javascript
maplebirch.npc.addStats(stats);
maplebirch.npc.addSchedule(npcName, schedule);
maplebirch.npc.addClothes(config);
```

## NPC Config

`npcConfig` controls framework-side NPC behavior such as affection labels, important NPC flags, special NPC flags, and romance conditions.

```javascript
maplebirch.npc.add(
  {
    nam: 'Draven',
    gender: 'm',
    title: 'wanderer'
  },
  {
    love: { maxValue: 100 },
    loveAlias: ['Loyalty', '忠诚'],
    important: true,
    special: true,
    romance: [() => V.completedDravenQuest]
  }
);
```

`loveAlias` can be a static array or a function. When using an array, the order is `[English, Chinese]`.

```javascript
loveAlias: ['Affection', '好感'];
```

Dynamic aliases may return either a string or an `[English, Chinese]` array:

```javascript
loveAlias: () => {
  const trust = V.playerTrust || 0;
  return trust > 50 ? ['Trust', '信赖'] : ['Affection', '好感'];
};
```

## boot.json

```json
"npc": {
  "NamedNPC": [],
  "Stats": {},
  "Sidebar": {
    "image": [],
    "clothes": [],
    "config": []
  }
}
```

## Hair Lengths

`NPCData.hair_sides_length` and `NPCData.hair_fringe_length` are independent numeric lengths (0–1000). Both fields default independently to 200. Missing, nonnumeric or nonfinite values reset to that default during construction and variable validation; old length fields are not converted. Each NPC owns its values; changing one field does not change the other. See [NPC Sidebar](./NamedNPCSidebar.md) for the numeric-to-model-stage conversion.
