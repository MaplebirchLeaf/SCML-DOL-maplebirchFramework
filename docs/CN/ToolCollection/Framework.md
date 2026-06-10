## 区域管理

### 用来做什么

区域管理用于把模组 widget 插入到游戏页面的固定位置。它适合放置选项页内容、状态栏信息、页眉页脚、链接区提示、角色面板扩展、社交页扩展等内容。

如果你的目标是“把一个 widget 放到游戏已有界面的某个位置”，通常就使用这个功能。

---

### 使用入口

```javascript
maplebirch.tool.addTo(zone, widget);
```

也可以通过子模块访问：

```javascript
maplebirch.tool.zone.addTo(zone, widget);
```

两种写法等价，文档中统一使用 `maplebirch.tool.addTo()`。

---

### 最小写法

先定义 SugarCube widget：

```twine
<<widget "MyModOptions">>
  <h3>我的模组选项</h3>
  <<checkbox "$myMod.enabled" false true autocheck>> 启用功能
<</widget>>
```

再添加到选项区域：

```javascript
maplebirch.tool.addTo('Options', 'MyModOptions');
```

---

### 通过 boot.json 添加

固定区域内容可以直接写入 `boot.json`：

```json
"framework": {
  "addto": "Options",
  "widget": "MyModOptions"
}
```

多个区域可写成数组：

```json
"framework": [
  {
    "addto": "Options",
    "widget": "MyModOptions"
  },
  {
    "addto": "StatusBar",
    "widget": "MyModStatus"
  }
]
```

完整配置方式见 [boot.json 配置](../BootJson.md)。

---

### widget 写法

#### widget 名称

最常用的写法是传入 widget 名称：

```javascript
maplebirch.tool.addTo('StatusBar', 'MyModStatus');
```

框架会在对应区域输出：

```twine
<<MyModStatus>>
```

#### 函数

可以直接传入函数：

```javascript
maplebirch.tool.addTo('Information', () => {
  return `当前位置：${V.location}`;
});
```

函数适合简单动态文本。复杂 UI 更推荐写成 SugarCube widget。

#### 配置对象

配置对象用于控制显示范围：

```javascript
maplebirch.tool.addTo('StatusBar', {
  widget: 'CombatStatus',
  passage: ['Combat', 'Struggle'],
  exclude: ['Victory']
});
```

字段说明：

| 字段      | 说明                    |
| :-------- | :---------------------- |
| `widget`  | widget 名称             |
| `passage` | 只在指定 passage 显示   |
| `exclude` | 在指定 passage 不显示   |
| `match`   | 用正则匹配 passage 标题 |

---

### 链接区域

`BeforeLinkZone` 和 `AfterLinkZone` 用于在一组链接前后添加内容：

```javascript
maplebirch.tool.addTo('BeforeLinkZone', 'BeforeLinksHint');
maplebirch.tool.addTo('AfterLinkZone', 'AfterLinksHint');
```

`CustomLinkZone` 用于在指定链接位置插入内容：

```javascript
maplebirch.tool.addTo('CustomLinkZone', [0, 'BeforeFirstLink']);
maplebirch.tool.addTo('CustomLinkZone', [2, 'BeforeThirdLink']);
```

数组第一项是链接位置索引，从 `0` 开始；第二项是 widget 名称或配置对象。

---

### 初始化

如果需要在 StoryInit 相关时机执行初始化函数：

```javascript
maplebirch.tool.onInit(() => {
  setup.myMod ??= {};
  setup.myMod.name = 'myMod';
});
```

也可以传入多个函数：

```javascript
maplebirch.tool.onInit(initData, initOptions, initWidgets);
```

传入字符串时，会作为 `Init` 区域 widget 调用：

```javascript
maplebirch.tool.onInit('MyModInitWidget');
```

---

### 常用区域

| 区域               | 位置             |
| :----------------- | :--------------- |
| `Options`          | 选项页           |
| `Cheats`           | 作弊页           |
| `Information`      | 选项覆盖层信息区 |
| `Header`           | passage 页眉     |
| `Footer`           | passage 页脚     |
| `StatusBar`        | 侧边栏状态区域   |
| `MenuBig`          | 大菜单按钮区域   |
| `MenuSmall`        | 小菜单按钮区域   |
| `BeforeLinkZone`   | 链接区之前       |
| `AfterLinkZone`    | 链接区之后       |
| `CustomLinkZone`   | 指定链接位置     |
| `Journal`          | 日志页           |
| `CharaDescription` | 角色描述区域     |
| `StatusSocial`     | 社交页自定义状态 |
| `NPCinit`          | NPC 初遇初始化   |
| `NPCinject`        | NPC 生成初始化   |

角色与属性页区域：

| 区域                      | 位置           |
| :------------------------ | :------------- |
| `CaptionDescription`      | 侧边栏描述区域 |
| `CaptionAfterDescription` | 侧边栏描述之后 |
| `HintMobile`              | 移动端提示区域 |
| `MobileStats`             | 移动端状态区域 |
| `DegreesBonusDisplay`     | 属性加成显示前 |
| `DegreesBox`              | 属性框         |
| `SkillsBonusDisplay`      | 技能加成显示前 |
| `SkillsBox`               | 技能框         |
| `SubjectBoxBonusDisplay`  | 学科加成显示前 |
| `SchoolSubjectsBox`       | 学科框         |
| `SchoolMarksText`         | 成绩文本       |
| `WeaponBox`               | 武器框         |

社交页区域：

| 区域               | 位置             |
| :----------------- | :--------------- |
| `ReputationModify` | 声誉显示修改区   |
| `Reputation`       | 声誉显示之后     |
| `FameModify`       | 知名度显示修改区 |
| `Fame`             | 知名度显示之后   |

---

### 完整示例

```twine
<<widget "MyModStatus">>
  <<if $myMod.enabled>>
    <span class="gold">模组状态：启用</span>
  <</if>>
<</widget>>

<<widget "MyModOptions">>
  <h3>我的模组</h3>
  <label><<checkbox "$myMod.enabled" false true autocheck>> 启用</label>
<</widget>>
```

```javascript
maplebirch.tool.onInit(() => {
  V.myMod ??= {};
  V.myMod.enabled ??= true;
});

maplebirch.tool.addTo('Options', 'MyModOptions');

maplebirch.tool.addTo('StatusBar', {
  widget: 'MyModStatus',
  exclude: ['Start']
});
```

---

### 补充说明

- `zone` 名称需要与上方区域名一致。
- `passage`、`exclude` 和 `match` 都匹配 passage 标题。
- `CustomLinkZone` 的位置是链接索引，不是页面行号。
- `MobileStats` 是当前移动端状态区域名称。
