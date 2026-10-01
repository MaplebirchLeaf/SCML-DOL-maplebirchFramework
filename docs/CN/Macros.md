# SugarCube 宏

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

对象数据可先存入变量，再传入宏：

```twine
<<set _greeting to { EN: "Hello", CN: "你好" }>>
<<lanSwitch _greeting>>
```

也可以在表达式中使用：

```twine
<<= lanSwitch("Save", "保存")>>
```

---

## lanButton

创建按钮，文本会随语言切换刷新。按钮内容在点击时执行，跳转需要在内容中使用 `goto`。

### 双语文本

第一项固定为英文，第二项固定为中文。直接写数组，不需要反引号。两项必须都是字符串，每种语言写完整文本，不使用分段拼接数组。当前语言文本为空时，回退到另一项。

```twine
<<lanButton ['Open guide', '打开指南'] 'class:teal'>>
  <<set $guideOpen to true>>
<</lanButton>>
```

这类文本直接保存在 Twee 中，不需要注册翻译键，也不会写入翻译表。

### 翻译键与变量

复用的公共文本可以继续使用翻译键。变量可以保存翻译键或双语数组：

```twine
<<lanButton "myMod:start">>
  <<goto "StartPassage">>
<</lanButton>>

<<set _label to ['Close guide', '关闭指南']>>
<<lanButton _label>>
  <<set $guideOpen to false>>
<</lanButton>>
```

### 样式参数

下表同样适用于 `lanLink`。样式参数独立于文本和目标 passage：

| 参数                                       | 说明                             |
| :----------------------------------------- | :------------------------------- |
| `title`、`upper`、`lower`、`capitalize` 等 | 文本格式转换                     |
| `class:teal`                               | 添加 CSS 类，多个类以空格分隔    |
| `style:font-weight:bold`                   | 添加内联样式                     |
| `icon:mirror.png`                          | 在文本前添加图标                 |
| `icon-only`                                | 只显示图标，文本仍用作无障碍标签 |

```twine
<<lanButton ['Open guide', '打开指南'] 'title' 'class:teal'>>
  <<set $guideOpen to true>>
<</lanButton>>
```

---

## lanLink

创建链接，文本会随语言切换刷新。第二个非样式字符串指定目标 passage，内容在点击时执行，然后跳转。

### 跳转链接

```twine
<<lanLink ['Go to town (0:02)', '前往城镇 (0:02)'] 'Town'>>
  <<pass 2>>
<</lanLink>>
```

时间文本只负责显示，推进时间仍需在内容中调用 `pass`。数组文本、翻译键、变量及样式参数的规则与 `lanButton` 一致。

### 点击操作

不指定目标 passage 时，链接执行内容，不自动跳转。只有链接需要强调时，直接给链接添加颜色类：

```twine
<<lanSwitch 'Reload required.' '需要重载。'>>
<<lanLink ['Reload now', '立即重载'] 'class:teal'>>
  <<run window.location.reload()>>
<</lanLink>>
```

### 原有写法

翻译键、变量、反引号表达式与 SugarCube 链接标记继续支持：

```twine
<<lanLink "myMod:goTown" "Town">><</lanLink>>
<<lanLink [[myMod:goTown|Town]]>><</lanLink>>

<<set _label to ['Go to town', '前往城镇']>>
<<lanLink _label 'Town'>><</lanLink>>
<<lanLink `['Go to town', '前往城镇']` 'Town'>><</lanLink>>
```

只有 `lanLink`、`lanButton` 接管开头的双语数组解析。它们的其他参数继续使用原版解析器，全局 SugarCube 语法不变。变量和表达式在生成控件时求值，之后修改变量需要重新绘制控件。语言切换会刷新现有控件的文本。

---

## lanListbox

创建多语言下拉框。第一个参数是带引号的变量名，选项值与显示文本分开。

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option "myMod:mode.easy" "easy">>
  <<option "myMod:mode.normal" "normal">>
  <<option "myMod:mode.hard" "hard">>
<</lanListbox>>
```

### 静态双语选项

`option` 使用原版参数解析，数组需要反引号或变量。不要照搬 `lanLink` 的裸数组写法：

```twine
<<lanListbox "$myMod.mode" autoselect>>
  <<option `['Easy', '简单']` 'easy'>>
  <<option `['Hard', '困难']` 'hard'>>
<</lanListbox>>
```

省略选项值时，使用英文标签作为稳定值，与当前语言无关。需要稳定的数据标识时，建议明确填写选项值。

### 从数据生成选项

`optionsfrom` 支持数组、对象、Map、Set。数组和 Set 的每项同时作为标签与值，对象和 Map 使用键作为标签、对应值作为选项值：

```twine
<<set _options to new Map([
  ['myMod:mode.easy', 'easy'],
  ['myMod:mode.hard', 'hard']
])>>
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
<<set _options = [["easy", "myMod:easy"], ["normal", "myMod:normal"]]>>
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

相关功能见 [文本工具](Tools/Text.md)。

---

## 自定义宏

可以通过 `maplebirch.tool.defineS()` 定义返回文本或节点的 SugarCube 宏。

```javascript
maplebirch.tool.defineS('myModHello', name => {
  return `Hello, ${name}`;
});
```

在 passage 中使用：

```twine
<<myModHello "Robin">>
```

如果需要直接操作宏上下文，可用 `define()`：

```javascript
maplebirch.tool.define('myModRaw', function () {
  $(this.output).wiki('raw output');
});
```

`define()` 和 `defineS()` 沿用 `tool.macro` 的参数，默认在 `:sugarcube` 注册**新增宏**，无需自己包一层 `once(':sugarcube')`。替换原版宏时，将最后一个 `phase` 参数设为 `'storyready'`，等原版注册完成后再替换。提前占用原版宏名会让 SugarCube 的原版注册报错。若要读取并包装原版处理器，仍需等到 `:storyready`。需要 `create()` 等其它宏管理能力时可访问 `maplebirch.tool.macro`。

---

## 补充说明

- 多语言宏会在语言切换后尽量刷新自身文本。
- 翻译键建议带模组名前缀。
- `lanButton` 和 `lanLink` 内部可以写 SugarCube 动作。
- 需要生成复杂文本时，可把逻辑放到 [文本工具](Tools/Text.md) 中。

`language` 的语言写在 `option` 子标签上。不要写 `<<language 'CN'>>`，没有匹配的 `option` 时正文为空。
