# SugarCube Macros

## Purpose

The framework adds SugarCube macros for multilingual text, buttons, links, listboxes, radio options, and text output.

## Common Macros

| Macro | Purpose |
| :--- | :--- |
| `<<language>>` | Display content by language |
| `<<lanSwitch>>` | Output language-specific text |
| `<<lanButton>>` | Multilingual button |
| `<<lanLink>>` | Multilingual link |
| `<<lanListbox>>` | Multilingual listbox |
| `<<radiobuttonsfrom>>` | Generate radio buttons from data |
| `<<maplebirchTextOutput>>` | Output registered text builder content |

## language

```twine
<<language>>
  <<option "CN">>中文内容<</option>>
  <<option "EN">>English content<</option>>
<</language>>
```

## lanSwitch

```twine
<<lanSwitch "Hello" "你好">>
```

Object form:

```twine
<<lanSwitch { EN: "Hello", CN: "你好" }>>
```

## lanButton

```twine
<<lanButton "myMod.start">>
  <<goto "StartPassage">>
<</lanButton>>
```

## lanLink

```twine
<<lanLink "myMod.goTown" "Town">>
  Go to town
<</lanLink>>
```

SugarCube link syntax:

```twine
<<lanLink [[myMod.goTown|Town]]>>
```

## lanListbox

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option "myMod.mode.easy" "easy">>
  <<option "myMod.mode.hard" "hard">>
<</lanListbox>>
```

## Custom Macros

```javascript
maplebirch.tool.macro.defineS('myModHello', name => {
  return `Hello, ${name}`;
});
```
