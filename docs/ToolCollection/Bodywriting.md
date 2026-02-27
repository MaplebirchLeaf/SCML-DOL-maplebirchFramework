## 纹身系统 (Bodywriting System)

### 基本介绍

`Bodywriting` 是框架提供的纹身管理系统，允许模组制作者添加或删除自定义的纹身图案。纹身在游戏中通常用于角色自定义、状态标记、剧情表达等场景。

_可通过 `maplebirch.tool.other.addBodywriting()` 访问。_

---

### 核心功能

#### **添加纹身 (addBodywriting)**

- 添加一个新的纹身图案
- **@param**:
  - `key` (string): 纹身的唯一标识符
  - `config` (BodywritingConfig): 纹身配置对象
- **@return**: void
- **@example**:
  ```javascript
  maplebirch.tool.other.addBodywriting('dragon_tattoo', {
    writing: 'Dragon',
    writ_cn: '龙纹',
    type: 'text',
    gender: 'n',
    lewd: 0
  });
  ```

### 纹身配置对象 (BodywritingConfig)

| 属性       | 类型            | 说明                  | 默认值 |
| :--------- | :-------------- | :-------------------- | :----- |
| `writing`  | string          | 纹身的英文名称        | -      |
| `writ_cn`  | string          | 纹身的中文名称        | -      |
| `type`     | 'text'/'object' | 纹身类型              | 'text' |
| `arrow`    | 0/1             | 是否有箭头标记        | 0      |
| `special`  | string          | 特殊标记              | 'none' |
| `gender`   | 'n'/'f'/'m'/'h' | 适用性别              | 'n'    |
| `lewd`     | 0/1             | 是否色情内容          | 0      |
| `degree`   | number          | 纹身程度/强度         | 0      |
| `featSkip` | boolean         | 是否跳过特征检查      | true   |
| `sprites`  | string[]        | 使用的精灵图名称数组  | -      |
| `index`    | number          | 纹身索引(自动生成)    | -      |
| `key`      | string          | 纹身键名(同传入的key) | -      |

#### **性别说明**

- `'n'`: 中性/通用
- `'f'`: 女性
- `'m'`: 男性
- `'h'`: 双性

#### **类型说明**

- `'text'`: 文本纹身
- `'object'`: 图案纹身

---

### 完整使用示例

#### **示例1：基本文本纹身**

```javascript
// 添加一个简单的文本纹身
maplebirch.tool.other.addBodywriting('tribal_symbol', {
  writing: 'Tribal Symbol',
  writ_cn: '部落符号',
  type: 'text',
  gender: 'n', // 中性，男女通用
  lewd: 0, // 非色情内容
  degree: 1 // 轻微程度
});
```

#### **示例2：图案纹身**

```javascript
// 添加一个图案纹身
maplebirch.tool.other.addBodywriting('phoenix_tattoo', {
  writing: 'Phoenix',
  writ_cn: '凤凰纹身',
  type: 'object',
  gender: 'n',
  lewd: 0,
  sprites: ['phoenix_left', 'phoenix_right'], // 使用的精灵图
  degree: 3 // 较强程度
});
```

#### **示例3：性别特定纹身**

```javascript
// 女性专属纹身
maplebirch.tool.other.addBodywriting('butterfly_f', {
  writing: 'Butterfly',
  writ_cn: '蝴蝶',
  type: 'object',
  gender: 'f', // 仅女性可用
  lewd: 0,
  sprites: ['butterfly_back']
});

// 男性专属纹身
maplebirch.tool.other.addBodywriting('skull_m', {
  writing: 'Skull',
  writ_cn: '骷髅头',
  type: 'object',
  gender: 'm', // 仅男性可用
  lewd: 0,
  sprites: ['skull_chest']
});
```

#### **示例4：特殊标记纹身**

```javascript
// 带有箭头标记的纹身
maplebirch.tool.other.addBodywriting('arrow_tribal', {
  writing: 'Arrow Tribal',
  writ_cn: '箭头部落纹',
  type: 'object',
  arrow: 1, // 有箭头标记
  gender: 'n',
  lewd: 0,
  sprites: ['arrow_up', 'arrow_down']
});

// 特殊类型的纹身
maplebirch.tool.other.addBodywriting('magic_rune', {
  writing: 'Magic Rune',
  writ_cn: '魔法符文',
  type: 'text',
  special: 'magic', // 特殊标记
  gender: 'n',
  lewd: 0,
  degree: 2
});
```

#### **示例5：色情内容纹身**

```javascript
// 色情内容纹身(需要特定条件解锁)
maplebirch.tool.other.addBodywriting('bdsm_mark', {
  writing: 'BDSM Mark',
  writ_cn: 'BDSM标记',
  type: 'text',
  gender: 'n',
  lewd: 1, // 色情内容
  degree: 3,
  featSkip: false // 不跳过特征检查
});
```
