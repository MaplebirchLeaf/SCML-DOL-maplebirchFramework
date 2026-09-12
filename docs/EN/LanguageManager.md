# Language Manager

## Purpose

Language manager imports translation files and reads current-language text from scripts or SugarCube content.

## Entry Points

```javascript
maplebirch.t(key);
maplebirch.auto(text);
maplebirch.Language;
maplebirch.lang.set(key, translations);
maplebirch.lang.has(key);
```

## Import Through boot.json

```json
"language": ["CN", "EN"]
```

Custom files:

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

## Translation File

```json
{
  "myMod.title": "My Mod",
  "myMod.enable": "Enable",
  "myMod.disable": "Disable"
}
```

Use mod-prefixed keys to avoid unintended conflicts. For each language, the current manager records the order in which mods first import that language; later sources have priority for shared keys. Importing the same source and language again updates its content without changing its priority, including cache hits. Each language has its own order, determined again by its imports after reload. Languages not yet reimported keep their existing cached translations.

Each import replaces the source snapshot for that mod and language. Removing a key or importing an empty object `{}` removes that source's translation. The highest-priority remaining source supplies the fallback, while other languages and unrelated mod entries remain intact.

Existing databases are upgraded during normal imports without clearing storage. Older records retained only the winning text, so previously overwritten sources become available for fallback after their files are imported again.

## t()

```javascript
maplebirch.t('myMod.title');
```

Missing keys return `[key]`.

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
