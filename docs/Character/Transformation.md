# 转化系统 (Transformation System)

## 基本介绍

转化系统允许模组制作者为游戏添加自定义的形态变化，如兽化、神圣化、恶魔化等。通过此系统，您可以定义角色在不同转化阶段的外观、特性、条件和效果。
_可通过 `maplebirch.char.transformation.add` 或 `maplebirchFrameworks.addTransform` 注册。_

---

## 添加自定义转化

### 基本结构

```javascript
// 在模组初始化时添加转化
maplebirch.tool.onInit(() => {
  maplebirch.char.transformation.add('dragon', 'physical', {
    // 必填：转化部件列表
    parts: [
      { name: 'horns', tfRequired: 1, default: 'default' },
      { name: 'tail', tfRequired: 2, default: 'default' },
      { name: 'wings', tfRequired: 3, default: 'default' },
      { name: 'scales', tfRequired: 4, default: 'default' },
      { name: 'claws', tfRequired: 5, default: 'default' },
      { name: 'fangs', tfRequired: 6, default: 'default' }
    ],

    // 可选：转化特质列表
    traits: [
      { name: 'fire_breath', tfRequired: 4, default: 'default' },
      { name: 'dragon_sight', tfRequired: 3, default: 'default' }
    ],

    // 转化配置
    build: 100, // 最大build值
    level: 6, // 最大等级
    update: [20, 40, 60, 80, 95, 100], // 等级升级阈值

    // 可选：图标
    icon: 'img/ui/dragon_icon.png',

    // 可选：转化消息
    message: {
      EN: {
        up: ['你感到背部发痒...', '鳞片开始生长...', '龙翼破体而出...', '龙爪变得锋利...', '你感到龙的力量...', '完全转化为龙！'],
        down: ['鳞片开始脱落...', '龙翼萎缩...', '龙爪变钝...', '龙的特征减弱...', '几乎恢复人形...', '完全恢复人形']
      },
      CN: {
        up: ['你感到背部发痒...', '鳞片开始生长...', '龙翼破体而出...', '龙爪变得锋利...', '你感到龙的力量...', '完全转化为龙！'],
        down: ['鳞片开始脱落...', '龙翼萎缩...', '龙爪变钝...', '龙的特征减弱...', '几乎恢复人形...', '完全恢复人形']
      }
    },

    // 可选：是否允许自然衰退
    decay: true,

    // 可选：衰退条件
    decayConditions: [() => V.maplebirch.transformation.dragon.build >= 1, () => V.worn.neck.name !== 'dragon_amulet', () => playerNormalPregnancyType() !== 'dragon'],

    // 可选：是否压制其他转化
    suppress: true,

    // 可选：压制条件
    suppressConditions: [sourceName => sourceName !== 'dragon', () => V.worn.neck.name !== 'dragon_amulet'],

    // 可选：预处理函数
    pre: options => {
      if (V.maplebirch?.transformation?.dragon?.level >= 3) {
        options.scale_factor = 1.1;
        options.color_tint = '#d4a017'; // 金色龙鳞
      }
    },

    // 可选：后处理函数
    post: options => {
      if (V.maplebirch?.transformation?.dragon?.level >= 6) {
        addDragonAura(options.canvas);
      }
    },

    // 可选：转化图层定义
    layers: {
      dragon_horns: {
        srcfn: options => {
          const level = V.maplebirch?.transformation?.dragon?.level || 0;
          if (level < 1) return null;
          return `img/transformations/dragon/horns_${level}.png`;
        },
        showfn: () => V.maplebirch?.transformation?.dragon?.level >= 1,
        zfn: () => maplebirch.char.ZIndices.effects
      },
      dragon_wings: {
        srcfn: options => {
          const level = V.maplebirch?.transformation?.dragon?.level || 0;
          if (level < 3) return null;
          return `img/transformations/dragon/wings_${level}.png`;
        },
        showfn: () => V.maplebirch?.transformation?.dragon?.level >= 3,
        zfn: () => maplebirch.char.ZIndices.effects + 1
      }
    },

    // 可选：翻译
    translations: {
      dragon: { EN: 'Dragon', CN: '龙' },
      fire_breath: { EN: 'Fire Breath', CN: '火焰吐息' },
      dragon_sight: { EN: 'Dragon Sight', CN: '龙之视觉' }
    }
  });
});
```

---

## 配置选项详解

### 必需参数

| 参数    | 类型   | 说明                                         |
| :------ | :----- | :------------------------------------------- |
| `name`  | string | 转化的唯一标识符                             |
| `type`  | string | 转化类型：`'physical'`(物理转化)或自定义类型 |
| `parts` | Array  | 转化部件定义数组                             |

### 转化部件 (parts)

每个部件对象包含：

- `name`: 部件名称(必须唯一)
- `tfRequired`: 触发该部件所需的最小等级
- `default`: 默认值(可选)

```javascript
parts: [
  { name: 'tail', tfRequired: 2, default: 'default' },
  { name: 'horns', tfRequired: 1, default: 'curved' },
  { name: 'wings', tfRequired: 3, default: 'leathery' }
];
```

