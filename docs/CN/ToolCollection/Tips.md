## 小贴士注册 (Tips)

### 基本介绍

小贴士注册用于向原版 `setup.tips` 分类中添加新的提示文本。
_可通过 `maplebirch.tool.patch.tips.addTips()` 访问。_

### 添加小贴士

```javascript
maplebirch.tool.patch.tips.addTips('general', '第一条模组小贴士。', '第二条模组小贴士。');
```

- 第一个参数是已有或新增的小贴士分类名。
- 后续参数是需要加入该分类的提示文本。
- 空文本会被忽略，重复文本不会再次添加。
- 原版分类继续遵循原版的内容开关；新增分类会作为始终启用的小贴士分类，自动加入原版随机池。

框架会在原版 `init_tips` 完成后调用 `applyTips()`，因此不会覆盖或阻止原版小贴士初始化。通过 `maplebirchAddon` 加载的普通 `script` 可以直接调用 `addTips()`。

### 在 boot.json 中注册

```json
"framework": {
  "tips": "data/tips.json"
}
```

`tips.json` 可以是字符串数组，所有内容将加入 `general`：

```json
["第一条模组小贴士。", "第二条模组小贴士。"]
```

也可以使用与 `setup.tips` 相同的分类对象：

```json
{
  "general": ["始终可能出现的小贴士。"],
  "weather": ["天气内容启用时出现的小贴士。"],
  "myMod": ["自定义分类会自动加入随机池。"]
}
```

文件路径相对于模组压缩包根目录。完整 addon 结构见 [boot.json 配置](../BootJson.md)。
