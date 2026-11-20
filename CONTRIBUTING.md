# 代码组织

- `src/modules/` 保存模块状态和生命周期。模块负责填充自己拥有的默认值。
- `src/services/` 负责启动、注册和存储流程。`AddonPlugin/Files.ts` 负责读取和执行模组启动脚本。`src/host/` 接入原版、SugarCube 和 ModLoader。
- `src/modules/Frameworks/` 保存通用工具。`src/modules/DoL/` 保存 DoL 专用工具和原版补丁，`src/compat/` 保存分支适配，`src/twee/` 保存段落和宏。
- `src/migrations/` 保存存档结构转换和对应的版本判断。公开迁移入口为 `maplebirch.tool.migration`。

## 命名与注释

- TypeScript 类用 `PascalCase`，方法和接口成员用 `camelCase`。内部存档字段及自有 Twee 临时变量用 `snake_case`。保留顶层存档命名空间、原版变量和公开接口。
- 入口函数沿用模块或文件名，例如 `Achievements`。入口按运行顺序列出调用。
- 对象或文件已说明用途时，可用 `config`、`queue` 这样的短名。反复访问同一个深层对象时，先取局部引用。
- 注释说明代码看不出的原因，例如原版锚点、注册时机或结算顺序。文件路径由目录表达，关键限制写在对应代码旁。

## 校验

使用仓库的 Oxfmt 规则。提交前运行 `bun run verify` 和 `bun run build`。