### 转化特质 (traits)

```javascript
traits: [
  { name: 'night_vision', tfRequired: 2, default: 'default' },
  { name: 'enhanced_senses', tfRequired: 4, default: 'default' }
];
```

### 等级配置

| 参数     | 类型     | 说明                    |
| :------- | :------- | :---------------------- |
| `build`  | number   | 最大build值(0-100)      |
| `level`  | number   | 最大等级(通常为6)       |
| `update` | number[] | 等级升级的build阈值数组 |

```javascript
build: 100,
level: 6,
update: [20, 40, 60, 80, 95, 100]  // 达到20build升1级，40build升2级...
```

### 衰退系统

| 参数              | 类型       | 说明             |
| :---------------- | :--------- | :--------------- |
| `decay`           | boolean    | 是否允许自然衰退 |
| `decayConditions` | Function[] | 衰退条件函数数组 |

```javascript
decay: true,
decayConditions: [
  () => V.maplebirch.transformation.dragon.build >= 1,
  () => V.worn.neck.name !== 'dragon_amulet',
  () => !Weather.bloodMoon
]
```

### 压制系统

| 参数                 | 类型       | 说明             |
| :------------------- | :--------- | :--------------- |
| `suppress`           | boolean    | 是否压制其他转化 |
| `suppressConditions` | Function[] | 压制条件函数数组 |

```javascript
suppress: true,
suppressConditions: [
  (sourceName) => sourceName !== 'dragon',  // 不压制自身
  () => V.worn.neck.name !== 'dragon_amulet'
]
```

### 转化消息

```javascript
message: {
  EN: {
    up: ['等级1消息', '等级2消息', '等级3消息', '等级4消息', '等级5消息', '等级6消息'],
    down: ['等级5->4消息', '等级4->3消息', '等级3->2消息', '等级2->1消息', '等级1->0消息', '完全消失消息']
  },
  CN: {
    up: ['等级1消息', '等级2消息', '等级3消息', '等级4消息', '等级5消息', '等级6消息'],
    down: ['等级5->4消息', '等级4->3消息', '等级3->2消息', '等级2->1消息', '等级1->0消息', '完全消失消息']
  }
}
```

### 预处理/后处理函数

```javascript
pre: (options) => {
  // 在角色渲染前执行
  const level = V.maplebirch?.transformation?.dragon?.level || 0;
  if (level >= 4) {
    options.glow_effect = true;
    options.glow_color = '#ff6b00';
  }
},

post: (options) => {
  // 在角色渲染后执行
  if (options.glow_effect) {
    addGlowEffect(options.canvas, options.glow_color);
  }
}
```

---

## 转化数据存储

### 变量结构

```javascript
V.maplebirch.transformation = {
  dragon: {
    level: 0, // 当前等级
    build: 0 // 当前build值
  }
  // 其他自定义转化...
};

V.transformationParts = {
  dragon: {
    horns: 'disabled', // 或 'default' 或自定义值
    tail: 'disabled',
    wings: 'disabled'
  },
  traits: {
    fire_breath: 'disabled',
    dragon_sight: 'disabled'
  }
};
```

---

## 完整示例

### 示例1：简单的精灵转化

```javascript
maplebirch.char.transformation.add('fairy', 'physical', {
  parts: [
    { name: 'wings', tfRequired: 1, default: 'delicate' },
    { name: 'glow', tfRequired: 2, default: 'default' },
    { name: 'pointed_ears', tfRequired: 3, default: 'default' }
  ],
  build: 100,
  level: 3,
  update: [33, 66, 100],
  decay: true,
  decayConditions: [() => V.maplebirch.transformation.fairy.build >= 1, () => !V.worn.earrings?.name?.includes('fairy')],
  layers: {
    fairy_wings: {
      srcfn: () => 'img/transformations/fairy/wings.png',
      showfn: () => V.maplebirch?.transformation?.fairy?.level >= 1,
      zfn: () => maplebirch.char.ZIndices.effects + 2
    }
  }
});
```

### 示例2：元素转化

```javascript
maplebirch.char.transformation.add('fire_elemental', 'elemental', {
  parts: [
    { name: 'aura', tfRequired: 1, default: 'flickering' },
    { name: 'embers', tfRequired: 2, default: 'default' },
    { name: 'flame_body', tfRequired: 4, default: 'default' },
    { name: 'fire_crown', tfRequired: 6, default: 'default' }
  ],
  traits: [
    { name: 'heat_aura', tfRequired: 3, default: 'default' },
    { name: 'fire_immunity', tfRequired: 5, default: 'default' }
  ],
  build: 100,
  level: 6,
  update: [20, 40, 60, 80, 95, 100],
  suppress: false, // 元素转化不压制其他转化

  pre: options => {
    const level = V.maplebirch?.transformation?.fire_elemental?.level || 0;
    if (level >= 2) {
      options.color_tint = '#ff3300';
      options.brightness = 1.1;
    }
    if (level >= 4) {
      options.heat_distortion = true;
    }
  }
});
```
