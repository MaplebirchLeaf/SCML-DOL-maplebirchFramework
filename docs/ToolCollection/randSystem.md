## 随机数系统

### 用来做什么

`randSystem` 用于创建可复现的随机数生成器。它适合需要保存种子、回放随机结果或调试随机事件的场景。

如果只是临时取一个普通随机数，可以使用全局工具函数 `random()` 或 `either()`；如果希望“同一个种子产生同一串结果”，使用 `maplebirch.tool.rand.create()`。

---

### 使用入口

```javascript
const rng = maplebirch.tool.rand.create();
```

也可以传入初始状态：

```javascript
const rng = maplebirch.tool.rand.create({
  seed: 12345
});
```

---

### 最小示例

```javascript
const rng = maplebirch.tool.rand.create();

rng.Seed = 12345;

const percent = rng.rng; // 1-100
const index = rng.get(5); // 0-5
```

---

### API

| API | 说明 |
| :--- | :--- |
| `maplebirch.tool.rand.create(state?)` | 创建随机数生成器 |
| `rng.Seed` | 获取或设置种子 |
| `rng.rng` | 生成 `1-100` 的整数 |
| `rng.get(max)` | 生成 `0-max` 的整数 |
| `rng.backtrack(count)` | 回退随机指针 |
| `rng.history` | 已生成结果 |
| `rng.pointer` | 当前历史指针 |

---

### 设置种子

```javascript
const rng = maplebirch.tool.rand.create();

rng.Seed = 42;

const a = rng.rng;
const b = rng.rng;
```

使用相同种子会得到相同的随机序列：

```javascript
function roll(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.Seed = seed;
  return [rng.rng, rng.rng, rng.rng];
}

roll(100); // 每次结果一致
roll(100); // 与上方一致
```

---

### 百分比判定

`rng.rng` 返回 `1-100`，适合百分比判断。

```javascript
const rng = maplebirch.tool.rand.create();
rng.Seed = V.myMod.seed;

if (rng.rng <= 30) {
  setup.myMod.triggerRareEvent();
}
```

---

### 范围随机数

`get(max)` 返回 `0` 到 `max` 之间的整数。

```javascript
const index = rng.get(4); // 0, 1, 2, 3, 4
const value = rng.get(100); // 0-100
```

如果要从数组中取值：

```javascript
const list = ['a', 'b', 'c'];
const item = list[rng.get(list.length - 1)];
```

---

### 回退随机结果

`backtrack(count)` 可以让随机指针回退。

```javascript
const first = rng.rng;
const second = rng.rng;

rng.backtrack(1);

const again = rng.rng; // 与 second 相同
```

这适合调试，或在某些流程中需要重新计算同一次随机结果。

---

### 保存到存档

如果希望随机序列跟随存档，应保存种子：

```javascript
V.myMod ??= {};
V.myMod.seed ??= Date.now();

const rng = maplebirch.tool.rand.create();
rng.Seed = V.myMod.seed;
```

如果还需要精确恢复已走过的随机历史，可自行保存 `history` 和 `pointer`，再通过 `create(state)` 恢复。

---

### 示例：随机遭遇

```javascript
function createEncounterRng() {
  V.myMod ??= {};
  V.myMod.encounterSeed ??= Date.now();

  const rng = maplebirch.tool.rand.create();
  rng.Seed = V.myMod.encounterSeed;
  return rng;
}

function randomEncounter() {
  const rng = createEncounterRng();
  const roll = rng.rng;

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
  rng.Seed = seed;

  const types = ['weapon', 'armor', 'potion', 'ring'];
  const type = types[rng.get(types.length - 1)];
  const rarityRoll = rng.rng;

  let rarity = 'common';
  if (rarityRoll <= 5) rarity = 'legendary';
  else if (rarityRoll <= 20) rarity = 'rare';

  return {
    type,
    rarity,
    value: rng.get(100) + 1
  };
}
```

---

### 补充说明

- `Seed` 改变后会重新开始随机序列。
- `rng.rng` 是属性访问，每读取一次都会推进随机指针。
- `get(max)` 的最大值包含在结果范围内。
- 只需要普通随机时，优先考虑 [工具函数](../Utilities.md) 中的 `random()` 和 `either()`。
