# 状态事件

交谈结束后，想在页面末尾留一句提示；某件事还没处理，想等玩家回到指定地点时再出现——这些都可以交给状态事件。

框架会在段落正文开始前检查 `gate`，在正文结束后检查 `append`。把事件登记在加载脚本或模块 `preInit()` 中，之后让它随着页面检查即可，不需要每次渲染都重新注册。

[NPC 公园约见实例](../NamedNPC/Example.md)里就用 `append` 显示初次交谈后的提示。加信任仍然发生在玩家点击时，提示本身只负责把结果告诉玩家。

## 先设计触发与完成

| 环节            | 负责什么                 | 本页提醒示例                 |
| :-------------- | :----------------------- | :--------------------------- |
| 存档初始化      | 补缺失的状态，不重置进度 | `noticePending` 默认 `false` |
| 实际行动        | 让事件进入待处理状态     | 行动成功后设为 `true`        |
| `cond`          | 查询资格与页面范围       | 读取待处理标记               |
| `action`        | 同步结算或消费待处理状态 | 派发后设为 `false`           |
| `output` widget | 显示结果或提供后续行动   | 提醒文本与必要出口           |

可以把待处理标记想成留给下个页面的一张便条：行动完成时写下它，条件读取它，准备显示时再收起来。初始化和读档补齐的方法见[开发流程](../Development.md#注册与存档初始化分开)。如果提示一直没有出现，先看看行动是否真的把标记设成了 `true`。

## 使用入口

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:notice', options);
maplebirch.dynamic.delStateEvent('gate', 'myMod:notice');
```

注册、注销均返回是否成功。`gate` 和 `append` 分别保存自己的事件，同类事件 ID 不能重复。

## 执行顺序

`gate` 默认不截断。所有命中的非截断事件按优先级从高到低执行 `action` 并收集输出。`forceExit` 为真的候选留到最后，重新检查条件，第一个实际输出并要求截断的事件结束当前正文。没有输出的 `action` 不会单独截断页面。

`cond` 与函数形式的 `forceExit` 应为无副作用的判断，可能被重复检查。影响后续事件资格的状态修改放在 `action`，不要依赖尚未渲染的 `output` 宏。

`append` 在正文末尾收集输出，不用于页首提醒。两类事件都可以只配置 `action`。`once: true` 表示事件触发后从本次运行的注册表移除，不是持久化存档标记。如果提醒只能在该存档显示一次，还应自行记录已读状态。

## 配置字段

| 字段            | 默认        | 说明                                      |
| :-------------- | :---------- | :---------------------------------------- |
| `output`        | 无          | 要渲染的 widget 名称，不是任意 Twine 文本 |
| `action()`      | 无          | 同步执行状态修改                          |
| `cond()`        | 返回 `true` | 是否具备触发资格                          |
| `priority`      | `0`         | 数值较大者先执行                          |
| `once`          | `false`     | 触发后移除本次运行的注册                  |
| `forceExit`     | `false`     | 布尔值或函数，只对 `gate` 截断有效        |
| `extra.passage` | 无          | 只在指定标题数组中触发                    |
| `extra.exclude` | 无          | 排除指定标题数组                          |
| `extra.match`   | 无          | 用正则匹配 passage 标题                   |

所有范围条件共同生效。条件或动作报错会记录到框架诊断。

## 页首提醒

先在模组的状态初始化中创建 `V.myMod`。脚本注册判断，Twee 定义输出 widget：

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:notice', {
  output: 'myModNotice',
  cond: () => V.myMod?.noticePending === true,
  action: () => {
    V.myMod.noticePending = false;
  },
  forceExit: false,
  extra: {
    exclude: ['Start', 'Start2']
  }
});
```

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>你有一件事情需要处理。</span><br><br>
<</widget>>
```

这里的 `action` 会先清除标记，再渲染输出 widget，所以它记录的是这条提醒已交给页面显示。widget 直接输出文本即可；如果再次检查 `noticePending`，反而会因为标记已经清除而把提醒藏起来。玩家是否亲自确认，还需要下面这样的点击处理。

如果提醒需要玩家确认，将上面注册中的 `action` 删除，保留 `cond`，并把 widget 改为：

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>你有一件事情需要处理。</span>
  <<linkreplace '知道了'>>
    <<set $myMod.noticePending to false>>
    已确认。
  <</linkreplace>>
  <br><br>
<</widget>>
```

这两种消费方式二选一，不要同时登记同名事件。后一种在点击前会保留待处理状态，重新进入符合条件的页面或读回未确认的存档时仍会提醒。状态事件只负责检查和输出，不提供持久化的“已读”机制。 页内 `linkreplace` 不会创建新历史段落；若确认必须随本次操作进入存档快照，应在真正离开提示场景的链接中清除标记。

## 替换正文的场景

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:encounter', {
  output: 'myModEncounter',
  cond: () => V.myMod?.encounterPending === true,
  forceExit: true,
  priority: 10,
  extra: {
    passage: ['My Mod Road']
  }
});
```

输出 widget 必须提供完整场景和可用出口。示例的目标 passage 由模组提供，不是原版地点：

```twine
:: My Mod Encounters [widget]
<<widget 'myModEncounter'>>
  有人挡住了去路。<br><br>
  <<link '离开' 'My Mod Safe Place'>>
    <<set $myMod.encounterPending to false>>
  <</link>>
<</widget>>
```

## 页面末尾补充

```javascript
maplebirch.dynamic.regStateEvent('append', 'myMod:footer', {
  output: 'myModFooter',
  cond: () => V.myMod?.showFooter === true
});
```

页尾补充、特质或成就提示不等于实际结算。购买、领取或完成行动的奖励，应放在已核对的成功分支。
