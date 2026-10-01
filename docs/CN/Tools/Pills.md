# 药片

`maplebirch.tool.patch.pills.add(name, config)` 接入原版药柜。请在启动脚本注册，当前没有对应的 boot.json 数据字段。

| 字段                           | 类型                             | 用途               |
| ------------------------------ | -------------------------------- | ------------------ |
| `cn_name`                      | 字符串或无参数函数，可选         | 中文名称           |
| `description`、`warning_label` | 字符串或无参数函数               | 描述与包装提醒     |
| `icon`                         | 字符串，可选                     | 完整图片路径       |
| `indicators`                   | 字符串数组或返回数组的函数，可选 | 图标下方的效果提示 |
| `owned`、`doseTaken`           | 无参数函数，返回数字             | 当前库存与已服用量 |
| `canTake`                      | 无参数函数，返回布尔值           | 是否允许服用       |
| `take`                         | 无参数函数                       | 实际服药结算       |

库存大于零时才会出现在药柜中。服用还需要 `canTake()` 成立。框架不扣库存、不计算药效或依赖，也不自动记录服药时间，这些应由 `take()` 和模组自己的存档数据管理。扩展药片只能手动服用，不能使用每日自动服药。不得占用原版药片名称。

`indicators` 使用原版药柜显示 HTML 提示，例如 `<span class="green">- 压力</span>`。开启隐藏属性时，原版会隐藏这些提示。这里只提供显示文本，不执行药效结算。

```javascript
maplebirch.tool.patch.pills.add('myMod tablets', {
  cn_name: '示例药片',
  description: '示例药片',
  warning_label: '',
  owned: () => V.myMod?.tablets ?? 0,
  doseTaken: () => V.myMod?.taken ?? 0,
  canTake: () => Boolean(V.myMod),
  take: () => {
    if (!V.myMod || V.myMod.tablets <= 0) return;
    V.myMod.tablets--;
    V.myMod.taken = (V.myMod.taken ?? 0) + 1;
    // 在这里结算模组药效。
  }
});
```

示例假定模组已通过 State 区域或模块存档初始化建立 `V.myMod`。药柜接入不会自动增加药房商品，购买入口需另行注册。分类内的商品列表应保持原版的单行商品链接，把描述、售价和风险提示放在确认购买页。需要插在返回链接之前时，可使用 `CustomLinkZone` 的 `[-1, widget]`，避免 `BeforeLinkZone` 把内容插进原版分类。
