## 工具函数

## 用来做什么

框架提供了一组全局工具函数，可直接在模组脚本中使用。它们适合处理对象复制、对象合并、随机数、条件选择、字符串格式转换、数值整理和图片检查。

```javascript
const data = clone(source);
const value = number(input, 0, 0, 100);
const id = convert('My Text', 'snake');
```

---

## 函数列表

| 函数 | 用途 |
| :--- | :--- |
| `clone()` | 克隆对象 |
| `equal()` | 深度比较 |
| `merge()` | 合并对象 |
| `contains()` | 检查数组包含关系 |
| `random()` | 生成随机数 |
| `either()` | 从候选项中随机取一个 |
| `SelectCase` | 链式条件选择器 |
| `convert()` | 字符串格式转换 |
| `number()` | 数值整理 |
| `loadImage()` | 检查或加载图片 |

---

## clone

深拷贝对象。

```javascript
const next = clone({
  a: 1,
  b: {
    c: 2
  }
});
```

浅拷贝：

```javascript
const next = clone(source, {
  deep: false
});
```

保留原型链：

```javascript
const next = clone(source, {
  proto: true
});
```

支持普通对象、数组、`Date`、`RegExp`、`Map`、`Set`、`ArrayBuffer`、TypedArray 等常见类型。

---

## equal

深度比较两个值。

```javascript
equal({ a: 1 }, { a: 1 }); // true
equal({ a: 1 }, { a: 2 }); // false
```

---

## merge

递归合并对象。第一个参数会被修改并作为结果返回。

```javascript
const target = { a: 1 };
merge(target, { b: 2 });
```

数组合并模式：

```javascript
merge(target, source, {
  mode: 'replace' // replace | concat | merge
});
```

过滤字段：

```javascript
merge(target, source, {
  filterFn: (key, value, depth, targetValue) => {
    return targetValue === undefined;
  }
});
```

---

## contains

检查数组是否包含指定值。

```javascript
contains([1, 2, 3], 2); // true
```

多个值：

```javascript
contains([1, 2, 3], [1, 2], 'all'); // true
contains([1, 2, 3], [2, 4], 'any'); // true
contains([1, 2, 3], [4, 5], 'none'); // true
```

深度比较：

```javascript
contains([{ id: 1 }], { id: 1 }, 'all', {
  deep: true
});
```

---

## random

生成随机数。

```javascript
random(); // 0-1 浮点数
random(10); // 0-10 整数
random(5, 10); // 5-10 整数
random(5, 10, true); // 5-10 浮点数
```

对象写法：

```javascript
random({
  min: 5,
  max: 10,
  float: true
});
```

需要可复现随机序列时，使用 [随机数系统](ToolCollection/randSystem.md)。

---

## either

从候选项中随机选择一个。

```javascript
either(['a', 'b', 'c']);
either('a', 'b', 'c');
```

权重：

```javascript
either(['rare', 'normal'], {
  weights: [0.1, 0.9]
});
```

允许返回 `null`：

```javascript
either(['a', 'b'], {
  null: true
});
```

---

## SelectCase

链式条件选择器，适合整理复杂分支。

```javascript
const result = new SelectCase()
  .case('rain', '下雨')
  .caseRange(6, 12, '上午')
  .caseRegex(/^shop/, '商店')
  .else('默认')
  .match(input);
```

常用方法：

| 方法 | 说明 |
| :--- | :--- |
| `.case(value, result)` | 精确匹配 |
| `.casePredicate(fn, result)` | 自定义判断 |
| `.caseRange(min, max, result)` | 数值范围 |
| `.caseIn(values, result)` | 在数组中 |
| `.caseIncludes(text, result)` | 字符串包含 |
| `.caseRegex(regex, result)` | 正则匹配 |
| `.caseCompare(op, value, result)` | 比较运算 |
| `.else(result)` | 默认结果 |
| `.match(input, meta?)` | 执行匹配 |

---

## convert

转换字符串格式。

```javascript
convert('Hello World', 'snake'); // hello_world
convert('Hello World', 'kebab'); // hello-world
convert('hello world', 'pascal'); // HelloWorld
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

---

## number

把输入整理成合法数值。

```javascript
number('12.5'); // 12.5
number(undefined, 10); // 10
number(120, 0, 0, 100); // 100
```

取整：

```javascript
number(5.8, 0, 0, 10, 'floor'); // 5
number(5.8, 0, 0, 10, 'round'); // 6
```

步进：

```javascript
number(17, 0, 0, 100, 'round', {
  step: 5
}); // 15
```

循环区间：

```javascript
number(370, 0, 0, 360, 'none', {
  loop: true
}); // 10
```

百分比：

```javascript
number(75, 0, 0, 200, 'none', {
  percent: true
}); // 37.5
```

---

## loadImage

检查图片是否可用，并在可用时返回可加载结果。

```javascript
const result = await loadImage('img/myMod/icon.png');

if (result) {
  console.log('图片可用');
}
```

`loadImage()` 可能返回布尔值、图片路径或 Promise，异步场景建议使用 `await`。

---

## 补充说明

- 这些函数会挂载到 `window`，可直接调用。
- `merge()` 会修改第一个参数；如果不想改原对象，先传入 `{}` 或 `clone()`。
- `random()` 使用普通随机；需要可保存种子的随机，请用 `maplebirch.tool.rand.create()`。
