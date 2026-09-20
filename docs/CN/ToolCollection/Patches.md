# Patch 注册

`maplebirch.tool.patch` 管理原版数据扩展。直接使用 `addTraits()`、`addFoodstuff()`、`addFish()` 等目录接口，或通过 `.add(name, definition)` 注册自己的 API 和生命周期处理器。

## 使用入口

```javascript
maplebirch.tool.patch.add(name, definition);
```

**`name`** 是扩展的唯一名称，可以使用 `myMod:catalog` 或 `myMod-catalog`。**`definition.api`** 声明要加入 `patch` 的成员，其余字段按需提供。

返回值是包含新增成员的 `patch`，保留对应的 TypeScript 类型。重复名称或与现有成员冲突的 API 属性会抛错。请在启动脚本注册，晚注册不会补跑已经结束的阶段。

## 最小示例

```typescript
const patch = maplebirch.tool.patch.add('myMod:catalog', {
  api: { myCatalog: new Map<string, string>() },
  init() {
    // 合并 setup 中的静态配置
  },
  state() {
    // 补齐 V 中缺失的存档数据
  },
  widgets: {
    myModWidget: {
      before(text) {
        return text;
      },
      after(node) {
        node.append(document.createTextNode('My Mod'));
      }
    }
  }
});
patch.myCatalog.set('example', 'value');
```

## 执行阶段

| 处理器                       | 执行位置                         | 用途                                  |
| ---------------------------- | -------------------------------- | ------------------------------------- |
| `init()`                     | StoryInit 中原版静态初始化完成后 | 合并 `setup` 目录，不创建存档变量     |
| `state()`                    | 新游戏及读档的状态初始化阶段     | 只补齐 `V` 缺失项，保留现有数量和进度 |
| `widgets[name].before(text)` | 指定 widget 执行前               | 准备数据或转换源码，必须返回字符串    |
| `widgets[name].after(node)`  | 指定 widget 渲染后               | 使用执行结果或编辑当前片段            |

同阶段处理器按注册顺序同步执行，单项异常记录日志后继续。`before` 的返回值传给后续处理器；仅准备数据时返回原文。`after` 收到的片段可能尚未挂载到页面，不能用来判断链接是否被点击或奖励是否已结算。完整上下文钩子见 [ModLoader 接入](../AddonPlugin.md#渲染钩子)。

地点、身体文字、食物、鱼类、小贴士在 init 合并静态数据。食物库存及古董收集状态在 state 补齐；古董文本、捐赠和小贴士列表通过 widget 钩子接入。`setup` 不在读档时重新初始化。

相关文档：

- [boot.json 配置](../BootJson.md)
- [特质注册](Traits.md)
- [小贴士注册](Tips.md)
- [地点配置](Location.md)
- [身体文字](Bodywriting.md)
- [食物注册](Foodstuff.md)
- [钓鱼扩展](Fishing.md)
- [古董注册](Antiques.md)
