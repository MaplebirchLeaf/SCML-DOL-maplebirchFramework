## 状态事件模块 (StateEvents)

### 基本介绍

状态事件模块 (`StateEvents`) 是动态管理系统的一部分，用于处理游戏中的状态触发事件。框架会自动在段落开始和结束时检查并触发相应的事件，无需手动调用。

_可通过 `maplebirch.dynamic.State` 或快捷接口 `maplebirchFrameworks.addStateEvent()` 访问。_

---

### 核心功能

#### **注册状态事件 (regStateEvent)**

- 注册一个新的状态事件
- **@param**:
  - `type` (string): 事件类型，支持 `'interrupt'`(中断)或 `'overlay'`(覆盖)
  - `eventId` (string): 事件唯一标识符
  - `options` (StateEventOptions): 事件配置选项
- **@return**: boolean，表示是否成功注册
- **@example**:
  ```javascript
  // 注册一个中断事件
  maplebirch.dynamic.regStateEvent('interrupt', 'encounterBandit', {
    output: 'banditEncounter',
    cond: () => State.variables.location === 'forest' && State.variables.time === 'night',
    priority: 5,
    once: true
  });
  ```

#### **注销状态事件 (delStateEvent)**

- 注销一个已注册的状态事件
- **@param**:
  - `type` (string): 事件类型
  - `eventId` (string): 事件唯一标识符
- **@return**: boolean，表示是否成功注销
- **@example**:
  ```javascript
  maplebirch.dynamic.delStateEvent('interrupt', 'encounterBandit');
  ```

---

### 事件配置详解

#### **output 参数说明**

- **类型**: string
- **说明**: _该字符串是您在 SugarCube 中自定义的 widget 宏的名称。当事件触发时，框架会调用对应的 widget 宏。_
- **Widget 定义示例**:
  ```javascript
  <<widget 'banditEncounter'>>
    你突然听到灌木丛中传来沙沙声...
    一群盗贼跳了出来！<<link "战斗" "CombatBandit">> | <<link "逃跑" "RunAway">>
  <</widget>>
  ```

#### **其他重要参数**

| 参数            | 类型     | 说明                                         |
| :-------------- | :------- | :------------------------------------------- |
| `cond`          | function | 触发条件函数，返回布尔值                     |
| `priority`      | number   | 优先级，数字越大优先级越高                   |
| `once`          | boolean  | 是否只触发一次                               |
| `forceExit`     | boolean  | 是否强制阻断当前段落剩余内容(仅中断事件有效) |
| `extra.passage` | string[] | 仅在这些段落中触发                           |
| `extra.exclude` | string[] | 在这些段落中不触发                           |

---

### 完整使用示例

#### **示例1：中断事件(包含widget定义)**

```javascript
// 1. 注册事件
maplebirch.dynamic.regStateEvent('interrupt', 'forestBandit', {
  output: 'banditEncounter', // 对应下面定义的widget名称
  cond: () => State.variables.location === 'forest',
  priority: 10,
  once: false
});

// 2. 在游戏中的某个位置定义对应的widget
<<widget 'banditEncounter'>>
  <div class="encounter">
    <strong>遭遇盗贼！</strong>
    <p>一群凶恶的盗贼挡住了你的去路。</p>
    <<link "战斗" "CombatBandit">>
    <<link "谈判" "NegotiateBandit">>
    <<link "逃跑" "RunFromBandit">>
  </div>
<</widget>>
```

#### **示例2：覆盖事件(状态提示)**

```javascript
// 1. 注册潮湿状态提示
maplebirch.dynamic.regStateEvent('overlay', 'wetStatus', {
  output: 'showWetStatus',
  cond: () => State.variables.wetness > 70,
  priority: 3
});

// 2. 定义状态提示widget
<<widget 'showWetStatus'>>
  <div class="status-overlay wet">
    你的衣服湿透了，行动变得迟缓。
  </div>
<</widget>>
```

#### **示例3：带参数的事件widget**

```javascript
// 1. 注册事件
maplebirch.dynamic.regStateEvent('interrupt', 'merchantEvent', {
  output: 'merchantEncounter',
  cond: () => State.variables.day % 7 === 0,
  priority: 8,
  once: true
});

// 2. 带动态内容的widget
<<widget 'merchantEncounter'>>
  <<set _merchantName = ['老汤姆', '狡猾的杰克', '流浪商人'][Math.floor(Math.random()*3)]>>

  <div class="merchant">
    <h3>遇到了_merchantName</h3>
    <p>"看看我的货物吧，旅行者！"</p>

    <<link "购买药水" "BuyPotion">>
    <<link "购买武器" "BuyWeapon">>
    <<link "离开" "ContinueJourney">>
  </div>
<</widget>>
```

---

### 事件类型说明

#### **中断事件 (interrupt)**

- **触发时机**: 段落开始时自动检查
- **特点**:
  - 第一个满足条件的事件触发后立即中断段落执行
  - 可配置 `forceExit` 强制退出当前段落
- **Widget 要求**: 应包含完整的场景描述和用户选择

#### **覆盖事件 (overlay)**

- **触发时机**: 段落结束时自动检查
- **特点**:
  - 可同时触发多个事件
  - 输出内容会叠加到段落末尾
- **Widget 要求**: 通常为简洁的状态提示或额外信息

---

### 注意事项

1. **Widget 定义**: _必须在游戏中与 `output` 同名的 widget_
2. **性能考虑**: _widget 内容不应过于复杂，避免影响游戏性能_
3. **稳定性**: _确保 widget 在各种情况下都能正确显示_
4. **错误处理**: _如果找不到对应的 widget，框架会记录错误日志_
