# Pills

`maplebirch.tool.patch.pills.add(name, config)` integrates manual tablets with the native medicine drawer. Register during startup; there is no corresponding `boot.json` data field.

> [!IMPORTANT]
> Drawer registration only handles UI display and button hooks. The framework does **not** deduct inventory, apply effects, track dependence, or create pharmacy stock; handle these in `take()`, save initialization, and your own shop passages.

## Entry Point

```javascript
maplebirch.tool.patch.pills.add(name, config);
```

The first argument `name` is the native item name; keep it stable and use a mod prefix. When a separate Chinese display name is needed, supply the optional `cn_name` field.

## Config Fields

| Field                          | Type                                                 | Purpose                                 |
| :----------------------------- | :--------------------------------------------------- | :-------------------------------------- |
| `cn_name`                      | Optional string or callback                          | Chinese name                            |
| `description`, `warning_label` | String or callback                                   | Description and label                   |
| `icon`                         | Optional string                                      | Full image path                         |
| `indicators`                   | Optional string array or callback returning an array | Effect hints below the icon             |
| `owned`, `doseTaken`           | Callbacks returning numbers                          | Current stock and consumed doses (req.) |
| `canTake`                      | Callback returning boolean                           | Additional eligibility (req.)           |
| `take`                         | Callback                                             | Apply the dose (req.)                   |

> [!WARNING]
> All four callbacks (`owned`, `doseTaken`, `canTake`, `take`) are required—`add()` throws a `TypeError` if any is missing or not a function. Native pill names must not be reused (throws an error during `apply()`), and custom tablets cannot use daily automatic dosing.

Only stocked tablets (`owned() > 0`) appear in the drawer, and taking one also requires `canTake()` to return `true`. If `icon` is omitted, it defaults to `img/misc/icon/pill-collection.png`.

`indicators` supplies HTML hints to the native drawer, such as `<span class="green">- Stress</span>`. Native rendering hides them when blind stats are enabled. These strings only describe effects and do not apply them.

## Complete Example

**framework.js**

```javascript
function initMyModMedicine(variables) {
  variables.myMod ??= {};
  // Give 3 tablets on first initialization; retain existing stock, including 0.
  variables.myMod.tablets ??= 3;
  variables.myMod.taken ??= 0;
}
maplebirch.tool.onInit(() => initMyModMedicine(V));
maplebirch.on(':onLoad', save => initMyModMedicine(save.V));
```

```javascript
maplebirch.tool.patch.pills.add('myMod tablets', {
  cn_name: '示例药片',
  description: 'Example tablets',
  warning_label: '',
  owned: () => V.myMod?.tablets ?? 0,
  doseTaken: () => V.myMod?.taken ?? 0,
  canTake: () => Boolean(V.myMod),
  take: () => {
    if (!V.myMod || V.myMod.tablets <= 0) return;
    V.myMod.tablets--;
    V.myMod.taken = (V.myMod.taken ?? 0) + 1;
    // Apply mod-specific effects here.
  }
});
```

> [!TIP]
> Keep native pharmacy shop entries on single lines and put prices, descriptions, and warnings on the confirmation page. Using `CustomLinkZone` with `[-1, widget]` places a section before the return link without cutting into the first native category.
