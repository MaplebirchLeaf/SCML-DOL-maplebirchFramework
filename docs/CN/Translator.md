# 翻译服务 (Translator)

## 用来做什么

`Translator` 用于导入模组翻译文件，并在脚本或 SugarCube 内容中读取当前语言文本。适合处理模组选项、NPC 名称、按钮文本、提示文本等内容。

目前支持 `CN` 和 `EN`。翻译文件应放在模组 ZIP 内；路径相对 ZIP 根目录。

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

最简单的写法会自动查找 `translations/CN.json`、`translations/CN.yml`、`translations/CN.yaml`，以及对应的 `EN` 文件；存在多个格式时会按 **JSON → YML → YAML** 的顺序合并：

```json
"language": ["CN", "EN"]
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
  "CN": ["i18n/CN/common.yml", "i18n/CN/ui.yml"],
  "EN": ["i18n/EN/common.yml", "i18n/EN/ui.yml"]
}
```

原有的 `"CN": { "file": "i18n/cn.yml" }` 写法仍可用；`file` 也可以是文件数组。每次导入时，框架先把该模组同一语言的所有文件合并，再更新翻译。从配置列表移除文件，或从文件内容移除键后，下次导入不会留下对应旧译文；若列表中指定的文件缺失或解析失败，本次不会用半份结果替换已有翻译。请勿把一个语言的多个文件写成多个 `language` 配置项。

完整配置见 [boot.json 配置](BootJson.md)。

---

## 翻译文件

JSON：

```json
{
  "myMod.title": "我的模组",
  "myMod.enable": "启用",
  "myMod.disable": "禁用"
}
```

YAML：

```yaml
myMod.title: '我的模组'
myMod.enable: '启用'
myMod.disable: '禁用'
```

建议翻译键带模组名前缀，避免和其它模组冲突。

同一模组、同一语言的文件按列表顺序覆盖重名键；不同模组之间，后导入的模组优先提供重名键。建议使用 `myMod.category.name` 形式命名，避免意外覆盖。文件内容只支持平铺的文本键值；数字与布尔值会转为文本，嵌套对象不会被导入。

---

## t()

按翻译键读取当前语言文本。

```javascript
maplebirch.t('myMod.title');
```

如果找不到翻译，会返回 `[key]` 形式的占位文本：

```javascript
maplebirch.t('missing.key'); // [missing.key]
```

第二个参数 `space` 用于英文时追加空格：

```javascript
maplebirch.t('myMod.prefix', true);
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
maplebirch.services.translator.set('myMod.button.save', {
  CN: '保存',
  EN: 'Save'
});
```

检查翻译键是否存在：

```javascript
if (maplebirch.services.translator.has('myMod.button.save')) {
  console.log(maplebirch.t('myMod.button.save'));
}
```

---

## 在 SugarCube 中使用

可以结合语言宏使用：

```twine
<<language>>
  <<option "CN">>中文内容<</option>>
  <<option "EN">>English content<</option>>
<</language>>
```

更多宏用法见 [SugarCube 宏扩展](SugarCubeMacro.md)。

---

## 补充说明

- 翻译键建议使用 `modName.category.name` 形式。
- `t()` 适合明确翻译键，`auto()` 适合已有文本的自动匹配。
- 语言文件路径以模组压缩包内部路径为准。
- 切换语言后，如有自定义 DOM 文本，需要监听 `:language` 自行刷新。
