# Go + SQLite Cloud Save Server

这是云存档的自建后端示例。它提供账号、登录 token、云端槽位、存档码接口，数据保存到 SQLite。

SQLite 是一个“单文件 SQL 数据库”。运行后端后，会在本目录生成 `cloud-save.db`，里面主要有三类数据：

- `users`：账号、密码盐、密码哈希。
- `sessions`：登录会话、token 哈希、过期时间。
- `saves`：云存档槽位和加密后的 payload。

## 运行

在仓库根目录执行：

```powershell
bun run cloud:go
```

服务默认监听 `8787` 端口。游戏面板和浏览器里要填写的是“能访问到这台后端的完整 URL”，本机、局域网和公网部署时会不同。

健康检查：

```text
<后端 URL>/health
```

## 可选环境变量

后端配置优先级：

```text
默认值 < JSON 配置文件 < 环境变量
```

不传任何配置时，直接使用默认值。需要工程化部署时，可以复制示例配置：

```powershell
Copy-Item cloud-services\go-sql-server\config.example.json cloud-services\go-sql-server\config.json
cd cloud-services\go-sql-server
go run . -config config.json
```

`config.json` 示例：

```json
{
  "addr": ":8787",
  "dbPath": "./cloud-save.db",
  "sessionDays": 30
}
```

环境变量可以覆盖配置文件：

| 变量 | 默认值 | 作用 |
| --- | --- | --- |
| `CLOUD_SAVE_CONFIG` | 空 | JSON 配置文件路径。也可以用命令行 `-config` 指定。 |
| `CLOUD_SAVE_ADDR` | `:8787` | HTTP 监听地址。`:<端口>` 表示监听所有网卡；`<IP>:<端口>` 表示只监听指定地址。 |
| `CLOUD_SAVE_DB` | `./cloud-save.db` | SQLite 数据库文件路径。 |
| `CLOUD_SAVE_SESSION_DAYS` | `30` | 登录 token 有效天数。 |

PowerShell 示例：

```powershell
$env:CLOUD_SAVE_ADDR=':8787'
$env:CLOUD_SAVE_DB='./cloud-save.db'
$env:CLOUD_SAVE_SESSION_DAYS='30'
bun run cloud:go
```

启动日志会显示最终生效的配置：

```text
cloud save server listening on :8787, sqlite=./cloud-save.db, session_days=30
```

`config.json` 可以本地保留，不建议写真实部署路径后提交。仓库只提交 `config.example.json`。

## 游戏面板怎么填

- 地址：填写能访问到 Go 后端的完整 URL。
- 账号：自己起一个名字
- 密码：至少 8 位

第一次点“注册”，之后点“连接”。上传、下载、存档码功能都在游戏面板里操作。

## 数据安全

前端上传前会先用压缩 + AES-GCM 加密原版 IndexedDB 里的存档数据。Go 后端只保存加密后的 JSON，不知道存档明文。

密码既用于账号登录，也作为默认云存档加密口令。换密码后，旧云存档可能无法解密。

## SQL 大概是什么意思

建表：

```sql
CREATE TABLE IF NOT EXISTS users (...)
```

意思是“如果还没有 users 表，就创建它”。

插入账号：

```sql
INSERT INTO users (username, password_salt, password_hash, created_at)
VALUES (?, ?, ?, ?)
```

`?` 是参数占位符，Go 会把变量安全地填进去，避免直接拼字符串造成 SQL 注入。

覆盖云存档：

```sql
INSERT INTO saves (user_id, slot, updated_at, payload)
VALUES (?, ?, ?, ?)
ON CONFLICT(user_id, slot) DO UPDATE SET ...
```

意思是“如果这个账号的这个槽位不存在就新增；如果已经存在，就更新原来的那一行”。
