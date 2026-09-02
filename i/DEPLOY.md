# 部署指南：Vercel + Turso

目标：手机（健身房打卡）/ PC / Mac 访问同一个云端数据库，不再靠 git 倒 i.db。

代码已就绪：数据层是双模的——有 `TURSO_DATABASE_URL` 环境变量就走云端 SQLite，否则走本地 `data/i.db`。你只需要做账号配置，约 15 分钟。

## 第 1 步：Turso 建云数据库（5 分钟）

1. 打开 https://turso.tech 注册（可用 GitHub 登录），免费额度个人用不完
2. 安装 CLI 或用网页控制台建库，创建一个数据库，比如叫 `i-prod`
3. 拿到两样东西：
   - **Database URL**：形如 `libsql://i-prod-xxx.turso.io`
   - **Auth Token**：在数据库详情页点 "Generate Token"

## 第 2 步：push 代码 & 导入 Vercel（5 分钟）

```bash
git push   # 把最新代码推到远程
```

1. 打开 https://vercel.com 用 GitHub 登录
2. "Add New Project" → 导入 `growth-os` 仓库
3. **Root Directory 设为 `i`**（Next.js 项目在子目录，重要！）
4. 先别急着 Deploy，进入下一步配环境变量

## 第 3 步：配环境变量 & Deploy（5 分钟）

在 Vercel 项目的 Settings → Environment Variables 添加：

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | 第 1 步的 libsql:// 地址 |
| `TURSO_AUTH_TOKEN` | 第 1 步的 token |

然后 Deploy。完成后 Vercel 给你一个 `https://xxx.vercel.app` 域名，手机浏览器打开就能用（可以"添加到主屏幕"当 App 用）。

## 验证清单

- [ ] 手机打开域名 → 首页正常
- [ ] 重新生成一次健身计划（会写入云库）
- [ ] 记录页打卡一天 → 电脑上打开同一域名 → 能看到这条打卡

## 之后的用法

| 场景 | 数据库 |
|---|---|
| 线上（手机/任何设备访问 Vercel 域名） | Turso 云库，唯一数据源 |
| 本地 `npm run dev`（不配 TURSO 变量） | 本地 data/i.db，随便折腾不污染线上 |
| 本地想连线上数据 | 把两个变量写进 `.env.local` 即可（注意：改的是真数据） |

## 注意

- `.env.local` 已在 .gitignore，token 不会进仓库
- 旧的双机 git 同步 i.db 方式退休——数据以云库为准，i.db 只是本地开发副本
- 免费额度：Turso 9GB/每月 2500 万次读，Vercel hobby 个人项目免费，都够用
