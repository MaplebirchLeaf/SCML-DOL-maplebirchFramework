## 区域管理系统 (zonesManager)

### 基本介绍

`zonesManager` 是框架的区域管理工具，允许模组制作者将自定义的部件(widgets)添加到游戏的各个特定区域，如状态栏、菜单、页眉页脚等。它提供了一种结构化的方式来组织和控制游戏界面元素的显示。
_可通过 `maplebirch.tool` 或快捷接口 `maplebirchFrameworks.addto()` 访问。_

---

### 核心功能

#### **添加部件到区域 (addTo)**

- 将一个或多个部件添加到指定区域
- **@param**:
  - `zone` (string): 目标区域名称
  - `...widgets` (string | Function | ZoneWidgetConfig | [number, string | ZoneWidgetConfig]): 要添加的部件
- **@return**: void
- **@example**:

  ```javascript
  // 添加一个部件到状态栏
  maplebirch.tool.addTo('StatusBar', 'myStatusWidget');

  // 使用快捷接口
  maplebirchFrameworks.addto('StatusBar', 'myStatusWidget');
  ```

#### **初始化函数 (onInit)**

- 注册在游戏初始化时执行的函数
- **@param**: `...widgets` (InitFunction): 初始化函数或部件
- **@return**: void
- **@example**:
  ```javascript
  // 注册初始化函数
  maplebirch.tool.onInit(() => {
    // 在 setup 静态变量脚本时期执行的代码
    setup.myCustomData = { ... };
  });
  ```

---

### boot.json 配置方式

除了通过 JavaScript API 注册部件外，框架还支持在 `boot.json` 文件中通过 `addonPlugin` 配置来批量注册部件。这种方式适合需要在模组加载时就静态注册的部件。

#### **配置结构**

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "framework": [
      {
        "addto": "StatusBar",
        "widget": "myStatusWidget"
      },
      {
        "addto": "Header",
        "widget": {
          "widget": "myHeaderWidget",
          "exclude": ["SpecialPage1", "SpecialPage2"]
        }
      }
    ]
  }
}
```

#### **配置选项说明**

- `addto` (string): 目标区域名称
- `widget` (string | object): 部件配置
  - 字符串: widget 名称
  - 对象: 完整的部件配置对象

#### **配置对象结构**

```javascript
{
  "addto": "区域名称",             // 必填
  "widget": {                     // 部件配置
    "widget": "widget名称",       // 必填
    "passage": "段落名或数组",     // 可选，只在指定段落显示
    "exclude": ["段落1", "段落2"], // 可选，在这些段落不显示
    "match": "正则表达式字符串"    // 可选，段落名正则匹配
  }
}
```

#### **配置示例**

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "framework": [
      {
        "addto": "StatusBar",
        "widget": "healthDisplay"
      },
      {
        "addto": "Footer",
        "widget": "copyrightInfo"
      },
      {
        "addto": "Information",
        "widget": "locationInfo"
      }
    ]
  }
}
```

#### **带条件的部件注册**

```json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "framework": [
      {
        "addto": "StatusBar",
        "widget": {
          "widget": "combatStatus",
          "passage": ["Combat", "BossBattle"],
          "exclude": ["Victory", "Defeat"]
        }
      },
      {
        "addto": "BeforeLinkZone",
        "widget": {
          "widget": "warningMessage",
          "match": "Shop.*"
        }
      }
    ]
  }
}
```

---

### 支持的区域列表

框架预定义了多个区域，每个区域对应游戏界面中的特定位置：

