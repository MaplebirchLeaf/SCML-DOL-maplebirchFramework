# Go + SQLite Cloud Save Server

这是云存档的自建后端示例，适合本机、家庭局域网或自有服务器使用。

## 启动

在仓库根目录执行：

```powershell
bun run cloud:go
```

服务默认监听 `8787` 端口。浏览器或游戏面板里要填写的是“能访问到这台后端的完整 URL”。

健康检查：

```text
<后端 URL>/health
```

成功时返回：

```json
{ "ok": true }
```

## 游戏面板怎么填

```text
地址：Go 后端 URL
账号：自己起一个名字
密码：至少 8 位
```

账号规则：

```text
3-40 位，只允许 a-z、0-9、_、-
```

第一次点“注册”，注册成功后会自动登录。之后再打开面板时，可以直接点“连接”。上传、下载、存档码功能都在游戏面板里操作。

## PowerShell 快速测试

健康检查：

```powershell
Invoke-RestMethod -Uri "<后端 URL>/health"
```

注册：

```powershell
$endpoint = "<后端 URL>"
$body = @{ username = "test_user"; password = "password123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$endpoint/auth/register" -ContentType "application/json" -Body $body
```

读取远端槽位：

```powershell
Invoke-RestMethod -Uri "$endpoint/saves" -Headers @{ Authorization = "Bearer $($auth.token)" }
```

删除测试账号：

```powershell
Invoke-RestMethod `
  -Method Delete `
  -Uri "$endpoint/auth/account" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $($auth.token)" } `
  -Body (@{ password = "password123" } | ConvertTo-Json)
```

## 配置

默认读取：

```text
cloud-services/go-sql-server/config.json
```

复制示例配置：

```powershell
Copy-Item cloud-services\go-sql-server\config.example.json cloud-services\go-sql-server\config.json
```

`config.json` 示例：

```json
{
  "addr": ":8787",
  "dbPath": "./cloud-save.db",
  "sessionDays": 30
}
```

也可以临时指定其它配置文件：

```powershell
cd cloud-services\go-sql-server
go run . -config my-config.json
```

字段说明：

| 字段 | 默认值 | 作用 |
| --- | --- | --- |
| `addr` | `:8787` | HTTP 监听地址。`:<端口>` 表示监听所有网卡；`<IP>:<端口>` 表示只监听指定地址。 |
| `dbPath` | `./cloud-save.db` | SQLite 数据库文件路径。 |
| `sessionDays` | `30` | 登录 token 有效天数。 |

启动日志会显示最终生效的配置：

```text
cloud save server listening on :8787, sqlite=./cloud-save.db, session_days=30
```
