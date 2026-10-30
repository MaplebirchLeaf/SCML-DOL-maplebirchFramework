# 战斗同伴

为原版人类与野兽战斗加入自动掩护和牵制。同伴使用当前 `$NPCName` 或 `$per_npc` 中的人物，不加入敌人表。框架负责回合结算、生命、眩晕与结束清理；内容模组负责同行条件、援助效果和台词。

## 基本用法

场景先确认人物已认识、状态合适且确实同行，在原版战斗初始化后调用一次：

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support'>>
```

把响应 widget 文件加入模组的 `tweeFileList`。下面的示例提供10%增伤和10%疼痛增长减免，并在实际协助时输出台词：

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>>
  <<switch _args[0].event>>
    <<case 'effects'>>
      <<set _args[0].bonus to 0.1>>
      <<set _args[0].guard to 0.1>>
    <<case 'assist'>>
      <<lanSwitch 'Your companion watches your flank.' '同伴留意着你的侧后方。'>>
    <<case 'update'>>
      <<if _myModRobinHit>>
        <<set _args[0].hit to _myModRobinHit>>
        <<unset _myModRobinHit>>
      <</if>>
  <</switch>>
<</widget>>
```

自动协助随原版动作结算，内容无需在每次段落运行时重新加入人物或调用内部回合方法。需要主动专属行动时，使用既有的[战斗动作](Actions.md)接口。

## 人物与响应

命名 NPC 须已认识 (`init === 1`)。只接收当前容器中的实际人物对象；姓名字符串、复制对象与读档前保留的旧引用均不接受。`C.npc.Robin` 作为 Twee 宏参数时须用反引号包裹。也可直接使用原版容器：

```twine
<<companions-add $NPCName[setup.NPCNameList.indexOf('Robin')] 'myMod-robin-support'>>
<<companions-add $per_npc.hacker 'myMod-mickey-support'>>
```

原版 `generateMickey` 把米奇存入 `$per_npc.hacker`。两类人物使用相同流程，响应宏名不带 `<< >>`。

widget 通过 `_args[0]` 读取响应：

| 字段                                    | 用途                                     |
| --------------------------------------- | ---------------------------------------- |
| `npc`                                   | 当前原版人物引用，修改其字段会影响该人物 |
| `event`                                 | 本次响应事件                             |
| `health`、`healthmax`、`stun`、`damage` | 只读状态快照，直接修改不会写回同伴记录   |
| `bonus`、`guard`                        | 仅在 `effects` 中返回当前援助效果        |
| `hit`                                   | 仅在 `update` 中提交本次已经确认的受击   |

| 事件      | 时机                             |
| --------- | -------------------------------- |
| `effects` | 查询当前援助效果                 |
| `assist`  | 本次提供协助                     |
| `update`  | 原版敌方动作与状态输出后的更新   |
| `hit`     | 受击后仍有生命                   |
| `stun`    | 因眩晕跳过本次协助               |
| `defeat`  | 生命归零并停止协助               |
| `leave`   | 通过 `companions-leave` 提前离队 |

`effects` 可能反复查询，只能设置 `bonus` 和 `guard`，不要修改故事进度、消耗资源或输出台词。每次查询默认均为 `0`：`bonus` 是非负有限比例；`guard` 限制在 `0` 至 `1`，无效值按 `0` 处理。台词与实际消耗放在 `assist`，其它响应按场景需要补充。

多位同伴的 `bonus` 相加，原版 `defiance` 伤害乘以 `1 + 总增幅`，继续原版倍率、多人分流与击退流程。减痛逐项乘以 `1 - guard`，只影响战斗中正向的 `pain` 宏调用，不修饰疼痛恢复或直接写入疼痛的脚本。自定义伤害需由内容在正确结算点接入，保留个体生命与总血池一致。

NPC 属性按原版含义使用：`Robin.dom` 是自信，`Kylar.rage` 是嫉妒。

## 受击、眩晕与退场

加入宏的第三项可指定生命上限，默认 `100`，须为正有限数值。同伴生命独立于敌方生命与 DoLX 敌方难度倍率。

示例中的 `_myModRobinHit` 是内容自己的临时变量。只有场景确认罗宾实际受击后，才在本次 `stateman` 之前记录：

```twine
<<set _myModRobinHit to [8, 1]>>
```

`update` 返回的 `hit` 格式为 `[伤害, 眩晕次数]`，眩晕可省略。伤害须为非负有限数值，直接扣除同伴生命，最多扣至零，不使用 `pain` 的 ×4 换算；眩晕须为非负安全整数，保留新旧值中较大者。每次有效协助机会减一并跳过本次协助，从 `1` 降至 `0` 的当次仍不能援助。`hit`／`defeat` 响应中的 `damage` 为实际扣血，其余事件为 `0`。

同次提交有多次命中时，由场景合并伤害、保留最大眩晕后再返回。没有实际命中就不设置 `hit`；框架不为敌人随机挑选同伴目标。临时结果由原受击分支在读档重放时重建，不另存一套剧情进度。

提前离队可指定一人或多人：

```twine
<<companions-leave `C.npc.Robin` $per_npc.hacker>>
```

无参数或无有效人物时不做任何事。同一人物重复加入不会叠加；退场后重新加入保留本场生命、眩晕、宏名和结算记录，生命归零后本场不能重新加入。每位人物的 `leave` 响应同次提交只执行一次。生命归零仅停止协助，后续剧情由内容处理。

## 回合与存读档

- 按原版历史 moment 区分动作提交。同名 passage 的下一次 `Engine.play()` 仍是新回合；`Engine.show()` 重绘不会重复协助、消耗资源或扣除眩晕。
- 在 `effectsman` 后协助，在敌方动作结束及 `stateman` 输出状态后更新。仅展示 `stateman` 不触发受击结算。本轮协助后已经确认的命中可收尾一次，不再追加援助。
- 保存人物身份、响应宏、生命、眩晕及结算记录，读档后从当前原版容器重新解析人物。沿用原版入口快照与段落重放，不补算离线期间的回合。
- `combatinit`、`endcombat` 与 `endevent` 自动清理整场同伴，重复清理不会额外执行同伴响应。需保留战后结果时，在原版结束宏之前读取；结束清理不会删除 `$NPCName` 或 `$per_npc` 中的人物。
- 每位同伴行动前复查人物与战斗条件。冻结、回放、附身、待转场和眩晕时不新增协助。此入口覆盖普通人类／野兽战斗，复杂混合遭遇仍由内容判断加入条件。

## 脚本接口

位于 `maplebirch.combat.companions`。Twee 接入优先使用前述两个宏。

| 接口                                | 返回与用途                                           |
| ----------------------------------- | ---------------------------------------------------- |
| `add(npc, widget, healthmax = 100)` | 返回是否加入成功                                     |
| `leave(...npcs)`                    | 返回指定人物的离队响应                               |
| `get(npc)`                          | 返回状态快照，可查询已退场者；未加入时为 `undefined` |
| `members`                           | 当前有效且仍在场的同伴快照数组                       |
| `damage(amount)`                    | 返回计入同伴增幅的伤害，不直接扣除敌方生命           |
| `pain(amount, modifier = 4)`        | 返回计入同伴减免的疼痛增量，不直接修改疼痛           |
