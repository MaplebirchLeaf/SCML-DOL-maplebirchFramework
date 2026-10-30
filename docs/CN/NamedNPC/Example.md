# NPC 实例：公园约见与交谈

露娜是一位喜欢在公园散步的图书管理员。我们来让玩家在午后遇见她，约好有空时坐下来聊聊，再通过初次交谈拉近一点关系。

这个小场景会用到 NPC 注册、日程、信任数值和页面提示。文件内容都在下面，可以一边阅读，一边把它们放进自己的模组。

示例面向原版 **0.5.12.13**，入口使用该版本的 `Park` passage 和 `<<displayLinks>>` 宏。换到底版不同的游戏时，需要重新确认这个插入位置。

## 准备三个文件

```text
my-mod/
├── boot.json
├── framework.js
└── story.twee
```

`boot.json` 告诉加载器要读取哪些文件，`framework.js` 登记人物和规则，`story.twee` 写玩家看到的场景。打包时，这三个文件直接位于 ZIP 根目录；`my-mod/` 只是本地整理文件用的文件夹。

## 1. 接好加载配置

先把下面的内容保存为 `boot.json`。脚本通过 `params.script` 加载，所以 `scriptFileList` 留空，避免同一个文件执行两次。

这里的 `name: "myMod"` 是模组名，稍后人物资料中的 `nam: 'Luna'` 是人物标识。它们分别交给加载器和 NPC 系统使用。

```json
{
  "name": "myMod",
  "version": "0.1.0",
  "styleFileList": [],
  "scriptFileList": [],
  "tweeFileList": ["story.twee"],
  "imgFileList": [],
  "additionFile": ["framework.js"],
  "dependenceInfo": [
    {
      "modName": "maplebirch",
      "version": ">=5.5.7"
    }
  ],
  "addonPlugin": [
    {
      "modName": "maplebirch",
      "addonName": "maplebirchAddon",
      "modVersion": ">=5.5.7",
      "params": {
        "script": ["framework.js"]
      }
    }
  ]
}
```

## 2. 让框架认识露娜

这一节的五段代码都放进 `framework.js`，按出现的顺序连接即可。

### 把约定记在存档里

玩家可能约好见面后先回家，也可能保存游戏、第二天再来。因此，我们用 `meeting` 记住交谈进度，用 `noticePending` 记住还没显示的提示。

初始化只补缺少的字段。已经约好的会面会保留下来，读档时也不会重新变成“尚未约见”。

```javascript
function initMyMod(variables) {
  variables.myMod ??= {};
  variables.myMod.luna ??= {};
  variables.myMod.luna.meeting ??= 'none';
  variables.myMod.luna.noticePending ??= false;
}

maplebirch.tool.onInit(() => {
  initMyMod(V);
});

maplebirch.on(':onLoad', save => {
  initMyMod(save.V);
});
```

### 登记人物和信任

先定义“信任”，再注册使用它的露娜。这个顺序让人物创建时就能识别 `myModTrust`。

露娜的初始信任是 `25`，初遇后可以在她的社交卡片上看到。下面的 `min`、`max` 是范围资料，实际加点时仍要限制数值；我们会在剧情里把它控制在 `0–100`。

```javascript
maplebirch.npc.addStats({
  myModTrust: {
    min: 0,
    max: 100,
    default: 0,
    position: 2,
    name: '信任',
    value: () => T.npcData?.myModTrust ?? 0,
    minValue: 0,
    maxValue: 100,
    activeIcon: 'img/ui/sym-love.png',
    inactiveIcon: 'img/ui/sym-love-empty.png',
    color: 'teal',
    requirements: () => T.npcData?.nam === 'Luna'
  }
});

maplebirch.npc.add(
  {
    nam: 'Luna',
    gender: 'f',
    pronoun: 'f',
    adult: 1,
    teen: 0,
    age: 25,
    title: '图书管理员',
    description: '一位喜欢在公园散步的图书管理员',
    hairColour: 'black',
    eyeColour: 'purple',
    myModTrust: 25
  },
  {
    important: true
  }
);
```

### 安排午后的行程

让她上午在图书馆，下午两点到公园，傍晚六点回家：

```javascript
maplebirch.npc.addSchedule('Luna', {
  daily: [
    {
      time: 0,
      location: 'home'
    },
    {
      time: 8,
      location: 'library'
    },
    {
      time: 14,
      location: 'park'
    },
    {
      time: 18,
      location: 'home'
    }
  ]
});
```

这样，`08:00–13:59` 查询到的是 `library`，`14:00–17:59` 是 `park`，其余时间是 `home`。这些是人物日程的地点标签，不是 passage 标题，也不会改变玩家的 `$location`。

