# 战斗同伴

为普通人类与野兽战斗接入同伴协助。成员使用当前 `$NPCName` 或 `$per_npc` 中的 NPC 对象，两类人物使用相同流程，不加入敌人表。关系、协助条件和台词写在内容模组的 Twee widget 中。

| 负责方   | 负责内容                                                                  |
| -------- | ------------------------------------------------------------------------- |
| 框架     | 保存本场同伴、接入原版动作结算、处理生命和眩晕、避免重复结算、结束时清理  |
| 内容模组 | 判断谁在同行、提供响应 widget、决定援助条件和消耗、确认受击、处理后续剧情 |

## 最小用法

先确认罗宾已认识且正在同行，再在原版战斗初始化后调用一次加入宏：

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support'>>
```

需要提前退场时调用退场宏：

```twine
<<companions-leave `C.npc.Robin`>>
```

普通接入只需调用加入宏。框架随原版战斗流程自动处理动作、协助和受击更新，遭遇结束时清理全体同伴。退场宏只用于提前让指定人物离队，无参数时不做任何事。

一个同伴对应一个响应 widget。基础增伤和减痛只需处理 `effects`：

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>>
  <<if _args[0].event is 'effects'>>
    <<set _args[0].bonus to 0.1>>
    <<set _args[0].guard to 0.1>>
  <</if>>
<</widget>>
```

将 widget 所在文件加入模组的 `tweeFileList`。示例提供10%增伤和10%疼痛增长减免。每回合的台词或消耗放在 `assist`，治疗与受击响应按内容需要补充。

## NPC 与响应

传入人物须已由原版创建，命名 NPC 还须已经认识 (`init === 1`)。只接收当前容器内的实际对象，姓名字符串、复制对象和读档前的旧对象均不接受。`C.npc.Robin` 作为 Twee 宏参数时须用反引号包裹。

也可以直接使用原版容器：

```twine
<<companions-add $NPCName[setup.NPCNameList.indexOf('Robin')] 'myMod-robin-support'>>
<<companions-add $per_npc.hacker 'myMod-mickey-support'>>
```

原版 `generateMickey` 将米奇保存在 `$per_npc.hacker`。响应宏名不带 `<< >>`。

widget 从 `_args[0]` 读取本次响应数据：

| 字段                                    | 用法                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| `npc`                                   | 当前原版人物对象的引用，通过它修改 NPC 字段会影响该人物 |
| `event`                                 | 本次事件名，用于选择处理分支                            |
| `health`、`healthmax`、`stun`、`damage` | 本次状态快照，用于读取，直接修改不会写回同伴记录        |
| `bonus`、`guard`、`heal`                | 仅在 `effects` 分支设置，返回本次可提供的效果           |
| `hit`                                   | 仅在 `update` 分支设置，提交本次已经确认的受击          |

| `event`   | 触发时机                         |
| --------- | -------------------------------- |
| `effects` | 查询本次可提供的效果             |
| `assist`  | 本次可以协助                     |
| `update`  | 原版敌方动作后的状态更新         |
| `heal`    | 玩家选择该人物治疗后的实际执行   |
| `hit`     | 受击后仍有生命                   |
| `stun`    | 因眩晕跳过本次协助               |
| `defeat`  | 生命归零并停止协助               |
| `leave`   | 通过 `companions-leave` 提前离队 |

`damage` 在 `hit`／`defeat` 响应中表示实际扣血，其余响应为 `0`。只处理需要的事件。实际协助和治疗的消耗分别放在 `assist`、`heal` 分支，避免查询、受击或退场时再次执行。仅 `update` 读取返回的 `hit`，其它响应不会提交伤害。

NPC 属性以原版含义为准：`Robin.dom` 是自信，`Kylar.rage` 是嫉妒。伤害效果应沿用对应原版场景的伤害、击退和目标切换流程，保持敌人个体生命与总生命一致。

## 援助效果与治疗

框架会在动作选项、伤害和疼痛结算时调用 `effects` 查询。每次查询的返回字段默认如下：

| 字段    | 默认值  | 用途                                                           |
| ------- | ------- | -------------------------------------------------------------- |
| `bonus` | `0`     | 非负有限的伤害增幅比例，`0.1` 表示增加10%                      |
| `guard` | `0`     | 疼痛增长减免比例，合法数值限制在 `0` 至 `1`，无效值按 `0` 处理 |
| `heal`  | `false` | 严格为 `true` 时提供治疗选项                                   |

`effects` 可能反复执行，只能修改上述三个快照字段。不能在这里修改故事变量、扣除资源、推进剧情或输出台词。框架每次重置默认值，不需要内容手动清理上次查询。

