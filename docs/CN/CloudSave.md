# 云存档

云存档用于把 **DoL 原版本地存档**（IndexedDB 槽位）同步到 **你自己的云端**。服务端不由框架托管：你只需要部署一个自己的 Cloudflare Worker + R2 桶，并配一个访问令牌即可使用。

## 工作原理

游戏内设置界面会新增一个「云存档」标签页。面板把本地槽位以 JSON 记录上传到 Worker；Worker 校验请求头 `Authorization: Bearer <token>` 通过后写入 R2：

- 槽位存档：`slots/<槽位>.json`
- 导出码：`save-code.json`

上传内容为导出记录（含 `slot`/`details`/`save`/`exportedAt`/`gameId`），是**明文 JSON**，框架不做业务层加密。请使用 HTTPS、足够随机的令牌并保持 R2 桶私有；需要端到端加密时请在 Worker 层自行实现。

## 部署自己的 Worker（一次性）

仓库根 `cloudflare/` 目录已提供可部署的 Worker（`worker.ts` + `wrangler.jsonc`）：

1. 安装并登录 wrangler：

   ```bash
   bunx wrangler login
   ```

2. 在 `cloudflare/` 目录创建 R2 桶（`wrangler.jsonc` 已声明绑定 `SAVE_BUCKET` → 桶名 `maplebirch-save`，可按需修改）：

   ```bash
   bunx wrangler r2 bucket create maplebirch-save
   ```

3. 设置访问令牌（必填 secret `MAPLEBIRCH_TOKEN`，请使用足够长的随机串）：

   ```bash
   bunx wrangler secret put MAPLEBIRCH_TOKEN
   ```

4. 部署：

   ```bash
   bunx wrangler deploy
   ```

部署完成后访问 `https://<worker名>.<你的子域>.workers.dev/health` 应返回 `{ "ok": true }`。

### Worker 端点

除 `/health` 外均要求请求头 `Authorization: Bearer <MAPLEBIRCH_TOKEN>`：

| 端点           | 方法               | 说明                       |
| :------------- | :----------------- | :------------------------- |
| `/health`      | GET                | 健康检查                   |
| `/saves`       | GET                | 远端槽位列表               |
| `/saves/:slot` | PUT / GET / DELETE | 上传 / 下载 / 删除指定槽位 |
| `/save-code`   | GET / PUT          | 读取 / 写入导出码          |

## 游戏内使用

1. 打开游戏设置 → 「云存档」标签页。
2. 填写：
   - **地址**：你的 Worker 地址，例如 `https://maplebirch-cloud-save.<你的子域>.workers.dev`
   - **访问令牌**：与 `MAPLEBIRCH_TOKEN` 一致
3. 点「连接」验证（会自动刷新远端列表），之后可：
   - **槽位**：选择本地槽位后上传；对远端槽位下载 / 删除（槽位 0 为自动存档，1–10 为手动槽位）
   - **导出码**：把当前存档或指定槽位生成一段导出码并上传到云端；也可下载云端导出码，或直接粘贴导入

## 注意事项

- 删除远端槽位**不可恢复**。
- 框架只记住 Worker 地址，不持久化令牌；页面刷新或重新启动游戏后需要重新填写并连接。请妥善保管令牌，泄漏等于任何人可读写你的云端存档。
