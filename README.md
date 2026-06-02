# 🎬 MovieTracker

全栈电影管理网站 — 豆瓣数据 + 用户交互 + 数据分析

## ✨ 功能总览

### 📚 电影库（2243 部，含简介）
- 从豆瓣自动爬取 15 个标签的电影数据，douban_id 去重
- 豆瓣评分、导演、演员、地区、简介 等完整信息
- 搜索 + 四维排名（总排名 / 同年 / 同类型 / 同导演）

### 👤 用户操作
- **统一进度状态**：想看 / 在看 / 已看（进度下拉，`watched` 自动推导）
- **1-10 星评分**：独立于豆瓣的用户自主评分
- **写影评**：每部电影可撰写个人短评

### 📋 自定义清单
- 创建多个清单（名称 + 描述），从任意页面添加电影
- 清单内表格视图，含观影状态管理
- **进度双向同步**：清单内改状态 → 全局同步，反之亦然

### 📊 数据分析（ECharts 暗色主题）
- **全站分析**：评分分布 / 分类偏好 / 导演 Top10 / 年份趋势 / 地区分布
- **个人分析**：8 张统计卡片可点击跳转 + 8 个图表（含进度饼图、vs 豆瓣散点图等）

### 🎨 暗色主题
- 午夜蓝紫灰底色 `#1c1c28`，Inter 字体，毛玻璃导航
- 三强调色：青（主色）/ 橙（危险）/ 金（评分）
- 图片代理绕过豆瓣防盗链，失败自动 fallback 🎬

### 🛠 其他
- **电影详情页**：大海报 + 完整信息 + 四维排名 + 影评编辑
- **批量操作**：多选卡片 → 批量设进度 / 加清单
- **年份 + 分类筛选**：12 种分类 + 年份精确匹配 + 用户/豆瓣双评分排序

## 🚀 快速启动

```bash
git clone git@github.com:Pudd1ng1230/2026-05-28-movie-book-tracker.git
cd 2026-05-28-movie-book-tracker

cd server && npm install && cd ..
cd client && npm install && cd ..

# 终端1：后端（端口 3001）
cd server && npm start

# 终端2：前端（端口 3000）
cd client && npm run dev
```

数据库已包含 2243 部电影数据，无需额外爬取。如需更新数据：

```bash
cd server && node scraper.js
```

## 📂 项目结构

```
movie-book-tracker/
├── server/          # Express + SQLite 后端
├── client/          # React + Vite 前端
├── README.md        # 本文件
└── REASONIX.md      # AI 助手上下文
```

## 📖 详细文档

| 文档 | 内容 |
|------|------|
| [client/README.md](client/README.md) | 前端组件树、数据流、hooks、页面说明 |
| [server/README.md](server/README.md) | API 端点清单、数据库表结构 |
| [REASONIX.md](REASONIX.md) | 项目完整上下文（AI 助手用） |