| 区域名称                  | 对应位置           | 说明                       |
| :------------------------ | :----------------- | :------------------------- |
| `Init`                    | 初始化区域         | setup 静态变量脚本时期执行 |
| `State`                   | 初始化变量区域     | 存档变量 (V) 初始化        |
| `Header`                  | 页眉               | 页面顶部区域               |
| `Footer`                  | 页脚               | 页面底部区域               |
| `Information`             | 信息栏             | 信息显示区域               |
| `Options`                 | 选项栏             | 选项设置区域               |
| `Cheats`                  | 作弊栏             | 作弊功能区域               |
| `Statistics`              | 统计栏             | 统计数据区域               |
| `Journal`                 | 日志尾部           | 日志显示区域               |
| `BeforeLinkZone`          | 链接前区域         | 所有链接之前               |
| `AfterLinkZone`           | 链接后区域         | 所有链接之后               |
| `CustomLinkZone`          | 自定义位置链接区域 | 特定链接位置               |
| `CaptionDescription`      | 标题描述           | 标题描述区域               |
| `StatusBar`               | 状态栏             | 游戏状态显示               |
| `MenuBig`                 | 大菜单             | 大型菜单区域               |
| `MenuSmall`               | 小菜单             | 小型菜单区域               |
| `CaptionAfterDescription` | 标题描述后         | 标题描述之后               |
| `HintMobile`              | 移动端图标         | 疼痛上方图标               |
| `StatsMobile`             | 移动端状态         | 疼痛等状态显示             |
| `CharaDescription`        | 角色描述           | 角色描述区域               |
| `DegreesBonusDisplay`     | 属性加成显示       | 属性加成显示               |
| `DegreesBox`              | 属性框             | 属性显示框                 |
| `SkillsBonusDisplay`      | 技能加成显示       | 技能加成显示               |
| `SkillsBox`               | 技能框             | 技能显示框                 |
| `SubjectBoxBonusDisplay`  | 学科加成显示       | 学科加成显示               |
| `SchoolSubjectsBox`       | 学科框             | 学科显示框                 |
| `SchoolMarksText`         | 成绩文本           | 成绩显示文本               |
| `WeaponBox`               | 武器框             | 武器显示框                 |
| `ReputationModify`        | 声誉显示修改区     | 声誉显示修改               |
| `Reputation`              | 声誉               | 声誉显示                   |
| `FameModify`              | 知名度显示修改区   | 知名度显示修改             |
| `Fame`                    | 知名度             | 知名度显示                 |
| `StatusSocial`            | 自定义社交状态     | 社交状态显示               |
| `NPCinit`                 | NPC初遇初始化      | 原版 `<<initnpc>>` 宏相关  |
| `NPCinject`               | NPC生成初始化      | 原版 `<<npc>>` 宏相关      |

---

### 部件类型

#### **1. 字符串部件**

直接指定 widget 名称，会在指定区域调用该 widget。

```javascript
// 添加名为 'myWidget' 的 widget
maplebirch.tool.addTo('StatusBar', 'myWidget');

// 对应的 widget 定义
<<widget 'myWidget'>>
  这是状态栏的部件
<</widget>>
```

#### **2. 函数部件**

添加一个 JavaScript 函数，函数会被包装为可执行的 widget。

```javascript
// 添加一个函数到区域
maplebirch.tool.addTo('StatusBar', function () {
  console.log('状态栏部件执行');
  return '动态内容';
});

// 或者使用箭头函数
maplebirch.tool.addTo('StatusBar', () => {
  return `当前时间: ${Time.hour}:${Time.minute}`;
});
```

#### **3. 配置对象部件**

通过配置对象精确控制部件的显示条件。

```javascript
// 配置对象结构
interface ZoneWidgetConfig {
  widget: string;                    // widget 名称
  passage?: string | string[];       // 只在指定段落显示
  exclude?: string[];               // 在这些段落不显示
  match?: RegExp;                   // 段落名正则匹配
  type?: 'function';                // 函数类型
  func?: () => string;              // 函数实现
}
```

#### **4. 自定义链接位置部件**

仅用于 `CustomLinkZone` 区域，指定在部件的特定链接位置插入。

```javascript
// 在第一个链接位置添加部件
maplebirch.tool.addTo('CustomLinkZone', [0, 'myLinkWidget']);

// 在第五个链接位置添加部件
maplebirch.tool.addTo('CustomLinkZone', [4, 'myLinkWidget']);
```

---

### 完整使用示例

#### **示例1：基本区域添加**

```javascript
// 注册一个状态栏部件
<<widget 'healthDisplay'>>
  生命值: <<print $health>> / <<print $maxHealth>>
<</widget>>

// 在游戏代码中将部件添加到状态栏
maplebirch.tool.addTo('StatusBar', 'healthDisplay');
```

#### **示例2：条件显示部件**

```javascript
// 只在特定段落显示的部件
maplebirch.tool.addTo('StatusBar', {
  widget: 'combatStatus',
  passage: ['Combat', 'BossBattle'], // 只在战斗段落显示
  exclude: ['Victory', 'Defeat'] // 不在胜利/失败段落显示
});

// 使用正则匹配段落
maplebirch.tool.addTo('StatusBar', {
  widget: 'shopIndicator',
  match: /^Shop/ // 匹配以 Shop 开头的段落
});
```

#### **示例3：函数部件**

```javascript
// 添加动态函数部件
maplebirch.tool.addTo('StatusBar', () => {
  const time = Time.hour;
  if (time >= 6 && time < 18) {
    return '白天';
  } else {
    return '夜晚';
  }
});

// 添加复杂的函数部件
maplebirch.tool.addTo('Information', function () {
  const { variables } = State;
  const location = variables.location || '未知';
  const weather = Weather.name || '未知';

  return `位置: ${location} | 天气: ${weather}`;
});
```

#### **示例4：初始化函数**

