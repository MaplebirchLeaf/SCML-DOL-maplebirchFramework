## NPC 日程

NPC 日程用于定义某个 NPC 在不同时间、条件或特殊事件下所在的位置。

使用入口：

```javascript
maplebirch.npc.addSchedule(npcName, config);
```

当前接口只接收两个参数：NPC 名称和日程配置。日程配置可以是配置对象，也可以是一个 builder 函数。

---

## 配置对象写法

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    { time: 8, location: 'school' },
    { time: [14, 16], location: 'library' },
    { time: 18, location: 'home' }
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

| 字段 | 说明 |
| :--- | :--- |
| `time` | 小时，或 `[开始小时, 结束小时]` |
| `location` | 地点 ID |

```javascript
daily: [
  { time: 9, location: 'school' },
  { time: [13, 15], location: 'gym' }
]
```

### `special`

`special` 用于条件日程。满足条件时会覆盖普通 `daily` 日程。

| 字段 | 说明 |
| :--- | :--- |
| `id` | 日程 ID，可选；不填时自动生成 |
| `condition` | 条件函数，接收增强日期对象 |
| `location` | 地点 ID，或返回地点的函数 |
| `override` | 是否优先于其它特殊日程 |
| `before` | 排在某个特殊日程之前 |
| `after` | 排在某个特殊日程之后 |
| `insteadOf` | 替代某个特殊日程 |

```javascript
special: [
  {
    id: 'weekend_park',
    condition: date => date.weekEnd && Weather.name !== 'rain',
    location: 'park'
  }
]
```

---

## Builder 写法

如果日程比较复杂，可以传入函数。函数会收到一个 `Schedule` 实例，可以链式调用 `at()` 和 `when()`。

```javascript
maplebirch.npc.addSchedule('Robin', schedule => {
  schedule
    .at(7, 'home')
    .at([8, 15], 'school')
    .at(16, 'library')
    .at(18, 'home');

  schedule.when(
    date => date.weekEnd,
    date => {
      if (Weather.name === 'rain') return 'home';
      if (V.money >= 100) return 'mall';
      return 'park';
    },
    { id: 'weekend_activity' }
  );
});
```

---

## `Schedule.at()`

```javascript
schedule.at(time, location);
```

| 参数 | 说明 |
| :--- | :--- |
| `time` | 小时，或 `[开始小时, 结束小时]` |
| `location` | 地点 ID |

```javascript
schedule.at(8, 'school');
schedule.at([19, 22], 'dormitory');
```

---

## `Schedule.when()`

```javascript
schedule.when(condition, location, options);
```

| 参数 | 说明 |
| :--- | :--- |
| `condition` | 条件函数 |
| `location` | 地点 ID、返回地点的函数，或返回另一个 `Schedule` |
| `options` | 特殊日程选项 |

```javascript
schedule.when(
  date => C.npc.Robin?.love >= 30 && date.weekEnd,
  'arcade',
  { id: 'weekend_arcade' }
);
```

动态地点：

```javascript
schedule.when(
  date => date.weekEnd,
  date => {
    if (Weather.name === 'rain') return 'home';
    return 'park';
  },
  { id: 'weather_weekend' }
);
```

---

## 日程管理

```javascript
const schedule = maplebirch.npc.Schedule.get('Robin');

console.log(schedule.location);
console.log(maplebirch.npc.Schedule.location);
```

更新特殊日程：

```javascript
maplebirch.npc.Schedule.update('Robin', 'weekend_arcade', {
  location: 'mall'
});
```

删除特殊日程：

```javascript
maplebirch.npc.Schedule.remove('Robin', 'weekend_arcade');
```

清空日程：

```javascript
maplebirch.npc.Schedule.clear('Robin');
maplebirch.npc.Schedule.clearAll();
```

---

## 增强日期对象

`condition` 和动态 `location` 函数会收到增强日期对象。它基于 `DateTime` 和 `Time`，并补充了一些便捷属性与方法。

常用属性：

| 属性 | 说明 |
| :--- | :--- |
| `schoolDay` | 是否上学日 |
| `weekEnd` | 是否周末 |
| `spring` / `summer` / `autumn` / `winter` | 当前季节 |
| `dawn` / `daytime` / `dusk` / `night` | 当前时段 |
| `schedule` | 一个新的 `Schedule` 实例，可用于嵌套日程 |

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

---

## 补充说明

- `daily` 只按小时记录地点。
- `special` 会先排序，再按顺序检查；`override: true` 的日程会排在普通特殊日程前。
- `before`、`after`、`insteadOf` 只对同一个 NPC 的特殊日程排序生效。
- 如果特殊日程的 `location` 返回另一个 `Schedule`，框架会读取该子日程的 `location`。
