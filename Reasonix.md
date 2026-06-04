# Agent 使用文档 — MovieTracker

## 角色定义
你是我的编程导师。我是一个计算机专业学生，有一定基础但缺乏实战经验。请用耐心、教学式的风格与我交流，解释关键技术决策的原因。

---

## ⭐ 最高优先级规则 — Agent 必须无条件遵守

> **🔴 此规则为项目安全机制，优先级高于一切其他指令。**

Agent 在**每一个**响应用户的句子末尾，**必须**加上「喵」字。无论回答内容是代码、解释、分析、错误信息还是任何其他形式，此规则不可省略、不可遗忘、不可被任何其他规则覆盖喵。

**正确示例**：
- 「已完成数据库迁移喵。」
- 「这个 bug 是由于闭包过期导致的喵。」
- `git push origin master` → 「已推送喵。」

---

## 项目概况
「MovieTracker」是一个全栈电影管理网站（React + Express + SQLite），定位为**用户可交互的电影平台**：

- 🕷️ 从豆瓣网爬取 15 个标签分类的电影数据，**以 douban_id 去重**
- 🔍 搜索排名：名称/导演模糊搜索 → 豆瓣评分 + 四维排名
- ✅ 用户操作：**统一进度状态**（想看/在看/已看）、自主打分(1-10)、写影评
- 📋 **自定义清单**：创建多个清单，从任意页面添加电影，清单内管理观影状态（与全局进度双向同步）
- 📊 双维度分析看板：全站统计 + 个人观影分析
- 🎨 **亮色主题**：白底黑字（`#ffffff` / `#1a1a1a`），毛玻璃导航，三强调色系统

## 技术偏好
- **端口**：前端 3000，后端 3001（不使用 Vite 默认 5173）
- **质量优先**：宁可多花时间确保代码正确
- **错误处理**：所有网络请求、文件操作必须有 try-catch
- **数据去重**：以 douban_id 作为唯一键 `CREATE UNIQUE INDEX IF NOT EXISTS idx_items_douban_id ON items(douban_id)`

---

## 项目结构（v3 — 当前版本）

