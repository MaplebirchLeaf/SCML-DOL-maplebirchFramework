# 状态事件

状态事件在段落正文开始前（`gate`）或结束后（`append`）自动检查。注册时机是脚本加载或模块 `preInit()`，不要在每次段落渲染时重复注册。

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
  extra: { exclude: ['Start', 'Start2'] }
});
```

```twine
:: My Mod Notices [widget]
<<widget 'myModNotice'>>
  <span class='teal'>你有一件事情需要处理。</span><br><br>
<</widget>>
```

## 替换正文的场景

```javascript
maplebirch.dynamic.regStateEvent('gate', 'myMod:encounter', {
  output: 'myModEncounter',
  cond: () => V.myMod?.encounterPending === true,
  forceExit: true,
  priority: 10,
  extra: { passage: ['My Mod Road'] }
});
```

输出 widget 必须提供完整场景和可用出口。示例的目标 passage 由模组提供，不是原版地点：

```twine
:: My Mod Encounters [widget]
<<widget 'myModEncounter'>>
  有人挡住了去路。<br><br>
  <<lanLink ['Leave', '离开'] 'My Mod Safe Place'>>
    <<set $myMod.encounterPending to false>>
  <</lanLink>>
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
