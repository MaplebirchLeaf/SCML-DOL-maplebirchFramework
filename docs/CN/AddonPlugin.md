# ModLoader 接入

图片资源由 `maplebirch.host.modLoader.resources` 管理，诊断由 `maplebirch.infra.diagnostics` 统一汇集。boot 配置见 [boot.json](BootJson.md)，内容构建见 [HTML 工具](Tools/Text.md)。

## 修改原版内容

框架不再提供 `maplebirch.wikify()` 渲染拦截：当前宿主虽接受回调注册，却不在 SugarCube 解析时触发。修改 widget 内容应使用 [源码适配](Tools/Zones.md#源码适配) 并设置 `expected`。修改已经显示的页面节点可监听 [`:passagedisplay`](Events.md)。文本工具 Builder 的 `wikify(content)` 只负责解析提供的文本，与渲染拦截无关。

## 图片资源

```typescript
const resources = maplebirch.host.modLoader.resources;
const image = await resources.load('img/myMod/icon.png');
if (image !== false) document.querySelector<HTMLImageElement>('#myModIcon')!.src = image;
```

| 方法              | 返回值及行为                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `normalize(path)` | 归一化 Mod 相对路径，保留协议 URL                                                              |
| `has(path)`       | `true` 存在、`false` 不存在、`undefined` 上游无法判断。不发起图片请求                          |
| `load(path)`      | 缓存命中返回解析地址或 `false`，否则返回 Promise。先查 ModLoader，未解析到时由浏览器加载原路径 |
| `clear(path?)`    | 清除指定路径或全部缓存，已发出的请求仍会结束，但不会重新写回清除的缓存                         |

同一路径的并发读取共用请求。缓存保存解析后的实际地址，包括 Mod 图片的数据 URL。浏览器回退加载最多等待 15 秒。`has` 反映缓存和资源提供者掌握的情况，提供者返回 false 不代表普通 URL 也无法加载。实际加载应调用 `load`。失败也会缓存，资源变化或需要重试时调用 `clear`。框架在 early-load 完成后自动清理缓存。

[loadImage](Utilities.md#loadimage) 复用同一个解析器，并保留旧接口的侧边栏刷新行为。

## 冲突信息

```typescript
const diagnostics = maplebirch.infra.diagnostics;
console.table(diagnostics.conflicts);
```

`conflicts` 是上游合并冲突的快照，包含 `source`、`dataSource` 和重名的 `passages`、`scripts`、`styles` 数组。`undefined` 表示上游还没有结果。它表示同名资源冲突，不等同于补丁执行失败，也不表示已经定位冲突双方的具体源码。

## 补丁报告

```typescript
const failures = maplebirch.infra.diagnostics.patches.filter(item => item.status !== 'applied');
console.table(failures);
```

框架的 zone 源码适配、`maplebirch.host.modLoader.replace()` 和已有 Twine 脚本/样式替换会记录报告。每条包含 `kind`、`target`、`index`、`pattern`、`matches`、`applied`、`status`，必要时带 `expected`、`error`。`index` 是从 1 开始的补丁序号。整体资产或目标检查使用 0。

| 状态        | 含义                                 |
| ----------- | ------------------------------------ |
| `applied`   | 已执行替换                           |
| `unmatched` | 目标存在，源码未匹配                 |
| `missing`   | passage、资产或容器不存在            |
| `invalid`   | 配置无效，或 passage 放错 patch 分组 |
| `mismatch`  | 匹配数量与 `expected` 不符，未替换   |
| `error`     | 执行失败，原因见 error               |

同一 kind、target、index 保留最近结果。读取返回副本。`clearPatches()` 清空报告。此记录不涵盖第三方直接执行的补丁，也不是完整游戏行为验收。

## AI 修复的状态权限

模组在 early-load 注册脚本中，用 `maplebirch.services.repair.allowState(policy)` 登记可修复的宿主状态路径与 schema。状态读取由 core 注入 SugarCube 的 `State.variables`，服务层不依赖 DoL 的全局 `V`。`modName` 必须是已加载模组的正式名称，路径不能重叠；模型不能自行登记或扩大权限。没有登记的变量不会发送给 API，也不能被修改。

```typescript
maplebirch.services.repair.allowState({
  modName: 'Your Mod',
  path: ['ExampleMod', 'progress'],
  scope: 'mod',
  schema: {
    type: 'object',
    properties: { state: { type: 'string' } },
    required: ['state']
  }
});
```

这是接口示例，请按模组实际结构声明完整 schema。对象只接受 `properties` 中的字段；支持对象、数组、字符串、数字、布尔、null，以及 `required`、`items`、`enum`。状态片段限 16 KiB。仅当诊断涉及已授权的变量根时，该片段才加入分析请求。

状态 DSL 支持 `set / delete / rename / copy / merge / fill`，使用完整数组路径，如 `['ExampleMod', 'progress', 'state']`。`merge` 递归合并，`fill` 仅填缺失值。禁止覆盖整个单段模组根或 V/setup/window，以及原型字段。游戏原版路径必须明确注册 `scope: 'game'`、至少两段，且仅允许 `set / fill`。旧 `vanilla` 值按相同权限兼容，签名保持原值。变量名不用于推断所属游戏或模组。

源码 DSL 支持 `replace / insertBefore / insertAfter / delete`，继续使用精确匹配、指纹、目标绑定与已有代码限制。AI 不能生成函数执行。可纠正的格式或锚点错误最多向同一接口反馈一次；越权、禁止的代码、取消及接口失败不重试。

`type: 'ast'` 可对已绑定的 JS 或 Twee 内嵌 JS 做表达式、语句、代码块替换，以及语句前后插入、完整语句删除。`selector: { nodeType, source }` 使用 ESTree 类型和观察到的完整节点源码，忽略空白与注释后必须唯一匹配。`action` 为 `replaceExpression / replaceStatement / replaceBlock / insertBefore / insertAfter / deleteStatement`；除删除外，`code` 是新片段。不接受偏移或匹配数量来消除歧义。

AST 使用 Acorn 解析、校验及计算区间，最终只 splice 原始源码；完整 JS 单位重新解析，Twee 的宏范围也重新检查。首版允许既有变量、静态属性、JSON、普通表达式、原有赋值路径、return、if、block；禁止新增函数、构造器、动态属性与网络加载。已有调用只能原样保留，不能修改参数、增加次数或重定向调用。Twee 仅处理可独立解析的 JS 宏参数与 script 正文，不转换 `to/is/and` 等 SugarCube 方言。CSS、状态及补丁绑定不使用 AST。AST 配方保留在记忆中，重放仍重查定位、语法和权限。

同一方案的目标先完整校验，再应用源码 Overlay；状态迁移在同步 `:variable` 事件中检查旧值、写入和校验。全部验证成功后进入 `trial`，复测后手动确认 `active`。记忆保存在 `maplebirch/repair`，重载和读档无需调用 AI；目标或权限变化时停用。跨加载阶段失败会恢复可回滚的 Overlay 和状态快照，要求重载；已执行的脚本副作用不能通用撤销。原始 ZIP 和 ModLoader 安装包不修改。

AST 的绑定与赋值权限来自选中节点所在的原始词法块，不借用其他函数或子块的同名变量。声明类型、表达式所在的语法槽位及片段词法边界必须保持有效。含动态调用目标、构造器、动态 import、标签模板或禁用调用的 JS 单位暂不接受 AST 修复，避免通过修改参数变量间接执行代码；仍可使用其他已支持的 Repair 机制。静态校验通过不等同于运行行为已验证。
