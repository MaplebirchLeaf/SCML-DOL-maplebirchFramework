# Bodywriting

Bodywriting registration adds new entries to vanilla `setup.bodywriting`. It is useful for story marks, tattoos, symbols, or custom body text.

## Entry Point

```javascript
maplebirch.tool.patch.bodywriting.addBodywriting(key, config);
```

Use `maplebirch.tool.patch.bodywriting.deleteBodywriting(key)` to remove an entry. Registered operations are applied during initialization; call `applyBodywriting()` to apply them manually. Removal also clears the index mapping.

## Minimal Example

```javascript
maplebirch.tool.patch.bodywriting.addBodywriting('my_mod_mark', {
  writing: 'My Mark',
  writ_cn: 'My Mark',
  type: 'text',
  gender: 'n',
  lewd: 0
});
```

`key` is the unique id. Use a mod prefix to avoid collisions. It is written into the configuration and the `setup.bodywriting_namebyindex` mapping. Registering the same key updates the existing entry.

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

Without an explicit `index`, a new entry uses the next value after the current maximum; an existing entry keeps its index. An explicit index owned by another entry produces an error.

Gender values:

| Value | Meaning       |
| :---- | :------------ |
| `n`   | Neutral / all |
| `f`   | Female        |
| `m`   | Male          |
| `h`   | Hermaphrodite |

## Text Mark

```javascript
maplebirch.tool.patch.bodywriting.addBodywriting('my_mod_rune_text', {
  writing: 'Rune',
  writ_cn: 'Rune',
  type: 'text',
  gender: 'n',
  degree: 1
});
```

## Object Mark

```javascript
maplebirch.tool.patch.bodywriting.addBodywriting('my_mod_phoenix', {
  writing: 'Phoenix',
  writ_cn: 'Phoenix',
  type: 'object',
  gender: 'n',
  sprites: ['phoenix_left', 'phoenix_right'],
  degree: 3
});
```

Sprite names should match the resources used by the game or your mod.

## boot.json

Object-map form. This is the recommended format when registering multiple entries:

```json
{
  "framework": {
    "bodywriting": {
      "my_mod_rune_text": {
        "writing": "Rune",
        "writ_cn": "Rune",
        "type": "text",
        "gender": "n",
        "degree": 1
      },
      "my_mod_phoenix": {
        "writing": "Phoenix",
        "writ_cn": "Phoenix",
        "type": "object",
        "gender": "n",
        "sprites": ["phoenix_left", "phoenix_right"],
        "degree": 3
      }
    }
  }
}
```

External `.json`, `.yaml`, or `.yml` files are supported:

```json
{
  "framework": {
    "bodywriting": "data/bodywriting.yaml"
  }
}
```

Array form is also supported. Each item must include `key`:

```yaml
- key: my_mod_rune_text
  writing: Rune
  writ_cn: Rune
  type: text
  gender: n
  degree: 1
- key: my_mod_phoenix
  writing: Phoenix
  writ_cn: Phoenix
  type: object
  gender: n
  sprites:
    - phoenix_left
    - phoenix_right
  degree: 3
```
