# 时间事件

每天刷新一次帮助机会，或每累计十小时记下一次进度，都可以从时间事件开始。脚本加载时登记好规则，游戏推进时间时，框架就会检查该执行哪些事件。

这里的“小时”是**游戏内的时间**。玩家把页面开着一小时，并不会因此触发一次 `onHour`。

下面先做跨日刷新，再看看累积时间和时间旅行。示例的进度都放在 `V.myMod.time` 中；存档初始化还不熟悉时，可以先对照[开发流程](../Development.md)。

## 1. 登记与执行顺序

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod:newDay', {
  action: data => {
    maplebirch.log(
      `游戏日期已变为 ${data.currentDate.year}-${data.currentDate.month}-${data.currentDate.day}`
    );
  },
  exact: true,
  priority: 5
});
```

同一类型的 ID 必须唯一；重复登记返回 `false`，不会替换原事件。注销时需要类型和 ID：

```javascript
maplebirch.dynamic.delTimeEvent('onDay', 'myMod:newDay');
```

正常推进的顺序是：

```text
onBefore → 原版时间推进 → onThread
         → onYear → onMonth → onWeek → onDay → onHour → onMin → onSec
         → onAfter
```

单位事件只有符合本次经过时间／跨界条件时才运行；累积事件另见后文。`priority` 数值越大，同一类型中越先执行，不能靠优先级让 `onAfter` 跑到 `onBefore` 前。

| 类型                                   | 用途                                 |
| :------------------------------------- | :----------------------------------- |
| `onBefore`                             | 推进前读取旧日期，必要时调整本次耗时 |
| `onThread`                             | 已推进时间，在单位事件前处理         |
| `onSec`、`onMin`、`onHour`             | 处理秒、分钟、小时变化               |
| `onDay`、`onWeek`、`onMonth`、`onYear` | 处理日期或更大单位变化               |
| `onAfter`                              | 所有单位事件之后处理                 |
| `onTimeTravel`                         | 时间旅行后处理，不代替正常时间事件   |

## 2. 经过时间与跨越边界

默认单位事件会在经过至少一个完整单位，或跨过该单位边界时检查。`exact: true` 只保留跨界情况，不保证最后停在整点。

| 一次推进        | `changes.hour` | `exactPoints.hour` | `onHour` 的行为                      |
| :-------------- | :------------- | :----------------- | :----------------------------------- |
| `10:10 → 10:30` | `0`            | `false`            | 普通事件不执行，累积事件仍可累加时间 |
| `10:50 → 11:10` | `0`            | `true`             | 检查一次，也满足 `exact: true`       |
| `10:10 → 13:10` | `3`            | `true`             | 检查一次，不自动执行三次             |

因此，`23:50 → 次日 00:10` 可以触发跨日事件，但最终分钟为 `10`。再判断 `hour === 0 && minute === 0` 会漏掉它。日刷新应依据跨日，而不是要求最终恰好停在午夜。

回调中的 `currentDate` 是最终日期。需要对一次跨过三天的生产逐天结算时，必须由模组设计补算过程，不能把一次回调当作三个历史日期的独立回调。

## 3. 完整示例：跨日刷新一个使用标记

先在 `framework.js` 里准备好存档字段。后面的几个例子会沿用这些字段：

```javascript
function initMyModTime(variables) {
  variables.myMod ??= {};
  variables.myMod.time ??= {};
  variables.myMod.time.helpUsed ??= false;
  variables.myMod.time.elapsedSeconds ??= 0;
  variables.myMod.time.rewardCount ??= 0;
  variables.myMod.time.halfDuration ??= false;
}

maplebirch.tool.onInit(() => {
  initMyModTime(V);
});

