# NPC 转化

NPC 转化是命名 NPC 的轻量外观与身份层。它和 PC 转化系统分开，也不会渲染怀孕肚子图层。

## 注册转化类型

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

## 修改 NPC 转化

```javascript
maplebirch.npc.transformation.build('Robin', 'plant', 10);
maplebirch.npc.transformation.set('Robin', 'plant', 3);
maplebirch.npc.transformation.clear('Robin', 'plant');
```

状态保存在 `V.maplebirch.npc[name].transformation`。`type` 是 `maplebirch.npc.transformation.type(name)` 返回的玩法身份。`pregnancy` 只给 `NPCPregnancy` 查询怀孕类型，不会添加怀孕图层。
