# 转化系统 (Transformation System)

## 基本介绍

转化系统允许模组制作者为游戏添加自定义的形态变化，如兽化、神圣化、恶魔化等。通过此系统，您可以定义角色在不同转化阶段的外观、特性、条件和效果。
_可通过 `maplebirch.char.transformation.add` 注册。_

顶层 `pre`、`post` 与 `layers` 注册到原版 PC 的 `main` 画布。需要战斗贴图时，在 `combat` 中提供对应配置，框架会注册到 `combatMainPc`。

---

## 共用绘制与融合配置

`layers` 和 `combat.layers` 可以是图层表，也可以是返回图层表的函数。图层表直接登记，函数延后到游戏的 `StoryInit` 阶段执行，此时可读取已加载的原版 `Renderer.CanvasModels`。因此可在 `preInit` 登记转化和融合条件，不必等图像资源就绪。

```javascript
maplebirch.tool.onInit(() => {
  maplebirch.char.transformation.add('dragon', 'physical', {
    parts: [
      { name: 'eyes', tfRequired: 2, label: () => lanSwitch('Eyes', '眼睛') },
      { name: 'tail', tfRequired: 4, label: () => lanSwitch('Scaled tail', '鳞尾') }
    ],
    layers: () => dragonLayers(),
    combat: { pre: dragonCombatPre, layers: dragonCombatLayers },
    chimeras: [
      {
        name: 'demondragon',
        part: 'tail',
        sources: ['dragon', 'demon'],
        label: () => lanSwitch('Demon dragon tail:', '恶魔龙尾：')
      }
    ]
  });
});
```

- 部件的 `label` 可使用文本或函数，仅用于该转化的镜子选项。转化专属名称不会覆盖其他转化的通用名称。
- `chimeras` 中的 `name` 是融合标识，`part` 是部件名，`sources` 列出参与融合的转化。每个来源的同名部件均可见时，镜子中才显示选项。
- 框架统一接入原版融合默认值与镜子控件。开关存入 `$chimera[name][part]`，默认开启，保留玩家选择的关闭状态。相同标识可注册多个不同部件。
- 融合贴图由转化自身的 `pre` 与 `layers` 选择，可沿用原版 `isChimeraEnabled(name, part)` 读取开关。

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
        // 在此刷新模组自有的渲染状态，不要修改 V 中的转化进度。
      }
    },

    // 可选：转化图层定义
    layers: {
      dragon_horns: {
        srcfn: options => {
          const level = V.maplebirch?.transformation?.dragon?.level || 0;
          if (level < 1) return undefined;
          return `img/transformations/dragon/horns_${level}.png`;
        },
        showfn: () => V.maplebirch?.transformation?.dragon?.level >= 1,
        zfn: () => maplebirch.char.ZIndices.effects
      },
      dragon_wings: {
        srcfn: options => {
          const level = V.maplebirch?.transformation?.dragon?.level || 0;
          if (level < 3) return undefined;
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
- `label`: 该部件的镜子名称，可使用文本或函数(可选)

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
    down: ['等级1->0消息', '等级2->1消息', '等级3->2消息', '等级4->3消息', '等级5->4消息', '等级6->5消息']
  },
  CN: {
    up: ['等级1消息', '等级2消息', '等级3消息', '等级4消息', '等级5消息', '等级6消息'],
    down: ['等级1->0消息', '等级2->1消息', '等级3->2消息', '等级4->3消息', '等级5->4消息', '等级6->5消息']
  }
}
```

### 预处理/后处理函数

`pre` 和 `post` 只作用于 `main` 模型，用于修改 PC 常规人模渲染参数或在渲染后补充效果。

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

### 转化图层

`layers` 只会注入到 `main` 模型。需要给战斗画布或其它模型写独立图层时，请直接使用 `maplebirch.char.use()`。

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

## 特质归属与消息索引

同名特质（例如原版 `sharpEyes`）由多个转化共用时，只要任一归属转化达到要求，特质就保持启用。所有归属都失去资格后才关闭，不重复叠加原版加成。注册特质开关不会自动实现技能或伤害效果，具体结算仍需由原版或模组提供。

`up[n - 1]` 对应进入第 n 阶段，`down[n - 1]` 对应从第 n 阶段退出。因此衰退数组也按阶段从低到高排列，不按实际衰退顺序倒排。外观部件开关与特质开关分别存储，渲染时应判断 `isPartEnabled()`，不能只判断等级。
