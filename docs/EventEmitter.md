## 事件发射器

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

`description` 可用于之后移除监听。

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

自定义事件建议带模组名前缀，避免和其它模组冲突。

---

## after

`after()` 会在下一次指定事件触发后执行一次。

```javascript
maplebirch.after(':language', () => {
  setup.myMod.refreshText();
});
```

---

## 常用框架事件

| 事件 | 适合做什么 |
| :--- | :--- |
| `:storyready` | SugarCube 故事准备完成后的逻辑 |
| `:passageinit` | 获取当前 passage 信息 |
| `:passagestart` | passage 开始时刷新状态 |
| `:passagerender` | passage 渲染时处理 DOM 前逻辑 |
| `:passagedisplay` | passage 显示后处理页面 |
| `:passageend` | passage 结束阶段 |
| `:onSave` | 存档前后同步数据 |
| `:onLoad` | 读档时处理数据 |
| `:onLoadSave` | 读档进入页面流程后 |
| `:language` | 框架语言切换后 |
| `:modLoaderEnd` | ModLoader 加载结束 |

---

## 示例：读档后修复模组变量

```javascript
maplebirch.on(':onLoadSave', () => {
  V.myMod ??= {};
  V.myMod.flags ??= {};
});
```

---

## 示例：语言切换后刷新页面文本

```javascript
maplebirch.on(':language', () => {
  $('.my-mod-title').text(maplebirch.t('myMod.title'));
});
```

---

## 补充说明

- 事件名可以是框架内置事件，也可以是自定义字符串。
- `trigger()` 会等待异步回调完成。
- 同一个函数引用重复注册会返回 `false`。
- 自定义事件建议使用 `myMod:eventName` 形式。
