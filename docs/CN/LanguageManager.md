## 语言管理

## 用来做什么

语言管理用于导入模组翻译文件，并在脚本或 SugarCube 内容中读取当前语言文本。适合处理模组选项、NPC 名称、按钮文本、提示文本等内容。

框架当前常用语言代码为 `CN` 和 `EN`。

---

## 使用入口

```javascript
maplebirch.t(key);
maplebirch.auto(text);
maplebirch.Language;
maplebirch.lang.set(key, translations);
maplebirch.lang.has(key);
```

---

## 通过 boot.json 导入

推荐在 `boot.json` 中导入语言文件：

```json
"language": ["CN", "EN"]
```

指定文件路径：

```json
"language": {
  "CN": "language/cn.yml",
  "EN": "language/en.yml"
}
```

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
maplebirch.lang.set('myMod.button.save', {
  CN: '保存',
  EN: 'Save'
});
```

检查翻译键是否存在：

```javascript
if (maplebirch.lang.has('myMod.button.save')) {
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
