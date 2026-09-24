# Tip Registration

### Introduction

Tip registration adds new text to vanilla `setup.tips` categories.
_Access it through `maplebirch.tool.patch.tips.add()`._

### Adding Tips

```javascript
maplebirch.tool.patch.tips.add('general', 'The first mod tip.', 'The second mod tip.');
```

- The first argument is an existing or new tip category.
- The remaining arguments are the tip texts to add.
- Empty text is ignored and duplicate text is not added twice.
- Vanilla categories continue to follow vanilla content settings. New categories are treated as always enabled and automatically join the vanilla random pool.

The framework calls `apply()` after vanilla `init_tips`, so registration does not replace or prevent vanilla tip initialization. Normal scripts loaded through `maplebirchAddon` may call `add()` directly.

### Registering through boot.json

```json
"framework": {
  "tips": "data/tips.json"
}
```

`tips.json` may be a string array. Every entry is added to `general`:

```json
["The first mod tip.", "The second mod tip."]
```

It may also be an object matching the shape of `setup.tips`:

```json
{
  "general": ["A tip that may always appear."],
  "weather": ["A tip that appears with weather content."],
  "myMod:tips": ["A custom category automatically joins the random pool."]
}
```

File paths are relative to the root of the mod archive. See [boot.json Configuration](../BootJson.md) for the complete addon structure.
