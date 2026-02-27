## NPC日程

### 基本介绍

NPC 日程系统允许模组制作者为 NPC 定义详细的日常活动安排，包括固定时间、条件触发、特殊事件等。系统支持时间范围、条件判断、优先级控制和复杂依赖关系。
_可通过 `maplebirch.npc.addSchedule` 或 `maplebirch.npc.addNPCSchedule` 来注册NPC日程。_

---

### 基本概念

#### 日程类型

1. **固定时间日程**：在特定时间或时间段出现在特定地点
2. **条件日程**：根据游戏状态、时间、天气等条件决定出现地点
3. **特殊日程**：有依赖关系和优先级控制的复杂日程

#### 核心组件

- **ScheduleTime**: 时间定义(小时或时间段)
- **ScheduleCondition**: 条件函数
- **ScheduleLocation**: 地点定义(字符串或函数)
- **SpecialSchedule**: 特殊日程配置

---

### 添加日程 (addSchedule 方法)

#### 基本语法

```javascript
// 添加固定时间日程
maplebirch.npc.addSchedule('Luna', 9, 'school'); // 9点到学校
maplebirch.npc.addSchedule('Luna', [14, 16], 'library'); // 14-16点在图书馆

// 添加条件日程
maplebirch.npc.addSchedule('Luna', date => date.weekEnd && date.hour >= 10, 'park', 'weekend_park');

// 添加带选项的特殊日程
maplebirch.npc.addSchedule('Luna', date => date.weather === 'rain' && date.hour >= 18, 'home', 'rainy_night_home', { override: true, before: 'night_club' });
```

#### 方法签名

```javascript
addSchedule(
  npcName: string,                     // NPC名称
  scheduleConfig: ScheduleTime | ScheduleCondition,  // 时间或条件
  location: string | ScheduleLocation, // 地点
  id?: string | number,               // 日程ID(可选)
  options?: Partial<SpecialSchedule>  // 特殊选项
): Schedule
```

---

### 1. 固定时间日程

#### 单个时间点

```javascript
// NPC在指定小时出现在指定地点
maplebirch.npc.addSchedule('Robin', 8, 'school'); // 8点到学校
maplebirch.npc.addSchedule('Robin', 12, 'cafeteria'); // 12点到食堂
maplebirch.npc.addSchedule('Robin', 18, 'home'); // 18点到家
```

#### 时间段

```javascript
// NPC在时间段内出现在指定地点
maplebirch.npc.addSchedule('Kylar', [9, 12], 'library'); // 9-12点在图书馆
maplebirch.npc.addSchedule('Whitney', [13, 15], 'gym'); // 13-15点在体育馆
maplebirch.npc.addSchedule('Sydney', [19, 22], 'dormitory'); // 19-22点在宿舍
```

---

### 2. 条件日程

#### 时间条件

```javascript
// 基于时间的条件
maplebirch.npc.addSchedule(
  'Eden',
  date => date.isHour(6, 18), // 6点或18点
  'forest_clearing'
);

maplebirch.npc.addSchedule(
  'Black Wolf',
  date => date.isBetween([20, 0], [6, 0]), // 20:00-6:00
  'wolf_cave'
);

maplebirch.npc.addSchedule(
  'Great Hawk',
  date => date.isAfter(10) && date.isBefore(16), // 10:00-16:00
  'cliff_nest'
);
```

#### 日期条件

```javascript
// 基于星期、季节、天气的条件
maplebirch.npc.addSchedule(
  'Alex',
  date => date.weekEnd && date.weather === 'sunny', // 周末晴天
  'farm_field'
);

maplebirch.npc.addSchedule(
  'River',
  date => date.schoolDay && date.isHourBetween(8, 15), // 上学日8-15点
  'clinic'
);

maplebirch.npc.addSchedule(
  'Winter',
  date => date.winter && date.isHour(9), // 冬季9点
  'art_studio'
);
```

#### 游戏状态条件

```javascript
// 基于游戏变量和NPC状态的条件
maplebirch.npc.addSchedule(
  'Bailey',
  date => {
    return (
      date.day === 1 && // 每月1号
      date.hour === 10 && // 10点
      V.rentDue
    ); // 租金到期
  },
  'orphanage_office'
);

maplebirch.npc.addSchedule(
  'Whitney',
  date => {
    return (
      C.npc.Whitney?.love >= 30 && // 好感度≥30
      date.weekEnd && // 周末
      date.hour >= 18
    ); // 18点后
  },
  'arcade'
);
```

