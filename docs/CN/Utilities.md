# 工具函数

工具函数是框架提供给模组脚本共用的一组基础 API，用来减少重复代码。它们覆盖几类常见需求：

- 克隆、比较、合并对象或数组。
- 判断数组、对象、`Set`、`Map`、字符串中是否包含某些内容。
- 从数组中随机取值，或按权重取值。
- 转换字符串命名格式。
- 限制数字范围。
- 检查图片资源。
- 处理文本、JSON、字节、Base64 和路径。

框架初始化时会安装一部分原型/静态方法，同时也会把常用工具挂到全局，方便模组脚本直接使用。

## 推荐写法

对已有值操作时，使用原型方法：

```javascript
const copy = source.clone();
const same = oldData.equal(newData);
const ok = tags.contains('beast');
const key = 'My Text'.convert('snake');
```

创建新对象或新数组时，使用静态方法：

```javascript
const options = Object.merge(defaultOptions, userOptions);
const list = Array.append(baseList, modList);
```

数值工具放在 `Math` 上：

```javascript
const value = Math.clamp(input, 0, 100);
```

## 原型方法与静态方法

原型方法会修改调用者本身：

```javascript
target.merge(source);
target.append(source);
target.cover(source);
```

静态方法会创建一个新的对象或数组：

```javascript
const next = Object.merge(defaults, current);
const list = Array.append(base, extra);
```

如果你不想影响原数据，优先使用 `Object.merge()`、`Object.append()`、`Object.cover()`、`Array.merge()`、`Array.append()`、`Array.cover()`。

## 常用方法总览

| 方法                                    | 说明                           |
| :-------------------------------------- | :----------------------------- |
| `value.clone(deep, proto)`              | 克隆值                         |
| `value.equal(other)`                    | 深度比较                       |
| `target.merge(...sources)`              | 递归合并，数组按下标合并       |
| `target.append(...sources)`             | 递归合并，数组追加             |
| `target.cover(...sources)`              | 递归合并，数组替换             |
| `target.mergefn(fn, ...sources)`        | 带过滤函数的 `merge`           |
| `target.appendfn(fn, ...sources)`       | 带过滤函数的 `append`          |
| `target.coverfn(fn, ...sources)`        | 带过滤函数的 `cover`           |
| `Object.merge(...sources)`              | 创建新对象并 merge             |
| `Object.append(...sources)`             | 创建新对象并 append            |
| `Object.cover(...sources)`              | 创建新对象并 cover             |
| `Array.merge(...sources)`               | 创建新数组并 merge             |
| `Array.append(...sources)`              | 创建新数组并 append            |
| `Array.cover(...sources)`               | 创建新数组并 cover             |
| `value.contains(value, mode, opt)`      | 判断包含关系                   |
| `array.random()`                        | 从数组随机取一个元素           |
| `array.either(weights, allowNull)`      | 从数组随机取一个元素，可带权重 |
| `string.convert(mode, opt)`             | 字符串格式转换                 |
| `Math.random(max)`                      | `0` 到 `max` 的整数            |
| `Math.random(min, max, float)`          | `min` 到 `max` 的随机数        |
| `Math.clamp(value, min, max, fallback)` | 限制数值范围                   |
| `loadImage(src)`                        | 检查或加载图片资源             |

## clone

```javascript
const deepCopy = source.clone();
const shallowCopy = source.clone(false);
const plainCopy = source.clone(true, false);
```

参数：

| 参数    | 默认   | 说明           |
| :------ | :----- | :------------- |
| `deep`  | `true` | 是否深拷贝     |
| `proto` | `true` | 是否保留原型链 |

支持普通对象、数组、`Date`、`RegExp`、`Map`、`Set`、`ArrayBuffer`、`DataView` 和 TypedArray。

`clone()` 会处理循环引用。不可枚举属性不会被复制。

## equal

```javascript
const same = dataA.equal(dataB);
```

`equal()` 使用深度比较，适合比较对象、数组、嵌套结构。它比 `===` 更适合判断配置内容是否一致。

## merge / append / cover

这三个方法都会递归合并对象，区别主要在数组处理方式。

```javascript
({ list: [1, 2] }).merge({ list: [3] }); // { list: [3, 2] }
({ list: [1, 2] }).append({ list: [3] }); // { list: [1, 2, 3] }
({ list: [1, 2] }).cover({ list: [3] }); // { list: [3] }
```

对象会递归合并：

