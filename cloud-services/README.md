# Cloud Save Services

这里是云存档的配套服务目录。它不是临时实验文件夹，而是框架云存档功能的一部分：游戏内云存档面板负责导出、压缩、加密和导入存档；这里的服务负责把加密后的数据保存到远端。

## 选哪个

`go-sql-server/`

适合学习后端、家庭局域网测试，或以后自建服务器。它是一个 Go + SQLite 服务，提供账号注册、登录、删除账户、槽位存档、存档码接口。数据会存在 SQLite 文件里。

`cloudflare-r2-webdav-worker/`

适合实际云同步。它用 Cloudflare Worker + R2 模拟框架需要的 WebDAV 子集，不需要自己长期运行电脑或服务器。它只实现 `MKCOL / PUT / GET / DELETE / OPTIONS`，不是通用网盘 WebDAV。

`admin-ui/`

适合本地调试和确认服务状态。它是一个 Vue + TypeScript 面板，可以检查 Go 后端、注册/登录、列出槽位，也可以测试 WebDAV/R2 的 `slots/` 和 `manifest.json`。

## 目录

```text
cloud-services/
  README.md
  go-sql-server/
    README.md
    config.go
    config.example.json
    main.go
    go.mod
    go.sum
  cloudflare-r2-webdav-worker/
    README.md
    wrangler.toml
    .dev.vars.example
    src/worker.ts
  admin-ui/
    README.md
    index.html
    vite.config.ts
    src/
```

## 根目录脚本

所有命令都从仓库根目录执行。

```powershell
bun run cloud:go
```

启动 Go + SQLite 后端。服务默认监听 `8787` 端口；游戏面板里的“地址”需要填写你实际访问它的 URL。

如果要使用配置文件：

```powershell
Copy-Item cloud-services\go-sql-server\config.example.json cloud-services\go-sql-server\config.json
cd cloud-services\go-sql-server
go run . -config config.json
```

```powershell
bun run cloud:r2 login
bun run cloud:r2 r2 bucket create dol-cloud-save
bun run cloud:r2 dev
bun run cloud:r2 deploy
```

登录 Cloudflare、创建 R2 bucket、本地运行 Worker、部署 Worker。

```powershell
bun run cloud:r2 secret put WEBDAV_USER
bun run cloud:r2 secret put WEBDAV_PASSWORD
```

给部署到 Cloudflare 的 Worker 写入 WebDAV Basic Auth 账号和密码。

```powershell
bun run cloud:admin
```

启动 Vue 管理面板。命令行会打印可访问的 URL；局域网访问时使用运行面板那台电脑的局域网 IP。

## 游戏面板怎么填

两种服务都使用游戏里的同一个云存档面板：

- 地址：Go 后端 URL、Worker URL，或其他 WebDAV URL
- 账号：Go 账号或 WebDAV Basic Auth 账号
- 密码：Go 密码或 WebDAV Basic Auth 密码

点击“连接”时，框架会请求 `/health` 判断地址是不是 Go 后端。Go 后端会返回健康检查；Worker 会故意让 `/health` 返回 404，让框架按 WebDAV 处理。

第一次使用 Go 后端时，需要先点“注册”。Cloudflare R2 Worker 不支持注册账号，账号密码来自 Worker secret 或本地 `.dev.vars`，直接点“连接”。

## 数据保存在哪里

Go + SQLite：

```text
cloud-services/go-sql-server/cloud-save.db
```

Cloudflare R2 Worker：

```text
R2 bucket: dol-cloud-save
```

WebDAV/R2 里会看到类似：

```text
manifest.json
slots/1.json
slots/2.json
save-code.json
```

这些 JSON 里保存的是加密后的 payload，不是原始存档明文。

## 安全边界

浏览器上传前会先处理存档：

```text
原版存档 -> JSON -> gzip 压缩 -> AES-GCM 加密 -> Base64 -> 远端 JSON
```

远端服务只保存密文。它不理解 SugarCube 存档结构，也看不到原始变量内容。

当前游戏面板里的“密码”同时用于：

- Go 登录密码，或 WebDAV Basic Auth 密码
- 云存档加密口令

所以换密码后，旧云存档可能无法解密。之后如果要做得更严谨，可以把“登录密码”和“加密口令”拆成两个输入。

## 不要提交的文件

这些是运行时数据或私密配置，已经写入仓库 `.gitignore`：

```gitignore
cloud-services/**/*.db
cloud-services/**/.dev.vars
cloud-services/**/.wrangler/
```

`.dev.vars.example` 可以提交，它只放示例值。

## 更多说明

- [Go + SQLite 后端](./go-sql-server/README.md)
- [Cloudflare R2 WebDAV Worker](./cloudflare-r2-webdav-worker/README.md)
- [Vue 管理面板](./admin-ui/README.md)
