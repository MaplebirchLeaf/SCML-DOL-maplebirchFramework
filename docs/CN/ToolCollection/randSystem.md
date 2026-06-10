## 随机数系统

### 用来做什么

`randSystem` 用于创建可复现的随机数生成器。它适合需要保存种子、回放随机结果、回退随机流程或调试随机事件的场景。

如果只是临时取一个普通随机数，可以使用全局工具函数 `random()` 或 `either()`；如果希望 _同一个状态产生同一串结果_，使用 **`maplebirch.tool.rand.create()`**。

---

### 使用入口

```javascript
const rng = maplebirch.tool.rand.create();
```

也可以传入可保存的状态对象：

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);
```

`create(state)` 会直接使用传入对象作为内部状态，因此适合把 `V` 中的对象交给随机系统，让随机序列跟随存档。

---

### 最小示例

```javascript
const rng = maplebirch.tool.rand.create();

rng.seed = 12345;

const percent = rng.percent(); // 1-100
const index = rng.int(5); // 0-5
```

---

### API

| API                                   | 说明                           |
| :------------------------------------ | :----------------------------- |
| `maplebirch.tool.rand.create(state?)` | 创建随机数生成器               |
| `rng.seed`                            | 获取或重置种子                 |
| `rng.int(max)`                        | 生成 `0-max` 的整数            |
| `rng.percent()`                       | 生成 `1-100` 的整数            |
| `rng.back(steps?)`                    | 把随机历史指针向后回退         |
| `rng.forward(steps?)`                 | 在已生成的历史中把指针向前恢复 |
| `rng.history`                         | 已生成结果的副本               |
| `rng.index`                           | 当前历史指针                   |

---

### 设置种子

```javascript
const rng = maplebirch.tool.rand.create();

rng.seed = 42;

const a = rng.percent();
const b = rng.percent();
```

使用相同种子会得到相同的随机序列：

```javascript
function roll(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.seed = seed;
  return [rng.percent(), rng.percent(), rng.percent()];
}

roll(100); // 每次结果一致
roll(100); // 与上方一致
```

---

### 百分比判定

`percent()` 返回 `1-100`，适合百分比判断。

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);

if (rng.percent() <= 30) {
  setup.myMod.triggerRareEvent();
}
```

---

### 范围随机数

`int(max)` 返回 `0` 到 `max` 之间的整数，最大值包含在结果范围内。

```javascript
const index = rng.int(4); // 0, 1, 2, 3, 4
const value = rng.int(100); // 0-100
```

如果要从数组中取值：

```javascript
const list = ['a', 'b', 'c'];
const item = list[rng.int(list.length - 1)];
```

---

### 回退与恢复

`back(steps)` 可以让随机指针回退；之后再次取随机数，会复用已经生成过的历史结果。

```javascript
const first = rng.percent();
const second = rng.percent();

rng.back(1);

const again = rng.percent(); // 与 second 相同
```

`forward(steps)` 只会在已经生成过的历史里向前移动指针，不会生成新的随机数。

```javascript
rng.back(2);
rng.forward(1);
```

这适合调试、历史回退，或在某些流程中重新计算同一次随机结果。

---

### 保存到存档

如果希望随机序列跟随存档，推荐保存完整状态对象：

```javascript
V.myMod ??= {};
V.myMod.rand ??= {};

const rng = maplebirch.tool.rand.create(V.myMod.rand);
```

状态对象包含 `seed`、`history` 和 `index`。如果只保存 `seed`，可以复现从头开始的序列；如果保存完整状态，则可以精确恢复已经走过的随机历史。

---

### 示例：随机遭遇

```javascript
function createEncounterRng() {
  V.myMod ??= {};
  V.myMod.encounterRand ??= {};

  return maplebirch.tool.rand.create(V.myMod.encounterRand);
}

function randomEncounter() {
  const rng = createEncounterRng();
  const roll = rng.percent();

  if (roll <= 20) return 'weakEnemy';
  if (roll <= 60) return 'normalEnemy';
  if (roll <= 85) return 'treasure';
  return 'specialEvent';
}
```

---

### 示例：固定道具池

```javascript
function generateLoot(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.seed = seed;

  const types = ['weapon', 'armor', 'potion', 'ring'];
  const type = types[rng.int(types.length - 1)];
  const rarityRoll = rng.percent();

  let rarity = 'common';
  if (rarityRoll <= 5) rarity = 'legendary';
  else if (rarityRoll <= 20) rarity = 'rare';

  return {
    type,
    rarity,
    value: rng.int(100) + 1
  };
}
```

---

### 补充说明

- `seed` 改变后会重新开始随机序列。
- `int(max)` 和 `percent()` 每调用一次都会推进随机指针。
- `back()` 与 `forward()` 只移动历史指针，不会直接产生随机值。
- 只需要普通随机时，优先考虑 [工具函数](../Utilities.md) 中的 `random()` 和 `either()`。
