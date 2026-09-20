# 事件发射器

## 用来做什么

事件发射器用于在框架生命周期或自定义时机执行代码。它适合处理“等某个阶段发生后再注册或刷新内容”的需求。

常见用途：

- passage 开始或结束时执行逻辑。
- 读档、存档后同步模组数据。
- 语言切换后刷新文本。
- 在自己的模组脚本之间触发自定义事件。

---

## 使用入口

```javascript
maplebirch.on(eventName, callback, description);
maplebirch.once(eventName, callback, description);
maplebirch.off(eventName, identifier);
await maplebirch.trigger(eventName, ...args);
maplebirch.after(eventName, callback);
```

---

## 监听事件

```javascript
maplebirch.on(
  ':passagestart',
  () => {
    console.log('passage start');
  },
  'myMod passage start'
);
```

`description` 可用于之后移除监听。同一个函数引用重复注册会返回 `false`。

```javascript
maplebirch.off(':passagestart', 'myMod passage start');
```

也可以用函数引用移除：

```javascript
function handler() {
  console.log('passage start');
}

maplebirch.on(':passagestart', handler);
maplebirch.off(':passagestart', handler);
```

---

## 单次监听

`once()` 只执行一次。

```javascript
maplebirch.once(':storyready', () => {
  setup.myModReady = true;
});
```

---

## 触发自定义事件

```javascript
maplebirch.on('myMod:refresh', data => {
  console.log(data);
});

await maplebirch.trigger('myMod:refresh', {
  source: 'options'
});
```

`trigger()` 按注册顺序执行并等待异步回调。自定义事件建议使用 `myMod:eventName` 这样的模组名前缀，避免和其它模组冲突。

---

## after

`after()` 会在指定事件的监听器执行完毕后执行一次。对于 `:sugarcube`、`:idbReady`、`:storyready`、`:modLoaderEnd`、`:language`，框架会保留最近一次参数；事件已完成时，新注册的 `on()`、`once()`、`after()` 会立即收到这些参数。

```javascript
maplebirch.after(':language', () => {
  setup.myMod.refreshText();
});
```

---

## 常用框架事件

| 事件              | 适合做什么                     |
| :---------------- | :----------------------------- |
| `:storyready`     | SugarCube 故事准备完成后的逻辑 |
| `:passageinit`    | 获取当前 passage 信息          |
| `:passagestart`   | passage 开始时刷新状态         |
| `:passagerender`  | passage 渲染时处理 DOM 前逻辑  |
| `:passagedisplay` | passage 显示后处理页面         |
| `:passageend`     | passage 结束阶段               |
| `:onSave`         | 存档前后同步数据               |
| `:onLoad`         | 读档时处理数据                 |
| `:language`       | 框架语言切换后                 |
| `:modLoaderEnd`   | ModLoader 加载结束             |

---

## 存档与读档

`:onSave`、`:onLoad` 的回调必须同步执行，SugarCube 不会等待 Promise。框架会报告异步回调并继续执行后续同步监听器。

回调收到的 `save` 包含 `saveObj`、`details`、`V` 和 `use()`。`save.V` 是待保存或待载入的变量；读档回调执行时，全局 `V` 仍是当前游戏状态。

```javascript
maplebirch.on(':onLoad', save => {
  save.V.myMod ??= {};
  save.V.myMod.flags ??= {};
});
```

若已有初始化逻辑依赖全局 `V`，使用 `save.use(save.V, () => { /* 同步初始化 */ })` 临时切换变量。正常返回后修改写回存档，异常时不写回，当前游戏的变量始终恢复。`setup` 的静态注册仍在启动阶段完成。

---

## 示例：语言切换后刷新页面文本

```javascript
maplebirch.on(':language', () => {
  $('.my-mod-title').text(maplebirch.t('myMod.title'));
});
```
