# Agent 使用文档 — MovieTracker

## 角色定义
你是我的编程导师。我是一个计算机专业学生，有一定基础但缺乏实战经验。请用耐心、教学式的风格与我交流，解释关键技术决策的原因。

## 项目概况
「MovieTracker」是一个全栈电影管理网站（React + Express + SQLite），定位为**用户可交互的电影平台**：

- 🕷️ 从豆瓣网爬取 15 个标签分类的电影数据，**以 douban_id 去重**
- 🔍 搜索排名：名称/导演模糊搜索 → 豆瓣评分 + 四维排名
- ✅ 用户操作：**统一进度状态**（想看/在看/已看）、自主打分(1-10)、写影评
- 📋 **自定义清单**：创建多个清单，从任意页面添加电影，清单内管理观影状态（与全局进度双向同步）
- 📊 双维度分析看板：全站统计 + 个人观影分析
- 🎨 **暗色主题**：午夜蓝紫灰底色（`#1c1c28`），毛玻璃导航，三强调色系统

## 技术偏好
- **端口**：前端 3000，后端 3001（不使用 Vite 默认 5173）
- **质量优先**：宁可多花时间确保代码正确
- **错误处理**：所有网络请求、文件操作必须有 try-catch
- **数据去重**：以 douban_id 作为唯一键 `CREATE UNIQUE INDEX IF NOT EXISTS idx_items_douban_id ON items(douban_id)`

---

## 项目结构（v2 — 用户版）

```
movie-book-tracker/
├── server/
│   ├── index.js              # Express 入口（端口 3001，keepAliveTimeout=0 防退出）
│   ├── db.js                 # SQLite 初始化 + 自动增量迁移（PRAGMA 检测已存在列则跳过）
│   ├── scraper.js            # 豆瓣爬虫 v2（/j/search_subjects + /j/subject_abstract）
│   ├── data.db               # SQLite 数据库（WAL 模式）
│   └── routes/
│       ├── items.js          # 电影 CRUD + 搜索排名 + 用户操作 API
│       └── analytics.js      # 全站分析 + 个人分析 API（拆分多值字段聚合）
├── client/
│   └── src/
│       ├── App.jsx           # 根组件：吸顶导航（毛玻璃）+ 6 条路由
│       ├── App.css           # 全局样式：CSS 变量 + 用户操作区 + 个人主页
│       ├── api.js            # Axios API 封装（9 个导出函数）
│       ├── main.jsx          # React 入口
│       └── pages/
│           ├── Search.jsx    # 电影搜索页：自动搜索 + 排名展开 + 用户快捷操作
│           ├── List.jsx      # 电影清单页：卡片网格 + 筛选/排序 + 用户操作（已看/进度/评分）
│           ├── AddEdit.jsx   # 添加/编辑表单
│           ├── Analytics.jsx # 全站数据分析看板（ECharts 6 图 + 概览卡片 + 高分榜）
│           └── Profile.jsx   # 🆕 个人主页：观影概览 + 个人分析图表 + 影评列表 + Tab 切换
└── README.md                 # 用户向文档
```

---

## 数据库 Schema（items 表完整字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 自增主键 |
| name | TEXT | 电影名称 |
| type | TEXT | 'movie' / 'tv' / 'book'（CHECK 约束） |
| category | TEXT | 分类，多值用 "/" 分隔，如 "剧情/喜剧/家庭" |
| tags | TEXT | JSON 数组字符串，如 '["经典","烧脑"]' |
| director | TEXT | 导演，多值用 ", " 分隔，如 "张三, 李四" |
| year | INTEGER | 年份 |
| rating | INTEGER | **用户自主评分** (1-10) |
| review | TEXT | **用户影评** |
| date | TEXT | 日期 |
| poster | TEXT | 海报 URL |
| summary | TEXT | 简介 |
| created_at | DATETIME | 创建时间 |
| douban_id | TEXT | 豆瓣 ID（UNIQUE INDEX） |
| douban_rating | REAL | 豆瓣评分 |
| douban_votes | INTEGER | 豆瓣评价数 |
| regions | TEXT | 地区 |
| languages | TEXT | 语言 |
| actors | TEXT | 演员 |
| watched | INTEGER | 🆕 已看标记（0/1，DEFAULT 0） |
| watch_progress | TEXT | 🆕 观看进度（''/'想看'/'在看'/'已看'） |

### 迁移策略
`db.js` 使用 `migrate(colName, colDef)` 函数，通过 `PRAGMA table_info` 检测列是否存在，不存在才 `ALTER TABLE ADD COLUMN`。可安全重复运行，不会因重复添加而报错。

---

## API 接口完整清单

