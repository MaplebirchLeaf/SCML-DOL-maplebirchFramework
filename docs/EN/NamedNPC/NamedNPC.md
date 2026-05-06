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
