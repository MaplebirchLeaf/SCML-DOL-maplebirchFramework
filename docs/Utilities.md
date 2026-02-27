## 工具函数 (Utilities)

### 基本介绍

框架提供了一套完整的工具函数集，已全局挂载在 `window` 对象上，可在模组开发的任意位置直接使用。这些函数涵盖了数据处理、随机生成、字符串处理、图片加载等常见场景，为模组开发提供便利。

---

### 工具函数列表

| 函数         | 类别       | 主要功能                           |
| :----------- | :--------- | :--------------------------------- |
| `clone`      | 数据处理   | 深度克隆对象，支持多种数据类型     |
| `equal`      | 数据处理   | 深度比较两个值是否相等             |
| `merge`      | 数据处理   | 递归合并多个对象，支持多种合并模式 |
| `contains`   | 数组处理   | 检查数组是否包含指定元素           |
| `random`     | 随机生成   | 生成随机数，支持整数、浮点数       |
| `either`     | 随机生成   | 从选项中随机选择一个，支持权重     |
| `SelectCase` | 条件处理   | 提供链式API的条件选择器            |
| `convert`    | 字符串处理 | 将字符串转换为指定格式             |
| `loadImage`  | 资源处理   | 检查并加载图片资源                 |

---

### 数据处理工具

#### **深度克隆 (clone)**

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

```javascript
// 对象比较
equal({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }); // true
equal({ a: 1 }, { a: 2 }); // false

// 特殊值比较
equal(new Date(2025, 0, 1), new Date(2025, 0, 1)); // true
equal(/abc/i, /abc/i); // true
```

#### **递归合并 (merge)**

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

```javascript
// 基本检查
contains([1, 2, 3], 2); // true
contains([1, 2, 3], 4); // false

// 多值检查
contains([1, 2, 3], [1, 2], 'all'); // 包含所有值
contains([1, 2, 3], [1, 4], 'any'); // 包含任意一个值
contains([1, 2, 3], [4, 5], 'none'); // 不包含任何值

// 深度比较
contains([{ x: 1 }, { y: 2 }], { x: 1 }, 'all', { deep: true }); // true
```

---

### 随机生成工具

#### **随机数生成 (random)**

```javascript
random(); // 0-1之间的随机浮点数
random(10); // 0-10的随机整数
random(5, 10); // 5-10的随机整数
random(5, 10, true); // 5-10的随机浮点数
random({ min: 5, max: 10, float: true }); // 配置对象方式
```

#### **随机选择 (either)**

```javascript
either(['A', 'B', 'C']); // 随机返回其中一个
either('A', 'B', 'C'); // 参数方式
either(['A', 'B'], {
  weights: [0.8, 0.2]
}); // 80%概率返回'A'
either(['A', 'B'], {
  null: true
}); // 33%概率返回null
```

---

### 条件处理工具

#### **条件选择器 (SelectCase)**

```javascript
// 链式API条件选择
const selector = new SelectCase()
  .case(1, 'One')
  .case(2, 'Two')
  .caseRange(3, 5, 'Three to Five')
  .caseIn(['admin', 'root'], '管理员')
  .caseIncludes(['error', 'fail'], '错误状态')
  .caseRegex(/^d+$/, '纯数字')
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
```

---

### 资源处理工具

#### **图片加载 (loadImage)**

```javascript
// 同步检查
const exists = loadImage('character.png');
if (exists) {
  console.log('图片存在');
}

// 异步加载
loadImage('character.png').then(data => {
  if (typeof data === 'string') {
    // 使用 data URL
    document.getElementById('avatar').src = data;
  }
});

// 在SugarCube段落中使用
<<script>>
  const imgData = await loadImage('npc_portrait.png');
  if (imgData) {
    State.variables.npcImage = imgData;
  }
<</script>>
```

---

### 组合使用示例

#### **示例1：游戏道具系统**

```javascript
// 深克隆道具模板
const itemTemplate = {
  id: 0,
  name: '道具',
  attributes: { attack: 0, defense: 0 },
  effects: []
};

// 创建新道具
function createItem(id, name, attributes) {
  const item = clone(itemTemplate);
  merge(item, { id, name, attributes });
  return item;
}

// 检查道具是否匹配条件
const itemSelector = new SelectCase().caseRange(1, 10, '普通道具').caseRange(11, 20, '稀有道具').caseRange(21, 30, '史诗道具').else('未知道具');
```