```javascript
// 注册初始化函数(在 setup 时期执行)
maplebirch.tool.onInit(() => {
  // 初始化自定义数据
  setup.myModData = {
    version: '1.0.0',
    items: [],
    npcs: []
  };

  // 设置默认变量
  setup.defaultValues = {
    playerName: '旅行者',
    startingGold: 100
  };

  console.log('模组初始化完成');
});

// 也可以注册多个初始化函数
maplebirch.tool.onInit(
  () => {
    console.log('初始化函数1');
  },
  () => {
    console.log('初始化函数2');
  }
);
```

#### **示例5：自定义链接区域**

```javascript
// 在链接区域添加部件
<<widget 'linkSeparator'>>
  <hr>
<</widget>>

// 在第一个链接前添加分隔线
maplebirch.tool.addTo('CustomLinkZone', [0, 'linkSeparator']);

// 在第三个链接前添加提示
<<widget 'importantChoice'>>
  <strong>重要选择！</strong>
<</widget>>

maplebirch.tool.addTo('CustomLinkZone', [2, 'importantChoice']);
```

#### **示例6：页眉页脚定制**

```javascript
// 创建自定义页眉
<<widget 'customHeader'>>
  <header class="game-header">
    <h1>我的游戏模组</h1>
    <div class="header-info">
      版本: <<print setup.myModVersion>> |
      玩家: <<print $playerName>>
    </div>
  </header>
<</widget>>

// 创建自定义页脚
<<widget 'customFooter'>>
  <footer class="game-footer">
    <p>© 2025 我的模组 | 存档时间: <<print Time.date>></p>
  </footer>
<</widget>>

// 添加到相应区域
maplebirch.tool.addTo('Header', 'customHeader');
maplebirch.tool.addTo('Footer', 'customFooter');
```

#### **示例7：移动端界面优化**

```javascript
// 为移动端添加触摸提示
<<widget 'mobileHint'>>
  <div class="mobile-hint">
    点击图标查看更多选项
  </div>
<</widget>>

// 为移动端添加状态显示
<<widget 'mobileStats'>>
  <div class="mobile-stats">
    生命: <<print $health>> | 体力: <<print $stamina>>
  </div>
<</widget>>

maplebirch.tool.addTo('HintMobile', 'mobileHint');
maplebirch.tool.addTo('StatsMobile', 'mobileStats');
```

#### **示例8：组合配置(JavaScript + Boot.json)**

```javascript
// boot.json
{
  "modName": "maplebirch",
  "addonName": "maplebirchAddon",
  "modVersion": "^3.1.0",
  "params": {
    "framework": [
      {
        "addto": "Init",
        "widget": "setupMyMod"
      },
      {
        "addto": "StatusBar",
        "widget": "basicStats"
      }
    ],
    "script": [
      "my-mod-script.js"
    ]
  }
}
```

```javascript
// my-mod-script.js
// 在 JavaScript 中动态注册部件
maplebirch.tool.onInit(() => {
  // 初始化模组数据
  setup.myMod = {
    version: '1.0.0',
    features: ['customStats', 'dynamicUI']
  };
});

// 根据条件动态添加部件
if (setup.myMod.features.includes('customStats')) {
  maplebirch.tool.addTo('StatusBar', 'enhancedStats');
}

// 注册函数部件
maplebirch.tool.addTo('Information', () => {
  return `模组版本: ${setup.myMod.version}`;
});
```

---

### 特殊区域说明

#### **Init 区域**

- **执行时机**: 在游戏的 setup 静态变量脚本时期执行
- **用途**: 初始化模组数据、设置默认值、注册全局函数
- **注意**: 这里设置的变量会成为游戏静态数据的一部分

```javascript
maplebirch.tool.onInit(() => {
  // 在这里设置 setup 数据
  setup.myMod = {
    items: generateItems(),
    npcs: createNPCs(),
    quests: setupQuests()
  };

  // 注册全局函数
  window.myModFunction = function () {
    // 模组功能
  };
});
```

#### **State 区域**

- **执行时机**: 存档变量 (V) 初始化时期
- **用途**: 设置玩家变量初始值
- **注意**: 这里设置的变量会保存在存档中

```javascript
// 添加初始化变量
maplebirch.tool.addTo('State', () => {
  V.myMod = V.myMod || {
    progress: 0,
    completedQuests: [],
    collectedItems: []
  };
});
```

#### **CustomLinkZone 区域**

- **特殊语法**: 使用数组格式 `[position, widget]`
- **position**: 链接位置索引(从0开始)
- **widget**: 要插入的部件
- **用途**: 在特定链接位置插入内容

```javascript
// 在不同链接位置插入不同内容
maplebirch.tool.addTo(
  'CustomLinkZone',
  [0, 'firstLinkHint'], // 第一个链接前
  [2, 'thirdLinkWarning'], // 第三个链接前
  [4, 'fifthLinkTip'] // 第五个链接前
);
```
