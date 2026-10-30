# 翻译服务 (Translator)

## 用来做什么

`Translator` 用于导入模组翻译文件，并在脚本或 SugarCube 内容中读取当前语言文本。适合处理模组选项、NPC 名称、按钮文本、提示文本等内容。

目前支持 `CN` 和 `EN`。翻译文件应放在模组 ZIP 内。路径相对 ZIP 根目录。

---

## 使用入口

```javascript
maplebirch.t(key);
maplebirch.auto(text);
maplebirch.Language;
maplebirch.services.translator.set(key, translations);
maplebirch.services.translator.has(key);
```

---

## 通过 boot.json 导入

最简单的写法会自动查找 `translations/CN.json`、`translations/CN.yml`、`translations/CN.yaml`，以及对应的 `EN` 文件。存在多个格式时会按 **JSON → YML → YAML** 的顺序合并：

```json
"language": [
  "CN",
  "EN"
]
```

指定单个文件时可用字符串：

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

一个语言需要多个文件时，直接写有序数组。下面的 `ui.yml` 若与 `common.yml` 使用同一个键，后面的值生效：

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

每种语言使用一个文件列表，按“先通用、后界面”的顺序排列即可。也支持 `"CN": { "file": "i18n/cn.yml" }`，其中 `file` 同样可以写数组。

更新文件后，导入结果按下面的方式处理：

| 你做的修改                                 | 下次导入的结果                                   |
| :----------------------------------------- | :----------------------------------------------- |
| 在后面的文件重复同一个键                   | 使用后面的值                                     |
| 从列表移除一个文件，或从文件删掉一个键     | 不再保留由它单独提供的旧译文                     |
| 列表中仍指定某个文件，但文件缺失或格式错误 | 保留之前的整份翻译，日志报告错误，不导入半份内容 |

不要把同一语言拆成多个 `language` 配置项；用上面的数组把文件放在一起。

完整配置见 [boot.json 配置](BootJson.md)。

---

## 翻译文件

JSON：

```json
{
  "myMod:title": "我的模组",
  "myMod:enable": "启用",
  "myMod:disable": "禁用"
}
```

YAML：

```yaml
myMod:title: '我的模组'
myMod:enable: '启用'
myMod:disable: '禁用'
```

建议翻译键带模组名前缀，避免和其它模组冲突。

键名本身可以包含冒号和点，但文件内容保持平铺。比如把标题分到 `ui` 分类，可以这样写：

```yaml
# 键名中的点只是名称的一部分，不需要再套一层 ui 对象。
myMod:ui.title: '露娜的近况'
myMod:ui.meet: '约好见面的时间'
myMod:ui.cancel: '取消约见'
```

读取时使用完整键名，例如 `maplebirch.t('myMod:ui.title')`。嵌套对象不会被导入，数字和布尔值会转成文本。

同一语言按文件列表顺序覆盖重名键；不同模组之间，后导入的模组优先。因此键名带上 `myMod:` 前缀，可以减少意外覆盖。

## t()

按翻译键读取当前语言文本。

```javascript
maplebirch.t('myMod:title');
```

如果找不到翻译，会返回 `[key]` 形式的占位文本：

```javascript
maplebirch.t('missing.key'); // [missing.key]
```

第二个参数 `space` 用于英文时追加空格：

```javascript
maplebirch.t('myMod:prefix', true);
```

---

## auto()

`auto()` 会尝试把已知文本转换成当前语言文本。

```javascript
maplebirch.auto('Robin');
```

适合处理原版 NPC 名称、标题或已被导入的源文本。如果没有匹配翻译，会返回原文本。

---

## 切换语言

```javascript
maplebirch.Language = 'CN';
```

语言切换后会触发 `:language` 事件：

```javascript
maplebirch.on(':language', () => {
  console.log('当前语言：', maplebirch.Language);
});
```

---

## 在脚本中手动写入翻译

```javascript
maplebirch.services.translator.set('myMod:button.save', {
  CN: '保存',
  EN: 'Save'
});
```

检查翻译键是否存在：

```javascript
if (maplebirch.services.translator.has('myMod:button.save')) {
  console.log(maplebirch.t('myMod:button.save'));
}
```

---

## 在 SugarCube 中使用

使用翻译键时，可以直接调用 `maplebirch.t()`，不必再包一层 `language`：

```twine
<h3><<= maplebirch.t('myMod:title')>></h3>
<<link `maplebirch.t('myMod:enable')`>>
  <<set $myMod.enabled to true>>
<</link>>
```

示例假定 `$myMod` 已由模组初始化。`<<= ...>>` 和 `<<link>>` 是 SugarCube 原有语法：前者输出译文，后者在生成链接时读取标签。

需要在切换语言后刷新现有控件的标签时，使用 `lanLink`、`lanButton` 等语言宏。少量双语正文也可用 `language` 直接选择内容，写法见 [SugarCube 宏](Macros.md#language)。普通单语言正文直接写文本即可。

---

## 补充说明

- 翻译键建议使用 `modName:category.name` 形式。

- `t()` 适合明确翻译键，`auto()` 适合已有文本的自动匹配。
- 语言文件路径以模组压缩包内部路径为准。
- 切换语言后，如有自定义 DOM 文本，需要监听 `:language` 自行刷新。
