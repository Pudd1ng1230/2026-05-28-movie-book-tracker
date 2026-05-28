# 个人观影/阅读清单与评分分析

一个前后端分离的个人观影与阅读管理平台，支持录入、打分、短评，并提供多维度的数据分析看板。

## 快速启动

```bash
# 终端1 - 启动后端
cd server
npm start          # 运行在 http://localhost:3001

# 终端2 - 启动前端
cd client
npm run dev        # 运行在 http://localhost:5173
```

## 功能

### 清单管理
- 添加/编辑/删除影视或书籍条目
- 字段：名称、类型（电影/剧集/书籍）、分类、标签、导演/作者、年份、评分(1-10)、短评、日期、海报URL、简介
- 按名称搜索、按类型筛选、按评分/日期排序

### 数据分析看板
- 评分分布直方图
- 分类平均分对比（柱状图）
- 导演/作者平均分 Top10（柱状图）
- 年份平均分趋势（折线图）
- 月度观看/阅读量（柱状图）
- 标签偏好雷达图
- 概览卡片（总计、平均分、各类型数量、高分榜单）

## 技术方案

| 层级 | 技术 |
|------|------|
| 前端 | React (Vite) + ECharts + Axios + React Router |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |

## API 接口

### 条目 CRUD
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/items | 列表（支持 ?type=&category=&search=&sort=） |
| GET | /api/items/:id | 详情 |
| POST | /api/items | 新增 |
| PUT | /api/items/:id | 更新 |
| DELETE | /api/items/:id | 删除 |

### 数据分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/analytics/all | 全部分析数据 |

## 项目结构

```
movie-book-tracker/
├── client/              # React 前端 (Vite)
│   └── src/
│       ├── api.js           # Axios API 封装
│       ├── App.jsx          # 路由和布局
│       ├── App.css          # 全局样式
│       └── pages/
│           ├── List.jsx         # 清单页（搜索、筛选、卡片列表）
│           ├── AddEdit.jsx      # 添加/编辑表单页
│           └── Analytics.jsx    # 数据分析看板（ECharts）
├── server/              # Express 后端
│   ├── index.js             # 入口
│   ├── db.js                # SQLite 初始化和 Schema
│   └── routes/
│       ├── items.js         # 条目 CRUD
│       └── analytics.js     # 数据分析接口
└── README.md
```
