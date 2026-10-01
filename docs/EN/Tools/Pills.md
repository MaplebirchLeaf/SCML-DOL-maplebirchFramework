# Pills

`maplebirch.tool.patch.pills.add(name, config)` integrates manual tablets with the native medicine drawer. Register during startup. There is no corresponding boot.json data field.

| Field                          | Type                        | Purpose                          |
| ------------------------------ | --------------------------- | -------------------------------- |
| `cn_name`                      | Optional string or callback | Chinese name                     |
| `description`, `warning_label` | String or callback          | Description and label            |
| `icon`                         | Optional string             | Full image path                  |
| `owned`, `doseTaken`           | Callbacks returning numbers | Current stock and consumed doses |
| `canTake`                      | Callback returning boolean  | Additional eligibility           |
| `take`                         | Callback                    | Apply the dose                   |

Only stocked tablets appear. Taking one also requires `canTake()`. The framework does not deduct inventory, apply effects, track dependence, or record dose times. The owning mod handles these in `take()` and its save state. Custom tablets cannot use daily automatic dosing. Native pill names must not be reused.

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

The example assumes the mod initializes `V.myMod` through State widgets or module save initialization. Drawer registration does not create pharmacy stock. Keep native shop entries on single lines and put prices, descriptions, and warnings on the confirmation page. `CustomLinkZone` with `[-1, widget]` places a section before the return link without cutting into the first native category.
