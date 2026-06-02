# Server — 后端

Express 5 + SQLite (better-sqlite3) + multer，端口 3001

## 目录结构

```
server/
├── index.js                     # Express 入口：中间件 + 路由挂载 + 图片代理
├── db.js                        # SQLite 初始化 + 自动增量迁移（PRAGMA 检测）
├── data.db                      # 数据库文件（2243 部电影，已纳入 Git）
├── scraper.js                   # 豆瓣爬虫（/j/search_subjects + /j/subject_abstract）
├── scrape-summaries.js          # 简介爬虫（Puppeteer + Cookie 登录版）
├── scrape-summaries-only.js     # 简介爬虫（纯 HTTP 版，需手动 Edge Cookie 导出）
├── douban-cookies.json          # Cookie 文件（不入 Git）
├── uploads/                     # 附件上传目录
├── routes/
│   ├── items.js                 # 电影 CRUD + 搜索排名 + 用户操作 + 批量操作
│   ├── lists.js                 # 自定义清单（8 端点，进度双向同步）
│   └── analytics.js             # 全站分析 + 个人分析（多值字段拆分聚合）
├── controllers/                 # (无 — 逻辑在 routes 中)
└── models/                      # (无 — 使用 better-sqlite3 直接操作)
```

## 数据库表

### items（电影，14+ 字段）
`id, name, type, category, tags, director, year, rating, review, date, poster, summary, douban_id, douban_rating, douban_votes, regions, languages, actors, watched, watch_progress`

### lists（清单）
`id, name, description, created_at`

### list_items（清单-电影关联）
`id, list_id(FK), item_id(FK), watch_progress, added_at` — UNIQUE(list_id, item_id)

## API 端点

### 电影 — `/api/items`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 列表，支持 year/category/sort/progress/rating_min/rating_max/has_interaction/limit/offset |
| GET | `/:id` | 详情 |
| POST | `/` | 新增 |
| PUT | `/:id` | 更新 |
| DELETE | `/:id` | 软删除 |
| PATCH | `/:id/progress` | 更新进度（同步到所有清单） |
| PATCH | `/:id/watched` | 标记已看 |
| PATCH | `/batch/progress` | 批量设进度 `{ ids, progress }` |
| GET | `/search?q=` | 豆瓣搜索 + 简要排名 |
| GET | `/:id/ranking` | 四维排名 |

### 清单 — `/api/lists`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 所有清单 |
| POST | `/` | 创建 `{ name, description }` |
| PUT | `/:id` | 更新 |
| DELETE | `/:id` | 删除 |
| GET | `/:id/items` | 清单内电影（JOIN items） |
| POST | `/:id/items` | 添加电影 `{ item_id }`（自动复制进度） |
| POST | `/:id/items/batch` | 批量添加 `{ item_ids }` |
| DELETE | `/:id/items/:itemId` | 移除 |
| PATCH | `/:id/items/:itemId/progress` | 更新进度（同步到全局） |

### 分析 — `/api/analytics`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/all` | 全站分析 |
| GET | `/personal/all` | 个人分析（含评分档位/进度饼图/vs豆瓣散点等） |

### 图片代理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/proxy-image?url=` | 代理豆瓣图片（伪装 Referer + UA，绕过防盗链） |

## 爬虫

### scraper.js — 主爬虫
- 数据源：豆瓣 JSON API
- 15 标签 × 10 页 × 20 部 ≈ 3000 部
- 限流 1000ms/600ms，熔断 30 次

### scrape-summaries-only.js — 简介爬虫
- 需手动从 Edge 导出 Cookie 到 `douban-cookies.json`
- 每次 Cookie 约持续 300 部（~2.5 分钟）
- 当前状态：✅ 2240/2243 已完成

## 启动

```bash
cd server && npm install && npm start
# → http://localhost:3001
```
