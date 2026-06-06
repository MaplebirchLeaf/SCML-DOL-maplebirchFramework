# 工具函数

工具函数是框架提供给模组脚本共用的一组轻量 API，用来处理常见但容易写散的逻辑：对象克隆、配置合并、数组追加、包含关系、随机选择、字符串命名转换、数值边界限制，以及图片资源检查。

这些方法会在框架初始化时安装到全局环境中。模组既可以直接使用 `clone()`、`merge()`、`loadImage()` 这类全局函数，也可以使用更推荐的原型/静态写法：

- 对已有值操作时，用原型方法，例如 `source.clone()`、`target.merge(source)`、`'name'.convert('title')`。
- 想创建一个新对象或新数组时，用静态方法，例如 `Object.merge(defaults, current)`、`Array.append(base, extra)`。
- 数值工具挂在 `Math` 上，例如 `Math.clamp(value, min, max)`。

需要注意的是，`target.merge()`、`target.append()`、`target.cover()` 会修改调用者本身；如果不想改原对象，请用 `Object.merge()` / `Array.append()` 这类静态方法。

```javascript
const data = source.clone();
const next = Object.merge(defaults, current ?? {});
const value = Math.clamp(input, 0, 100);
const key = 'My Text'.convert('snake');
```

## 常用方法

| 方法 | 用途 |
| :--- | :--- |
| `value.clone(deep, proto)` | 克隆值 |
| `value.equal(other)` | 深度比较 |
| `target.merge(source)` | 递归合并对象，数组按下标合并 |
| `target.append(source)` | 递归合并对象，数组追加 |
| `target.cover(source)` | 递归合并对象，数组覆盖 |
| `target.mergefn(fn, source)` | 带过滤函数的 `merge` |
| `target.appendfn(fn, source)` | 带过滤函数的 `append` |
| `target.coverfn(fn, source)` | 带过滤函数的 `cover` |
| `value.contains(item, mode, options)` | 包含关系判断 |
| `array.random()` | 随机取一个元素 |
| `array.either(weights, allowNull)` | 随机取一个候选项，可带权重 |
| `string.convert(mode, options)` | 字符串格式转换 |
| `Math.random(max)` / `Math.random(min, max, float)` | 随机数 |
| `Math.clamp(value, min, max, fallback)` | 数值限制到区间内 |
| `loadImage(src)` | 检查或加载图片 |

## clone

```javascript
const next = source.clone();
const shallow = source.clone(false);
const plain = source.clone(true, false);
```

参数：

| 参数 | 默认 | 说明 |
| :--- | :--- | :--- |
| `deep` | `true` | 是否深拷贝 |
| `proto` | `true` | 是否保留原型链 |

支持普通对象、数组、`Date`、`RegExp`、`Map`、`Set`、`ArrayBuffer`、`DataView` 和 TypedArray。

## merge / append / cover

这三个方法都会修改调用者本身。

```javascript
target.merge(source);
target.append(source);
target.cover(source);
```

区别主要在数组：

```javascript
({ list: [1, 2] }).merge({ list: [3] });  // { list: [3, 2] }
({ list: [1, 2] }).append({ list: [3] }); // { list: [1, 2, 3] }
({ list: [1, 2] }).cover({ list: [3] });  // { list: [3] }
```

如果想生成新对象，不想改原对象，用静态方法：

```javascript
const next = Object.merge(defaults, current);
const list = Array.append(baseList, extraList);
```

过滤版本适合只合并部分字段：

```javascript
target.mergefn((key, value, depth, targetValue) => targetValue === undefined, source);
```

## contains

```javascript
[1, 2, 3].contains(2); // true
[1, 2, 3].contains([1, 2], 'all'); // true
[1, 2, 3].contains([2, 4], 'any'); // true
[1, 2, 3].contains([4, 5], 'none'); // true
'Hello World'.contains('hello', { case: false }); // true
```

对象、`Set`、`Map` 也可以调用，会使用它们的值进行判断。

## random / either

```javascript
Math.random(); // 原生 0-1 浮点数
Math.random(10); // 0-10 整数
Math.random(5, 10); // 5-10 整数
Math.random(5, 10, true); // 5-10 浮点数

['a', 'b', 'c'].random();
['rare', 'normal'].either([0.1, 0.9]);
['a', 'b'].either(undefined, true); // 允许返回 null
```

需要可复现随机序列时，使用 [随机数系统](ToolCollection/randSystem.md)。

## convert

```javascript
'Hello World'.convert('snake'); // hello_world
'Hello World'.convert('kebab'); // hello-world
'hello world'.convert('pascal'); // HelloWorld
```

支持模式：

| 模式 | 示例 |
| :--- | :--- |
| `lower` | `hello world` |
| `upper` | `HELLO WORLD` |
| `capitalize` | `Hello world` |
| `title` | `Hello World` |
| `camel` | `helloWorld` |
| `pascal` | `HelloWorld` |
| `snake` | `hello_world` |
| `kebab` | `hello-world` |
| `constant` | `HELLO_WORLD` |

## Math.clamp

```javascript
Math.clamp('12.5', 0, 100); // 12.5
Math.clamp(120, 0, 100); // 100
Math.clamp(undefined, 0, 100, 10); // 10
```

`fallback` 只会在输入无法转换成有限数字时使用；不传时使用较小边界值。

## loadImage

```javascript
const result = await loadImage('img/myMod/icon.png');

if (result) {
  console.log('图片可用');
}
```

`loadImage()` 可能返回布尔值、图片路径或 Promise，异步场景建议使用 `await`。
