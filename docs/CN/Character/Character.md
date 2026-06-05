# 角色图层

## 用来做什么

角色图层用于扩展玩家侧边栏模型。你可以添加新的图层、调整图层显示条件、注册渲染前后的处理函数，也可以为面部样式提供新的图片资源。

常见用途：

- 添加自定义耳朵、眼睛、尾巴、装饰物等图层。
- 根据变量控制图层显示。
- 为角色面部样式增加新的风格或变体。
- 在渲染前准备数据，或在渲染后追加效果。

---

## 使用入口

```javascript
maplebirch.char.use(layerMap);
maplebirch.char.use(layerMap, target);
maplebirch.char.use('pre', handler);
maplebirch.char.use('post', handler);
maplebirch.char.use('pre', handler, target);
maplebirch.char.use('post', handler, target);
```

`use()` 支持链式调用：

```javascript
maplebirch.char.use(layers).use('pre', preHandler);
```

默认情况下，`use()` 只作用于原版 `main` 模型。需要修改其它画布模型时，传入 `target`。

`target` 支持三种写法：

| 写法 | 说明 |
| :--- | :--- |
| `'main'` | 指定单个模型 |
| `['main', 'clothes']` | 指定多个模型 |
| `(name, modelOrOptions) => boolean` | 按模型名和模型/选项动态判断 |

常见模型名来自原版 `Renderer.CanvasModels`，例如 `main`、`lighting` 等。

---

## 添加图层

最小写法：

```javascript
maplebirch.char.use({
  my_mod_glow: {
    srcfn: () => 'img/myMod/glow.png',
    showfn: options => V.myMod?.glow === true,
    zfn: () => maplebirch.char.ZIndices.hair
  }
});
```

指定模型：

```javascript
maplebirch.char.use(
  {
    my_mod_overlay: {
      srcfn: () => 'img/myMod/overlay.png',
      showfn: () => true
    }
  },
  'main'
);
```

匹配多个模型：

```javascript
maplebirch.char.use(layers, ['main', 'lighting']);
```

动态匹配：

```javascript
maplebirch.char.use(layers, name => name.startsWith('main'));
```

图层配置：

| 字段 | 说明 |
| :--- | :--- |
| `srcfn(options)` | 返回图层图片路径 |
| `masksrcfn(options)` | 返回遮罩图片路径 |
| `showfn(options)` | 返回是否显示 |
| `zfn(options)` | 返回图层层级 |
| `filtersfn(options)` | 返回滤镜列表 |
| `animation` | 动画标识 |

`options` 是原版模型渲染传入的参数，里面会包含角色状态、外观选项和框架扩展字段。

---

## 渲染处理函数

### pre

`pre` 在图层渲染前执行，适合准备数据或调整 options。

```javascript
maplebirch.char.use('pre', options => {
  options.myMod ??= {};
  options.myMod.showAura = V.myMod?.aura === true;
});
```

指定模型：

```javascript
maplebirch.char.use(
  'pre',
  (options, model) => {
    options.myMod ??= {};
    options.myMod.modelName = model?.name;
  },
  ['main', 'lighting']
);
```

### post

`post` 在渲染后执行，适合处理渲染结果。

```javascript
maplebirch.char.use('post', options => {
  if (!options.myMod?.showAura) return;
  // 在这里处理额外效果
});
```

`handler` 的第二个参数是当前 `CanvasModel` 实例。只需要读写渲染选项时可以忽略它。

---

## 面部样式图片

框架会扫描模组中的 `img/face/` 目录，并把发现的风格和变体加入选项。

推荐目录：

```text
img/face/
  cat/
    default/
      eyes.png
      mouth-happy.png
    sweet/
      eyes.png
  default/
    gentle/
      eyes.png
```

图片查找顺序：

1. `img/face/<当前风格>/<当前变体>/<图层名>.png`
2. `img/face/<当前风格>/<图层名>.png`
3. `img/face/default/<当前变体>/<图层名>.png`
4. `img/face/default/<图层名>.png`
5. `img/face/default/default/<图层名>.png`

---

## faceStyleSrcFn

`faceStyleSrcFn()` 用于生成面部图层图片路径函数。

```javascript
const eyesSrc = maplebirch.char.faceStyleSrcFn('eyes');

maplebirch.char.use({
  my_mod_eyes: {
    srcfn: eyesSrc
  }
});
```

也可以传入函数动态决定图层名：

```javascript
const mouthSrc = maplebirch.char.faceStyleSrcFn(options => {
  return `mouth-${options.mouth}`;
});
```

---

## 遮罩辅助

`maplebirch.char.mask()` 用于生成头发渐变遮罩，支持位置和旋转。

```javascript
const mask = maplebirch.char.mask(0, 15);
```

通常只有在自定义头发、渐变或遮罩图层时才需要直接使用。

---

## 完整示例

```javascript
maplebirch.char.use('pre', options => {
  options.myMod ??= {};
  options.myMod.hasHalo = V.myMod?.halo === true;
});

maplebirch.char.use({
  my_mod_halo: {
    srcfn: () => 'img/myMod/halo.png',
    showfn: options => options.myMod?.hasHalo,
    zfn: () => maplebirch.char.ZIndices.hair,
    animation: 'idle'
  }
});
```

---

## 补充说明

- 图层名称建议带模组名前缀，避免与原版或其它模组冲突。
- 不传 `target` 时默认只修改 `main`，避免意外影响其它画布模型。
- 如果要修改多个模型，优先使用数组；只有需要规则匹配时再使用函数。
- `showfn` 只负责判断是否显示，不建议在里面修改游戏变量。
- 面部样式图片路径大小写应保持一致。
- 如果只是添加转化内容，优先参考 [转化管理](Transformation.md)。
