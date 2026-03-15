## 工具函数 (Utilities)

### 基本介绍

框架提供了一套完整的工具函数集，已全局挂载在 `window` 对象上，可在模组开发的任意位置直接使用。  
这些函数涵盖了数据处理、随机生成、条件处理、字符串处理、数值修整、图片加载等常见场景，可用于减少重复代码并提高模组开发效率。

所有工具函数均可直接调用，例如：

```javascript
const result = clone({ a: 1 });
const value = number('12.5');
const text = convert('Hello World', 'snake');
```

---

### 工具函数列表

| 函数         | 类别       | 主要功能                                     |
| :----------- | :--------- | :------------------------------------------- |
| `clone`      | 数据处理   | 深度克隆对象，支持多种数据类型               |
| `equal`      | 数据处理   | 深度比较两个值是否相等                       |
| `merge`      | 数据处理   | 递归合并多个对象，支持多种合并模式           |
| `contains`   | 数组处理   | 检查数组是否包含指定元素                     |
| `random`     | 随机生成   | 生成随机数，支持整数、浮点数                 |
| `either`     | 随机生成   | 从选项中随机选择一个，支持权重               |
| `SelectCase` | 条件处理   | 提供链式 API 的条件选择器                    |
| `convert`    | 字符串处理 | 将字符串转换为指定格式                       |
| `number`     | 数值处理   | 将输入修整为合法数值，支持范围、取整、步进等 |
| `loadImage`  | 资源处理   | 检查并加载图片资源                           |

---

### 数据处理工具

#### **深度克隆 (clone)**

用于深度克隆常见对象，支持：

- 普通对象
- 数组
- `Date`
- `RegExp`
- `Map`
- `Set`
- `ArrayBuffer`
- `DataView`
- TypedArray

**参数说明：**

- `source`：要克隆的源对象
- `opt.deep`：是否深克隆，默认为 `true`
- `opt.proto`：是否保留原型链，默认为 `true`

**返回值：**

- 返回克隆后的新对象

```javascript
// 深克隆对象
const original = { a: 1, b: { c: 2 } };
const cloned = clone(original); // { a: 1, b: { c: 2 } }
console.log(cloned.b === original.b); // false

// 浅克隆数组
const arr = [1, [2, 3]];
const shallowArr = clone(arr, { deep: false });
console.log(shallowArr[1] === arr[1]); // true
```

#### **深度比较 (equal)**

用于深度比较两个值是否相等，内部基于 lodash 的深比较逻辑。

**参数说明：**

- `a`：第一个值
- `b`：第二个值

**返回值：**

- `true`：两个值深度相等
- `false`：两个值不相等

```javascript
// 对象比较
equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
equal({ a: 1 }, { a: 2 }); // false

// 特殊值比较
equal(new Date(2025, 0, 1), new Date(2025, 0, 1)); // true
equal(/abc/i, /abc/i); // true
```

#### **递归合并 (merge)**

`merge` 会原地修改目标对象，并递归合并后续对象。

支持模式：

- `replace`：替换数组，默认模式
- `concat`：拼接数组
- `merge`：按索引递归合并数组

**参数说明：**

- `target`：合并目标对象，会被原地修改
- `...sources`：一个或多个源对象
- `mode`：数组合并模式，可选 `'replace' | 'concat' | 'merge'`
- `filterFn`：自定义过滤函数，用于控制某个字段是否允许被合并

**返回值：**

- 返回合并后的 `target`

```javascript
// 基本合并
const target = { a: 1 };
const source = { b: 2 };
merge(target, source); // { a: 1, b: 2 }

// 数组合并模式
const obj1 = { arr: [1, 2] };
const obj2 = { arr: [3, 4] };
merge(obj1, obj2, { mode: 'concat' }); // { arr: [1, 2, 3, 4] }

// 自定义过滤
merge(target, source, {
  filterFn: (key, value, depth, targetValue) => {
    return targetValue === undefined; // 只合并不存在的属性
  }
});
```

---

### 数组处理工具

#### **数组包含检查 (contains)**

支持单值、多值、深度比较、忽略大小写、自定义比较函数。

模式说明：

- `all`：全部存在
- `any`：任意存在
- `none`：全部不存在

**参数说明：**

- `arr`：要检查的目标数组
- `value`：待检查的值，可为单个值或数组
- `mode`：匹配模式，可选 `'all' | 'any' | 'none'`，默认为 `'all'`
- `opt.case`：字符串比较时是否区分大小写，默认为 `true`
- `opt.compare`：自定义比较函数
- `opt.deep`：是否使用深度比较，默认为 `false`

**返回值：**

- 返回布尔值，表示是否满足指定匹配条件

```javascript
// 基本检查
contains([1, 2, 3], 2); // true
contains([1, 2, 3], 4); // false

// 多值检查
contains([1, 2, 3], [1, 2], 'all'); // true
contains([1, 2, 3], [1, 4], 'any'); // true
contains([1, 2, 3], [4, 5], 'none'); // true

// 单值也支持 mode
contains([1, 2, 3], 2, 'none'); // false
contains([1, 2, 3], 4, 'none'); // true

// 深度比较
contains([{ x: 1 }, { y: 2 }], { x: 1 }, 'all', { deep: true }); // true
```

---

### 随机生成工具

#### **随机数生成 (random)**

用于生成随机整数或随机浮点数。

**参数说明：**

- `min`：最小值，支持数字或配置对象
- `max`：最大值
- `float`：是否生成浮点数，默认为 `false`

当第一个参数为对象时，可使用：

- `min`：最小值
- `max`：最大值
- `float`：是否生成浮点数

**返回值：**

- 返回生成的随机数

