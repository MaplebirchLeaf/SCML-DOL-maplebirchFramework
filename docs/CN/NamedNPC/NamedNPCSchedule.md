# NPC 日程

NPC 日程用于定义某个 NPC 在不同时间、条件或特殊事件下所在的位置。

使用入口：

```javascript
maplebirch.npc.addSchedule(npcName, config);
```

当前接口只接收两个参数：NPC 名称和日程配置。日程配置可以是配置对象，也可以是一个 builder 函数。

## 日程负责到哪一步

日程返回的是“此 NPC 现在应在何处”的字符串标签。侧边栏衣柜会读取它；模组剧情也可主动查询。它不会生成相遇链接、调用 `npc`、增加当前 `$npc` 名单，也不会替换罗宾等原版人物专用的日程函数。

`library`、`home` 等标签由模组约定，需与衣柜或剧情检查一致，不要求与 passage 标题相同。注册与修改日程在脚本中进行，当前没有对应的 `boot.json` 日程字段。

以下示例使用已注册的露娜（`Luna`）。首次定义整份日程用 `addSchedule()`；给已有日程追加活动则用 `Schedule.get('Luna').when(...)`，后面会分别演示。

**再次调用 `addSchedule('Luna', ...)` 会替换她的整份框架日程**，不是追加。返回值是这份新建的 `Schedule`。

本页的“配置对象”和“Builder”演示是两种完整写法，选择一种作为初始日程。后面的接口示例按需要选用；同一人物中不要重复登记相同的特殊日程 ID。

## 配置对象写法

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 8,
      location: 'school'
    },
    {
      time: [14, 16],
      location: 'library'
    },
    {
      time: 18,
      location: 'home'
    }
  ],
  special: [
    {
      id: 'rainy_night',
      condition: date => Weather.precipitation === 'rain' && date.hour >= 18,
      location: 'home',
      override: true
    }
  ]
});
```

### `daily`

`daily` 用于固定时间日程。

把 `daily` 想成“从这个小时开始，露娜去了哪里”。不用给一天的 24 个小时逐个填写；没有新记录时，她会留在最近一次安排的地点。

以上面的日程为例，在没有特殊日程命中时：

| 查询时间     | 所在地点  | 原因                                  |
| :----------- | :-------- | :------------------------------------ |
| 12:00        | `school`  | 沿用 8 点的记录                       |
| 14:00～16:59 | `library` | `[14, 16]` 填写了 14、15、16 三个小时 |
| 17:00        | `library` | 17 点未填写，沿用最近的记录           |
| 18:00        | `home`    | 使用 18 点的新记录                    |
| 次日 02:00   | `home`    | 凌晨没有记录，跨午夜回查到 18 点      |

同一小时写两次时，后写的覆盖前写的。小时必须是 `0`～`23` 的整数；跨午夜的范围要拆开，不能写 `[21, 5]`。整天没有记录时才返回空字符串。

| 字段       | 说明                            |
| :--------- | :------------------------------ |
| `time`     | 小时，或 `[开始小时, 结束小时]` |
| `location` | 地点 ID                         |

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 9,
      location: 'school' // 学校
    },
    {
      time: [13, 15],
      location: 'gym' // 体育馆
    }
  ]
});
// 这里的范围包含 13、14、15 点；16 点以后仍留在体育馆。
```

### `special`

`special` 用于条件日程。满足条件时会覆盖普通 `daily` 日程。

| 字段        | 说明                          |
| :---------- | :---------------------------- |
| `id`        | 日程 ID，可选。不填时自动生成 |
| `condition` | 条件函数，接收增强日期对象    |
| `location`  | 地点 ID，或返回地点的函数     |
| `override`  | 是否优先于其它特殊日程        |
| `before`    | 排在某个特殊日程之前          |
| `after`     | 排在某个特殊日程之后          |
| `insteadOf` | 排在指定特殊日程之前          |

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [{ time: 0, location: 'home' }], // 普通日程兜底。
  special: [
    {
      id: 'weekend_park',
      condition: date => date.weekEnd && Weather.precipitation !== 'rain',
      location: 'park' // 晴朗周末去公园。
    },
    {
      id: 'weekend_arcade',
      condition: date => date.weekEnd && (C.npc.Luna?.love ?? 0) >= 30,
      location: 'arcade',
      insteadOf: 'weekend_park' // 感情足够时优先去游戏厅，但不删除公园安排。
    }
  ]
});
```

以上例子会先检查 `weekend_arcade`，再检查 `weekend_park`，选中第一条成立的安排：

- 周末且感情达到 `30`：去游戏厅。
- 周末、感情不足 `30`，而且没下雨：仍可去公园。
- 两项都不成立：回到普通日程，这里是家中。

所以 `insteadOf` 表示“排在它前面试”，不会删除原项目。`before`、`after` 和 `insteadOf` 只给同一人物的普通特殊日程排序；`override: true` 的项目会先组成优先组，组内按登记顺序检查。每个人物内部的 ID 要唯一。

**跳过一条安排，要让 `condition` 返回 `false`。** 一旦条件成立，这条安排就已选中；在 `location` 中返回空字符串不会继续找下一条。动态地点应返回地点字符串或子 `Schedule`。

## Builder 写法

如果日程比较复杂，可以传入函数。函数会收到一个 `Schedule` 实例，可以链式调用 `at()` 和 `when()`。

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(7, 'home').at([8, 15], 'school').at(16, 'library').at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.precipitation === 'rain') return 'home';
      if (V.money >= 100) return 'mall';
      return 'park';
    },
    {
      id: 'weekend_activity'
    }
  );
});
```

