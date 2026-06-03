# Cloudflare R2 WebDAV Worker

这是给云存档用的“轻量 WebDAV 模拟层”。它不实现完整 WebDAV，只实现框架当前需要的：

- `MKCOL`
- `PUT`
- `GET`
- `DELETE`
- `OPTIONS`

数据实际存进 Cloudflare R2。账号密码通过 Worker secret 保存，不写进代码。

## 目录结构

```text
src/
  worker.ts   # 请求入口和路由分发
  auth.ts     # Basic Auth 解析和校验
  http.ts     # CORS、通用 Response
  r2Store.ts  # URL 路径规范化和 R2 读写
  types.ts    # Worker 绑定类型
```

## 1. 准备 Cloudflare

1. 登录 Cloudflare。
2. 打开 `R2 Object Storage`。
3. 创建 bucket：

```text
dol-cloud-save
```

如果你想换名字，也要同步修改 `wrangler.toml` 里的 `bucket_name`。

也可以用命令创建：

```powershell
bun run cloud:r2 r2 bucket create dol-cloud-save
```

## 2. 安装依赖

```powershell
cd <仓库根目录>
bun install
```

Wrangler 已放在仓库根目录的 `devDependencies` 中，这个 Worker 子项目不单独维护依赖。

## 3. 登录 Wrangler

```powershell
bun run cloud:r2 login
```

浏览器会打开 Cloudflare 授权页面，允许即可。

## 4. 写入账号密码

这两个 secret 就是游戏云存档面板里填写的账号和密码。

本地测试用 `.dev.vars`：

```powershell
Copy-Item cloud-services\cloudflare-r2-webdav-worker\.dev.vars.example cloud-services\cloudflare-r2-webdav-worker\.dev.vars
```

然后打开 `cloud-services/cloudflare-r2-webdav-worker/.dev.vars`，把账号和密码改成你自己的。

部署到 Cloudflare 前，再写入远端 secret：

```powershell
bun run cloud:r2 secret put WEBDAV_USER
bun run cloud:r2 secret put WEBDAV_PASSWORD
```

命令会让你逐个输入值。

## 5. 本地试跑

```powershell
bun run cloud:r2 dev
```

本地试跑后，Wrangler 会在命令行打印可访问的 URL。游戏面板里填写那个 URL；如果换到局域网或线上 Worker，也填写对应的实际 URL。

游戏云存档面板填写：

- 地址：填写 Wrangler 打印的本地 URL，或部署后的 Worker URL。
- 账号：你写入的 `WEBDAV_USER`
- 密码：你写入的 `WEBDAV_PASSWORD`

点击“连接”。成功后再上传本地槽位。

## 6. 部署到 Cloudflare

```powershell
bun run cloud:r2 deploy
```

部署完成后会得到一个 Worker 地址，例如：

```text
https://dol-cloud-save-r2-webdav.<你的账号>.workers.dev
```

游戏云存档面板填写这个地址即可。

## 重要说明

- `/health` 会返回 404。这是故意的，避免框架把它误判成 Go + SQL 后端。
- Worker 只适配当前云存档数据结构，不适合当通用 WebDAV 网盘使用。
- 远端只能看到加密后的 JSON。密码既用于 Basic Auth，也用于云存档加密，所以换密码后旧存档无法解密。
- 这个目录是框架云存档的配套子项目，会提交到仓库；只有 `.dev.vars`、`.wrangler/` 等运行时私密文件会被忽略。