```javascript
const result = Object.merge({ npc: { enabled: true, count: 2 } }, { npc: { count: 4 } });
// { npc: { enabled: true, count: 4 } }
```

多个来源会按顺序合并，后面的来源优先：

```javascript
const options = Object.merge(defaults, modDefaults, playerOptions);
```

## mergefn / appendfn / coverfn

过滤版本会在每个字段合并前调用过滤函数。

```javascript
target.mergefn((key, value, depth, targetValue) => targetValue === undefined, source);
```

过滤函数参数：

| 参数          | 说明                       |
| :------------ | :------------------------- |
| `key`         | 当前字段名                 |
| `value`       | 来源对象中的值             |
| `depth`       | 当前递归深度，第一层为 `1` |
| `targetValue` | 目标对象中已有的值         |

常见用法：

```javascript
// 只写入目标中没有的字段
target.mergefn((_key, _value, _depth, targetValue) => targetValue === undefined, source);

// 只合并前两层
target.mergefn((_key, _value, depth) => depth <= 2, source);

// 跳过 null / undefined
target.mergefn((_key, value) => value != null, source);
```

## contains

数组：

```javascript
[1, 2, 3].contains(2); // true
[1, 2, 3].contains([1, 2], 'all'); // true
[1, 2, 3].contains([2, 4], 'any'); // true
[1, 2, 3].contains([4, 5], 'none'); // true
```

对象、`Set`、`Map` 会检查它们的值：

```javascript
({ a: 1, b: 2 }).contains(2); // true
new Set(['a', 'b']).contains('a'); // true
new Map([['key', 'value']]).contains('value'); // true
```

字符串：

```javascript
'Hello World'.contains('World'); // true
'Hello World'.contains('hello', { case: false }); // true
```

`mode` 可选：

| 模式   | 说明                         |
| :----- | :--------------------------- |
| `all`  | 传入数组时，所有值都必须存在 |
| `any`  | 任意一个值存在即可           |
| `none` | 所有值都不能存在             |

`options` 可选：

| 参数      | 默认    | 说明                     |
| :-------- | :------ | :----------------------- |
| `case`    | `true`  | 字符串比较是否区分大小写 |
| `deep`    | `false` | 是否使用深度比较         |
| `compare` | 无      | 自定义比较函数           |

示例：

```javascript
const list = [{ id: 1 }, { id: 2 }];
list.contains({ id: 1 }, 'any', { deep: true }); // true
list.contains(2, 'any', { compare: (item, value) => item.id === value }); // true
```

## random / either

`Math.random()` 保留原生无参数行为：

```javascript
Math.random(); // 0 到 1 的浮点数
```

带参数时使用框架扩展：

```javascript
Math.random(10); // 0 到 10 的整数
Math.random(5, 10); // 5 到 10 的整数
Math.random(5, 10, true); // 5 到 10 的浮点数
```

数组随机：

```javascript
['a', 'b', 'c'].random();
```

按权重选择：

```javascript
['rare', 'normal'].either([0.1, 0.9]);
```

允许返回 `null`：

```javascript
['a', 'b'].either(undefined, true);
```

需要可复现随机序列时，使用 [随机数系统](ToolCollection/randSystem.md)。

## convert

```javascript
'Hello World'.convert('snake'); // hello_world
'Hello World'.convert('kebab'); // hello-world
'hello world'.convert('pascal'); // HelloWorld
'hello world'.convert('camel'); // helloWorld
```

支持模式：

| 模式         | 示例          |
| :----------- | :------------ |
| `lower`      | `hello world` |
| `upper`      | `HELLO WORLD` |
| `capitalize` | `Hello world` |
| `title`      | `Hello World` |
| `camel`      | `helloWorld`  |
| `pascal`     | `HelloWorld`  |
| `snake`      | `hello_world` |
| `kebab`      | `hello-world` |
| `constant`   | `HELLO_WORLD` |

可选参数：

| 参数        | 默认   | 说明                             |
| :---------- | :----- | :------------------------------- |
| `delimiter` | 空格   | 拆分词语时优先使用的分隔符       |
| `acronym`   | `true` | `title` 模式下是否保留全大写缩写 |

```javascript
'NPC name'.convert('title'); // NPC Name
'NPC name'.convert('title', { acronym: false }); // Npc Name
```

## Math.clamp

```javascript
Math.clamp('12.5', 0, 100); // 12.5
Math.clamp(120, 0, 100); // 100
Math.clamp(undefined, 0, 100, 10); // 10
```

`fallback` 只在输入无法转换成有限数字时使用；不传时使用较小边界值。

