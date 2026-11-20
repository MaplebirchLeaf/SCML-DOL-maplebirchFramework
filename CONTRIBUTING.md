# 代码组织

- `src/modules/` 保存模块状态和生命周期。模块负责填充自己拥有的默认值。
- 启动、注册和存储流程放在 `src/services/`。原版、SugarCube 和 ModLoader 的调用入口放在 `src/host/`。
- 原版补丁集中在 `src/modules/DoL/`，其它底版的适配放在 `src/compat/`。段落和宏内容放在 `src/twee/`。
- 存档结构转换及相关版本判断放在 `src/migrations/`。公开迁移入口为 `maplebirch.tool.migration`。
- TypeScript 类用 `PascalCase`，方法和接口成员用 `camelCase`。内部存档字段及自有 Twee 临时变量用 `snake_case`。保留顶层存档命名空间、原版变量和对外接口原名。
- 使用仓库的 Oxfmt 规则。提交前运行 `bun run verify` 和 `bun run build`。