这次约见没有指定日期。玩家今天没来，约定就留到下一次露娜在公园时，不需要为它添加过期处理。

### 在公园放入入口

日程告诉我们露娜在哪里，交谈链接还需要放进页面。下面的局部补丁会在公园普通选项分支里、原版导航链接之前调用 `myModLunaEntry`。这个 widget 会在下一节定义。

```javascript
maplebirch.tool.inject({
  locationPassage: {
    Park: [
      {
        src: '<<displayLinks>>',
        applybefore: '<<myModLunaEntry>>\n',
        expected: 1
      }
    ]
  }
});
```

`expected: 1` 表示锚点应当只出现一次。如果它没有匹配，先查看补丁报告，确认底版和所在分支；保留这项检查，才能及时发现原版结构已经变化。

### 留一条交谈后的提示

完成初次交谈后，剧情会把 `noticePending` 设为 `true`。这里登记一个 `append` 事件，清除这次待显示标记，并把提示放到交谈页面末尾。

```javascript
maplebirch.dynamic.regStateEvent('append', 'myMod:lunaConversation', {
  output: 'myModLunaNotice',
  cond: () => V.myMod?.luna?.noticePending === true,
  action: () => {
    V.myMod.luna.noticePending = false;
  },
  extra: {
    passage: ['My Mod Luna Meeting']
  }
});
```

这段代码只负责提示。信任增加放在下面的点击行动中，所以重绘页面不会再次加点。

## 3. 写出玩家看到的场景

现在打开 `story.twee`。第一个 passage 带有 `[widget]` 标签，定义交谈入口和提示；第二个 passage 是玩家进入的交谈场景。

入口只在露娜的公园日程内出现，也会避开已有遭遇、战斗和不适合交谈的状态。玩家约好见面后，链接文字会变成“去喷泉旁见露娜”。

```twine
:: My Mod Luna Widgets [widget]
<<widget "myModLunaEntry">>
  <<if C.npc.Luna
    and maplebirch.npc.Schedule.get('Luna').location is "park"
    and $exposed lte 0
    and $stress lt $stressmax
    and $arousal lt $arousalmax
    and !$combat
    and !$possessed
    and (!$npc or $npc.length is 0)>>
    <<if $myMod.luna.meeting is "planned">>
      <<link "去喷泉旁见露娜" "My Mod Luna Meeting">><</link>>
    <<else>>
      <<link "和长椅旁的露娜打招呼" "My Mod Luna Meeting">><</link>>
    <</if>>
    <br>
  <</if>>
<</widget>>

<<widget "myModLunaNotice">>
  <span class="teal">聊过之后，你和露娜熟悉了一些。信任增加了。</span>
<</widget>>

:: My Mod Luna Meeting
<<npc "Luna">>
当前信任：<<= C.npc.Luna.myModTrust>>。
<br><br>

<<switch $myMod.luna.meeting>>
  <<case "none">>
    露娜坐在长椅旁，向你挥了挥手。她提议有空时在喷泉边坐下来聊聊。
    <br>
    <<link "约好有空时在这里聊聊" "Park">>
      <<if $myMod.luna.meeting is "none">>
        <<set $myMod.luna.meeting to "planned">>
      <</if>>
      <<endevent>>
    <</link>>
  <<case "planned">>
    露娜在喷泉旁等你。你们找了个安静的位置坐下。
    <br>
    <<link "介绍自己，聊聊近况" "My Mod Luna Meeting">>
      <<if $myMod.luna.meeting is "planned">>
        <<set C.npc.Luna.myModTrust to Math.clamp(C.npc.Luna.myModTrust + 5, 0, 100)>>
        <<set $myMod.luna.meeting to "completed">>
        <<set $myMod.luna.noticePending to true>>
      <</if>>
    <</link>>
  <<case "completed">>
    露娜认出了你，笑着和你打招呼。你们已经完成过初次交谈。
<</switch>>

<br><br>
<<link "结束交谈，回到公园" "Park">>
  <<endevent>>
<</link>>
```

第一次进入时，`<<npc "Luna">>` 会接上原版初遇和遭遇槽位。之后再来，露娜仍是当前存档里的同一个人物，信任不会被重新设成 `25`。离开时的 `<<endevent>>` 则负责清理这次遭遇。

留意链接里的两步：约好后把 `meeting` 设为 `planned`，返回公园；赴约并介绍自己后才增加信任，把进度改为 `completed`。如果只是暂时离开，约定仍在，也没有完成交谈。

