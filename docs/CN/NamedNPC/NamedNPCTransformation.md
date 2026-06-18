# NPC 转化

NPC 转化是命名 NPC 的轻量外观与身份层。它和 PC 转化系统分开，也不会渲染怀孕肚子图层。

## 注册转化类型

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

## 修改 NPC 转化

```javascript
maplebirch.npc.Transformation.build('Robin', 'plant', 10);
maplebirch.npc.Transformation.set('Robin', 'plant', 3);
maplebirch.npc.Transformation.clear('Robin', 'plant');
```

状态保存在 `V.maplebirch.npc[name].transformation`。`type` 是 `maplebirch.npc.Transformation.type(name)` 返回的玩法身份。`pregnancy` 只给 `NPCPregnancy` 查询怀孕类型，不会添加怀孕图层。

## 使用原版转化图层

NPC 侧边栏已接入原版 PC 转化图片路径。注册回调只需把当前等级转换成原版字段，框架会负责图层、位置偏移、遮罩和颜色滤镜：

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

支持原版 `angel`、`fallen`、`demon`、`wolf`、`cat`、`cow`、`bird` 与 `fox` 图层字段。框架不会自行规定各等级出现哪些部位；模组作者可在 `sidebar()` 中自由决定成长顺序和样式。自定义转化仍可通过 `layers` 添加额外图层。

原版转化部位统一使用 NPC 的 `bodydata.hairColour` 发色滤镜；牛耳标签等固定色素材保持原色。
