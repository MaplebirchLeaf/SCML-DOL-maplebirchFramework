# 转化选项提示

在选择链接外使用 `<<transform-hint "horse" "softbrown">>` 显示转化名称。

```twine
<<link "继续前进" "Next Passage">>
  <<transform "horse" 5>>
<</link>>
<<transform-hint "horse" "softbrown">>
```

第一个参数是框架翻译键，第二个参数是作者指定的 CSS 颜色类，例如 `blue`、`orange`、`gold` 或 `softbrown`。框架不指定统一颜色。

> [!NOTE]
> 提示只渲染 `| <名称>` 格式的转化名称标签，与原版动物转化提示一致。此宏**不会**增加转化进度（仍需在链接或动作中调用 `<<transform>>`），且在玩家开启隐藏数值提示（`blindStatsEnabled`）时不显示任何内容。
