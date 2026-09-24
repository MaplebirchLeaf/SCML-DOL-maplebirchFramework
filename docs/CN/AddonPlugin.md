# ModLoader 接入

通过 `maplebirch.wikify` 注册同步渲染钩子；图片资源由 `maplebirch.host.modLoader.resources` 管理，诊断由 `maplebirch.infra.diagnostics` 统一汇集。boot 配置见 [boot.json](BootJson.md)，内容构建见 [HTML 工具](Tools/Text.md)。

## 渲染钩子

```typescript
maplebirch.wikify('myMod:relationship', {
  beforeWidget(text, name, passageTitle, passage) {
    return text;
  },
  afterWidget(text, name, passageTitle, passage, node) {
    if (name !== 'relationshiptext') return;
    node.append(document.createTextNode('Relationship details'));
  }
});
```

名称是普通字符串，`myMod:relationship`、`myMod-relationship` 均可。框架只在底层注册名之前加 `maplebirch:`，不会拆分你的名称；同名注册遵循 ModLoader 的替换规则。建议带上 Mod 名避免冲突。

| 回调            | 参数                                            | 返回值             |
| --------------- | ----------------------------------------------- | ------------------ |
| `beforePassage` | `text, passageTitle, passage`                   | 原始或修改后的源码 |
| `afterPassage`  | `text, passageTitle, passage, node`             | 无                 |
| `beforeWidget`  | `text, widgetName, passageTitle?, passage?`     | 原始或修改后的源码 |
| `afterWidget`   | `text, widgetName, passageTitle, passage, node` | 无                 |
| `beforeWikify`  | `text`                                          | 原始或修改后的源码 |
| `afterWikify`   | `text, node`                                    | 无                 |

回调同步执行，不使用异步事件总线。`before` 必须返回字符串，后续处理器收到前一个处理器的结果。widget 的 passage 信息可能为 `undefined`；ModLoader 配套 SugarCube 的钩子可传入定义 widget 的 passage，不能据此推断玩家当前页面。需要当前页面时读取 `maplebirch.SugarCube.State.passage`。`node` 是当前渲染片段，可能尚未挂载到页面。

在钩子中再次调用 Wikifier 时必须过滤目标，避免重复进入同一个钩子。上游没有公开注销入口，此接口不提供注销或优先级。按 widget 名声明原版适配可以使用 [Patch](Tools/Patches.md)。

钩子只描述渲染时序。例如含有“领取奖励”链接的 widget 执行完毕时，玩家可能还没点击链接；奖励逻辑必须放在成功处理分支中。需要精确改动分支时使用 [源码适配](Tools/Zones.md#源码适配)，不能把成功结算等同于 `afterWidget`。

## 图片资源

```typescript
const resources = maplebirch.host.modLoader.resources;
const image = await resources.load('img/myMod/icon.png');
if (image !== false) document.querySelector<HTMLImageElement>('#myModIcon')!.src = image;
```

| 方法              | 返回值及行为                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `normalize(path)` | 归一化 Mod 相对路径，保留协议 URL                                                              |
| `has(path)`       | `true` 存在、`false` 不存在、`undefined` 上游无法判断；不发起图片请求                          |
| `load(path)`      | 缓存命中返回解析地址或 `false`，否则返回 Promise；先查 ModLoader，未解析到时由浏览器加载原路径 |
| `clear(path?)`    | 清除指定路径或全部缓存，已发出的请求仍会结束，但不会重新写回清除的缓存                         |

同一路径的并发读取共用请求；缓存保存解析后的实际地址，包括 Mod 图片的数据 URL。浏览器回退加载最多等待 15 秒。`has` 反映缓存和资源提供者掌握的情况，提供者返回 false 不代表普通 URL 也无法加载；实际加载应调用 `load`。失败也会缓存，资源变化或需要重试时调用 `clear`；框架在 early-load 完成后自动清理缓存。

[loadImage](Utilities.md#loadimage) 复用同一个解析器，并保留旧接口的侧边栏刷新行为。

## 依赖与冲突

```typescript
const diagnostics = maplebirch.infra.diagnostics;
const requirement = diagnostics.mod('OtherMod', '>=1.2.0');
console.log(requirement.status, requirement.version);
console.log(diagnostics.checkDependencies());
console.table(diagnostics.conflicts);
```

`mod(name, range?)` 查询普通已加载 Mod，返回名称、版本、范围和状态：`available`、`missing`、`incompatible`；解析抛错时为 `invalid`，并带 `error`。版本判断使用 ModLoader 的版本算法。省略范围时只判断是否已加载。

`checkDependencies()` 调用 ModLoader 的完整依赖及加载顺序检查，返回布尔值，详细原因由其日志报告；ModLoader、游戏版本等特殊依赖也应使用这个入口。

`conflicts` 是上游合并冲突的快照，包含 `source`、`dataSource` 和重名的 `passages`、`scripts`、`styles` 数组；`undefined` 表示上游还没有结果。它表示同名资源冲突，不等同于补丁执行失败，也不表示已经定位冲突双方的具体源码。

## 补丁报告

```typescript
const failures = maplebirch.infra.diagnostics.patches.filter(item => item.status !== 'applied');
console.table(failures);
```

框架的 zone 源码适配、`maplebirch.host.modLoader.replace()` 和已有 Twine 脚本/样式替换会记录报告。每条包含 `kind`、`target`、`index`、`pattern`、`matches`、`applied`、`status`，必要时带 `expected`、`error`。`index` 是从 1 开始的补丁序号；整体资产或目标检查使用 0。

| 状态        | 含义                                 |
| ----------- | ------------------------------------ |
| `applied`   | 已执行替换                           |
| `unmatched` | 目标存在，源码未匹配                 |
| `missing`   | passage、资产或容器不存在            |
| `invalid`   | 配置无效，或 passage 放错 patch 分组 |
| `mismatch`  | 匹配数量与 `expected` 不符，未替换   |
| `error`     | 执行失败，原因见 error               |

同一 kind、target、index 保留最近结果；读取返回副本。`clearPatches()` 清空报告。此记录不涵盖第三方直接执行的补丁，也不是完整游戏行为验收。
