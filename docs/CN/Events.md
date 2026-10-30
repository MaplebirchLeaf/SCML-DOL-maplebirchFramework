# 事件

> [!TIP]
> 日常脚本使用 `maplebirch.on()`、`once()`、`off()` 和 `after()`。不必直接操作内部事件对象。

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

### DOM 控件

`on()` 接收框架已转发的生命周期事件和 `trigger()` 发出的自定义事件。输入框的 `change`、链接的 `click` 等 DOM 事件仍由控件处理。

自有 Twee 界面的刷新可以放在容器的 `onchange` 中。需要在原版链接执行前读取状态时，可通过 passage 生命周期给当前内容绑定捕获监听，避免长期监听整个 `document`：

```javascript
function capture(event) {
  // 只观察带目标 passage 的链接，其它点击直接忽略。
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[data-passage]');
  if (!link) return;

  // 捕获阶段先于链接的普通点击处理，便于核对行动前的钱。
  console.log({
    destination: link.getAttribute('data-passage'),
    moneyBefore: V.money
  });
}

maplebirch.on(':passagerender', (_passage, content) => {
  content.addEventListener('click', capture, true);
});
```

旧内容移除后，其 DOM 监听可随节点回收。同一函数在同一节点上重复绑定不会增加监听次数。

---

## 监听事件

```javascript
maplebirch.on(
  ':passagestart',
  () => {
    console.log('段落开始');
  },
  'myMod:passage-start'
);
```

`description` 可用于之后移除监听。同一个函数引用重复注册会返回 `false`。上述监听在每次 passage 开始时输出一次“段落开始”。注销后不再输出。

```javascript
maplebirch.off(':passagestart', 'myMod:passage-start');
```

也可以用函数引用移除：

```javascript
function handler() {
  console.log('段落开始');
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

想等这一轮监听都完成后再处理一次，用 `after()`。下面沿用已导入的 `myMod:title` 翻译键，刷新页面上的自有标题：

```javascript
maplebirch.after(':language', () => {
  // 页面上已有 .my-mod-title 时，更新其文字。
  const title = document.querySelector('.my-mod-title');
  if (title) title.textContent = maplebirch.t('myMod:title');
});
```

`after()` 只处理一次。需要每次切换语言都刷新时，用文末的 `on(':language', ...)` 示例。

有些启动事件还会保留最近一次参数：`:sugarcube`、`:idbReady`、`:storyready`、`:modLoaderEnd`、`:language`。它们完成后才登记监听也能立即收到这次结果：

```javascript
// 即使故事已经准备好才加载这段脚本，也会执行一次。
maplebirch.once(':storyready', () => {
  console.log('故事已准备好，可以接入页面功能了。');
});
```

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

回调收到的 `save` 包含 `saveObj`、`details`、`V` 和 `use()`。`save.V` 是待保存或待载入的变量。读档回调执行时，全局 `V` 仍是当前游戏状态。

```javascript
function initMyMod(variables) {
  variables.myMod ??= {};
  variables.myMod.flags ??= {};
  variables.myMod.flags.metLuna ??= false; // 保留存档中已经完成的初遇。
}

// 新游戏初始化当前变量。
maplebirch.tool.onInit(() => initMyMod(V));

maplebirch.on(':onLoad', save => {
  // 此时正在修整待载入的存档，不能把这行改成 initMyMod(V)。
  initMyMod(save.V);
});
```

上例让初始化函数直接接收变量对象，所以新游戏和读档可以共用它。读档回调中的全局 `V` 仍指向当前游戏，`save.V` 才是即将载入的存档。

如果已有函数只能读取全局 `V`，可以使用下面这套替代写法：

```javascript
function initMyModWithGlobalV() {
  V.myMod ??= {};
  V.myMod.flags ??= {};
  V.myMod.flags.metLuna ??= false;
}

maplebirch.tool.onInit(initMyModWithGlobalV);
maplebirch.on(':onLoad', save => {
  // 在这个同步函数执行期间，让 V 临时指向待载入的数据副本。
  save.use(save.V, initMyModWithGlobalV);
});
```

`use()` 成功后把修改写回存档，抛错时丢弃这次副本的修改；退出时恢复当前游戏变量。回调必须同步，不能在里面等待请求。`setup` 的静态注册仍放在启动阶段。

## 示例：语言切换后刷新页面文本

```javascript
maplebirch.on(':language', () => {
  $('.my-mod-title').text(maplebirch.t('myMod:title'));
});
```
