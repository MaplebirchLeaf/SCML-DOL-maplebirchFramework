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
"language": ["CN", "EN"]
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
  "CN": ["i18n/CN/common.yml", "i18n/CN/ui.yml"],
  "EN": ["i18n/EN/common.yml", "i18n/EN/ui.yml"]
}
```

The existing `"CN": { "file": "i18n/cn.yml" }` form still works; `file` may also be an array. The framework merges all files for one mod and language before updating its translations. Removing a file from the configuration list, or a key from a file, removes the old translation on the next import. A missing or invalid file still listed in the configuration leaves the previous set intact instead of importing only part of the list. Do not split one language across separate `language` configuration entries.

## Translation File

```json
{
  "myMod.title": "My Mod",
  "myMod.enable": "Enable",
  "myMod.disable": "Disable"
}
```

Within a mod and language, later files override duplicate keys; between mods, later imports take priority. Prefix keys such as `myMod.category.name` to avoid accidental collisions. Files use flat key/value pairs: strings are accepted, numbers and booleans become text, and nested objects are ignored. JSON, YML, and YAML are supported.

## t()

```javascript
maplebirch.t('myMod.title');
```

Missing keys return `[key]`.

The optional second argument appends a space after English text:

```javascript
maplebirch.t('myMod.prefix', true);
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
maplebirch.services.translator.set('myMod.button.save', { CN: '保存', EN: 'Save' });
if (maplebirch.services.translator.has('myMod.button.save')) {
  console.log(maplebirch.t('myMod.button.save'));
}
```

## SugarCube Content

The language macro can choose text without a translation file:

```twine
<<language>>
  <<option "CN">>中文内容<</option>>
  <<option "EN">>English content<</option>>
<</language>>
```

See [SugarCube macros](SugarCubeMacro.md) for other examples.
