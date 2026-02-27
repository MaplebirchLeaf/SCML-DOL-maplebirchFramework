# 角色系统 (Character) - 侧边栏图层

## 基本介绍

`Character` 系统是框架提供的角色管理工具，允许模组制作者扩展和自定义游戏中的角色外观、图层、样式和效果。通过该系统，您可以添加新的面部样式、发型、服装图层，以及自定义渲染逻辑。

---

## 核心功能：use 方法

`use` 方法是扩展和自定义角色渲染的核心接口，支持三种调用方式：

```javascript
// 1. 添加预处理/后处理函数
maplebirch.char.use('pre', preprocessFunction); // 在渲染前执行
maplebirch.char.use('post', postprocessFunction); // 在渲染后执行

// 2. 添加图层定义
maplebirch.char.use(layerDefinitions);

// 3. 链式调用
maplebirch.char.use(layer1).use('pre', preFunc).use(layer2);
```

### 1. 处理函数

#### **预处理函数 (pre)**

在角色渲染**前**执行，用于修改渲染选项、准备数据、添加自定义逻辑。

```javascript
// 添加预处理函数
maplebirch.char.use('pre', options => {
  // 根据游戏状态修改选项
  if (V.has_magic_aura) {
    options.glow_intensity = 1.5;
    options.color_tint = '#ff5500';
  }
});
```

#### **后处理函数 (post)**

在角色渲染**后**执行，用于修改渲染结果、添加效果、执行清理工作。

```javascript
// 添加后处理函数
maplebirch.char.use('post', options => {
  // 可以在这里操作 Canvas
  if (options.canvas && options.custom_effect) {
    addCustomEffect(options.canvas, options);
  }
});
```

### 2. 图层定义

图层定义是一个对象，键是图层名称，值是该图层的配置对象。

```javascript
// 图层配置结构
{
  [layerName]: {
    srcfn?: (options) => string,           // 返回图片路径
    masksrcfn?: (options) => string|array, // 返回遮罩图片
    showfn?: (options) => boolean,         // 显示条件
    zfn?: (options) => number,             // Z轴顺序
    filtersfn?: (options) => array,        // 滤镜列表
    animation?: string,                    // 动画类型
    [key: string]: any                     // 其他属性
  }
}
```

#### **示例：添加自定义头发图层**

```javascript
maplebirch.char.use({
  custom_hair: {
    srcfn: options => `img/custom/hair/${options.hair_style}.png`,
    showfn: options => options.has_custom_hair,
    zfn: () => maplebirch.char.ZIndices.hair,
    animation: 'idle'
  }
});
```

---

## 面部风格系统

### 文件夹结构

```
img/face/[style_name]/[variant_name]/[layer_name].png
```

**路径说明**:

- `style_name`: 面部风格名称(如：default, cat, fox)
- `variant_name`: 风格变体名称(如：gentle, sweet, aloof)
- `layer_name`: 面部图层名称(如：eyes, mouth, brows)

### 路径查找优先级

系统按以下顺序查找图片，找到第一个存在的即使用：

1. `img/face/[当前风格]/[当前变体]/[图层名].png`
2. `img/face/[当前风格]/[图层名].png`
3. `img/face/default/[当前变体]/[图层名].png`
4. `img/face/default/[图层名].png`
5. `img/face/default/default/[图层名].png`

**自动注册**：

- 在模组加载时自动扫描 `img/face/` 目录
- 检测到的样式和变体会自动添加到游戏选项
- 支持多语言显示名称

### 示例结构

```
img/face/
├── default/           # 默认风格
│   ├── gentle/       # 温柔变体
│   │   ├── eyes.png
│   │   ├── mouth.png
│   └── default/      # 默认变体
│       ├── eyes.png
└── cat/              # 猫风格
    ├── sweet/        # 甜美变体
    │   ├── eyes.png
    └── default/      # 默认变体
        └── eyes.png
```

---

## 内置辅助函数

### faceStyleSrcFn

辅助函数，用于创建面部样式图片源函数。

```javascript
// 创建眼睛图层源函数
const eyesSrc = maplebirch.char.faceStyleSrcFn('eyes');
const dynamicSrc = maplebirch.char.faceStyleSrcFn(options => options.eye_type || 'default');

// 在图层中使用
maplebirch.char.use({
  custom_eyes: {
    srcfn: eyesSrc
  }
});
```

### mask

创建遮罩图片，用于控制图层的可见区域。

```javascript
// 创建遮罩
const halfMask = maplebirch.char.mask(0.5); // 50% 遮罩
const reversedMask = maplebirch.char.mask(0.3, true); // 30% 反向遮罩
```
