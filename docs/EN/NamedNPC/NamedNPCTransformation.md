# NPC Transformation

NPC transformation is a lightweight visual and identity layer for named NPCs. It is separate from the player transformation system and does not render pregnancy belly layers.

## Register A Type

```javascript
maplebirch.npc.Transformation.add('plant', {
  levels: [5, 10, 15, 20, 25, 30],
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
maplebirch.npc.Transformation.build('Robin', 'plant', 10);
maplebirch.npc.Transformation.set('Robin', 'plant', 3);
maplebirch.npc.Transformation.clear('Robin', 'plant');
```

State is stored under `V.maplebirch.npc[name].transformation`. `type` is the gameplay identity returned by `maplebirch.npc.Transformation.type(name)`. `pregnancy` is only a string used by `NPCPregnancy` when it needs a pregnancy type; it does not add pregnancy rendering.

## Use Vanilla Transformation Layers

The NPC sidebar supports the vanilla PC transformation image paths. Convert the current level into vanilla option fields inside `sidebar()`; the framework handles layers, NPC offsets, masks, and colour filters:

```javascript
maplebirch.npc.Transformation.add('wolf', {
  sidebar(nnpc, state) {
    nnpc.wolf_ears_type = state.level >= 1 ? 'default' : 'disabled';
    nnpc.wolf_tail_type = state.level >= 2 ? 'default' : 'disabled';
    nnpc.wolf_tail_layer = 'back';
    nnpc.wolf_cheeks_type = state.level >= 3 ? 'feral' : 'disabled';
    nnpc.wolf_pits_type = state.level >= 4 ? 'default' : 'disabled';
    nnpc.wolf_pubes_type = state.level >= 4 ? 'default' : 'disabled';
  }
});
```

Vanilla fields for `angel`, `fallen`, `demon`, `wolf`, `cat`, `cow`, `bird`, and `fox` are supported. The framework does not prescribe which parts appear at each level; mods choose the progression and styles in `sidebar()`. Custom transformations may still provide additional `layers`.

Vanilla transformation parts use the NPC's `bodydata.hairColour` filter. Fixed-colour assets such as the cow ear tag retain their original colour.