`min` 和 `max` 可以反过来传，框架会自动取正确区间：

```javascript
Math.clamp(5, 10, 0); // 5
```

## loadImage

```javascript
const result = await loadImage('img/myMod/icon.png');

if (result) {
  console.log('图片可用');
}
```

`loadImage()` 会优先通过 ModLoader 读取图片。如果读取失败，会尝试检查路径本身是否可用。

返回值可能是：

| 返回值                       | 说明         |
| :--------------------------- | :----------- |
| `string`                     | 可用图片路径 |
| `true`                       | 图片存在     |
| `false`                      | 图片不可用   |
| `Promise<string \| boolean>` | 异步结果     |

异步场景建议始终使用 `await`。

## 字节与 Base64 工具

这些函数适合云存档、导入导出、压缩数据、网络请求等场景。

```javascript
const bytes = textToBytes('hello');
const text = bytesToText(bytes);

const jsonBytes = jsonToBytes({ ok: true });
const data = bytesToJson(jsonBytes);

const base64 = bytesToBase64(bytes);
const bytesAgain = base64ToBytes(base64);
const buffer = base64ToArrayBuffer(base64);
```

| 函数                          | 说明                                     |
| :---------------------------- | :--------------------------------------- |
| `textToBytes(text)`           | 字符串转 `Uint8Array`                    |
| `bytesToText(bytes)`          | `Uint8Array` / `ArrayBuffer` 转字符串    |
| `jsonToBytes(value)`          | JSON 数据转字节                          |
| `bytesToJson(bytes)`          | 字节转 JSON 数据                         |
| `toArrayBuffer(bytes)`        | 从 `Uint8Array` 截取准确的 `ArrayBuffer` |
| `bytesToBase64(bytes)`        | 字节转 Base64                            |
| `base64ToBytes(base64)`       | Base64 转字节                            |
| `base64ToArrayBuffer(base64)` | Base64 转 `ArrayBuffer`                  |
| `normalizeBase64(base64)`     | 修正 URL-safe Base64 和补齐 `=`          |

## 路径与文本工具

```javascript
trimSlashes('/a/b/'); // a/b
joinPath('/cloud/', '/slot/', '1'); // cloud/slot/1
joinEncodedPath('user name', 'slot 1'); // user%20name/slot%201
escapeHtmlText('<b>text</b>'); // &lt;b&gt;text&lt;/b&gt;
```

| 函数                            | 说明                               |
| :------------------------------ | :--------------------------------- |
| `basicAuth(username, password)` | 生成 Basic Auth 的 Base64 凭据部分 |
| `trimSlashes(value)`            | 去掉路径两端斜杠                   |
| `joinPath(...parts)`            | 拼接普通路径                       |
| `joinEncodedPath(...parts)`     | 拼接并编码路径                     |
| `escapeHtmlText(value)`         | 转义 HTML 文本                     |

## widgets

`widgets()` 用于清理 `.twee` 文件导入后的外层 passage 声明。

```javascript
import Options from '@/twee/Options.twee';

const content = widgets(Options);
```

传入多个内容时返回数组：

```javascript
const list = widgets(Options, Cheats);
```

## SelectCase

`SelectCase` 适合把一组条件和结果写成链式结构。

```javascript
const result = new SelectCase().case('wolf', '狼').caseIn(['cat', 'dog'], '动物').caseRange(0, 10, '低').caseIncludes('NPC', '角色').caseRegex(/^mod:/, '模组').else('未知').match(value);
```

常用方法：

| 方法                             | 说明         |
| :------------------------------- | :----------- |
| `case(value, result)`            | 精确匹配     |
| `case(fn, result)`               | 使用函数判断 |
| `caseRange(min, max, result)`    | 数值范围     |
| `caseIn(values, result)`         | 值在数组中   |
| `caseIncludes(text, result)`     | 字符串包含   |
| `caseRegex(regex, result)`       | 正则匹配     |
| `caseCompare(op, value, result)` | 比较运算     |
| `else(result)`                   | 默认结果     |
| `match(value, meta)`             | 执行匹配     |

## 全局函数

常用工具也会挂到全局，适合旧脚本或简单场景：

```javascript
clone(source);
equal(a, b);
merge(target, source);
append(target, source);
cover(target, source);
contains(list, value);
random(1, 10);
either(list);
convert('Hello World', 'snake');
clamp(value, 0, 100);
loadImage(src);
```

新代码更推荐原型/静态写法，因为阅读时更容易看出“谁是被操作的数据”。
