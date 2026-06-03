# Cloud Save Services

## Go + SQLite

```powershell
bun run cloud:go
```

可选配置：

```text
cloud-services/go-sql-server/config.json
```

## Cloudflare Worker + R2 + D1

```powershell
bun run cloud:r2 r2 bucket create dol-cloud-save
bun run cloud:r2 d1 create dol-cloud-save-db
```

把 D1 的 `database_id` 填进：

```text
cloud-services/cloudflare-webdav-worker/wrangler.toml
```

初始化并部署：

```powershell
bun run cloud:r2 d1 migrations apply dol-cloud-save-db --remote
bun run cloud:r2 deploy
```

Worker 地址会写入：

```text
cloud-services/cloudflare-webdav-worker/worker-url.txt
```

## Admin UI

```powershell
bun run cloud:admin
```
