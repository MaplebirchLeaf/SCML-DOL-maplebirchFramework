# Cloudflare R2 Worker

这是部署到 Cloudflare 的云存档后端。默认最多 5 个游戏云存档账户，可在 `wrangler.toml` 的 `MAX_USERS` 修改。

## 创建资源

```powershell
bun run cloud:r2 r2 bucket create dol-cloud-save
bun run cloud:r2 d1 create dol-cloud-save-db
```

把 D1 命令输出里的 `database_id` 填进 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "SAVE_DB"
database_name = "dol-cloud-save-db"
database_id = "这里填 database_id"
```

## 初始化数据库

```powershell
bun run cloud:r2 d1 migrations apply dol-cloud-save-db --remote
```

## 部署

```powershell
bun run cloud:r2 deploy
```

部署成功后，Worker URL 会写入：

```text
cloud-services/cloudflare-webdav-worker/worker-url.txt
```

## 游戏内填写

```text
地址：Worker URL
账号：自定义游戏云存档账号
密码：自定义游戏云存档密码，至少 8 位
```

第一次点“注册”，之后点“连接”。

## 本地调试

```powershell
bun run cloud:r2 dev
```

本地 D1 会放在 `.wrangler/`，不会提交。
