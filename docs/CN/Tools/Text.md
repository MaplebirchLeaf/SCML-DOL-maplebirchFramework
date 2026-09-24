# 文本与 HTML 工具

通过 `maplebirch.tool.text` 注册内容、构建片段或修改现有节点。操作 widget 时传入回调提供的片段；省略替换方法的根节点才会查找当前页面的 `#passage-content`。

## 使用入口

```javascript
maplebirch.tool.text;
```

## 最小示例

```typescript
const text = maplebirch.tool.text;
text.add(
  'myMod:relationship',
  tools => {
    const label = tools.context.label;
    if (typeof label === 'string') tools.text(label, 'gold');
  },
  'myMod:label'
);

maplebirch.wikify('myMod:relationship', {
  afterWidget(_source, name, passageTitle, _passage, node) {
    if (name !== 'relationshiptext') return;
    text.renderInto(node, 'myMod:relationship', {
      widgetName: name,
      passageTitle,
      label: 'Relationship details'
    });
  }
});
```

这个例子在每次 `relationshiptext` 执行后追加内容，原版 widget 源码无需替换。实际 Mod 应按目标 passage、NPC 或显示条件缩小范围。钩子详见 [ModLoader 接入](../AddonPlugin.md#渲染钩子)。

## 注册与渲染

| 方法                               | 行为                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `add(key, handler, id?)`           | 注册处理器，返回 ID；同一 key 下相同 ID 替换原处理器，无效参数返回 `false` |
| `delete(key, idOrHandler?)`        | 删除指定处理器；省略第二参数时删除整个 key，返回是否删除                   |
| `clear()`                          | 清空所有文本处理器                                                         |
| `renderFragment(keys, context?)`   | 创建并返回新片段                                                           |
| `renderInto(root, keys, context?)` | 在指定 `Element` 或 `DocumentFragment` 中追加内容                          |
| `render(macro, keys)`              | 写入 SugarCube 宏的输出，并提供宏上下文                                    |

`keys` 可以是字符串或字符串数组，按给定顺序渲染；单个处理器报错会记录日志，其余继续执行。`context` 的 `args` 是只读 `unknown[]`；`name`、`widgetName`、`passageTitle` 是可选字符串。自定义字段为 `unknown`，读取前需检查类型。宏渲染时通过 `context.macro` 访问完整的 MacroContext。

宏入口支持字符串、字符串数组和逗号分隔的键名：

```twine
<<maplebirchTextOutput "myMod:header,myMod:details">>
```

`makeTextOutput({ CSV: false })` 可创建关闭逗号拆分的宏处理器。非法参数会报告宏错误。

## Builder

处理器接收的 `tools.fragment` 就是当前写入目标，`tools.context` 是本次上下文。以下方法返回 Builder，支持链式调用。

| 方法                         | 行为                                      |
| ---------------------------- | ----------------------------------------- |
| `text(content, className?)`  | 创建 span，自动翻译文本，末尾添加一个空格 |
| `line(content?, className?)` | 添加换行，可接着添加文本                  |
| `wikify(content)`            | 在当前目标中执行 Wiki 语法                |
| `raw(content)`               | 添加 Node 或原样文本，不翻译、不解析 HTML |
| `box(content, className?)`   | 创建 div；字符串自动翻译，Node 直接插入   |

`text`、`line`、`wikify` 接受字符串、数字、布尔值；空值不输出文本。需要翻译原样文本时显式调用 `tools.raw(tools.auto(value))`。Node 会移动到目标中，复用时应自行克隆。

## 修改已有内容

```typescript
maplebirch.wikify('myMod:links', {
  afterWidget(_source, name, _title, _passage, node) {
    if (name !== 'myModMenu') return;
    const link = node.querySelector('a[data-passage="Town"]');
    if (link) maplebirch.tool.text.renameLink(link, 'Visit town');
  }
});
```

| 方法                                     | 行为                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `replaceText(oldText, newText, root?)`   | 替换根节点内各文本节点中的匹配文字，返回替换次数；不跨节点匹配，跳过 script/style/textarea |
| `renameLink(target, label, root?)`       | 修改链接标签，保留链接元素、属性、目的地及其监听器，返回是否找到链接                       |
| `replaceLink(target, wikiSource, root?)` | 将整个链接替换为新解析的 Wiki 内容，原监听器不会保留，返回是否完成替换                     |

链接 `target` 优先传入已经定位的元素；这时直接操作该元素。传入字符串时，在 root 内查找第一个显示文字包含该字符串的 `.macro-link` 或 `.link-internal`。文字参数沿用 `lanSwitch` 翻译。按元素或 `data-passage` 定位可避免依赖显示语言。

`renameLink` 会重建标签内容，原链接内的子节点不会保留。`replaceLink` 先解析，再替换；解析抛错或生成 `.error` 时保留原链接。解析过程中执行的 Wiki 副作用不会回滚。
