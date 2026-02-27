## 随机数系统 (randSystem)

### 基本介绍

`randSystem` 是一个可控的伪随机数生成器系统，允许您设置种子、回溯随机数历史，确保随机结果的确定性和可重复性。这在需要可重现随机结果的场景(如调试、测试、游戏存档)中非常有用。
_可通过 `maplebirch.tool.rand` 或快捷接口 `maplebirchFrameworks.rand()` 创建实例。_

---

### 核心功能

#### **创建随机数生成器 (create)**

- 创建一个新的随机数生成器实例
- **@return**: 新的随机数生成器实例
- **@example**:

  ```javascript
  // 标准访问方式
  const rng = maplebirch.tool.rand.create();

  // 快捷访问方式
  const rng = maplebirchFrameworks.rand();
  ```

#### **设置种子 (Seed)**

- 设置随机数生成器的种子
- **@param**: `seed` (number): 随机数种子
- **@getter**: 返回当前种子值
- **@setter**: 设置新的种子值
- **@example**:
  ```javascript
  rng.Seed = 12345; // 设置种子
  const seed = rng.Seed; // 获取当前种子
  ```

#### **生成随机数 (get)**

- 生成指定范围内的随机整数
- **@param**: `max` (number): 最大值(包含)
- **@return**: 0 到 max 之间的随机整数
- **@example**:
  ```javascript
  rng.get(10); // 返回 0-10 之间的随机整数
  rng.get(100); // 返回 0-100 之间的随机整数
  ```

#### **生成百分比随机数 (rng)**

- 生成 1-100 的随机整数(常用于百分比判定)
- **@return**: 1 到 100 之间的随机整数
- **@example**:

  ```javascript
  const roll = rng.rng; // 返回 1-100 的随机数

  // 用于百分比判定
  if (roll <= 30) {
    console.log('30%概率事件发生');
  }
  ```

#### **回溯 (backtrack)**

- 将随机数指针回退指定步数
- **@param**: `steps` (number): 回退的步数
- **@example**:
  ```javascript
  const roll1 = rng.rng; // 生成一个随机数
  rng.backtrack(1); // 回退一步
  const roll2 = rng.rng; // roll1 和 roll2 相同
  ```

#### **获取历史记录 (history)**

- 获取已生成随机数的历史记录
- **@return**: 随机数历史数组
- **@example**:

  ```javascript
  rng.rng; // 生成一个随机数
  rng.rng; // 生成第二个随机数

  console.log(rng.history); // 查看历史记录
  console.log(rng.pointer); // 查看当前指针位置
  ```

---

### 完整使用示例

#### **示例1：基础随机数生成**

```javascript
// 创建随机数生成器
const rng = maplebirch.tool.rand.create();

// 设置种子(确保可重复性)
rng.Seed = 42;

// 生成随机数
const num1 = rng.get(10); // 0-10 的随机整数
const num2 = rng.rng; // 1-100 的随机整数
const num3 = rng.get(50); // 0-50 的随机整数

console.log(`随机数: ${num1}, ${num2}, ${num3}`);

// 查看历史记录
console.log('历史记录:', rng.history);
console.log('当前指针:', rng.pointer);
```

#### **示例2：可重复的随机序列**

```javascript
// 相同的种子总是产生相同的随机序列
function testSeed(seed) {
  const rng = maplebirch.tool.rand.create();
  rng.Seed = seed;

  console.log(`种子 ${seed} 的随机序列:`);
  for (let i = 0; i < 5; i++) {
    console.log(rng.rng);
  }
}

testSeed(12345); // 总是产生相同的 5 个随机数
testSeed(12345); // 再次运行，结果相同
```

#### **示例3：随机回溯功能**

```javascript
// 创建随机数生成器
const rng = maplebirch.tool.rand.create();
rng.Seed = 100;

// 生成一些随机数
console.log('第一次生成:', rng.rng); // 假设是 42
console.log('第二次生成:', rng.rng); // 假设是 87
console.log('第三次生成:', rng.rng); // 假设是 15

// 回溯一步
rng.backtrack(1);
console.log('回溯后的下一个:', rng.rng); // 再次得到 15

// 回溯两步
rng.backtrack(2);
console.log('回溯两步后的下一个:', rng.rng); // 得到 87
```

#### **示例4：游戏中的随机事件**

```javascript
// 创建游戏随机数生成器
const gameRng = maplebirch.tool.rand.create();

// 保存种子到存档
V.rngSeed = Date.now();
gameRng.Seed = V.rngSeed;

// 随机遭遇系统
function randomEncounter() {
  const roll = gameRng.rng;

  if (roll <= 20) {
    return 'enemy_weak';
  } else if (roll <= 50) {
    return 'enemy_normal';
  } else if (roll <= 70) {
    return 'enemy_strong';
  } else if (roll <= 85) {
    return 'treasure';
  } else if (roll <= 95) {
    return 'npc';
  } else {
    return 'special_event';
  }
}

// 使用回溯重试
function retryEncounter() {
  // 回退到生成遭遇判定之前
  gameRng.backtrack(1);
  return randomEncounter();
}
```

#### **示例5：随机道具生成**

```javascript
// 使用相同种子确保相同的随机道具分布
function generateRandomItems(seed, count) {
  const rng = maplebirch.tool.rand.create();
  rng.Seed = seed;

  const items = [];
  const itemTypes = ['weapon', 'armor', 'potion', 'scroll', 'ring'];

  for (let i = 0; i < count; i++) {
    const typeIndex = rng.get(itemTypes.length - 1);
    const rarityRoll = rng.rng;

    let rarity = 'common';
    if (rarityRoll <= 5) rarity = 'legendary';
    else if (rarityRoll <= 20) rarity = 'epic';
    else if (rarityRoll <= 50) rarity = 'rare';

    items.push({
      type: itemTypes[typeIndex],
      rarity: rarity,
      value: rng.get(100) + 1
    });
  }

  return items;
}

// 相同的种子总是产生相同的道具列表
const items1 = generateRandomItems(12345, 10);
const items2 = generateRandomItems(12345, 10);
console.log(JSON.stringify(items1) === JSON.stringify(items2)); // true
```

---

### 属性说明

| 属性      | 类型     | 说明                                                 |
| :-------- | :------- | :--------------------------------------------------- |
| `Seed`    | number   | 当前随机数种子，设置新种子会重置历史                 |
| `history` | number[] | 已生成随机数的历史记录数组                           |
| `pointer` | number   | 当前指针位置，指向下一个要生成的随机数在历史中的位置 |
| `rng`     | number   | 1-100 的随机整数，常用于百分比判定                   |

---

### 算法说明

`randSystem` 使用线性同余生成器(LCG)算法：