这里有两个不同的标记：`C.npc.Luna.init` 记录原版人物是否已初始化，`$myMod.luna.meeting` 记录我们自己的剧情走到了哪里。把它们分开，后续添加新对话时就不必重做人物初遇。移植到其他地点时，也应保留那个地点原有的行动限制。

## 4. 打包，到游戏里见见她

三个文件写好后，在它们所在的目录执行下面的命令；也可以用压缩软件选中这三个文件创建 ZIP。把生成的模组包导入 ModLoader，就可以用单独的测试存档走一遍场景。

```bash
zip myMod.mod.zip boot.json framework.js story.twee
```

先在下午两点至六点之间进入公园，确认页面处于可以正常行动的分支，再按下面的顺序尝试：

| 操作                                  | 预期结果                                            |
| :------------------------------------ | :-------------------------------------------------- |
| 在 `14:00–17:59` 进入公园普通选项分支 | 出现打招呼链接                                      |
| 在 `14:00` 前或 `18:00` 后检查        | 日程不在 `park`，链接隐藏                           |
| 首次打招呼                            | 原版完成初遇，`meeting` 仍为 `none`，信任为 `25`    |
| 约好聊聊                              | 状态为 `planned`，返回公园，信任仍为 `25`           |
| 保存，离开公园，再读回该档            | 约见保留；符合日程时出现赴约链接                    |
| 赴约并点击介绍自己                    | 状态为 `completed`，信任为 `30`，出现熟悉彼此的提示 |
| 再进入交谈或重新显示页面              | 信任保持 `30`，初次交谈的奖励选项不再出现           |
| 结束交谈后保存并重新启动读档          | 已完成状态与 `30` 信任保留                          |
| 打开社交页                            | 露娜的重要人物卡片显示信任条目与图标                |

读回约见前或交谈前的存档，会恢复当时的进度。`planned` 不会因为回家、过夜或重新启动而自行变成 `completed`。

提示有一个值得留意的细节：框架准备显示时会清除标记，但原版读档可能重放保存页面上的那条提示。这不会再次增加信任，因为加点发生在点击行动里。

### 没有看到预期结果时

可以先在浏览器控制台查看这几项。它们只读取状态，不会改动存档：

```javascript
(() => {
  const { Story, Macro } = maplebirch.host.sugarcube.require();
  console.log(V.myMod?.luna);
  console.log(C.npc.Luna?.init, C.npc.Luna?.myModTrust);
  console.log(maplebirch.npc.Schedule.get('Luna').location);
  console.log(Story.has('My Mod Luna Meeting'), Macro.has('myModLunaEntry'));
})();
```

如果人物资料存在，页面和 widget 也能找到，就从补丁报告、当前日程、入口条件依次检查。人物本身不存在时，回到注册脚本和加载顺序查找原因。人物档案和遭遇槽位继续交给原版流程维护，清空 `$NPCName`、手写 `$NPCList` 或重置 `init` 都不能替代这一步排查。

## 接着丰富这个人物

基本交谈跑通后，可以按需要给露娜添加更多内容。下面这些扩展都能沿用同一个人物标识和剧情进度，不必从头再做一位 NPC。

| 要增加什么           | 接在本例哪里                                                    | 对应指南                               |
| :------------------- | :-------------------------------------------------------------- | :------------------------------------- |
| 特殊日程，如雨天休息 | 在现有日程上添加 `when()`，入口仍查询同一日程                   | [NPC 日程](NamedNPCSchedule.md)        |
| 社交恋爱资格         | 注册时提供 `romance`，在实际剧情中修改自己的解锁标记            | [NPC 注册](NamedNPC.md#社交与恋爱配置) |
| 与日程对应的服装     | 在衣柜准备完成后登记 `library`、`park`、`home` 的 `wear()` 规则 | [NPC 服装](NamedNPCClothes.md)         |
| 立绘                 | 准备图片／模型，进入场景后开启侧边栏并选择露娜的图像            | [NPC 侧边栏](NamedNPCSidebar.md)       |
| 转化成长             | 加载时登记定义，在真实行动的成功分支调用 `build()`              | [NPC 转化](NamedNPCTransformation.md)  |
| 周期与受孕           | 加载时登记配置，实际场景中按原版条件调用判定                    | [NPC 怀孕](NamedNPCPregnancy.md)       |
| 每日交谈             | 增加独立的每日交谈标记，保留初次交谈的完成状态                  | [时间事件](../Dynamic/TimeEvents.md)   |

发布前，在自己准备支持的游戏、汉化和模组组合里再走完一次，尤其确认公园入口仍在正确的原版分支中。

[返回 NPC 注册](NamedNPC.md) · [开发流程](../Development.md)
