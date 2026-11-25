# 参与秋枫白桦框架开发

框架的接入方式、接口签名和调用示例收录在模组作者文档中。[中文文档](docs/CN/README.md) · [English documentation](docs/EN/README.md)

## 本地开发

在仓库根目录用 Bun 安装依赖并构建。

```sh
bun install --frozen-lockfile
bun run verify
bun run build
```

实机调试前运行 `bun run package:zip` 生成测试包，再用 `bun run package:verify` 核对包内容。将 `package/` 中生成的 ZIP 载入带 SugarCube 2 ModLoader 的 DoL。

## 仓库结构

| 内容                 | 入口                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 框架启动与对外导出   | `src/index.ts` 接入 DoL，`src/core.ts` 组装运行时，`src/main.ts` 汇总公共导出。                                                            |
| 宿主、装载与基础服务 | `src/host/` 封装 DoL、SugarCube 和 ModLoader。`src/infra/` 放事件、生命周期和诊断，`src/services/` 放模组加载、配置与存储服务。            |
| 模组扩展接口         | `src/modules/` 按功能组织。通用工具在 `src/modules/Frameworks/`，DoL 专用接入在 `src/modules/DoL/`，分支及其它模组的适配在 `src/compat/`。 |
| 宏、界面与资源       | `src/macros/` 放内置 TypeScript 宏，模块专用的宏跟随模块。`src/twee/`、`src/styles/`、`src/assets/` 分别放段落和 widget、样式及资源。      |
| 文档与分发           | `docs/CN/` 和 `docs/EN/` 是接口文档。`scripts/` 放类型包、模组包和校验脚本，`cloudflare/` 放云存档 Worker。                                |

## 修改约定

- 接入原版先查现有区域、事件和宏。确需修改原版源码时，只覆盖必要范围，优先用宏、变量或目标段落等跨语言稳定的结构定位，并核对匹配次数。[区域挂点](docs/CN/Tools/Zones.md) · [源码补丁](docs/CN/Tools/Patches.md)
- 从调用方确定宏的注册和包装时机。修改公开接口时一起检查调用方、类型声明与默认行为，并同步中英文签名和示例。[SugarCube 宏](docs/CN/Macros.md)
- 由模块初始化自己拥有的状态。已发布存档需要转换结构时，通过 `maplebirch.tool.migration` 接入，步骤和版本判断放在 `src/migrations/`。[迁移接口](docs/CN/Tools/Migration.md)
- TypeScript 类用 `PascalCase`，方法和成员用 `camelCase`。自有存档内部字段和 Twee 临时变量用 `snake_case`，沿用已有的顶层命名空间和公开标识。局部用途明确时用短名。注释写在对应代码旁，交代锚点、时序或结算顺序的原因。

## 验证

`bun run verify` 检查类型、代码风格、文档示例和第三方许可声明。文档示例可单独用 `bun run docs:check` 验证。涉及对外类型时，用 `bun run types:pack` 核对类型包的内容。

- 改启动、注册或加载顺序时，在实际调用该功能的模组里测一次冷启动和读档后的首次调用。改源码补丁时，确认目标命中后，从原版入口走到受影响的分支。
- 改存档或结算时，用新档和已有存档走一遍，检查初始化、读档和再次触发。改分支适配时，在对应分支和原版各复测受影响的入口。

## 提交与反馈

报错时附 DoL、ModLoader、框架及相关模组版本、加载顺序和复现步骤。框架设置里的「复制诊断」可带上加载和补丁记录。[反馈与讨论](README.md#反馈与讨论)

提交 PR 时交代原先的问题、涉及的接口或加载阶段，以及实际跑过的检查。可以独立验证的改动分开提交，便于逐项查阅。

仓库 CI 还会构建类型包、生成 ZIP 并检查包内容。[CI 工作流](.github/workflows/ci.yml)
