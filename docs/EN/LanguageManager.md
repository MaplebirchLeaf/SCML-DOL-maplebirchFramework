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
