# NPC 怀孕

`maplebirch.npc.Pregnancy` 将命名 NPC 注册到原版 0.5.12.13 怀孕系统，并提供周期配置、剧情查询和受孕判定。妊娠记录、时间推进、子女生成与生产仍由原版负责。

`add()` 可在模组脚本加载时注册；读取状态或判定受孕应等游戏初始化并载入 NPC 后进行。调用前可检查 `maplebirch.npc.Pregnancy.available`：缺少原版怀孕 API 时，`get()` 和 `tryConceive()` 会抛错。未知 NPC 名称也会抛错。

## 注册

注册键就是 NPC 的 `nam`，不使用模组前缀。

```javascript
maplebirch.npc.add({ nam: 'Example', gender: 'f', type: 'human' });

maplebirch.npc.Pregnancy.add('Example', {
  canBePregnant: true,
  canImpregnatePlayer: true,
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

静态配置也可以写在 [`boot.json` 的 `npc.Pregnancy`](../BootJson.md#npc) 中；不要同时为同一 NPC 在两处配置不同周期。`canBePregnant` 和 `canImpregnatePlayer` 只向原版内容名单添加 NPC，不会从原版名单移除已有成员。

| 配置                    | 默认值  | 说明                                |
| :---------------------- | :------ | :---------------------------------- |
| `canBePregnant`         | `true`  | 加入原版可怀孕内容名单              |
| `canImpregnatePlayer`   | `false` | 加入原版可使玩家怀孕的内容名单      |
| `cycle.days`            | 原版    | 固定周期天数，或 `[最短, 最长]`     |
| `cycle.dangerousDay`    | 原版    | 排卵危险日                          |
| `cycle.fertileLeadDays` | 原版    | 固定易孕提前天数，或随机范围        |
| `cycle.pills`           | 原版    | `contraceptive`、`fertility` 或空值 |
| `cycle.analEnabled`     | 原版    | 是否允许原版肛交怀孕判定            |
| `cycle.avoidance`       | 原版    | 避孕倾向，范围 `0` 至 `100`         |

`days` 和 `fertileLeadDays` 必须是正整数或递增的正整数范围；指定 `dangerousDay` 时必须同时指定 `days`，且不能大于最短周期。无效配置会在 `add()` 时抛错。

周期配置只应用一次。已有存档保留当前周期日，超出新周期长度时收回有效范围；以后读档不会再次重置周期，也不会覆盖玩家已经保存的开关。

## 查询剧情状态

```javascript
const pregnancy = maplebirch.npc.Pregnancy.get('Example');
```

返回值集中提供剧情常用信息：

```javascript
{
  cycle: {
    enabled,
    day,
    days,
    dangerousDay,
    fertileLeadDays,
    fertility,
    pills,
    analEnabled,
    avoidance
  },
  pregnancies,
  progress,
  dueDate,
  belly
}
```

`pregnancies` 是原版返回的活动妊娠记录。`fertility` 是原版当前生育倍率，范围为 `0` 至 `1`。`progress` 为第一条活动妊娠的进度，范围为 `0` 至 `1`；没有妊娠时为 `null`。`dueDate` 使用原版时间戳，`belly` 使用原版腹部大小计算。

## 剧情受孕判定

自定义剧情明确发生内射后，可以请求原版进行一次 NPC 受孕判定：

```javascript
const record = maplebirch.npc.Pregnancy.tryConceive('Example', {
  donor: 'pc',
  orifice: 'vagina',
  depth: 'deep',
  location: V.location,
  fertility: 1,
  aware: true,
  donorKnown: true
});
```

成功时返回原版妊娠记录，未受孕时返回 `null`。该方法保留原版概率、周期、药物、内容开关、不孕名单和已有妊娠限制；不会强制受孕。

`donor` 默认为玩家 `pc`，`fertility` 默认为 `1`，且必须是非负有限数。`orifice` 省略时按 NPC 的身体数据选择；建议在具体剧情中显式填写。`aware` 与 `donorKnown` 为真时分别记录玩家知道怀孕、知道捐精方，不代表所有角色都已知情。每调用一次都会请求一次原版判定，应只在对应剧情事件实际发生时调用。

NPC 和捐精方必须使用原版支持的生殖种族：`human`、`wolf`、`wolfboy`、`wolfgirl`、`hawk` 或 `harpy`。框架不会新增后代种族，也不会替换原版战斗怀孕、每日推进或生产流程。
