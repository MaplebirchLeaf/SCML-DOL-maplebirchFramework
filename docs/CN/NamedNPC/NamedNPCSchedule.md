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

`addSchedule()` 返回新 `Schedule`，并**替换该人物此前整份框架日程**。需要给已有日程增加一项时，使用 `Schedule.get(name).when(...)`；不要用第二次 `addSchedule()` 当作追加。以下示例均以模组人物 `Luna` 为例。

---

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
      condition: date => Weather.name === 'rain' && date.hour >= 18,
      location: 'home',
      override: true
    }
  ]
});
```

### `daily`

`daily` 用于固定时间日程。

单个小时是从该时刻起的地点记录，不表示只有那一小时能出现。查询时从当前小时往前找最近的一条，必要时跨午夜回查；整天都没记录才返回空字符串。范围 `[14, 16]` 会分别填写 14、15、16 三个小时，后面的空小时仍沿用最近记录。

例如 `8 → school`、`14 → library`、`18 → home`，则 12 点仍在学校，17 点仍在图书馆，次日凌晨沿用家中记录。重复填写同一小时以后写入的值为准。范围两端必须是 `0` 至 `23` 的整数，开始不能大于结束；跨午夜请拆为两段。

| 字段       | 说明                            |
| :--------- | :------------------------------ |
| `time`     | 小时，或 `[开始小时, 结束小时]` |
| `location` | 地点 ID                         |

```javascript
daily: [
  {
    time: 9,
    location: 'school'
  },
  {
    time: [13, 15],
    location: 'gym'
  }
];
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
special: [
  {
    id: 'weekend_park',
    condition: date => date.weekEnd && Weather.name !== 'rain',
    location: 'park'
  }
];
```

特殊日程按顺序选第一条条件成立的项目。`insteadOf` 只影响排序，不会删除目标；当前项目不成立时，目标仍可触发。`before/after/insteadOf` 的相对排序用于同一人物的非 `override` 项目，`override` 项目作为优先组保留登记顺序。ID 应在该人物的日程内保持唯一。

动态地点回调应返回有效字符串或一个子 `Schedule`。条件已经成立后返回空字符串或没有配置地点，不表示“继续尝试下一个特殊日程”；需要跳过时，把条件写在 `condition` 中。

---

## Builder 写法

如果日程比较复杂，可以传入函数。函数会收到一个 `Schedule` 实例，可以链式调用 `at()` 和 `when()`。

```javascript
maplebirch.npc.addSchedule('Luna', schedule => {
  schedule.at(7, 'home').at([8, 15], 'school').at(16, 'library').at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.name === 'rain') return 'home';
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
schedule.when(date => C.npc.Luna?.love >= 30 && date.weekEnd, 'arcade', {
  id: 'weekend_arcade'
});
```

动态地点：

```javascript
schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.name === 'rain') return 'home';
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
date.isAt(9);
date.isAt([14, 30]);
date.isAfter(12);
date.isBefore(18);
date.isBetween(9, 17);
date.isBetween([8, 30], [12, 0]);
date.isHour(8, 12, 18);
date.isHourBetween(9, 16);
date.isMinuteBetween(0, 30);
```

`at([14, 16], ...)` 中数组表示小时区间；`date.isAt([14, 30])` 中数组表示 **14:30**，含义不同。`isAt(9)` 只匹配 09:00；`isAfter/isBefore` 为严格比较，`isBetween/isHourBetween/isMinuteBetween` 包含两端。日期比较方法不自动处理跨午夜区间，跨夜条件用两段或 `||` 表达。

---

## 补充说明

- `daily` 只按小时记录地点。
- `special` 会先排序，再按顺序检查。`override: true` 的日程会排在普通特殊日程前。
- `before`、`after`、`insteadOf` 只对同一个 NPC 的特殊日程排序生效。
- 如果特殊日程的 `location` 返回另一个 `Schedule`，框架会读取该子日程的 `location`。
