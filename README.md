# Voice Clone

基于 Fish Audio 的本地声音克隆与文本转语音工具。单人使用，数据保存在本机。

- Next.js 16（App Router）+ TypeScript + React 19
- Tailwind CSS v4 + shadcn/ui
- SQLite（better-sqlite3 + Drizzle ORM）

## 功能

- 上传音频样本，创建可复用的克隆声音（Fish `POST /model`）
- 使用克隆声音合成语音（Fish `POST /v1/tts`）
- 声音状态自动轮询（`created` → `training` → `trained` / `failed`）
- 生成记录保存在 SQLite，音频文件保存在 `data/audio/`

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env.local
# 编辑 .env.local，填入 FISH_API_KEY

# 3. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

首次启动会自动创建 `data/app.db` 和 `data/audio/`，并自动执行 `drizzle/` 中尚未应用的迁移。

## 生产运行（本地）

```bash
npm run build
npm start -- -H 127.0.0.1
```

## 数据库迁移

Schema 的唯一来源是 `src/db/schema.ts`。修改表结构后：

```bash
npm run db:generate   # 生成 drizzle/000X_*.sql
npm run db:studio     # 可选：打开可视化查看数据
```

把 `drizzle/` 下的新文件一并保留；应用启动时会自动执行未应用的迁移。
`drizzle.config.ts` 会显式加载 `.env.local`，因此 `DATA_DIR` / `DATABASE_PATH`
在应用和 drizzle-kit 中指向同一个数据库。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `FISH_API_KEY` | 是 | Fish Audio API Key，只在服务端使用 |
| `DATA_DIR` | 否 | 数据目录，默认 `./data` |
| `DATABASE_PATH` | 否 | SQLite 文件路径，默认 `./data/app.db` |

## 目录结构

```
src/
  app/
    page.tsx                 语音合成页
    voices/page.tsx          声音库页
    api/voices/route.ts      创建/列出声音
    api/voices/[id]/route.ts 查询/更新/删除声音
    api/voices/[id]/status/  轮询 Fish 训练状态
    api/tts/route.ts         合成语音
    api/audio/[id]/route.ts  播放音频（支持 Range）
  components/                UI 组件
  db/                        Drizzle schema 与连接
  lib/fish/                  Fish Audio 客户端
  lib/storage.ts             音频文件存储
data/                        SQLite 与音频文件（已 gitignore）
```

## 说明

- 克隆与合成在 Fish Audio 云端完成，音频与文本会上传到 Fish Audio。
- 开发时默认使用免费的 `s2.1-pro-free`，生产建议改用 `s2.1-pro`。
- 只克隆你有权使用的声音。
- 默认只监听本机；不要随意绑定 `0.0.0.0` 暴露到局域网。
