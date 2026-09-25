# SugarCube macros

## Purpose

The framework adds SugarCube macros for multilingual text, buttons, links, listboxes, radio options, and text output.

## Common Macros

| Macro                      | Purpose                                |
| :------------------------- | :------------------------------------- |
| `<<language>>`             | Display content by language            |
| `<<lanSwitch>>`            | Output language-specific text          |
| `<<lanButton>>`            | Multilingual button                    |
| `<<lanLink>>`              | Multilingual link                      |
| `<<lanListbox>>`           | Multilingual listbox                   |
| `<<radiobuttonsfrom>>`     | Generate radio buttons from data       |
| `<<maplebirchReplace>>`    | Replace framework overlay content      |
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
<<lanButton "myMod:start">>
  <<goto "StartPassage">>
<</lanButton>>
```

## lanLink

```twine
<<lanLink "myMod:goTown" "Town">>
  Go to town
<</lanLink>>
```

SugarCube link syntax:

```twine
<<lanLink [[myMod:goTown|Town]]>>
```

## lanListbox

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option "myMod:mode.easy" "easy">>
  <<option "myMod:mode.hard" "hard">>
<</lanListbox>>
```

## radiobuttonsfrom

Generate radio buttons from a string or array.

```twine
<<radiobuttonsfrom "$myMod.mode" "easy|normal|hard">>
<</radiobuttonsfrom>>
```

Array form:

```twine
<<set _options = [["easy", "myMod:easy"], ["normal", "myMod:normal"]]>>
<<radiobuttonsfrom "$myMod.mode" _options>>
<</radiobuttonsfrom>>
```

## maplebirchReplace

Replace the framework overlay body from inside overlay content.

```twine
<<maplebirchReplace>>
  <<MyOtherWidget>>
<</maplebirchReplace>>
```

## Custom Macros

```javascript
maplebirch.tool.defineS('myModHello', name => {
  return `Hello, ${name}`;
});
```

Use `maplebirch.tool.define()` when the handler needs the SugarCube macro context. Both shortcuts retain the arguments of `tool.macro.define()` and `tool.macro.defineS()`. New macros register at `:sugarcube` by default, without a manual `once(':sugarcube')` wrapper. To replace a vanilla macro, set the final `phase` argument to `'storyready'` so vanilla can register first; claiming its name earlier makes SugarCube reject the vanilla definition. To read and wrap an original handler, still wait until `:storyready`. The `macro` service remains available for other macro-management methods.
