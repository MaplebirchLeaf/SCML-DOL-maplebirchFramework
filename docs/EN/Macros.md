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

Store object data in a variable before passing it to the macro:

```twine
<<set _greeting to { EN: "Hello", CN: "你好" }>>
<<lanSwitch _greeting>>
```

## lanButton

Create a button whose label updates when the language changes. Its body runs on click. Use `goto` in the body when navigation is needed.

### Bilingual labels

The first entry is English and the second is Chinese. Write the array directly, without backticks. Both entries must be strings containing complete labels, rather than translation segments. An empty entry falls back to the other language.

```twine
<<lanButton ['Open guide', '打开指南'] 'class:teal'>>
  <<set $guideOpen to true>>
<</lanButton>>
```

These labels stay in Twee. They require no translation-key registration and are not added to the translation table.

### Translation keys and variables

Shared text may still use translation keys. A variable may contain either a key or a bilingual array:

```twine
<<lanButton "myMod:start">>
  <<goto "StartPassage">>
<</lanButton>>

<<set _label to ['Close guide', '关闭指南']>>
<<lanButton _label>>
  <<set $guideOpen to false>>
<</lanButton>>
```

### Style arguments

These arguments also apply to `lanLink`. They are separate from the label and target passage:

| Argument                                      | Meaning                                                        |
| :-------------------------------------------- | :------------------------------------------------------------- |
| `title`, `upper`, `lower`, `capitalize`, etc. | Convert text formatting                                        |
| `class:teal`                                  | Add CSS classes, separated by spaces                           |
| `style:font-weight:bold`                      | Add inline styling                                             |
| `icon:mirror.png`                             | Add an icon before the label                                   |
| `icon-only`                                   | Show only the icon, retaining the text as its accessible label |

```twine
<<lanButton ['Open guide', '打开指南'] 'title' 'class:teal'>>
  <<set $guideOpen to true>>
<</lanButton>>
```

## lanLink

Create a link whose label updates when the language changes. The next string that is not a style argument specifies the target passage. The body runs on click, followed by navigation.

### Passage links

```twine
<<lanLink ['Go to town (0:02)', '前往城镇 (0:02)'] 'Town'>>
  <<pass 2>>
<</lanLink>>
```

The time in the label is display text. Advancing time still requires `pass` in the body. Array labels, translation keys, variables, and styling follow the same rules as `lanButton`.

### Click actions

Without a target passage, the link runs its body without automatic navigation. Apply a colour class to the link when only the action needs emphasis:

```twine
<<lanSwitch 'Reload required.' '需要重载。'>>
<<lanLink ['Reload now', '立即重载'] 'class:teal'>>
  <<run window.location.reload()>>
<</lanLink>>
```

### Existing syntax

Translation keys, variables, backtick expressions, and SugarCube link markup remain supported:

```twine
<<lanLink "myMod:goTown" "Town">><</lanLink>>
<<lanLink [[myMod:goTown|Town]]>><</lanLink>>

<<set _label to ['Go to town', '前往城镇']>>
<<lanLink _label 'Town'>><</lanLink>>
<<lanLink `['Go to town', '前往城镇']` 'Town'>><</lanLink>>
```

Only `lanLink` and `lanButton` handle leading bilingual arrays themselves. All other arguments use the native parser, and global SugarCube syntax is unchanged. Variables and expressions are evaluated when the control is created. Redraw the control to pick up later variable changes. Language changes refresh the labels on existing controls.

## lanListbox

Create a multilingual listbox. The first argument is a quoted variable name. Option values are separate from display labels.

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option "myMod:mode.easy" "easy">>
  <<option "myMod:mode.normal" "normal">>
  <<option "myMod:mode.hard" "hard">>
<</lanListbox>>
```

### Static bilingual options

`option` uses native argument parsing, so arrays require backticks or a variable. Do not copy the bare-array syntax from `lanLink`:

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option `['Easy', '简单']` 'easy'>>
  <<option `['Hard', '困难']` 'hard'>>
<</lanListbox>>
```

When the value is omitted, the English label supplies a stable value independent of the current language. Prefer explicit values when you need stable data identifiers.

### Options from data

`optionsfrom` accepts arrays, objects, Maps, and Sets. Each array or Set entry supplies both its label and value. Objects and Maps use each key as the label and its corresponding value as the option value:

```twine
<<set _options to new Map([
  ['myMod:mode.easy', 'easy'],
  ['myMod:mode.hard', 'hard']
])>>
<<lanListbox "$myMod.mode" autoselect>>
  <<optionsfrom _options>>
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

Put the language on an `option` child tag. `<<language 'CN'>>` does not select its body. Without a matching option, the result is empty.
