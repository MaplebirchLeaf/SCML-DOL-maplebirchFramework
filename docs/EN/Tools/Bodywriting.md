# Bodywriting

Bodywriting registration adds new entries to vanilla `setup.bodywriting`. It is useful for story marks, tattoos, symbols, or custom body text. The framework writes registered entries into the vanilla data during initialization.

## Entry Point

```javascript
maplebirch.tool.patch.bodywriting.add(key, config);
```

Use `maplebirch.tool.patch.bodywriting.delete(key)` to remove an entry. Registered operations are applied during initialization; call `maplebirch.tool.patch.bodywriting.apply()` to apply them manually. Removal also clears the index mapping in `setup.bodywriting_namebyindex`.

## Minimal Example

```javascript
maplebirch.tool.patch.bodywriting.add('my_mod_mark', {
  writing: 'My Mark',
  writ_cn: '我的标记',
  type: 'text',
  gender: 'n',
  lewd: 0
});
```

`key` is the unique id. Use a mod prefix to avoid collisions. It is written into the configuration and the `setup.bodywriting_namebyindex` mapping; registering the same key updates the existing entry.

> [!NOTE]
> `writing` and `writ_cn` are vanilla's English and Chinese data fields. They do not need language macros.

## Config Fields

| Field      | Description                   | Default |
| :--------- | :---------------------------- | :------ |
| `writing`  | English display name          | -       |
| `writ_cn`  | Chinese display name          | -       |
| `type`     | `text` or `object`            | `text`  |
| `arrow`    | Arrow marker, `0` or `1`      | `0`     |
| `special`  | Special marker                | `none`  |
| `gender`   | Allowed body type             | `n`     |
| `lewd`     | Lewd flag, `0` or `1`         | `0`     |
| `degree`   | Intensity                     | `0`     |
| `featSkip` | Skip vanilla feat checks      | `true`  |
| `sprites`  | Sprite names for object marks | -       |
| `index`    | Bodywriting index             | Auto    |

Gender values:

| Value | Meaning       |
| :---- | :------------ |
| `n`   | Neutral / all |
| `f`   | Female        |
| `m`   | Male          |
| `h`   | Hermaphrodite |

> [!WARNING]
> Without an explicit `index`, a new entry uses the next value after the current maximum, while an existing entry keeps its index. Specifying an `index` already owned by another entry throws an error during `apply()`.

## Text Mark

```javascript
maplebirch.tool.patch.bodywriting.add('my_mod_rune_text', {
  writing: 'Rune',
  writ_cn: '符文',
  type: 'text',
  gender: 'n',
  degree: 1
});
```

## Object Mark

```javascript
maplebirch.tool.patch.bodywriting.add('my_mod_phoenix', {
  writing: 'Phoenix',
  writ_cn: '凤凰',
  type: 'object',
  gender: 'n',
  sprites: ['phoenix_left', 'phoenix_right'],
  degree: 3
});
```

> [!IMPORTANT]
> `sprites` only references sprite names; your mod must supply the corresponding tattoo image assets.

## Special & Conditional Marks

```javascript
maplebirch.tool.patch.bodywriting.add('my_mod_magic_mark', {
  writing: 'Magic Mark',
  writ_cn: '魔法标记',
  type: 'text',
  special: 'magic',
  gender: 'n',
  lewd: 0,
  degree: 2
});
```

To enable vanilla feat checks instead of skipping them, set `featSkip` to `false`:

```javascript
maplebirch.tool.patch.bodywriting.add('my_mod_restricted_mark', {
  writing: 'Restricted Mark',
  writ_cn: '受限标记',
  featSkip: false
});
```

## boot.json

Object-map form. _This is the recommended format when registering multiple entries._

```json
{
  "framework": {
    "bodywriting": {
      "my_mod_rune_text": {
        "writing": "Rune",
        "writ_cn": "符文",
        "type": "text",
        "gender": "n",
        "degree": 1
      },
      "my_mod_phoenix": {
        "writing": "Phoenix",
        "writ_cn": "凤凰",
        "type": "object",
        "gender": "n",
        "sprites": ["phoenix_left", "phoenix_right"],
        "degree": 3
      }
    }
  }
}
```

External **`.json`**, **`.yaml`**, or **`.yml`** files are supported:

```json
{
  "framework": {
    "bodywriting": "data/bodywriting.yaml"
  }
}
```

Array form is also supported. Each item must include **`key`**:

```yaml
- key: my_mod_rune_text
  writing: Rune
  writ_cn: 符文
  type: text
  gender: n
  degree: 1
- key: my_mod_phoenix
  writing: Phoenix
  writ_cn: 凤凰
  type: object
  gender: n
  sprites:
    - phoenix_left
    - phoenix_right
  degree: 3
```