### 电影 CRUD
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items?type=&search=&sort=&watched=&has_review=&limit=&offset=` | 分页列表，返回 `{ items, total }` |
| GET | `/api/items/:id` | 详情 |
| POST | `/api/items` | 新增 |
| PUT | `/api/items/:id` | 更新（支持 rating/review/watched 等所有字段） |
| DELETE | `/api/items/:id` | 删除 |

**分页参数**：`limit`（每页条数）、`offset`（偏移量）。不传则返回全部。
**筛选参数**：`watched=0\|1`、`has_review=1`（仅返回有影评的条目）。

### 搜索与排名
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/items/search?q=` | 豆瓣搜索（模糊匹配名称/导演），返回 50 条 + 简要排名 |
| GET | `/api/items/:id/ranking` | 详细四维排名（总/同年/同类型/同导演） |

### 用户操作 🆕
| 方法 | 路径 | 说明 |
|------|------|------|
| PATCH | `/api/items/:id/watched` | 标记已看 `{ watched: 0\|1 }` |
| PATCH | `/api/items/:id/progress` | 更新进度 `{ progress: ""\|"想看"\|"在看"\|"已看" }` |

### 数据分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analytics/all` | 全站分析（6 图表 + 概览） |
| GET | `/api/analytics/personal/all` | 🆕 个人分析（含评分分布/分类/导演/进度饼图/vs豆瓣散点/年份/地区/演员/评分档位） |
| GET | `/api/analytics/rating-distribution` | 评分分布 |
| GET | `/api/analytics/avg-by-category` | 分类平均分（按 "/" 拆分聚合） |
| GET | `/api/analytics/avg-by-director` | 导演平均分 Top10（按 ", " 拆分聚合） |
| GET | `/api/analytics/avg-by-year` | 年份平均分趋势 |
| GET | `/api/analytics/timeline` | 月度观看量 |
| GET | `/api/analytics/tag-preference` | 标签偏好（雷达图数据） |
| GET | `/api/analytics/summary` | 概览统计 |

**个人分析额外字段**（`/personal/all`）：
- `progressDistribution` — 观看进度饼图数据（想看/在看/已看）
- `userVsDouban` — 我的评分 vs 豆瓣评分散点数据
- `yearDistribution` — 观影年份分布柱状图
- `regionDistribution` — 地区分布（拆分 "/"）
- `actorPreference` — 演员频次 Top15（拆分 ", "）
- `ratingTiers` — 评分档位：`{ high: ≥8, mid: 5-7, low: ≤4 }`

---

## 数据分析多值字段拆分 🔧

### 问题
原始数据中 `category = "剧情/喜剧/家庭"`、`director = "张三, 李四"`。旧版 SQL 直接 `GROUP BY category` 把整个字符串当作一个分类处理，导致 "剧情/喜剧/家庭" 作为一个独立项统计，而不是拆成 "剧情"、"喜剧"、"家庭" 三个独立分类。

### 解决方案
在 `analytics.js` 中新增 `splitAggregate()` 工具函数：

```js
function splitAggregate(rows, field, delimiter, scoreField) {
  // 1. 遍历每行，按 delimiter 拆分 field
  // 2. 将每个独立值关联的评分存入 map
  // 3. 计算每个独立值的平均分和样本数
  // 4. 按平均分降序排列
}
```

应用：
- **category**：按 `"/"` 拆分 → 每个独立分类各自计算平均分
- **director**：按 `", "` 拆分 → 每个独立导演各自计算平均分
- **tags**：按 `"/"` 拆分 → JSON 数组中的标签如有 "/" 也拆分

### 影响范围
- `GET /api/analytics/all` — `avgByCategory`、`avgByDirector`、`tagPreference`
- `GET /api/analytics/personal/all` — 同上
- 各独立端点（`/avg-by-category`、`/avg-by-director`、`/tag-preference`）

---

## 前端路由与组件树

```
App (吸顶导航 + <Routes>)
├── /search     → Search.jsx    搜索页（自动搜索 + 排名面板 + 用户快捷操作）
├── /           → List.jsx      清单页（筛选/排序 + 卡片网格 + 用户操作）
├── /add        → AddEdit.jsx   添加条目
├── /edit/:id   → AddEdit.jsx   编辑条目
├── /analytics  → Analytics.jsx 全站分析看板
└── /profile    → Profile.jsx   🆕 个人主页（Tab: 个人分析 | 我的影评）
```

### 前端 API 封装（client/src/api.js）