#### 复合条件

```javascript
// 多个条件组合
maplebirch.npc.addSchedule(
  'Sydney',
  date => {
    return (
      date.schoolDay && // 上学日
      !date.spring && // 不是春季
      date.weather !== 'storm' && // 没有暴风雨
      V.sydneyCorruption >= 50
    ); // 堕落度≥50
  },
  'temple_basement'
);
```

---

### 3. 动态地点

#### 函数返回地点

```javascript
// 动态决定地点
maplebirch.npc.addSchedule(
  'Robin',
  date => date.weekEnd,
  date => {
    if (date.weather === 'rain') return 'home';
    if (date.money >= 100) return 'mall';
    return 'park';
  },
  'robin_weekend'
);

// 基于NPC状态的动态地点
maplebirch.npc.addSchedule(
  'Kylar',
  date => C.npc.Kylar?.love >= 70,
  date => {
    const trauma = C.npc.Kylar?.trauma || 0;
    if (trauma >= 50) return 'safe_room';
    if (date.hour < 12) return 'flower_shop';
    return 'observatory';
  },
  'kylar_romance'
);
```

#### 日程嵌套

```javascript
// 地点返回另一个日程
maplebirch.npc.addSchedule(
  'MysteriousMerchant',
  date => date.day % 7 === 3, // 每周三
  date => {
    const merchantSchedule = new maplebirch.npc.Schedule();
    merchantSchedule.at(9, 'market_square').at([12, 14], 'tavern').at(18, 'outskirts');
    return merchantSchedule; // 返回子日程
  },
  'merchant_wednesday'
);
```

---

### 日程选项

#### 优先级控制

```javascript
// override: 覆盖其他所有日程
maplebirch.npc.addSchedule('EmergencyDoctor', date => V.emergency, 'hospital_emergency_room', 'emergency_call', { override: true });

// insteadOf: 替代特定日程
maplebirch.npc.addSchedule('RobinSick', date => C.npc.Robin?.health < 30, 'hospital', 'robin_sick', { insteadOf: 'school_day' });
```

#### 依赖关系

```javascript
// before: 在某个日程之前执行
maplebirch.npc.addSchedule('MorningRoutine', date => date.isHour(7), 'bathroom', 'morning_routine', { before: 'school' });

// after: 在某个日程之后执行
maplebirch.npc.addSchedule('EveningStudy', date => date.isHour(20), 'library', 'evening_study', { after: 'dinner' });
```

---

### 日程管理

#### 获取日程

```javascript
// 获取NPC的日程对象
const robinSchedule = maplebirch.npc.Schedule.get('Robin');

// 获取当前地点
const currentLocation = robinSchedule.location;
console.log(`Robin现在在: ${currentLocation}`);

// 获取所有NPC的当前位置
const allLocations = maplebirch.npc.Schedule.location;
console.log('所有NPC位置:', allLocations);
```

#### 更新日程

```javascript
// 更新已有日程的条件
maplebirch.npc.Schedule.update('Robin', 'school_day', {
  condition: date => date.schoolDay && !date.holiday,
  location: 'school_classroom'
});

// 更新地点
maplebirch.npc.Schedule.update('Alex', 'farm_work', {
  location: date => (date.season === 'winter' ? 'farm_house' : 'field')
});
```

#### 删除日程

```javascript
// 删除特定日程
maplebirch.npc.Schedule.remove('Robin', 'weekend_mall');

// 清空NPC的所有日程
maplebirch.npc.Schedule.clear('Robin');

// 清空所有NPC的日程
maplebirch.npc.Schedule.clearAll();
```

#### 日程列表

```javascript
// 获取所有有日程的NPC
const scheduledNPCs = maplebirch.npc.Schedule.npcList;
console.log('有日程的NPC:', scheduledNPCs);

// 获取所有日程对象
const allSchedules = maplebirch.npc.Schedule.schedules;
allSchedules.forEach((schedule, npcName) => {
  console.log(`${npcName}的日程数量:`, schedule.specials.length);
});
```

---

### 增强日期对象 (EnhancedDate)

#### 基本属性