---

## `Schedule.at()`

```javascript
schedule.at(time, location);
```

| 参数       | 说明                            |
| :--------- | :------------------------------ |
| `time`     | 小时，或 `[开始小时, 结束小时]` |
| `location` | 地点 ID                         |

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna'); // 取出露娜已有日程，保留其它安排。
schedule.at(8, 'school');
schedule.at([19, 22], 'dormitory');
```

---

## `Schedule.when()`

```javascript
schedule.when(condition, location, options);
```

| 参数        | 说明                                             |
| :---------- | :----------------------------------------------- |
| `condition` | 条件函数                                         |
| `location`  | 地点 ID、返回地点的函数，或返回另一个 `Schedule` |
| `options`   | 特殊日程选项                                     |

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(date => (C.npc.Luna?.love ?? 0) >= 30 && date.weekEnd, 'arcade', {
  id: 'weekend_arcade'
});
```

动态地点：

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.precipitation === 'rain') return 'home';
    return 'park';
  },
  {
    id: 'weather_weekend'
  }
);
```

---

## 日程管理

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

console.log(schedule.location);
console.log(maplebirch.npc.Schedule.location);
```

更新特殊日程：

```javascript
maplebirch.npc.Schedule.update('Luna', 'weekend_arcade', {
  location: 'mall'
});
```

删除特殊日程：

```javascript
maplebirch.npc.Schedule.remove('Luna', 'weekend_arcade');
```

清空日程：

```javascript
maplebirch.npc.Schedule.clear('Luna');
maplebirch.npc.Schedule.clearAll();
```

`get(name)` 不存在时会创建空日程。`update/remove/clear` 返回该人物的 `Schedule`，`update/remove` 找不到项目 ID 时不会创建项目。`clearAll()` 会清除所有框架 NPC 日程，包括其它模组登记的内容；普通扩展优先只删除自己的项目。

日程定义保存在运行时，重载脚本时重建。持久化任务状态放在模组存档中，由条件回调读取。回调可能因查询或重绘反复执行，只做判断，不推进时间或修改剧情进度。

---

## 增强日期对象

`condition` 和动态 `location` 函数会收到增强日期对象。它基于 `DateTime` 和 `Time`，并补充了一些便捷属性与方法。

常用属性：

| 属性                                      | 说明                                     |
| :---------------------------------------- | :--------------------------------------- |
| `schoolDay`                               | 是否上学日                               |
| `weekEnd`                                 | 是否周末                                 |
| `spring` / `summer` / `autumn` / `winter` | 当前季节                                 |
| `dawn` / `daytime` / `dusk` / `night`     | 当前时段                                 |
| `schedule`                                | 一个新的 `Schedule` 实例，可用于嵌套日程 |

常用方法：

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');

schedule.when(
  date => {
    // 调试时查看各项判断的 true/false，正式脚本可删去 console.table。
    console.table({
      atNine: date.isAt(9), // 仅 09:00，不包含 09:01。
      atHalfPastTwo: date.isAt([14, 30]), // 仅 14:30，这里的数组是“时、分”。
      afterNoon: date.isAfter(12), // 晚于 12:00，不含 12:00。
      beforeSix: date.isBefore(18), // 早于 18:00，不含 18:00。
      daytime: date.isBetween(9, 17), // 09:00～17:00，含两端。
      morning: date.isBetween([8, 30], [12, 0]), // 08:30～12:00，含两端。
      selectedHours: date.isHour(8, 12, 18), // 8 点、12 点或 18 点的任意分钟。
      schoolHours: date.isHourBetween(9, 16), // 9～16 点的任意分钟。
      firstHalfHour: date.isMinuteBetween(0, 30) // 每小时的第 0～30 分钟。
    });

    return date.isBetween([8, 30], [12, 0]);
  },
  'park',
  { id: 'myMod:morningPark' }
);
```

上例会在查询日程时输出各项判断，方便在控制台对照当前时间。正式脚本去掉 `console.table()`，保留最后的 `return`，就是一条 08:30～12:00 去公园的安排。

注意两类数组的含义不同：`schedule.at([14, 16], ...)` 填写 **14～16 点三个小时**，`date.isAt([14, 30])` 则只匹配 **14:30**。

日期比较方法不自动跨午夜。夜间安排可以这样追加：

```javascript
const schedule = maplebirch.npc.Schedule.get('Luna');
schedule.when(
  date => date.isHour(21, 22, 23, 0, 1, 2, 3, 4, 5), // 21:00～次日 05:59。
  'home',
  { id: 'myMod:nightHome' }
);
```

也可以用 `date.hour >= 21 || date.hour <= 5` 表达同一范围。

## 补充说明

- `daily` 只按小时记录地点。
- `special` 会先排序，再按顺序检查。`override: true` 的日程会排在普通特殊日程前。
- `before`、`after`、`insteadOf` 只对同一个 NPC 的特殊日程排序生效。
- 如果特殊日程的 `location` 返回另一个 `Schedule`，框架会读取该子日程的 `location`。