```javascript
random(); // 0-1之间的随机浮点数
random(10); // 0-10的随机整数
random(5, 10); // 5-10的随机整数
random(5, 10, true); // 5-10的随机浮点数
random({ min: 5, max: 10, float: true }); // 配置对象方式
```

#### **随机选择 (either)**

支持数组形式、参数形式，以及权重和 `null` 选项。

**参数说明：**

- `itemsOrA`：候选项数组，或第一个候选值
- `...rest`：其余候选项，或配置对象
- `weights`：权重数组，长度需与候选项一致
- `null`：是否允许返回 `null`

**返回值：**

- 返回随机选中的值
- 当配置不合法或候选为空时，可能返回 `undefined`

```javascript
either(['A', 'B', 'C']); // 随机返回其中一个
either('A', 'B', 'C'); // 参数方式

either(['A', 'B'], {
  weights: [0.8, 0.2]
}); // 80%概率返回'A'

either(['A', 'B'], {
  null: true
}); // 约 1 / (items.length + 1) 概率返回 null
```

---

### 条件处理工具

#### **条件选择器 (SelectCase)**

适合多条件分支、范围匹配、正则匹配和自定义判断。

支持的方法包括：

- `.case()`：精确匹配或谓词匹配
- `.casePredicate()`：自定义函数匹配
- `.caseRange()`：数值范围匹配
- `.caseIn()`：集合匹配
- `.caseIncludes()`：字符串包含匹配
- `.caseRegex()`：正则匹配
- `.caseCompare()`：比较运算匹配
- `.else()`：设置默认返回值
- `.match()`：执行匹配

**返回值：**

- `match()` 返回首个命中条件对应的结果
- 若未命中任何条件，则返回 `else()` 设置的默认值

```javascript
const selector = new SelectCase()
  .case(1, 'One')
  .case(2, 'Two')
  .caseRange(3, 5, 'Three to Five')
  .caseIn(['admin', 'root'], '管理员')
  .caseIncludes(['error', 'fail'], '错误状态')
  .caseRegex(/^\d+$/, '纯数字')
  .casePredicate(x => x > 10, '大于10')
  .else('未知');

selector.match(1); // 'One'
selector.match(4); // 'Three to Five'
selector.match('admin'); // '管理员'
selector.match(15); // '大于10'
selector.match('test'); // '未知'
```

---

### 字符串处理工具

#### **字符串转换 (convert)**

支持常见命名风格转换，也支持 `title` 模式下保留首字母缩略词。

支持模式：

- `lower`
- `upper`
- `capitalize`
- `title`
- `camel`
- `pascal`
- `snake`
- `kebab`
- `constant`

**参数说明：**

- `str`：待转换字符串
- `mode`：转换模式，默认为 `'lower'`
- `opt.delimiter`：自定义分隔符，默认为空格
- `opt.acronym`：在 `title` 模式下是否保留全大写缩略词，默认为 `true`

**返回值：**

- 返回转换后的字符串

```javascript
convert('Hello World', 'lower'); // 'hello world'
convert('Hello World', 'upper'); // 'HELLO WORLD'
convert('Hello World', 'capitalize'); // 'Hello world'
convert('Hello World', 'title'); // 'Hello World'
convert('Hello World', 'camel'); // 'helloWorld'
convert('Hello World', 'pascal'); // 'HelloWorld'
convert('Hello World', 'snake'); // 'hello_world'
convert('Hello World', 'kebab'); // 'hello-world'
convert('Hello World', 'constant'); // 'HELLO_WORLD'

convert('HTTP API', 'title', { acronym: false }); // 'Http Api'
convert('HTTP API', 'title', { acronym: true }); // 'HTTP API'
```

---

### 数值处理工具

#### **数值修整 (number)**

`number` 用于把任意输入修整成可用数值，支持：

- 非法值回退
- 最小/最大范围限制
- 取整模式
- 步进吸附
- 百分比输出
- 循环区间

**参数说明：**

- `value`：原始输入
- `fallback`：当输入不是合法有限数值时使用的默认值，默认为 `0`
- `min`：最小值，默认为 `-Infinity`
- `max`：最大值，默认为 `Infinity`
- `mode`：取整模式，可选 `'none' | 'floor' | 'ceil' | 'round' | 'trunc'`，默认为 `'none'`
- `opt.step`：步进值，大于 `0` 时启用步进吸附
- `opt.percent`：是否返回当前数值在 `[min, max]` 区间中的百分比
- `opt.loop`：是否将区间视为循环区间

**返回值：**

- 默认返回修整后的数值
- 当 `opt.percent` 为 `true` 时，返回 `0 ~ 100` 之间的百分比数值

```javascript
number('12.5'); // 12.5
number(undefined, 10); // 10
number(120, 0, 0, 100); // 100
number(5.8, 0, 0, 10, 'floor'); // 5
number(17, 0, 0, 100, 'round', { step: 5 }); // 15
number(370, 0, 0, 360, 'none', { loop: true }); // 10
number(75, 0, 0, 200, 'none', { percent: true }); // 37.5
```

---

### 资源处理工具

#### **图片加载 (loadImage)**

用于检查图片资源是否存在，并在可用时返回可加载结果。

**参数说明：**

- `src`：图片路径

**返回值：**

- 同步情况下返回：
  - `string`：可用图片路径或处理后的图片结果
  - `boolean`：图片是否存在
- 异步情况下返回：
  - `Promise<string | boolean>`

```javascript
// 同步检查
const exists = loadImage('character.png');
if (exists) {
  console.log('图片存在');
}

// 异步加载
loadImage('character.png').then(data => {
  if (typeof data === 'string') {
    document.getElementById('avatar').src = data;
  }
});

// 在SugarCube段落中使用
<<script>>
  const imgData = await loadImage('npc_portrait.png');
  if (imgData) {
    V.npcImage = imgData;
  }
<</script>>
```