```javascript
date => {
  // 原始DateTime属性
  date.year; // 年份
  date.month; // 月份
  date.day; // 日期
  date.hour; // 小时
  date.minute; // 分钟
  date.second; // 秒

  // 星期相关
  date.weekDay; // 星期几
  date.weekEnd; // 是否周末
  date.schoolDay; // 是否上学日

  // 季节
  date.spring; // 是否春季
  date.summer; // 是否夏季
  date.autumn; // 是否秋季
  date.winter; // 是否冬季

  // 时间段
  date.dawn; // 黎明
  date.daytime; // 白天
  date.dusk; // 黄昏
  date.night; // 夜晚

  // 天气
  date.weather; // 天气状态
  date.precipitation; // 降水量

  return true;
};
```

#### 时间判断方法

```javascript
// 时间点判断
date.isAt(9); // 是否9:00
date.isAt([14, 30]); // 是否14:30

// 时间比较
date.isAfter(12); // 是否在12:00之后
date.isBefore(18); // 是否在18:00之前
date.isBetween(9, 17); // 是否在9:00-17:00之间
date.isBetween([8, 30], [12, 0]); // 是否在8:30-12:00之间

// 小时判断
date.isHour(8, 12, 18); // 是否8、12或18点
date.isHourBetween(9, 16); // 是否9-16点之间
date.isMinuteBetween(0, 30); // 是否0-30分钟之间
```

#### 自定义属性

```javascript
// 可以访问全局游戏变量
date => {
  // 玩家状态
  date.playerHealth = V.health;
  date.playerMoney = V.money;
  date.playerLocation = V.location;

  // NPC状态
  date.robinLove = C.npc.Robin?.love;
  date.kylarTrauma = C.npc.Kylar?.trauma;
  date.whitneyAnger = C.npc.Whitney?.anger;

  // 游戏进度
  date.mainQuestStage = V.mainQuestStage;
  date.completedQuests = V.completedQuests;

  return true;
};
```

---

### 完整示例

#### 示例1：学生NPC的完整日程

```javascript
// 罗宾的学校日程
maplebirch.tool.onInit(() => {
  const robin = maplebirch.npc.Schedule.get('Robin');

  // 上学日日程
  robin
    .at(7, 'home') // 7点在家
    .at([8, 15], 'school') // 8-15点在学校
    .at(12, 'cafeteria') // 12点在食堂
    .at(16, 'library') // 16点在图书馆
    .at(18, 'home') // 18点在家
    .at(22, 'bedroom'); // 22点在卧室

  // 周末日程
  robin.when(
    date => date.weekEnd,
    date => {
      if (date.weather === 'rain') return 'home';
      if (date.money >= 50) return 'mall';
      return 'park';
    },
    'weekend_activity'
  );

  // 特殊事件：考试周
  robin.when(date => V.examWeek, 'library', 'exam_week', { override: true, insteadOf: 'school' });

  // 生病时
  robin.when(date => C.npc.Robin?.health < 50, 'hospital', 'sick_day', { override: true });
});
```

#### 示例2：商店店主的动态日程

```javascript
// 商店店主根据季节和时间调整营业
maplebirch.npc.addSchedule(
  'Shopkeeper',
  date => {
    // 营业时间：9-18点，周日休息
    return date.hour >= 9 && date.hour <= 18 && date.weekDay !== 0;
  },
  date => {
    // 根据季节决定店铺位置
    switch (date.season) {
      case 'spring':
        return date.weather === 'rain' ? 'indoor_market' : 'flower_market';
      case 'summer':
        return date.hour < 12 ? 'beach_stand' : 'shady_plaza';
      case 'autumn':
        return 'harvest_fair';
      case 'winter':
        return 'winter_festival';
      default:
        return 'main_shop';
    }
  },
  'shop_seasonal'
);
```

#### 示例3：有依赖关系的复杂日程

```javascript
// 晨间例行公事，有严格的顺序
maplebirch.npc.addSchedule('MorningRoutine', date => date.isHour(6), 'bedroom_wakeup', 'wakeup', { before: 'shower' });

maplebirch.npc.addSchedule('MorningRoutine', date => date.isBetween([6, 10], [6, 30]), 'bathroom', 'shower', { after: 'wakeup', before: 'breakfast' });

maplebirch.npc.addSchedule('MorningRoutine', date => date.isBetween([6, 30], [7, 0]), 'kitchen', 'breakfast', { after: 'shower', before: 'dress' });

maplebirch.npc.addSchedule('MorningRoutine', date => date.isBetween([7, 0], [7, 15]), 'bedroom', 'dress', { after: 'breakfast', before: 'leave' });

maplebirch.npc.addSchedule('MorningRoutine', date => date.isHour(7) && date.minute >= 15, 'front_door', 'leave', { after: 'dress' });
```
