# SCML-DOL-maplebirchframework
依赖Sugarcube2 ModLoader为DOL设计的框架系统
<hr>

  **maplebirchframework** 是为使用 Sugarcube2 ModLoader 的DOL游戏设计的MOD内容添加框架，用于简化游戏扩展模组的开发过程。\
  **maplebirchframework** 是为使用 Sugarcube2 ModLoader 的DOL游戏设计的MOD内容添加框架，用于简化游戏扩展模组的开发过程。
  
  本框架现有**事件注册**、**多语言管理**、**模块管理器**、**简便变量迁徙**、**原版<<effect>>宏内容添加**、**随机数**、**游戏内置作弊器**、**addto区域快捷插入**(包含游戏内侧边栏几乎所有功能，除成就、存档)、**简易弹窗**、**特质添加**、**地点创建**(左上角地点图片)、**时间事件**(已让游戏支持-9999年-9999年，公元纪年)、**NPC注册(包括创新属性)**、。

- [安装方式说明](#安装方式说明)
- [反馈与讨论方式](#反馈与讨论方式)
- [详细内容介绍](#详细内容介绍)
    - [事件注册](#事件注册)
    - [多语言管理](#多语言管理)
    - [addto区域快捷插入](#addto区域快捷插入)
    - [特质添加](#特质添加)
    - [地点创建](#地点创建)
    - [时间事件](#时间事件)
    - [NPC注册](#NPC注册)
- [致谢](#致谢)
- [未实现的功能构想](#未实现的功能构想)

### 反馈与讨论方式
 (暂无)，或在**污度孤儿中国模组制作群**联系我。

### 安装方式说明
  申明依赖两种方式。  
**第一种: 在boot.json中申明**  
```
"dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=2.0.0"
    }
  ]
```
**第二种：利用钩子依赖**

<details>
  <summary>点击查看图片</summary>
  <img width="1828" height="648" alt="image" src="https://github.com/user-attachments/assets/3ed72615-54f9-4590-8901-93da0262ddf4" />
</details>

### 详细内容介绍:

#### 事件注册
   通过 **`maplebirch.on(eventName, callback, priority = 1, description = '')`** 来注册事件。  
- `eventName`：事件名称（可自定义创建，下方图片为默认事件名）  
- `callback`：事件触发时的回调函数  
- `priority`：优先级（优先级从小到大 **`1 -> 3`**，默认值 **`1`**）  
- `description`：事件描述（字符串，默认空字符串）  

其中 **`maplebirch.once(eventName, callback, priority = 1, description = '')`** 是注册单次事件，即触发后删除。  
其中 **`maplebirch.off(eventName, identifier)`** 是删除注册的事件，**`identifier`**是事件标识符，通常使用注册时的**事件描述**。  
其中 **`maplebirch.trigger(eventName, ...args)`** 是触发事件的函数，**`...args`**是传导的变量数据。
```
示例:  
maplebirch.once(':coreReady',() => console.log('核心已准备好'), 3);  
maplebirch.trigger(':coreReady'); 时触发console.log('核心已准备好')后删除事件。  
```
<details>
  <summary>点击查看图片</summary>
  <img width="706" height="401" alt="image" src="https://github.com/user-attachments/assets/a488bcf5-e505-473d-a7c2-a8e0885b2678" />
</details>

#### 多语言管理
  通常翻译数据文件路径  
```
根目录/  
└── translations/  
    ├── cn.json  
    ├── en.json  
    └── jp.json
```
在js中通过 **`await maplebirch.lang.importAllLanguages(你的模组名);`** 来导入你的数据文件。  
- `maplebirch.lang.t(键名)` : 根据键名转换翻译。  
- `maplebirch.lang.autoTranslate(任意语言数据)` : 自动根据当前语言自动转换。
```
示例:  
 cn.json中: "key" : "键"  
 en.josn中: "key" : "key"
 maplebirch.lang.t('key') 在中文 输出'键'。在英文输出 'key'。
 maplebirch.lang.autoTranslate('键') 在中文 输出'键'。在英文输出 'key'。
```
#### 原版`<<effect>>`宏内容添加
  在原版的 **`<<effect>>`** 中添加内容，常用于成就的添加，比较难用完全可以使用addto中的 **Header页眉区域替代** 。  
```
示例:  
maplebirch.tool.registerWidget(id, widget, cleanup, meta);  
maplebirch.tool.registerText(id, text, cleanup, meta);
maplebirch.tool.effect.registerText(
  "XXX",
  [
    { style: "span", text: `蓝色`, colour: "blue" },
    { style: "span", text: `红色`, colour: "red" }
  ],
  false
  ,
  { persistent: true } // 设置为持久化
);
maplebirch.tool.effect.registerWidget(
  "XXX",
  ["earnFeat", "Under the Ice"],
  fasle
  ,
  {
    description: "获得'Under the Ice'成就",
    persistent: false
  }
);
```
- `id`：此注册内容的id(如为持久化则必须为唯一id)  
- `widget`：使用的widget宏
- `text`：文本，
- `cleanup`：清理函数  
- `meta`：元数据(persistent: trues时为持久化)  
#### addto区域快捷插入
  与原来的简易框架一致，在对应区域插入widget或函数，详情看下方图片。  
<details>
  <summary>点击查看图片</summary>
  <img width="846" height="990" alt="image" src="https://github.com/user-attachments/assets/0fc25fa2-4bd9-4323-b17e-6d3a77376e1d" />
</details>  

#### 简易弹窗
  使用特殊的**`<<maplebirchReplace>>`**宏来弹窗。
```
示例:

<<maplebirchReplace "maplebirchModHint" "title">>

<<widget 'maplebirchModHint'>>  
<</widget>>

<<widget 'titleMaplebirchModHint'>>  
  <<setupTabs>>  
  <div id="overlayTabs" class="tab">  
    <<closeButtonMobile>>  
  </div>  
  <<closeButton>>  
<</widget>>

弹出带有'titleMaplebirchModHint'标题的首页面'maplebirchModHint'的弹窗。

<<maplebirchReplace 'maplebirchModHint'>> 单弹窗无标题。

<<maplebirchReplace 'maplebirchModHint' 'customize'>> 自定义 通过 <<print 'maplebirchModHint'>> 使用你的自设弹窗。
```
#### 特质添加
  便携添加特质，可重复添加下方为汉化包汉化后的中英文特质标题映射，输入对应英文进你的特质标题即可为对应特质区域添加特质。
<details>
  <summary>点击查看图片</summary>
  <img width="438" height="247" alt="image" src="https://github.com/user-attachments/assets/7b2fd514-4819-4a5f-832c-5ca9bd00d1bf" />
</details>  

```
示例:  
maplebirch.tool.other.addTraits({  
  title: 特质标题,  
  name: typeof traits.name === 'function' ? traits.name() : traits.name,                 // 特质名字  
  colour: typeof traits.colour === 'function' ? traits.colour() : traits.colour || '',   // 文字颜色  
  has: typeof traits.has === 'function' ? traits.has() : traits.has || false,            // 触发条件  
  text: typeof traits.text === 'function' ? traits.text() : traits.text || ''            // 特质说明  
},{  
  title: "General Traits",  
  name: typeof traits.name === 'function' ? traits.name() : traits.name,  
  colour: typeof traits.colour === 'function' ? traits.colour() : traits.colour || '',  
  has: typeof traits.has === 'function' ? traits.has() : traits.has || false,  
  text: typeof traits.text === 'function' ? traits.text() : traits.text || ''  
});  
```

#### 地点创建
  便携为你的地点添加右上角贴图，详情请查看原版对应的**setup.LocationImages**变量
```
/**
 * 地点配置方法（添加/更新）
 * @param {string} locationId - 地点ID
 * @param {object} config - 配置对象
 * @param {object} [options] - 配置选项
 * @param {boolean} [options.overwrite=false] - 是否覆盖整个配置
 * @param {string} [options.layer] - 指定操作图层
 * @param {string} [options.element] - 指定操作元素
 * 
 * 示例1：添加新地点
 * configureLocation('magic_academy', {
 *   folder: 'magic_academy',
 *   base: { main: { image: 'main.png' } }
 * });
 * 
 * 示例2：更新特定元素
 * configureLocation('lake_ruin', {
 *   condition: () => Weather.bloodMoon && !Weather.isSnow
 * }, { layer: 'base', element: 'bloodmoon' });
 * 
 * 示例3：完全覆盖地点
 * configureLocation('cafe', {
 *   folder: 'cafe_remastered',
 *   base: { ... }
 * }, { overwrite: true });
 * 
 * 示例4：添加新图层元素
 * configureLocation('forest', {
 *   image: 'fireflies.png',
 *   animation: { frameDelay: 300 }
 * }, { layer: 'emissive', element: 'fireflies' });
 */
```
#### 时间事件
 用于注册时间事件。
```
/**
 * 时间事件系统数据结构说明
 * 
 * 核心事件数据结构：
 * 
 * 所有事件类型共有的核心属性:
 *   passed: number,        // 流逝的总秒数
 *   prevDate: DateTime,    // 流逝前的时间对象
 *   currentDate: DateTime  // 流逝后的时间对象
 * 
 * 1. onBefore 事件 (时间流逝前触发)
 * @typedef {Object} BeforeEventData
 * @property {number} passed - 即将流逝的秒数
 * @property {number} timeStamp - 流逝前的时间戳
 * @property {DateTime} prev - 流逝前的时间对象（只读）
 * @property {Object} option - 预留选项对象（通常为空）
 * 
 * 2. onThread 事件 (时间流逝中触发)
 * @typedef {Object} ThreadEventData
 * @property {number} passed - 流逝的秒数
 * @property {number} sec - 秒数差
 * @property {number} min - 分钟差
 * @property {number} hour - 小时差
 * @property {number} day - 天数差
 * @property {number} week - 周数差
 * @property {number} month - 月数差
 * @property {number} year - 年数差
 * @property {number[]} weekday - 星期变化 [流逝前星期, 流逝后星期]
 * @property {Object} cumulative - 累积时间对象
 *   @property {number} cumulative.sec - 累积秒数
 *   @property {number} cumulative.min - 累积分钟
 *   @property {number} cumulative.hour - 累积小时
 *   @property {number} cumulative.day - 累积天数
 *   @property {number} cumulative.week - 累积周数
 *   @property {number} cumulative.month - 累积月数
 *   @property {number} cumulative.year - 累积年数
 * @property {DateTime} prevDate - 流逝前的时间对象
 * @property {DateTime} currentDate - 流逝后的时间对象
 * 
 * 3. onAfter 事件 (时间流逝后触发)
 * @typedef {Object} AfterEventData
 * @property {number} passed - 流逝的秒数
 * @property {number} sec - 秒数差
 * @property {number} min - 分钟差
 * @property {number} hour - 小时差
 * @property {number} day - 天数差
 * @property {number} week - 周数差
 * @property {number} month - 月数差
 * @property {number} year - 年数差
 * @property {number[]} weekday - 星期变化 [流逝前星期, 流逝后星期]
 * @property {Object} cumulative - 累积时间对象
 *   @property {number} cumulative.sec - 累积秒数
 *   @property {number} cumulative.min - 累积分钟
 *   @property {number} cumulative.hour - 累积小时
 *   @property {number} cumulative.day - 累积天数
 *   @property {number} cumulative.week - 累积周数
 *   @property {number} cumulative.month - 累积月数
 *   @property {number} cumulative.year - 累积年数
 * @property {DateTime} prevDate - 流逝前的时间对象
 * @property {DateTime} currentDate - 流逝后的时间对象
 * 
 * 4. 周期性事件 (onSec, onMin, onHour, onDay, onWeek, onMonth)
 * @typedef {Object} PeriodicEventData
 * @property {number} passed - 流逝的秒数
 * @property {number} sec - 秒数差
 * @property {number} min - 分钟差
 * @property {number} hour - 小时差
 * @property {number} day - 天数差
 * @property {number} week - 周数差
 * @property {number} month - 月数差
 * @property {number} year - 年数差
 * @property {number[]} weekday - 星期变化 [流逝前星期, 流逝后星期]
 * @property {Object} cumulative - 累积时间对象
 *   @property {number} cumulative.sec - 累积秒数
 *   @property {number} cumulative.min - 累积分钟
 *   @property {number} cumulative.hour - 累积小时
 *   @property {number} cumulative.day - 累积天数
 *   @property {number} cumulative.week - 累积周数
 *   @property {number} cumulative.month - 累积月数
 *   @property {number} cumulative.year - 累积年数
 * @property {Object} changes - 本次事件周期内累积的变化量
 *   @property {number} changes.sec - 秒数变化量
 *   @property {number} changes.min - 分钟变化量
 *   @property {number} changes.hour - 小时变化量
 *   @property {number} changes.day - 天数变化量
 *   @property {number} changes.week - 周数变化量
 *   @property {number} changes.month - 月数变化量
 *   @property {number} changes.year - 年数变化量
 * @property {DateTime} prevDate - 流逝前的时间对象
 * @property {DateTime} currentDate - 流逝后的时间对象
 * 
 * DateTime 对象结构
 * 
 * @typedef {Object} DateTime
 * @property {number} year - 年份（支持负值表示公元前）
 * @property {number} month - 月份 (1-12)
 * @property {number} day - 日期 (1-31)
 * @property {number} hour - 小时 (0-23)
 * @property {number} minute - 分钟 (0-59)
 * @property {number} second - 秒数 (0-59)
 * @property {number} weekDay - 星期 (1-7, 1=周日)
 * @property {number} timeStamp - Unix时间戳（秒）
 * @property {number} moonPhase - 月相 (0-1)
 * @property {number} moonPhaseFraction - 月相分数
 * @property {string} dayState - 时间段 ("dawn", "day", "dusk", "night")
 * @property {function} toString - 转换为字符串的方法
 * @property {function} addSeconds - 添加秒数
 * @property {function} addMinutes - 添加分钟
 * @property {function} addHours - 添加小时
 * @property {function} addDays - 添加天数
 * @property {function} addMonths - 添加月数
 * @property {function} addYears - 添加年数
 * @property {function} compareWith - 比较两个时间对象
 *   @param {DateTime} other - 要比较的时间对象
 *   @param {boolean} [getSeconds=false] - 是否只返回秒数差
 *   @returns {number|Object} - 秒数差或详细时间差对象
 * 
 * 时间事件系统功能：
 * - 提供精确的时间流逝事件处理
 * - 支持多种时间单位的事件（秒、分、时、日、周、月）
 * - 处理闰年、闰月等复杂日历计算
 * - 支持负年份（公元前）的时间计算
 * - 提供累积时间变化统计
 * - 自动优化底层DateTime实现
 */
```

```
示例:  
// 1. 注册时间流逝前事件 (onBefore)
maplebirch.state.regTimeEvent('onBefore', 'beforeEventExample', {
  action: (data) => {
    console.log(`[onBefore] 即将流逝 ${data.passed} 秒`);
    console.log(`当前时间: ${data.prev.toString()}`);
  },
  description: '时间流逝前记录日志',
  priority: 5
});

// 2. 注册每秒事件 (onSec)
maplebirch.state.regTimeEvent('onSec', 'secEventExample', {
  action: (data) => {
    console.log(`[onSec] 秒数变化: ${data.changes.sec}`);
    // 每秒检查一次玩家状态
    if (V.player.health < 30) {
      console.warn('警告: 玩家生命值过低!');
    }
  },
  description: '每秒检查玩家状态'
});

// 3. 注册每分钟事件 (onMin)
maplebirch.state.regTimeEvent('onMin', 'minEventExample', {
  action: (data) => {
    console.log(`[onMin] 分钟变化: ${data.changes.min}`);
    // 每分钟恢复1点体力
    V.player.stamina = Math.min(V.player.stamina + 1, 100);
  },
  description: '每分钟恢复体力',
  priority: 3
});

// 4. 注册每小时事件 (onHour)
maplebirch.state.regTimeEvent('onHour', 'hourEventExample', {
  action: (data) => {
    console.log(`[onHour] 小时变化: ${data.changes.hour}`);
    // 每小时自动存档
    if (!V.disableAutoSave) {
      Save.save('auto');
      console.log('自动存档完成');
    }
  },
  description: '每小时自动存档'
});

// 5. 注册每天事件 (onDay)
maplebirch.state.regTimeEvent('onDay', 'dayEventExample', {
  action: (data) => {
    console.log(`[onDay] 天数变化: ${data.changes.day}`);
    // 每天重置商店库存
    Shop.resetStock();
    // 更新每日任务
    Quest.resetDailyQuests();
    // 特殊日期事件
    if (data.currentDate.month === 12 && data.currentDate.day === 25) {
      console.log('圣诞节特殊事件触发!');
      V.events.christmas = true;
    }
  },
  description: '每日重置和特殊事件',
  priority: 10
});

// 6. 注册每周事件 (onWeek)
maplebirch.state.regTimeEvent('onWeek', 'weekEventExample', {
  action: (data) => {
    console.log(`[onWeek] 周数变化: ${data.changes.week}`);
    // 每周结算工资
    if (V.player.job) {
      const salary = Jobs[V.player.job].salary;
      V.player.money += salary;
      console.log(`收到周薪: $${salary}`);
    }
  },
  description: '每周结算工资'
});

// 7. 注册每月事件 (onMonth)
maplebirch.state.regTimeEvent('onMonth', 'monthEventExample', {
  action: (data) => {
    console.log(`[onMonth] 月数变化: ${data.changes.month}`);
    // 每月支付账单
    const bills = calculateBills();
    V.player.money -= bills;
    console.log(`支付账单: $${bills}`);
    
    // 季节变化检测
    const season = getSeason(data.currentDate.month);
    if (V.currentSeason !== season) {
      V.currentSeason = season;
      console.log(`季节变为: ${season}`);
    }
  },
  description: '每月账单和季节变化'
});

// 8. 注册时间流逝后事件 (onAfter)
maplebirch.state.regTimeEvent('onAfter', 'afterEventExample', {
  action: (data) => {
    console.log(`[onAfter] 时间流逝完成`);
    console.log(`新时间: ${data.currentDate.toString()}`);
    // 更新UI时间显示
    updateTimeDisplay(data.currentDate);
  },
  description: '更新UI时间显示'
});

// 9. 一次性事件示例 (使用once选项)
maplebirch.state.regTimeEvent('onDay', 'oneTimeEvent', {
  action: (data) => {
    console.log('这是一次性事件，只会触发一次!');
    // 触发特殊剧情
    startSpecialEvent();
  },
  once: true,
  description: '一次性特殊事件'
});

// 10. 条件性事件示例 (使用cond选项)
maplebirch.state.regTimeEvent('onHour', 'conditionalEvent', {
  cond: (data) => {
    // 只在夜晚触发 (晚上8点到早上6点)
    return data.currentDate.hour >= 20 || data.currentDate.hour < 6;
  },
  action: (data) => {
    console.log('夜晚事件触发!');
    // 增加夜晚遭遇概率
    V.nightEncounterChance += 0.1;
  },
  description: '夜晚专属事件'
});
```
#### NPC注册
 为你的模组便携添加npc，详情看**下方图片**，或去代码指定位置，选择你的npc数据。
```
// 添加一个名为Lily的狐狸NPC
npc.add({
  nam: "Lily",         // NPC唯一名称（必需）
  gender: "f",         // 女性（m/f/none）
  title: "dancer"      // 头衔
  type: "human",       // 人类种族 （如果你可以解决战斗问题，你可以换全新种族）
}, 
{  // NPC配置（可选）
  important: true,     // 标记为重要NPC（显示在状态栏）
  love: { maxValue: 30 },  // 设置好感度上限
  dom: { maxValue: 20 }    // 设置支配值上限
},
{  // 翻译数据（可选）
  "Lily": {             
    CN: "莉莉",        // 中文翻译
    EN: "Lily"         // 英文原文
}
});

// 添加新状态"arcana"并修改现有状态"purity"
npc.addStats({
  arcana: {           // 新状态-奥秘值
    min: 0,           // 最小值0
    max: 100,         // 最大值100
    position: 3       // 插入到状态列表第4个位置
  },
  purity: {           // 修改现有状态-纯洁值
    max: 200          // 调整最大值为200（原值100）
  },
  corruption: {       // 修改现有状态-堕落值
    min: -50,         // 允许负值
    position: "last"  // 移动到列表末尾
  }
});
```

<details>
  <summary>点击查看图片</summary>
  <img width="510" height="1083" alt="image" src="https://github.com/user-attachments/assets/5e5c5625-2eab-4c15-9d86-eaa0da4b0da0" />
</details> 

### 致谢
- 感谢 [Lyoko-Jeremie](https://github.com/Lyoko-Jeremie) 制作的Modloader和所支持的功能。
- 感谢 [Lyoko-Jeremie](https://github.com/Lyoko-Jeremie) 大神开发了Modloader以及所有预置模组、[Number_Sir](https://github.com/NumberSir) 大佬开发了模组编写助手，以及两位魔法师在模组开发群里提供的教程和指导。
- 感谢 [狐千月](https://github.com/emicoto) 制作的 [简易框架](https://github.com/emicoto/SCMLSimpleFramework) 。
- 感谢 [苯环](https://github.com/Nephthelana) 、[零环](https://github.com/ZeroRing233) 、 [丧心](https://github.com/MissedHeart) 的代码指导。
- 感谢 污度孤儿中国模组制作群 的新人引导。

### 未实现的功能构想
- 人类体型战斗系统重置、完善制作全新npc架构(画布...)