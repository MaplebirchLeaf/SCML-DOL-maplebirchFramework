# Patch 注册

`maplebirch.tool.patch` 是通用补丁注册入口；框架的 DoL 接入负责注册特质、地点等原版数据扩展。每个扩展按名称挂载到 `patch`，并通过 `.add(name, definition)` 注册 API 和生命周期处理器。接入其它游戏时可以只注册该游戏需要的扩展。

## 使用入口

```javascript
maplebirch.tool.patch.add(name, definition);
maplebirch.tool.patch.get(name);
```

**`name`** 是扩展的唯一名称，可以使用 `myMod:catalog` 或 `myMod-catalog`。**`definition.api`** 声明要加入 `patch` 的成员，其余字段按需提供。

内置扩展直接使用 `patch.traits`、`patch.location`、`patch.bodywriting`、`patch.fishing`、`patch.foodstuff`、`patch.antiques` 和 `patch.tips`。动态名称使用 `get(name)`；不存在时返回 `undefined`，需要强制取得时使用 `require(name)`。`has(name)` 和 `names()` 可用于查询。

不同扩展可以声明同名 API，它们在各自命名空间中互不冲突。`.add()` 仍为未冲突的 API 保留 4.x 扁平访问兼容；新代码应使用命名空间。重复扩展名称会抛错。请在启动脚本注册，晚注册不会补跑已经结束的阶段。

## 最小示例

```typescript
const api = { myCatalog: new Map<string, string>() };

maplebirch.tool.patch.add('myMod:catalog', {
  api,
  available() {
    return Boolean(setup.myCatalog);
  },
  init() {
    // 合并 setup 中的静态配置
  },
  state() {
    // 补齐 V 中缺失的存档数据
  }
});

const catalog = maplebirch.tool.patch.require<typeof api>('myMod:catalog');
catalog.myCatalog.set('example', 'value');
```

## 执行阶段

| 处理器        | 执行位置                         | 用途                                  |
| ------------- | -------------------------------- | ------------------------------------- |
| `available()` | 每次执行生命周期处理器前         | 返回 `false` 时跳过当前扩展           |
| `init()`      | StoryInit 中原版静态初始化完成后 | 合并 `setup` 目录，不创建存档变量     |
| `state()`     | 新游戏及读档的状态初始化阶段     | 只补齐 `V` 缺失项，保留现有数量和进度 |

同阶段处理器按注册顺序同步执行。`available` 不缓存；缺少依赖的原版结构时可返回 `false`，跳过 `init` 或 `state`。单项异常记录日志后继续。

地点、身体文字、食物、鱼类、小贴士在 init 合并静态数据。对应的原版目录不存在时会静默跳过，不会主动创建原版 `setup` 根项。食物库存及古董收集状态在 state 补齐；古董文本、捐赠和小贴士列表通过 [widget 源码适配](Zones.md#源码适配) 接入。`setup` 不在读档时重新初始化。

相关文档：

- [boot.json 配置](../BootJson.md)
- [特质注册](Traits.md)
- [小贴士注册](Tips.md)
- [地点配置](Location.md)
- [身体文字](Bodywriting.md)
- [食物注册](Foodstuff.md)
- [钓鱼扩展](Fishing.md)
- [古董注册](Antiques.md)
