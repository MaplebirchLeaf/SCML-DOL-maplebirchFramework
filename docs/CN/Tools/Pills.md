# 药片

`maplebirch.tool.patch.pills.add(name, config)` 用于将自定义手动药片接入原版药柜。请在启动脚本中注册，当前没有对应的 `boot.json` 数据字段。

> [!IMPORTANT]
> 药柜注册只负责界面展示与按钮挂钩。框架**不会**自动扣除库存、结算药效、计算依赖或创建药房商品；这些逻辑应由 `take()`、模组存档初始化以及模组自己的商店段落处理。

## 使用入口

```javascript
maplebirch.tool.patch.pills.add(name, config);
```

第一个参数 `name` 为原版药片条目名称，建议保持稳定并带有模组前缀。需要提供中文显示名称时，请使用可选的 `cn_name` 字段。

## 配置字段

| 字段                           | 类型                             | 用途                       |
| :----------------------------- | :------------------------------- | :------------------------- |
| `cn_name`                      | 字符串或无参数函数，可选         | 中文名称                   |
| `description`、`warning_label` | 字符串或无参数函数               | 描述与包装提醒             |
| `icon`                         | 字符串，可选                     | 完整图片路径               |
| `indicators`                   | 字符串数组或返回数组的函数，可选 | 图标下方的效果提示         |
| `owned`、`doseTaken`           | 无参数函数，返回数字             | 当前库存与已服用量（必填） |
| `canTake`                      | 无参数函数，返回布尔值           | 是否允许服用（必填）       |
| `take`                         | 无参数函数                       | 实际服药结算（必填）       |

> [!WARNING]
> `owned`、`doseTaken`、`canTake`、`take` 四个回调均为必填，缺少或非函数时 `add()` 会直接抛出 `TypeError`。不得复用原版药片名称（否则初始化时抛出错误），且自定义药片只能手动服用，不支持每日自动服药。

库存大于零时药片才会出现在药柜中；服用还需要 `canTake()` 返回 `true`。`icon` 未指定时默认使用 `img/misc/icon/pill-collection.png`。

`indicators` 使用原版药柜显示 HTML 提示，例如 `<span class="green">- 压力</span>`。开启隐藏属性时，原版会隐藏这些提示。这里只提供显示文本，不执行药效结算。

## 完整示例

**framework.js**

```javascript
function initMyModMedicine(variables) {
  variables.myMod ??= {};
  // 本例首次接入给 3 片；已有库存（包括 0）不会重置。
  variables.myMod.tablets ??= 3;
  variables.myMod.taken ??= 0;
}
maplebirch.tool.onInit(() => initMyModMedicine(V));
maplebirch.on(':onLoad', save => initMyModMedicine(save.V));
```

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

> [!TIP]
> 药房分类内的商品列表应保持原版的单行商品链接，把描述、售价和风险提示放在确认购买页。需要插在返回链接之前时，可使用 `CustomLinkZone` 的 `[-1, widget]`，避免 `BeforeLinkZone` 把内容插进原版分类。
