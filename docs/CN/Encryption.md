# 模组加密

框架本体不加密。该能力用于**依赖 maplebirch 的其它模组**的加密发行：把真实模组打包成加密壳 `.modpack`，壳在 ModLoader 的 `earlyload` 阶段向框架请求授权，验证通过后再解密并懒加载真实模组。

## 玩家侧流程

1. 在游戏中把 `.modpack` 载入 ModLoader。壳包只暴露壳 `boot.json`、earlyload 解密器和 `.crypt` 分片；原始 `boot.json`、`auth.json`、脚本与资源都进入加密 payload。
2. 首次加载时框架弹出授权输入框，请粘贴配套工具签发的授权凭证（形如 `maplebirch-auth.<payload>.<signature>`），或对应授权密码。
3. 框架用壳内嵌的公钥验证签名与 `subject`/`key` 匹配，并按 `auth.json` 的日期配置校验有效期。
4. 验证通过 → 解密真实模组并交给 ModLoader 懒加载；框架会把凭证加密记住（按 `subject:key` 存于本地 IndexedDB 的 `credentials` 库），之后不再重复询问。
5. 关闭输入框或验证失败 → 框架**禁用该加密模组**（避免半加载状态）；已记住的凭证在失效时会自动清除并要求重新输入。

## 作者侧：生成加密壳与授权凭证

加密壳与授权凭证由**配套工具**签发：

- [DOL Mod Protection Tools](https://github.com/MaplebirchLeaf/dol-mod-protection-tools)（完整配置说明以其仓库 README 为准）

`auth.json` 最小配置：

```json
{
  "key": "main",
  "publicKey": "BASE64_SPKI_PUBLIC_KEY"
}
```

可选字段：`subject`、`name`、`prompt`（弹窗文案）与 `date`。`date` 支持按 `period: "day" | "month"` 校验、`timezone`（时区）与 `graceDays`（宽限天数）。转换后 `auth.json` 不会明文留在壳包中。

## 有效期与失效处理

- 框架按 `auth.json` 中 `date` 声明的窗口（日/月、时区、宽限天数）校验凭证签发时间，不在窗口内视为无效。
- 凭证失效或更换授权时，框架会清除本地记住的旧凭证，回到弹窗输入流程。
- 校验失败/取消会让框架禁用该模组；如需恢复，重新验证成功后即可正常加载。
