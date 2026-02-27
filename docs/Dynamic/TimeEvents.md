## 时间事件 (TimeEvents)

### 基本介绍

时间事件模块 (`TimeEvents`) 是动态管理系统的一部分，用于处理游戏中的时间相关事件。它允许开发者注册在特定时间点或时间间隔触发的事件，如每小时、每天、每月等定时事件，以及时间旅行时的事件处理。

_可通过 `maplebirch.dynamic.Time` 或快捷接口 `maplebirchFrameworks.addTimeEvent()` 访问。_

---

### 核心功能

#### **注册时间事件 (regTimeEvent)**

- 注册一个新的时间事件
- **@param**:
  - `type` (string): 事件类型，支持以下类型：
    - `onSec`: 每秒触发
    - `onMin`: 每分钟触发
    - `onHour`: 每小时触发
    - `onDay`: 每天触发
    - `onWeek`: 每周触发
    - `onMonth`: 每月触发
    - `onYear`: 每年触发
    - `onTimeTravel`: 时间旅行时触发
  - `eventId` (string): 事件唯一标识符
  - `options` (TimeEventOptions): 事件配置选项
- **@return**: boolean，表示是否成功注册
- **@example**:

  ```javascript
  // 注册一个每天触发的事件
  maplebirch.dynamic.regTimeEvent('onDay', 'dailyCheck', {
    action: data => {
      // 每天执行的逻辑
      V.dayCounter = (V.dayCounter || 0) + 1;
    },
    cond: data => {
      // 只在白天触发
      return data.currentDate.hour >= 6 && data.currentDate.hour < 18;
    },
    priority: 5,
    once: false
  });

  // 使用快捷接口
  maplebirchFrameworks.addTimeEvent('onDay', 'dailyCheck', {
    action: data => {
      V.dayCounter = (V.dayCounter || 0) + 1;
    },
    cond: data => data.currentDate.hour >= 6 && data.currentDate.hour < 18,
    priority: 5,
    once: false
  });
  ```

#### **注销时间事件 (delTimeEvent)**

- 注销一个已注册的时间事件
- **@param**:
  - `type` (string): 事件类型
  - `eventId` (string): 事件唯一标识符
- **@return**: boolean，表示是否成功注销
- **@example**:
  ```javascript
  maplebirch.dynamic.delTimeEvent('onDay', 'dailyCheck');
  ```

#### **时间旅行 (timeTravel)**

- 将游戏时间向前或向后跳跃
- **@param**: `options` (TimeTravelOptions): 时间旅行配置
- **@return**: boolean，表示是否成功执行时间旅行
- **@example**:

  ```javascript
  // 跳转到特定日期
  maplebirch.dynamic.timeTravel({
    year: 2025,
    month: 3,
    day: 15,
    hour: 12
  });

  // 向前跳跃一段时间
  maplebirch.dynamic.timeTravel({
    addDays: 7,
    addHours: 6
  });

  // 向后跳跃
  maplebirch.dynamic.timeTravel({
    addDays: -3
  });
  ```

---

### 事件配置选项 (TimeEventOptions)

| 参数                | 类型     | 说明                                                           |
| :------------------ | :------- | :------------------------------------------------------------- |
| `action`            | function | 触发时执行的动作函数，接收 TimeData 对象                       |
| `cond`              | function | 触发条件函数，接收 TimeData 对象，返回布尔值                   |
| `priority`          | number   | 优先级，数字越大优先级越高                                     |
| `once`              | boolean  | 是否只触发一次                                                 |
| `accumulate`        | object   | 累积触发配置                                                   |
| `accumulate.unit`   | string   | 累积单位：'sec', 'min', 'hour', 'day', 'week', 'month', 'year' |
| `accumulate.target` | number   | 累积目标值(达到多少单位后触发)                                 |
| `exact`             | boolean  | 是否在精确时间点触发(如整点、午夜等)                           |

---

### 时间数据对象 (TimeData)

事件回调函数接收的 `data` 参数包含以下信息：

| 属性           | 类型             | 说明                                  |
| :------------- | :--------------- | :------------------------------------ |
| `prevDate`     | DateTime         | 时间变化前的日期时间                  |
| `currentDate`  | DateTime         | 时间变化后的日期时间                  |
| `passed`       | number           | 经过的秒数                            |
| `sec`          | number           | 经过的秒数(整数)                      |
| `min`          | number           | 经过的分钟数                          |
| `hour`         | number           | 经过的小时数                          |
| `day`          | number           | 经过的天数                            |
| `week`         | number           | 经过的周数                            |
| `month`        | number           | 经过的月数                            |
| `year`         | number           | 经过的年数                            |
| `weekday`      | [number, number] | [变化前星期, 变化后星期]              |
| `detailedDiff` | object           | 详细的时间差                          |
| `changes`      | object           | 各时间单位的变化量                    |
| `cumulative`   | object           | 累积的时间量                          |
| `direction`    | string           | 时间旅行方向：'forward' 或 'backward' |

---

### 完整使用示例

