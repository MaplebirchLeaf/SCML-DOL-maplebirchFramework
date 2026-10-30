# Translation Service (Translator)

## Purpose

`Translator` imports mod translation files and reads current-language text from scripts or SugarCube content. It supports `CN` and `EN`. File paths are relative to the mod ZIP root.

## Entry Points

```javascript
maplebirch.t(key);
maplebirch.auto(text);
maplebirch.Language;
maplebirch.services.translator.set(key, translations);
maplebirch.services.translator.has(key);
```

## Import Through boot.json

For the default layout, the framework looks for `translations/CN.json`, `.yml`, and `.yaml`, plus the corresponding `EN` files. When more than one format exists, files merge in **JSON → YML → YAML** order:

```json
"language": [
  "CN",
  "EN"
]
```

For one custom file per language:

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

For multiple files in a language, use an ordered array. If `ui.yml` repeats a key from `common.yml`, its later value wins:

```json
"language": {
  "CN": [
    "i18n/CN/common.yml",
    "i18n/CN/ui.yml"
  ],
  "EN": [
    "i18n/EN/common.yml",
    "i18n/EN/ui.yml"
  ]
}
```

Use one file list per language, ordered from shared text to UI-specific text. The `"CN": { "file": "i18n/cn.yml" }` form is also supported, including an array for `file`.

On the next import:

| Your change                                           | Result                                                                             |
| :---------------------------------------------------- | :--------------------------------------------------------------------------------- |
| Repeat a key in a later file                          | Use the later value                                                                |
| Remove a file from the list, or a key from its file   | Remove old text supplied only by that source                                       |
| Keep a file in the list, but it is missing or invalid | Log the error and retain the previous complete set; do not import a partial result |

Keep one language's files together in the array rather than splitting them across separate `language` entries.

## Translation File

```json
{
  "myMod:title": "My Mod",
  "myMod:enable": "Enable",
  "myMod:disable": "Disable"
}
```

Keys may contain colons and dots while the file stays flat. For a UI category, write:

```yaml
# The dot is part of the key; do not wrap these in a nested ui object.
myMod:ui.title: "Luna's news"
myMod:ui.meet: 'Arrange a meeting'
myMod:ui.cancel: 'Cancel the meeting'
```

Read the complete key, such as `maplebirch.t('myMod:ui.title')`. Nested objects are ignored; numbers and booleans become text. JSON, YML and YAML are supported.

Later files in the same language override duplicate keys. Between mods, later imports take priority, so a `myMod:` prefix helps prevent accidental collisions.

## t()

```javascript
maplebirch.t('myMod:title');
```

Missing keys return `[key]`.

The optional second argument appends a space after English text:

```javascript
maplebirch.t('myMod:prefix', true);
```

## auto()

```javascript
maplebirch.auto('Robin');
```

`auto()` attempts to match already imported text and returns the current-language version. If no match exists, it returns the original text.

## Switch Language

```javascript
maplebirch.Language = 'EN';
```

Listen for language changes:

```javascript
maplebirch.on(':language', () => {
  console.log(maplebirch.Language);
});
```

If your mod writes translated text into its own DOM nodes, refresh those nodes on `:language`.

## Setting Text in Scripts

Use this for a few runtime-generated labels; file imports are preferable for larger sets:

```javascript
maplebirch.services.translator.set('myMod:button.save', {
  CN: '保存',
  EN: 'Save'
});
if (maplebirch.services.translator.has('myMod:button.save')) {
  console.log(maplebirch.t('myMod:button.save'));
}
```

## SugarCube Content

Use `maplebirch.t()` directly for translation keys. No `language` wrapper is needed:

```twine
<h3><<= maplebirch.t('myMod:title')>></h3>
<<link `maplebirch.t('myMod:enable')`>>
  <<set $myMod.enabled to true>>
<</link>>
```

The example assumes your mod has initialized `$myMod`. `<<= ...>>` and `<<link>>` are native SugarCube syntax: one outputs the translation, the other reads the label when creating the link.

Use `lanLink`, `lanButton` or related macros when existing labels need to refresh after a language change. For short bilingual prose without translation keys, see the [language macro](Macros.md#language). Write ordinary single-language prose directly.
