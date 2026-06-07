# Cloud Admin UI

这是云存档服务的 Vue 调试面板。它只用于本地管理和联调，不会进入游戏包。

## 启动

在仓库根目录运行：

```powershell
bun run cloud:admin
```

启动后，Vite 会在命令行打印可访问的 URL。局域网访问时使用运行面板电脑的局域网 IP。

## 能做什么

- Go + SQLite：健康检查、注册、登录、列出远端槽位。
- WebDAV / Cloudflare R2 Worker：初始化 `slots/`，读取 `manifest.json`。
- 保存地址和账号到浏览器 localStorage。
- 密码只保存在当前页面内存中，刷新后会清空。

## 注意

这个面板不负责解密存档，也不读取游戏本地 IndexedDB。真正上传/下载存档仍然在游戏云存档面板里完成。
