## SugarCube 宏扩展

## 用来做什么

框架提供了一组 SugarCube 宏，主要用于多语言文本、按钮、链接、列表和选项生成。它们适合写在 `.twee`、widget 或 passage 内容中。

常用宏：

| 宏                         | 用途                     |
| :------------------------- | :----------------------- |
| `<<language>>`             | 按当前语言显示不同内容块 |
| `<<lanSwitch>>`            | 输出当前语言对应文本     |
| `<<lanButton>>`            | 多语言按钮               |
| `<<lanLink>>`              | 多语言链接               |
| `<<lanListbox>>`           | 多语言下拉框             |
| `<<radiobuttonsfrom>>`     | 从数组/对象生成单选按钮  |
| `<<maplebirchReplace>>`    | 替换框架覆盖层内容       |
| `<<maplebirchTextOutput>>` | 输出文本工具注册的内容   |

---

## language

按当前 `maplebirch.Language` 显示对应内容。

```twine
<<language>>
  <<option "CN">>中文内容<</option>>
  <<option "EN">>English content<</option>>
<</language>>
```

内容块中可以继续写 SugarCube 代码：

```twine
<<language>>
  <<option "CN">>
    <<link "继续">><<goto "Next">><</link>>
  <</option>>
  <<option "EN">>
    <<link "Continue">><<goto "Next">><</link>>
  <</option>>
<</language>>
```

---

## lanSwitch

输出当前语言对应文本。

```twine
<<lanSwitch "Hello" "你好">>
```

对象写法：

```twine
<<lanSwitch { EN: "Hello", CN: "你好" }>>
```

也可以在表达式中使用：

```twine
<<= lanSwitch("Save", "保存")>>
```

---

## lanButton

创建会随语言刷新文本的按钮。

```twine
<<lanButton "myMod.start">>
  <<goto "StartPassage">>
<</lanButton>>
```

支持格式转换和样式参数：

```twine
<<lanButton "myMod.save" "upper" "class:gold">>
  <<save>>
<</lanButton>>
```

常用参数：

| 参数                           | 说明                         |
| :----------------------------- | :--------------------------- |
| 翻译键                         | 按 `maplebirch.t()` 获取文本 |
| `title` / `upper` / `lower` 等 | 文本格式转换                 |
| `class:xxx`                    | 添加 CSS 类                  |
| `style:xxx`                    | 添加内联样式                 |

---

## lanLink

创建会随语言刷新文本的链接。

```twine
<<lanLink "myMod.goTown" "Town">>
  前往城镇
<</lanLink>>
```

SugarCube 链接语法：

```twine
<<lanLink [[myMod.goTown|Town]]>>
```

无目标 passage 时，可作为可点击控件使用：

```twine
<<lanLink "myMod.close">>
  <<replace "#panel">><</replace>>
<</lanLink>>
```

---

## lanListbox

创建多语言下拉框。

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option "myMod.mode.easy" "easy">>
  <<option "myMod.mode.normal" "normal">>
  <<option "myMod.mode.hard" "hard">>
<</lanListbox>>
```

`optionsfrom` 可从数组、对象、Map、Set 生成选项：

```twine
<<set _options = [["easy", "myMod.mode.easy"], ["hard", "myMod.mode.hard"]]>>

<<lanListbox "$myMod.mode" autoselect>>
  <<optionsfrom _options>>
<</lanListbox>>
```

---

## radiobuttonsfrom

从数组或字符串生成一组单选按钮。

```twine
<<radiobuttonsfrom "$myMod.mode" "easy|normal|hard">>
<</radiobuttonsfrom>>
```

数组写法：

```twine
<<set _options = [["easy", "myMod.easy"], ["normal", "myMod.normal"]]>>
<<radiobuttonsfrom "$myMod.mode" _options>>
<</radiobuttonsfrom>>
```

第三个参数可指定分隔符：

```twine
<<radiobuttonsfrom "$myMod.mode" "easy|normal|hard" " / ">>
<</radiobuttonsfrom>>
```

---

## maplebirchTextOutput

输出由文本工具注册的内容。

```twine
<<maplebirchTextOutput "myTextKey">>
```

相关功能见 [文本工具](ToolCollection/htmlTools.md)。

---

## 自定义宏

可以通过 `maplebirch.tool.macro` 定义自己的 SugarCube 宏。

```javascript
maplebirch.tool.macro.defineS('myModHello', name => {
  return `Hello, ${name}`;
});
```

在 passage 中使用：

```twine
<<myModHello "Robin">>
```

如果需要直接操作宏上下文，可用 `define()`：

```javascript
maplebirch.tool.macro.define('myModRaw', function () {
  $(this.output).wiki('raw output');
});
```

---

## 补充说明

- 多语言宏会在语言切换后尽量刷新自身文本。
- 翻译键建议带模组名前缀。
- `lanButton` 和 `lanLink` 内部可以写 SugarCube 动作。
- 需要生成复杂文本时，可把逻辑放到 [文本工具](ToolCollection/htmlTools.md) 中。
