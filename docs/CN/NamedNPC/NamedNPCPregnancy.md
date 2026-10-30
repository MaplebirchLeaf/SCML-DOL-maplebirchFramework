# NPC 怀孕

`maplebirch.npc.Pregnancy` 将命名 NPC 接入原版 0.5.12.13 的 NPC 怀孕 API，提供名单注册、周期配置、查询和受孕判定。妊娠记录、时间推进、子女生成和生产仍由原版处理。

## 注册与运行时的边界

- 在模组加载脚本中调用 `add()`，登记配置。
- 在游戏及人物档案初始化完成后，才能查询或判定受孕。
- `available` 只检查原版 API 函数是否存在，不代表人物存在、周期已开启或本次一定符合受孕条件。
- 查询前同时确认 `available` 与当前人物，例如 `C.npc.Luna`。缺少原版 API 或人物名未知时，`get()`、`tryConceive()` 会抛错。

`NPCData.pregnancy` 保存周期和开关状态。它与 `get().pregnancies` 返回的活动妊娠记录是两类数据，不能把记录数组塞进人物的 `pregnancy` 字段。

## 注册

注册键使用人物的 `nam`，与 [NPC 注册](NamedNPC.md)一致：

```javascript
maplebirch.npc.add({
  nam: 'Luna',
  gender: 'f',
  adult: 1,
  teen: 0,
  type: 'human'
});

maplebirch.npc.Pregnancy.add('Luna', {
  canBePregnant: true,
  canImpregnatePlayer: false,
  cycle: {
    days: [26, 30],
    dangerousDay: 14,
    fertileLeadDays: [4, 6],
    pills: null,
    analEnabled: true,
    avoidance: 50
  }
});
```

两个名单开关只向原版对应内容名单增加人物，不会移除已有成员。它们不改变生殖器官、不绕过内容设置，也不自动生成怀孕或生产剧情。

| 配置                    | 默认值  | 说明                                       |
| :---------------------- | :------ | :----------------------------------------- |
| `canBePregnant`         | `true`  | 加入原版可怀孕内容名单                     |
| `canImpregnatePlayer`   | `false` | 加入原版可使玩家怀孕的内容名单             |
| `cycle.days`            | 原版    | 固定周期天数，或 `[最短, 最长]`            |
| `cycle.dangerousDay`    | 原版    | 危险日，正整数，不能大于最短周期           |
| `cycle.fertileLeadDays` | 原版    | 固定易孕提前天数，或随机范围               |
| `cycle.pills`           | 原版    | `'contraceptive'`、`'fertility'` 或 `null` |
| `cycle.analEnabled`     | 原版    | 原版肛交怀孕开关                           |
| `cycle.avoidance`       | 原版    | 避孕倾向，有限数值 `0` 至 `100`            |

`days` 与 `fertileLeadDays` 使用正整数，或两端为正整数且最短不大于最长的范围。提供 `dangerousDay` 时必须同时提供 `days`。无效配置在 `add()` 时抛错；`add()` 返回此服务本身，重复登记同一人物替换该配置。

周期配置对每个存档人物应用一次。已有周期保留当前日，必要时限制到新周期范围；新初始化的周期可随机选择起始日。此后读档不反复重置，修改注册配置也不等于重新设置已有周期。玩家已保存的周期及开关由原版流程维护。

## boot.json 静态配置

也可放入 `maplebirchAddon` 的 `params`，使用下列结构：

```json
{
  "npc": {
    "Pregnancy": {
      "Luna": {
        "canBePregnant": true,
        "cycle": {
          "days": 28,
          "dangerousDay": 14
        }
      }
    }
  }
}
```

与脚本注册同一份周期配置时选择一种入口，避免两处定义不同数值。完整外层见 [boot.json 配置](../BootJson.md#npc)。`npc.Pregnancy` 不会代替 `npc.NamedNPC` 注册人物。

## 查询

下面的代码放在 NPC 已载入的剧情逻辑中：

```javascript
if (maplebirch.npc.Pregnancy.available && C.npc.Luna) {
  const status = maplebirch.npc.Pregnancy.get('Luna');
  console.log(status.cycle.enabled, status.progress, status.dueDate);
}
```

| 返回字段                                               | 含义                                              |
| :----------------------------------------------------- | :------------------------------------------------ |
| `cycle.enabled`                                        | 当前原版周期是否开启                              |
| `cycle.day`、`days`、`dangerousDay`、`fertileLeadDays` | 当前周期数据，缺失数字为 `null`                   |
| `cycle.fertility`                                      | 原版当前生育倍率，`0` 至 `1`                      |
| `cycle.pills`、`analEnabled`、`avoidance`              | 药物、肛交开关与避孕倾向，缺失倾向为 `null`       |
| `pregnancies`                                          | 原版返回的活动妊娠记录数组                        |
| `progress`                                             | 第一条活动妊娠的进度，`0` 至 `1`；无妊娠为 `null` |
| `dueDate`                                              | 第一条活动妊娠的原版时间戳；无妊娠为 `null`       |
| `belly`                                                | 原版计算的腹部大小                                |

返回值用于剧情查询。不要靠改写查询结果伪造受孕、生产或知识状态；这些变更沿用原版 API。

## 剧情受孕判定

只在自定义剧情的对应事件确实发生后，请求一次原版判定：

```javascript
const record = maplebirch.npc.Pregnancy.tryConceive('Luna', {
  donor: 'pc',
  orifice: 'vagina',
  depth: 'deep',
  location: V.location,
  fertility: 1,
  aware: true,
  donorKnown: true
});
```

调用前仍须确认前述运行时条件。成功返回原版妊娠记录，未受孕返回 `null`，不强制成功。每调用一次就进行一次判定，不能把它放进显示、日程或反复执行的条件回调。

| 参数           | 默认与含义                                                                 |
| :------------- | :------------------------------------------------------------------------- |
| `donor`        | 默认 `'pc'`；其它命名人物须存在于原版人物档案                              |
| `donorSpecies` | 玩家默认 `'human'`，命名 NPC 默认读取其基础 `type`；需要特殊来源时显式填写 |
| `orifice`      | `'vagina'` 或 `'anus'`，省略时按身体数据选择；无对应身体条件会返回 `null`  |
| `depth`        | `'outside' / 'imminent' / 'deep'`，传给原版深度判定                        |
| `location`     | 发生地点，传给原版记录                                                     |
| `fertility`    | 默认 `1`，必须为非负有限数，不是保证成功的概率                             |
| `aware`        | 为真时记录玩家知道本次妊娠                                                 |
| `donorKnown`   | 为真时记录玩家知道捐精方；不代表所有角色知情                               |

保留原版概率、周期、药物、内容开关、不孕名单和已有妊娠限制。`canImpregnatePlayer` 不会反向把这个 API 变成“令玩家怀孕”的入口；`tryConceive(name)` 的承孕方始终是所传 NPC。

承孕 NPC 与捐精方支持原版种族：`human`、`wolf`、`wolfboy`、`wolfgirl`、`hawk`、`harpy`。NPC 转化服务的玩法身份不会自动改写基础 `type`，也不会自动改变这里的物种判定。框架不增加后代种族，也不替换原版战斗判定、每日推进或生产流程。