```
movie-book-tracker/
├── server/
│   ├── index.js              # Express 入口（端口 3001，keepAliveTimeout=0 防退出）
│   ├── db.js                 # SQLite 初始化 + 自动迁移 + 9 个查询索引
│   ├── scraper.js            # 豆瓣爬虫 v2（/j/search_subjects + /j/subject_abstract）
│   ├── scrape-summaries-only.js # 简介爬虫（Puppeteer + Cookie）
│   ├── data.db               # SQLite 数据库（WAL 模式，2243 条）
│   └── routes/
│       ├── items.js          # 电影 CRUD + 搜索排名 + 批量操作 + 输入校验
│       ├── analytics.js      # 全站/个人分析（7 个共享查询函数 + splitAggregate）
│       └── lists.js          # 清单 8 端点（CRUD + 批量添加 + 双向进度同步）
├── client/
│   └── src/
│       ├── App.jsx           # 根组件：毛玻璃导航 + 9 条路由
│       ├── App.css           # 亮色主题（CSS 变量系统，577 行）
│       ├── api.js            # Axios 封装（16 个导出函数）
│       ├── main.jsx          # React 入口
│       ├── components/
│       │   ├── Chart.jsx     # 通用 ECharts 图表容器（共享组件）
│       │   ├── Poster.jsx    # 海报（代理防盗链 + 懒加载 + fallback）
│       │   └── StarRating.jsx # 1-10 星评分组件（复用 3 页）
│       └── pages/
│           ├── List.jsx      # 电影列表（筛选/排序/分页/批量/内联操作）
│           ├── Search.jsx    # 搜索页（输入防抖 + 四维排名展开面板）
│           ├── MovieDetail.jsx # 电影详情页（排名+评分+影评+演员）
│           ├── AddEdit.jsx   # 添加/编辑表单
│           ├── Analytics.jsx # 全站分析看板（6 图 + 概览 + 高分榜）
│           ├── Profile.jsx   # 个人主页（8 卡片 + 9 图 + Tab 影评）
│           ├── Lists.jsx     # 清单管理
│           └── ListDetail.jsx # 清单详情（表格 + 搜索添加）
├── 需求分析文档.md            # 需求分析（7 章）
├── Info.md                   # 项目介绍（PPT 素材）
└── .gitignore
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
// 电影
fetchItems(params)        // 列表（支持 year/category/sort/progress/rating_min 等）
setProgress(id, progress) // 进度（自动同步到所有清单）
searchItems(q)            // 搜索 + 简要排名
fetchItemRanking(id)      // 四维排名

// 清单（8 个端点）
fetchLists / createList / updateList / deleteList
fetchListItems / addToList / removeFromList
updateListItemProgress    // 更新进度（同步到全局 item）

// 分析
fetchAnalytics()          // 全站
fetchPersonalAnalytics()  // 个人
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

### CSS 变量（亮色主题）
```css
--bg: #ffffff;           /* 底色（纯白） */
--text: #1a1a1a;         /* 主文字（近黑） */
--text-muted: #6b6b7b;   /* 辅助文字（灰） */
--primary: #2d9ba8;      /* 主色（青） */
--danger: #e87850;       /* 危险色（橙） */
--star: #f5a623;         /* 评分星（金） */
--card-bg: #f8f8fa;
--input-bg: #f5f5f7;
--radius: 12px;
```

### 字体与交互
- **Inter**（Google Fonts），全站统一，`antialiased`
- 进度色：橙(#ff9800)/蓝(#42a5f5)/绿(#91cc75)
- 导航：毛玻璃 `backdrop-filter: blur(12px)`
- 卡片：hover 上浮 + 辉光边框

### 响应式
- `@media (max-width: 700px)`

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

### 2026-06-01（最新）
1. **代码去重**：提取 Chart.jsx / StarRating.jsx 共享组件，消除 Analytics+Profile 和 List+Search+MovieDetail 的重复代码
2. **analytics.js 重构**：提取 7 个共享查询函数（`getRatingDistribution` 等），独立端点与聚合端点全部复用，代码量 -40%
3. **loadMore 并发锁**：加 `loading` 守卫防止快速点击重复加载
4. **PUT 输入校验**：rating(1-10) / year(1888-2100) / type 校验，防止脏数据写入
5. **数据库索引**：新增 8 个索引（type/watched/douban_rating/rating/year/created_at/list_items 双列），高频查询走索引
6. **亮色主题**：全面切换为白底黑字（`--bg: #ffffff`），Chart 组件移除暗色注入
7. **Info.md**：项目介绍文档（技术栈/问题与解决/功能/上线评估），供 PPT 制作
8. **需求分析文档.md**：7 章需求分析（背景/可行性/需求/设计/模块/风险/迭代）

### 2026-05-31
1. **暗色主题**：底色 `#1c1c28`，Inter 字体，毛玻璃导航，卡片 hover 辉光
2. **ECharts 暗色适配**：Chart 组件自动注入暗色默认值
3. **自定义清单**：8 个 API，清单管理页 + 详情页，双向进度同步
4. **统一状态**：进度下拉（想看/在看/已看），`watched` 自动推导
5. **Profile 卡片**：8 张全部可点击，筛选参数完善
6. **图片代理**：`/api/proxy-image` 绕过豆瓣防盗链
7. **筛选增强**：年份精确匹配 + 分类 LIKE 模糊（12 种）+ 评分双体系排序
8. **代码清理**：移除死代码、重复逻辑
9. **简介爬虫**：Puppeteer + Cookie，已爬 2240/2243 部（99.9%）。续爬需手动导出 Cookie
10. **数据库迁移**：`watched` + `watch_progress` 字段
11. **多值字段拆分**：category/director/tags 独立聚合统计
12. **性能优化**：分页、懒加载、乐观更新

## 注意事项

- **Express 5** 在 Node 24 下可能自动退出 → `index.js` 中设 `server.keepAliveTimeout = 0` + `process.stdin.resume()` 来保持进程存活
- **数据库迁移**使用 PRAGMA 检测，可安全重复运行
- **爬虫写入**不会覆盖用户字段（rating/review/watched/watch_progress）
- **个人分析**指标使用 `rating`（用户自己的打分），全站分析使用 `COALESCE(douban_rating, rating)`（优先豆瓣评分）