maplebirch.on(':onLoad', save => {
  initMyModTime(save.V);
});
```

然后在同一脚本中登记：

```javascript
maplebirch.dynamic.regTimeEvent('onDay', 'myMod:resetHelp', {
  action: () => {
    V.myMod.time.helpUsed = false;
  },
  exact: true
});
```

玩家真正完成帮助行动时，把 `$myMod.time.helpUsed` 设为 `true`，并在显示入口和点击时都检查这个标记。下一次正常推进跨过日期边界，它就会恢复为 `false`。即使一次跳过三天，这里也只需重置一次，因为这个功能没有补发奖励。

`helpUsed` 随存档保存，事件注册在每次启动时重建。时间旅行只触发 `onTimeTravel`，不会执行这个跨日刷新。如果玩法允许通过时间旅行刷新，需要在时间旅行事件中明确实现该策略。

## 4. 每累计十小时处理多少次

以下使用框架自带的累积器，接在初始化后运行：

```javascript
maplebirch.dynamic.regTimeEvent('onHour', 'myMod:elapsedReward', {
  action: data => {
    V.myMod.time.rewardCount += data.triggeredByAccumulator.count;
  },
  accumulate: {
    unit: 'hour',
    target: 10
  }
});
```

一次推进 `25` 小时，`count` 为 `2`，剩下 `5` 小时留在累积器。这里仅记录应结算次数；接入钱或物品前，应在本分支实现自己的实际结算。

选择这版之前，先了解余数会在哪里保留：

- 余数保存在事件对象中，不随存档保存。重启会丢失余数，切换存档也不会自动换成该存档自己的余数。
- `cond` 为假时也会累加；达到门槛后会先消耗计数，再判断条件。它不表示“只有条件成立的时间才计入”。
- 秒至周使用经过的秒数累积，月与年使用日历变化数量。时间旅行不进入这些普通单位事件的累积器。

**如果十小时进度属于该存档，使用下面这一版替换上一版，二者不要同时登记。**它把余数和结算次数都保存在模组变量中：

```javascript
maplebirch.dynamic.regTimeEvent('onAfter', 'myMod:elapsedReward', {
  action: data => {
    const state = V.myMod.time;
    const period = 10 * maplebirch.dynamic.Time.TimeConstants.secondsPerHour;
    state.elapsedSeconds += Math.max(0, data.diffSeconds ?? 0);
    const count = Math.floor(state.elapsedSeconds / period);
    state.elapsedSeconds %= period;
    state.rewardCount += count;
  }
});
```

这版按正常推进的游戏时间计算，不计现实离线时间。每次正常推进都会处理余数，读档恢复保存时的进度；`25` 小时一次推进与分成 `5` 次 `5` 小时的结果相同。需要限定为训练、工作等特定行为时，先明确哪些实际行动耗时可以计入，不要仅根据推进后的页面位置推断整段时间都在工作。

## 5. 调整本次正常行动耗时

沿用初始化中的 `halfDuration` 选项，以下代码演示如何把正常推进耗时减半：

```javascript
maplebirch.dynamic.regTimeEvent('onBefore', 'myMod:halfDuration', {
  cond: () => V.myMod?.time?.halfDuration === true,
  action: data => {
    data.passed = data.passed / 2;
  }
});
```

这个开关由自己的设置界面或剧情维护，初始为 `false`。`onBefore` 只提供 `prevDate`、`prev`、`passed`、`timeStamp`，此时还没有 `currentDate`。

多个 `onBefore` 回调共享同一份数据，按优先级依次修改，最终有效的 `passed` 才交给原版。`0` 有效；最终为负数、非数值或非有限值时采用原始耗时。这个示例会影响全部正常推进，实际玩法若只针对某一行动，应在 `cond` 中检查该行动明确设置的上下文。它不改变时间旅行的目标。

## 6. 时间旅行

只在游戏时间系统已就绪后的实际行动中调用：

```javascript
maplebirch.dynamic.timeTravel({
  addDays: 2,
  addHours: 6
});
```

这会请求相对于当前日期跳转，返回是否完成。不要把调用直接放到注册脚本顶层，否则每次加载都会尝试跳转。

若需要记录最近一次跳转，可在脚本中另行登记：

```javascript
maplebirch.dynamic.regTimeEvent('onTimeTravel', 'myMod:recordTravel', {
  action: data => {
    V.myMod.time.lastTravel = {
      from: data.prevDate.timeStamp,
      to: data.currentDate.timeStamp,
      direction: data.direction
    };
  }
});
```

这里只保存数字和字符串，不把运行时 `DateTime` 对象当作任务记录。跳转不重放 `onDay`、`onHour` 等普通事件，也不等于逐步模拟经过日期内的所有剧情。

| 参数                                                                       | 行为                                                     |
| :------------------------------------------------------------------------- | :------------------------------------------------------- |
| `target`                                                                   | 指定一个有效 `DateTime`；提供时优先使用                  |
| `year`、`month`、`day`、`hour`、`minute`、`second`                         | 指定绝对日期的一部分，未指定部分沿用当前值               |
| `addYears`、`addMonths`、`addDays`、`addHours`、`addMinutes`、`addSeconds` | 只在没有 `target` 和绝对日期字段时用于相对跳转；可为负数 |

- +不要混写绝对与相对字段并期待两者叠加。目标必须处于原版允许的日期范围内。
- +## 配置与数据速查
- +| 配置 | 含义 |
  +| :--- | :--- |
  +| `action(data)` | 同步处理本次变化 |
  +| `cond(data)` | 无副作用的资格判断，默认成立 |
  +| `priority` | 同类型内从大到小排序，默认 `0` |
  +| `once` | 触发后移除本次运行中的登记，不是存档标记 |
  +| `exact` | 要求跨过对应单位边界 |
  +| `accumulate` | `{ unit, target }`；单位为 `sec/min/hour/day/week/month/year`，目标向下取整且至少为 `1` |
- +正常推进完成后的回调可读取以下字段。部分字段在类型上可选，`onBefore` 不提供完整结果：
- +| 数据 | 含义 |
  +| :--- | :--- |
  +| `prevDate`、`currentDate` | 推进前、后的日期；`prev`、`current` 为别名 |
  +| `passed` | 本次采用的推进秒数 |
  +| `diffSeconds`、`sec` | 实际日期差，时间旅行向后时为负 |
  +| `changes` | 秒至周为绝对经过时间的完整单位数；月、年为日历差 |
  +| `min/hour/day/week/month/year` | 对应 `changes` 中的值 |
  +| `exactPoints` | 是否跨过分钟至年的单位边界 |
  +| `weekday` | `[推进前星期, 推进后星期]` |
  +| `detailedDiff` | 原版日期比较结果 |
  +| `direction` | `forward` 或 `backward` |
  +| `triggeredByAccumulator` | 累积触发时的 `unit`、`target`、`count` |
- +## 验证边界
- +用独立存档分别检查：同小时内推进、跨整点但不足一小时、一次跨多小时、跨午夜、保存／重启／读档、向前与向后时间旅行。尤其确认长时间推进的结算次数，以及切换存档是否保留各自余数。避免在真实存档中用跳转反复试验奖励。
- +[状态事件](StateEvents.md)负责把这些状态变成页面提示或场景；奖励仍在实际结算中发放。
-
