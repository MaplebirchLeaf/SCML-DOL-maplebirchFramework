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

框架从本次错误日志和相关当前源码中的 `V.foo`、`$foo` 或 `State.variables` 明确静态路径，自动发现诊断相关的存档字段。无需模组作者登记路径、schema 或所属模组，也不区分游戏原版与模组变量。实际值由 core 注入的 SugarCube `State.variables` 宿主读取，服务层不绑定 DoL 变量名。

只有本次分析提供的目标及其范围可读取和修改，模型不能新增目标或扩大范围，也不会获得完整存档。每次最多 8 个状态片段，每个限 16 KiB，只接受普通 JSON 数据：对象、数组、字符串、有限数字、布尔和 null。函数、特殊对象、循环引用和访问器不进入请求或修复。JSON 校验只验证数据与操作边界，不能保证修复值符合游戏语义。

状态 DSL 支持 `set / delete / rename / copy / merge / fill`，使用完整数组路径，如 `['ExampleMod', 'progress', 'state']`，操作路径和目标路径都必须留在本次提供的范围内。`merge` 递归合并，`fill` 仅填缺失值，保留已有的 false、0 和 null。禁止操作整个宿主状态根、V/setup/window 或原型字段，也不能求值表达式或执行生成代码。

旧格式修复记录校验失败后会停用，重新分析即可生成当前格式的方案。

源码 DSL 支持 `replace / insertBefore / insertAfter / delete`，继续使用精确匹配、指纹、目标绑定与已有代码限制。AI 不能生成函数执行。可纠正的格式或锚点错误最多向同一接口反馈一次；越权、禁止的代码、取消及接口失败不重试。

`type: 'ast'` 可对已绑定的 JS 或 Twee 内嵌 JS 做表达式、语句、代码块替换，以及语句前后插入、完整语句删除。`selector: { nodeType, source }` 使用 ESTree 类型和观察到的完整节点源码，忽略空白与注释后必须唯一匹配。`action` 为 `replaceExpression / replaceStatement / replaceBlock / insertBefore / insertAfter / deleteStatement`；除删除外，`code` 是新片段。不接受偏移或匹配数量来消除歧义。

AST 使用 Acorn 解析、校验及计算区间，最终只 splice 原始源码；完整 JS 单位重新解析，Twee 的宏范围也重新检查。首版允许既有变量、静态属性、JSON、普通表达式、原有赋值路径、return、if、block；禁止新增函数、构造器、动态属性与网络加载。已有调用只能原样保留，不能修改参数、增加次数或重定向调用。Twee 仅处理可独立解析的 JS 宏参数与 script 正文，不转换 `to/is/and` 等 SugarCube 方言。CSS、状态及补丁绑定不使用 AST。AST 配方保留在记忆中，重放仍重查定位、语法和权限。

TweeReplacer 绑定可同时带 `rebase: true` 和 `expressions: [{ find, replace, expectedMatches: 1 }]`：先保留当前继承源码，再迁移既有正文的完整 `if/elseif` 条件或单个 `set` 右侧。新表达式只接受有当前目标源码依据的静态读取与字面量，使用普通 JS 运算符，不生成调用或宏结构。新增临时变量必须在锚点之前无条件初始化，原生插件执行前与最终验证时重新核对。正文、绑定和同方案状态操作共同校验与回滚。

同一方案的目标先完整校验，再应用源码 Overlay；状态迁移在同步 `:variable` 事件中检查旧值、写入和校验。全部验证成功后进入 `trial`，复测后手动确认 `active`。记忆保存在 `maplebirch/repair`，重载和读档无需调用 AI；目标或权限变化时停用。跨加载阶段失败会恢复可回滚的 Overlay 和状态快照，要求重载；已执行的脚本副作用不能通用撤销。原始 ZIP 和 ModLoader 安装包不修改。

AST 的绑定与赋值权限来自选中节点所在的原始词法块，不借用其他函数或子块的同名变量。声明类型、表达式所在的语法槽位及片段词法边界必须保持有效。含动态调用目标、构造器、动态 import、标签模板或禁用调用的 JS 单位暂不接受 AST 修复，避免通过修改参数变量间接执行代码；仍可使用其他已支持的 Repair 机制。静态校验通过不等同于运行行为已验证。