多位同伴的 `bonus` 相加，原版 `defiance` 伤害乘以 `1 + 总增幅`，随后继续原版倍率、多人分流和击退流程。多位同伴的减痛倍率逐项相乘，即 `× (1 - guard)`。减痛只修饰战斗中使疼痛增加的 `pain` 宏调用，疼痛恢复及脚本直调 `statChange.pain()` 保持原样。

符合条件的同伴会在原版嘴部动作中提供治疗选项。框架检查嘴部是否可用、水下与禁言状态，并在执行时再次核对人物和条件。选择治疗会占用该人物这次动作提交的援助：该人物不再提供增伤、减痛或 `assist`，其它同伴继续正常协助。单次治疗后默认动作回到原版休息动作，避免下一轮自动重复消耗资源。

治疗的台词、恢复量与资源消耗写在 `heal` 分支。沿用原版 `pain` 与提示宏，保留原版疼痛下限。疼痛恢复到下限时，治疗选项会隐藏，剩余次数仍由内容模组保留。同伴框架不另外定义 PC 生命值。

## 消耗与退场示例

下面是包含消耗与退场的可选示例，分为场景接入、受击记录、响应 widget 和恢复四部分。同名 widget 替换前面的基础示例。实际内容可直接复用已有 NPC 或剧情进度。

### 1. 场景中加入同伴

以下 `$myModSupport` 仅为内容模组自己的示例进度，不是原版变量，也不是框架的通用能力值。它记录援助负担、剩余治疗次数及是否需要休息。先由场景自身确认罗宾同行，再在原版战斗初始化后执行：

```twine
<<if !$myModSupport>>
  <<set $myModSupport to { effort: 0, treatments: 2, needsRest: false }>>
<</if>>
<<if !$myModSupport.needsRest>>
  <<companions-add `C.npc.Robin` 'myMod-robin-support'>>
<</if>>
```

### 2. 场景中记录受击

只有遭遇自身已经确认罗宾实际受击时，才在该受击结算分支、当前 `stateman` 调用之前记录临时结果，例如：

```twine
<<set _myModRobinHit to [8, 1]>>
```

场景自己的受击判定负责是否命中以及伤害来源，仅在确认命中后执行上面的赋值。响应 widget 在 `update` 中消费该临时值，随后由框架扣血并触发 `hit` 或 `defeat`。

### 3. 定义响应 widget

援助负担越高，增伤和减痛越弱。主动治疗消耗一次治疗次数并增加更多负担，达到上限后提前离队：

```twine
:: My Mod Combat Support [widget]
<<widget 'myMod-robin-support'>><<if _args[0].event is 'effects'>><<silently>>
  <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5>>
    <<set _args[0].bonus to 0.15 * (1 - $myModSupport.effort / 5)>>
    <<set _args[0].guard to 0.2 * (1 - $myModSupport.effort / 5)>>
    <<set _args[0].heal to $myModSupport.treatments gt 0 and $pain gt 0>>
  <</if>>
<</silently>><<else>>
  <<switch _args[0].event>>
    <<case 'update'>>
      <<if _myModRobinHit>>
        <<set _args[0].hit to _myModRobinHit>>
        <<unset _myModRobinHit>>
      <</if>>
    <<case 'assist'>>
      <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5>>
        <<set $myModSupport.effort += 1>>
        罗宾留在你身旁，紧盯着战况。
      <</if>>
    <<case 'heal'>>
      <<if $myModSupport and !$myModSupport.needsRest and $myModSupport.effort lt 5 and $myModSupport.treatments gt 0 and $pain gt 0>>
        <<set $myModSupport.treatments -= 1>>
        <<set $myModSupport.effort += 2>>
        罗宾帮你处理伤处。
        <<pain -5 1>><<lpain>>
      <</if>>
    <<case 'leave' 'defeat'>>
      <<if $myModSupport and !$myModSupport.needsRest>>
        <<set $myModSupport.needsRest to true>>
        <<if _args[0].event is 'defeat'>>
          罗宾已经无法继续战斗。
        <<else>>
          罗宾退到一旁，喘了口气。
        <</if>>
      <</if>>
  <</switch>>
  <<if (_args[0].event is 'assist' or _args[0].event is 'heal') and $myModSupport and !$myModSupport.needsRest and $myModSupport.effort gte 5>>
    <<companions-leave _args[0].npc>>
  <</if>>
<</if>><</widget>>
```

`hit` 和 `stun` 不需要专门分支也会正常结算，可按需要补充反应。`needsRest` 防止离队响应重复写进度，也让后续场景知道该人物需要休息。

### 4. 在恢复节点清除休息状态

