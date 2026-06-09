# NPC Transformation

NPC transformation is a lightweight visual and identity layer for named NPCs. It is separate from the player transformation system and does not render pregnancy belly layers.

## Register A Type

```javascript
maplebirch.npc.transformation.add('plant', {
  levels: [5, 20, 40, 60, 80, 100],
  type: 'plant',
  pregnancy: 'plant',

  body(bodydata, state, npcName) {
    bodydata.eyeColour = 'green';
    bodydata.hairColour = 'green';
  },

  sidebar(nnpc, state, npcName) {
    nnpc.skin_type = 'greenlight';
  },

  layers: {
    nnpc_plant_vines: {
      srcfn: () => 'img/npc/plant/vines.png',
      showfn: options => maplebirch.npc.transformation.level(options.maplebirch.nnpc.name, 'plant') >= 3,
      zfn: options => maplebirch.char.ZIndices.over_upper + options.maplebirch.nnpc.position
    }
  }
});
```

## Change An NPC

```javascript
maplebirch.npc.transformation.build('Robin', 'plant', 10);
maplebirch.npc.transformation.set('Robin', 'plant', 3);
maplebirch.npc.transformation.clear('Robin', 'plant');
```

State is stored under `V.maplebirch.npc[name].transformation`. `type` is the gameplay identity returned by `maplebirch.npc.transformation.type(name)`. `pregnancy` is only a string used by `NPCPregnancy` when it needs a pregnancy type; it does not add pregnancy rendering.