#### **示例1：每日任务刷新**

```javascript
// 注册每日任务刷新事件
maplebirch.dynamic.regTimeEvent('onDay', 'dailyQuestRefresh', {
  action: data => {
    // 刷新每日任务
    V.dailyQuests = generateDailyQuests();
    V.lastQuestRefresh = data.currentDate.timeStamp;

    // 显示刷新提示
    Wikifier.wikifyEval('<<notify "每日任务已刷新！">>');
  },
  cond: data => {
    // 只在午夜后触发
    return data.currentDate.hour === 0 && data.currentDate.minute === 0;
  },
  priority: 10,
  once: false,
  exact: true // 精确在午夜触发
});
```

#### **示例2：累积时间事件(每累计10小时)**

```javascript
// 注册每累计10小时触发的事件
maplebirch.dynamic.regTimeEvent('onHour', 'tenHourReward', {
  action: data => {
    // 每累计10小时给予奖励
    const rewardCount = data.triggeredByAccumulator?.count || 1;
    for (let i = 0; i < rewardCount; i++) {
      giveRewardToPlayer();
    }

    Wikifier.wikifyEval(`<<notify "获得累计 ${rewardCount * 10} 小时在线奖励！">>`);
  },
  accumulate: {
    unit: 'hour',
    target: 10 // 每累计10小时触发一次
  },
  priority: 5
});
```

#### **示例3：季节性事件**

```javascript
// 注册季节性事件
maplebirch.dynamic.regTimeEvent('onMonth', 'seasonalEvent', {
  action: data => {
    const month = data.currentDate.month;

    if (month === 3 || month === 4) {
      // 春季事件
      V.season = 'spring';
      startSpringEvent();
    } else if (month === 7 || month === 8) {
      // 夏季事件
      V.season = 'summer';
      startSummerEvent();
    }
    // ... 其他季节
  },
  cond: data => {
    // 只在每月的第一天触发
    return data.currentDate.day === 1;
  },
  priority: 8
});
```

#### **示例4：时间旅行事件**

```javascript
// 注册时间旅行时触发的事件
maplebirch.dynamic.regTimeEvent('onTimeTravel', 'timeTravelEffects', {
  action: data => {
    // 根据时间旅行方向应用不同效果
    if (data.direction === 'forward') {
      // 向前时间旅行的效果
      applyAgingEffects(data.diffSeconds);
    } else if (data.direction === 'backward') {
      // 向后时间旅行的效果
      applyRejuvenationEffects(data.diffSeconds);
    }

    // 记录时间旅行历史
    V.timeTravelHistory = V.timeTravelHistory || [];
    V.timeTravelHistory.push({
      from: data.prevDate,
      to: data.currentDate,
      timestamp: Date.now()
    });
  },
  priority: 15
});
```

#### **示例5：复杂条件组合**

```javascript
// 注册只在特定条件下触发的时间事件
maplebirch.dynamic.regTimeEvent('onHour', 'specialConditionEvent', {
  action: data => {
    // 特殊事件逻辑
    triggerSpecialEvent();
  },
  cond: data => {
    // 只在满足以下所有条件时触发：
    // 1. 周五的下午
    // 2. 玩家在特定地点
    // 3. 特定的游戏进度
    return (
      data.currentDate.weekDay === 5 && // 周五
      data.currentDate.hour >= 14 &&
      data.currentDate.hour < 18 && // 下午2点到6点
      V.location === 'townSquare' && // 在城镇广场
      V.storyProgress >= 3
    ); // 故事进度至少为3
  },
  priority: 12,
  once: true // 只触发一次
});
```

---

### 时间旅行选项 (TimeTravelOptions)

时间旅行支持多种方式指定目标时间：

| 参数         | 类型     | 说明                               |
| :----------- | :------- | :--------------------------------- |
| `target`     | DateTime | 直接指定目标 DateTime 对象         |
| `year`       | number   | 目标年份(需与 month、day 一起使用) |
| `month`      | number   | 目标月份(1-12)                     |
| `day`        | number   | 目标日期(1-31)                     |
| `hour`       | number   | 目标小时(0-23)                     |
| `minute`     | number   | 目标分钟(0-59)                     |
| `second`     | number   | 目标秒数(0-59)                     |
| `addYears`   | number   | 增加的年数                         |
| `addMonths`  | number   | 增加的月数                         |
| `addDays`    | number   | 增加的天数                         |
| `addHours`   | number   | 增加的小时数                       |
| `addMinutes` | number   | 增加的分钟数                       |
| `addSeconds` | number   | 增加的秒数                         |

---

### 注意事项

1. **事件执行顺序**: _按优先级从高到低执行_
2. **时间旅行影响**: _时间旅行会触发 `onTimeTravel` 事件，并重新计算累积时间_
3. **累积触发**: _使用 `accumulate` 选项时，事件会在累积达到目标值时触发_
4. **精确触发**: _`exact: true` 的事件只在时间单位变化时触发(如整点、午夜)_
5. **一次性事件**: _`once: true` 的事件触发后会自动移除_