在内容原有的休息或回访节点实际完成恢复时，才清除休息状态：

```twine
<<if $myModSupport and $myModSupport.needsRest>>
  <<set $myModSupport.effort to 0>>
  <<set $myModSupport.needsRest to false>>
<</if>>
```

补充治疗次数应放在实际补给节点，沿用该内容的费用或耗材结算。关系门槛、离队条件和后续剧情由内容自身判断，继续使用原有 NPC 日程。

## 生命、受击与离队

加入宏的第三项可指定生命上限，默认 `100`，须为正有限数值。同伴生命独立于原版敌方 NPC 生命及 DoLX 敌方难度倍率：

```twine
<<companions-add `C.npc.Robin` 'myMod-robin-support' 100>>
```

原版敌方动作结束、`stateman` 输出战斗状态后，框架为每位在场同伴执行本次 `update`。同一次动作提交须先完成 `effectsman` 结算，再经敌方动作进入 `stateman`，单纯展示战斗状态不会触发更新。确认受击的内容可设置 `_args[0].hit` 为 `[伤害, 眩晕次数]`，例如 `[8, 1]`。眩晕可省略，`[8]` 表示没有新增眩晕。本轮协助后，敌方动作触发收尾时，已经确认的受击仍会结算一次，不再提供新的援助。

伤害须为非负有限数值，直接扣除同伴生命，最多扣至零，不使用原版 `pain` 的 ×4 换算。眩晕须为非负安全整数，保留新旧值中较大者。每次有效协助机会减一并跳过本次协助，从 `1` 降至 `0` 时仍跳过这次。没有确认受击时不设置 `hit`，框架不会自动为敌人挑选同伴目标。

同次提交有多次受击时，由内容先合并伤害、保留较大眩晕，再交给本次 `update`。受击结果保存在本次段落的临时变量中，下一次动作提交会清空，读档时由原受击分支重建，不写进持久剧情进度。

退场宏可接收多个人物，只让列出的同伴提前离队。没有参数或没有有效人物时不做任何事：

```twine
<<companions-leave `C.npc.Robin` $per_npc.hacker>>
```

同一人物重复加入不会叠加。退场后再次加入保留原有宏名、生命、上限、眩晕和去重记录。生命归零后，本场不能通过重新加入复活。每位人物在同一次动作提交中的 `leave` 响应只执行一次。

## 回合与存读档

- 框架按当前原版历史 moment 区分动作提交。即使 passage 名称相同，下一次 `Engine.play()` 仍会创建新的 moment。`Engine.show()` 不创建新 moment，重绘不会再次援助、扣除资源或消耗眩晕。
- 框架随原版动作提交开始处理，在 `effectsman` 后执行协助，在敌方动作结束及 `stateman` 输出状态后执行更新。作者无需逐页调用内部回合接口。每位人物同一次提交只援助或治疗一次，提前离队后重新加入也不会重置这次额度。
- 框架保存人物身份、响应宏、生命、眩晕及结算记录。读档后从当前原版容器重新解析人物，响应快照仅临时传给 widget，调用后恢复原有临时变量。
- 存读档沿用原版段落执行前的快照。读档会重放当前段落一次，框架随这次动作提交重建结算，不把画面重绘当成新的动作，也不补算离开游戏期间的回合。
- `combatinit`、`endcombat` 和 `endevent` 自动清理整场同伴记录，重复清理不产生额外结算。原版 `endcombat` 内部也会调用 `endevent`。提前让个别人离队会保留本场记录，重绘不会额外消耗眩晕。
- 原版 `endevent` 清理当前遭遇的 NPC 槽位与阶段，不会删除 `$NPCName` 或 `$per_npc` 中的人物档案。
- 每位同伴行动前重新检查人物及战斗状态。已结束、待转场、回放、冻结、附身、眩晕或人物失效时不提供效果。治疗执行时仍会重新校验。

此入口面向原版人类／野兽动作流水线。昏迷模拟、挣扎、触手和虫群没有独立接入，复杂混合遭遇的加入条件仍需由内容判断。

## 脚本接口

接口位于 `maplebirch.combat.companions`，Twee 内容优先使用前述两个宏。

| 接口                                | 返回与用途                                           |
| ----------------------------------- | ---------------------------------------------------- |
| `add(npc, widget, healthmax = 100)` | 返回是否加入成功                                     |
| `leave(...npcs)`                    | 返回指定人物的离队响应，无参数时无操作               |
| `get(npc)`                          | 返回状态快照，未加入时为 `undefined`，可查询已退场者 |
| `members`                           | 当前有效且仍在场的同伴快照数组                       |
