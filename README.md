# 🎬 MovieTracker — 个人电影管理网站

一个全栈电影管理平台：从豆瓣自动爬取海量电影数据，用户可标记已看、自主打分、管理观看进度、撰写影评，并提供**全站数据**与**个人观影**双维度分析看板。

## ✨ 功能

### 电影库
- 🕷️ **豆瓣爬虫** — 自动抓取 15 个标签分类的电影数据（热门/高分/华语/欧美/科幻/悬疑…），以 douban_id 去重
- 🔍 **智能搜索** — 按名称/导演模糊搜索，展示豆瓣评分 + 多维度排名（总排名/同年/同类型/同导演）
- 📋 **电影清单** — 浏览全部爬取的电影，筛选/排序

### 用户交互
- ✅ **已看标记** — 一键标记/取消已看，卡片状态实时反馈
- ⭐ **自主打分** — 1-10 分快速评分（自己的分数，独立于豆瓣评分）
- 📌 **观看进度** — 想看 / 在看 / 已看，三状态管理
- 💬 **写影评** — 为看过的电影撰写短评

### 数据分析
- 📊 **全站分析** — 评分分布直方图、分类平均分、导演 Top10、年份趋势、月度观看量、标签雷达图
- 👤 **个人分析** — 专属数据看板：我的均分、高分榜、分类偏好、导演偏好、看过的年份趋势
- 📝 **影评列表** — 集中展示所有写过的影评

## 🏗️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite + ECharts + React Router |
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| 爬虫 | axios + 豆瓣 API（`/j/search_subjects` + `/j/subject_abstract`） |

## 🚀 快速启动

```bash
cd 2026-05-28-movie-book-tracker

# 安装依赖
cd server && npm install && cd ..
cd client && npm install && cd ..

# 终端1 — 启动后端（端口 3001）
cd server && npm start

# 终端2 — 启动前端（端口 3000）
cd client && npm run dev
```

- 前端：http://localhost:3000
- 后端 API：http://localhost:3001/api

## 🕷️ 爬取数据

```bash
cd server
node scraper.js
```

首次运行约 30 分钟可爬取 ~3000 部电影。

## 📂 项目结构

```
movie-book-tracker/
├── server/
│   ├── index.js              # Express 入口
│   ├── db.js                 # SQLite 初始化 + 自动迁移
│   ├── scraper.js            # 豆瓣爬虫
│   └── routes/
│       ├── items.js          # 电影 CRUD + 搜索排名 + 用户操作 API
│       └── analytics.js      # 全站分析 + 个人分析 API
├── client/
│   └── src/
│       ├── App.jsx           # 根组件 + 导航路由
│       ├── App.css           # 全局样式
│       ├── api.js            # Axios API 封装
│       └── pages/
│           ├── Search.jsx    # 电影搜索 + 排名
│           ├── List.jsx      # 电影清单 + 用户操作
│           ├── AddEdit.jsx   # 添加/编辑
│           ├── Analytics.jsx # 全站数据分析
│           └── Profile.jsx   # 个人主页 + 个人分析
└── README.md
```

## 📡 API 接口

### 电影
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items?type=&search=&sort=&watched=` | 电影列表 |
| GET | `/api/items/search?q=` | 豆瓣搜索 + 简要排名 |
| GET | `/api/items/:id/ranking` | 电影详细排名 |
| POST | `/api/items` | 新增电影 |
| PUT | `/api/items/:id` | 更新电影 |
| DELETE | `/api/items/:id` | 删除电影 |

### 用户操作
| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/api/items/:id/watched` | 标记/取消已看 `{ watched: 0|1 }` |
| PATCH | `/api/items/:id/progress` | 更新观看进度 `{ progress: "想看"|"在看"|"已看" }` |

### 数据分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analytics/all` | 全站分析 |
| GET | `/api/analytics/personal/all` | 个人分析（已标记/打分/写评的电影） |