```js
fetchItems(params)          // 列表 → GET /api/items
fetchItem(id)               // 详情 → GET /api/items/:id
createItem(data)            // 新增 → POST /api/items
updateItem(id, data)        // 更新 → PUT /api/items/:id
deleteItem(id)              // 删除 → DELETE /api/items/:id
fetchAnalytics()            // 全站分析 → GET /api/analytics/all
searchItems(q)              // 搜索 → GET /api/items/search?q=
fetchItemRanking(id)        // 排名 → GET /api/items/:id/ranking
toggleWatched(id, watched)  // 🆕 已看 → PATCH /api/items/:id/watched
setProgress(id, progress)   // 🆕 进度 → PATCH /api/items/:id/progress
fetchPersonalAnalytics()    // 🆕 个人分析 → GET /api/analytics/personal/all
```

---

## 豆瓣爬虫（scraper.js）

### 爬取策略
- **数据源**：豆瓣 API（`/j/search_subjects` 列表 + `/j/subject_abstract` 详情）
- **标签覆盖**：15 个标签 × 每标签最多 10 页 × 每页 20 部 = 最多 3000 部
- **去重**：内存 `Set<doubanId>` + 数据库 UNIQUE INDEX
- **限流**：列表请求间隔 1000ms，详情请求间隔 600ms
- **熔断**：连续 30 次详情请求失败自动停止

### 增量更新
爬虫写入时使用 UPSERT 模式：已存在的电影只更新豆瓣评分等字段，不覆盖用户数据（rating/review/watched/watch_progress 等用户字段不会被覆盖）。

---

## 前端样式系统（App.css）

### CSS 变量
```css
--primary: #5470c6;  /* 主色（蓝紫） */
--danger: #ee6666;   /* 危险色（红） */
--bg: #f5f6fa;       /* 页面背景 */
--card-bg: #fff;     /* 卡片背景 */
--text: #333;        /* 主文字 */
--text-light: #888;  /* 辅助文字 */
--border: #e0e0e0;   /* 边框 */
--radius: 8px;       /* 圆角 */
```

### 🆕 用户操作区样式
- `.user-actions` — 已看按钮 + 进度下拉 + 评分星星的 flex 容器
- `.watched-btn.watched` — 已看状态：绿色背景 `#e8f5e9`
- `.progress-select.want / .watching / .watched-tag` — 进度颜色：橙/蓝/绿
- `.quick-rate .star` — 评分星星：灰色默认 → `#f5a623` 金色激活
- `.navbar` — 吸顶 `position: sticky` + 毛玻璃 `backdrop-filter: blur(12px)`

### 响应式
- `@media (max-width: 700px)`：导航栏纵向排列，图表单列，概览卡片 3 列

---

## 启动与运行

```bash
# 后端
cd server && npm start          # → http://localhost:3001

# 前端
cd client && npm run dev        # → http://localhost:3000

# 爬虫（独立运行）
cd server && node scraper.js    # 首次约 30 分钟爬 ~3000 部
```

---

## 改动历史

### 2026-05-31（最近）
1. **暗色主题移植**：从 Todo Kanban 设计系统（`style.md`）完整移植暗色主题到 MovieTracker。午夜蓝紫灰底色 `#1c1c28`，毛玻璃导航，卡片 hover 上浮辉光，三强调色（青/橙/金）系统
2. **自定义清单系统**：`lists` + `list_items` 表，8 个 API 端点，清单管理页 + 详情页（表格视图含观影状态），Search/List 卡片「加到清单」下拉
3. **清单-全局进度双向同步**：清单内改状态 → 全局同步，全局改状态 → 所有清单同步，添加时自动复制当前进度
4. **清单详情页内搜索添加**：可直接搜索电影并添加到当前清单
5. **统一电影状态**：移除独立的「已看/未看」按钮，统一为「进度下拉」（想看/在看/已看），`watched` 字段由进度自动推导
6. **Profile 8 卡片全部可点击**：新增 `progress`/`rating_min`/`rating_max`/`has_interaction` 后端筛选参数
7. **UI 优化**：10 星评分完整显示（11px），用户操作栏 flex-wrap

### 2026-05-31（早期）
1. 数据库迁移：`watched` + `watch_progress` 字段
2. 用户操作 API + 个人分析 API
3. 多值字段拆分（category/director/tags）
4. 性能优化：分页、懒加载、乐观更新

## 注意事项

- **Express 5** 在 Node 24 下可能自动退出 → `index.js` 中设 `server.keepAliveTimeout = 0` + `process.stdin.resume()` 来保持进程存活
- **数据库迁移**使用 PRAGMA 检测，可安全重复运行
- **爬虫写入**不会覆盖用户字段（rating/review/watched/watch_progress）
- **个人分析**指标使用 `rating`（用户自己的打分），全站分析使用 `COALESCE(douban_rating, rating)`（优先豆瓣评分）
