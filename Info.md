# MovieTracker — 项目介绍

> 全栈电影追踪管理平台 | React 19 + Express 5 + SQLite | 2026 年 5 月

---

## 一、技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19.2 | UI 框架（函数组件 + Hooks） |
| React Router | 7.15 | 前端路由（9 条路由） |
| Vite | 8.0 | 构建工具（HMR 极速开发） |
| Axios | 1.16 | HTTP 请求封装 |
| ECharts | 6.1 | 数据可视化（柱状/折线/饼图/雷达/散点） |
| Inter 字体 | Google Fonts | 全站统一字体 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Express | 5.2 | Web 框架（RESTful API） |
| better-sqlite3 | 12.10 | SQLite 数据库驱动（同步 API，WAL 模式） |
| cors | 2.8 | 跨域中间件 |
| axios | 1.16 | 爬虫 HTTP 客户端 |
| Puppeteer | 25.1 | 简介爬虫（Headless Chrome） |
| cheerio | 1.2 | HTML 解析（简介爬虫辅助） |

### 数据库

| 技术 | 说明 |
|------|------|
| SQLite | 单文件数据库，2243 条电影记录 |
| WAL 模式 | 支持并发读写，性能优于默认 journal 模式 |

---

## 二、项目结构

```
movie-book-tracker/
│
├── server/                          # 后端（Express 5 + CommonJS）
│   ├── index.js                     #   · 入口：CORS + JSON 解析 + 图片代理 + 路由挂载
│   │                                #   · keepAliveTimeout=0 防止 Node 24 下过早退出
│   ├── db.js                        #   · SQLite 初始化（WAL + foreign_keys）
│   │                                #   · 自动迁移：PRAGMA 检测列 → ALTER TABLE ADD COLUMN
│   │                                #   · 9 个查询索引（type/watched/rating 等）
│   ├── data.db                      #   · 数据库文件（2243 条电影，含 Git）
│   ├── scraper.js                   #   · 豆瓣爬虫（15 标签 × 10 页 × 20 部 ≈ 3000 上限）
│   │                                #   · 限流 1000ms + 熔断 30 次失败 + UPSERT 增量更新
│   ├── scrape-summaries-only.js     #   · 简介爬虫（Puppeteer + Cookie）
│   ├── douban-cookies.json          #   · Cookie 文件（不入 Git）
│   ├── package.json                 #   · 依赖清单
│   └── routes/
│       ├── items.js                 #   · 电影 CRUD + 模糊搜索 + 四维排名 + 批量操作
│       ├── analytics.js             #   · 全站/个人分析（7 个共享查询函数 + 拆分聚合）
│       └── lists.js                 #   · 清单 8 端点（CRUD + 批量添加 + 双向进度同步）
│
├── client/                          # 前端（React 19 + ESM）
│   ├── index.html                   #   · HTML 入口 + Inter 字体 CDN
│   ├── vite.config.js               #   · Vite 配置：端口 3000 + Proxy /api→3001
│   ├── package.json                 #   · 依赖清单
│   └── src/
│       ├── main.jsx                 #   · React 挂载入口
│       ├── App.jsx                  #   · 根组件：毛玻璃吸顶导航 + 9 条路由
│       ├── App.css                  #   · 全局样式（CSS 变量 + 亮色主题）
│       ├── api.js                   #   · Axios 封装（16 个导出函数）
│       ├── index.css                #   · 基础 reset
│       ├── components/              # 共享组件
│       │   ├── Chart.jsx            #   · ECharts 图表容器（通用）
│       │   ├── Poster.jsx           #   · 海报（代理防盗链 + 加载失败 fallback）
│       │   └── StarRating.jsx       #   · 1-10 星评分组件（复用 3 页）
│       └── pages/                   # 页面组件
│           ├── List.jsx             #   · 电影列表（筛选/排序/分页/批量/内联操作）
│           ├── Search.jsx           #   · 豆瓣搜索 + 四维排名展开面板
│           ├── MovieDetail.jsx      #   · 电影详情（排名+评分+影评+演员）
│           ├── AddEdit.jsx          #   · 添加/编辑表单
│           ├── Analytics.jsx        #   · 全站分析看板（6 图 + 概览 + 高分榜）
│           ├── Profile.jsx          #   · 个人主页（8 卡片 + 9 图 + Tab 影评）
│           ├── Lists.jsx            #   · 清单管理
│           └── ListDetail.jsx       #   · 清单详情（表格 + 搜索添加）
│
├── REASONIX.md                      # 项目全上下文（Agent 参考文档）
├── 需求分析文档.md                   # 需求分析（7 章，含可行性/设计/风险）
├── Info.md                          # · 本文件（项目介绍 / PPT 素材）
└── .gitignore
```

---

## 三、遇到的问题 & 解决方案

### 问题 1：豆瓣图片防盗链

**现象**：前端 `<img>` 直接引用豆瓣海报 URL 时，返回 403 Forbidden。豆瓣通过检查 HTTP `Referer` 头拦截外部站点请求。

**解决**：
- 在后端新增 `/api/proxy-image?url=` 代理端点
- 请求豆瓣时带上 `Referer: https://movie.douban.com/` 伪装来源
- 前端 `Poster` 组件自动拼接代理 URL，`onError` 时 fallback 为 emoji 占位符 🎬

> **文件**：`server/index.js:15` / `client/src/components/Poster.jsx`

---

### 问题 2：多值字段统计不准确

**现象**：`category = "剧情/喜剧/家庭"`、`director = "张三, 李四"`。直接用 SQL `GROUP BY category` 会把整个字符串当作一个分类，"剧情/喜剧/家庭" 就成了一个独立项，而不是拆成"剧情""喜剧""家庭"三个独立分类来统计。

**解决**：
- 编写 `splitAggregate(rows, field, delimiter, scoreField)` 工具函数
- 在应用层按分隔符拆分后独立计算每项的均分和样本数
- 分类用 `"/"` 拆分，导演用 `", "` 拆分，标签也支持 `"/"` 拆分

> **文件**：`server/routes/analytics.js:10`

---

### 问题 3：Express 5 在 Node 24 下自动退出

**现象**：Express 5 在 Node 24 环境中，请求处理完毕后进程会自动退出，导致服务不可用。

**解决**：
- `server.keepAliveTimeout = 0` 关闭 HTTP Keep-Alive 超时
- `process.stdin.resume()` 保持事件循环不退出

> **文件**：`server/index.js:36-37`

---

### 问题 4：数据去重与增量更新

**现象**：多次运行爬虫会重复插入同一部电影；且如果覆盖写入，用户自己的评分和影评会被清空。

**解决**：
- 数据库创建 `UNIQUE INDEX ON items(douban_id)`
- 爬虫写入时：检测 `douban_id` 是否存在 → 存在则只更新豆瓣评分等字段（`COALESCE` 保留非空用户数据），不存在才 INSERT
- 内存 `Set<doubanId>` 防止同一次爬取中重复请求

> **文件**：`server/scraper.js:100-130`

---

### 问题 5：数据库字段演进（Schema 迁移）

**现象**：开发过程中不断新增字段（`douban_id`、`watched`、`watch_progress` 等），每次手动 `ALTER TABLE` 容易出错，且重复执行会报"列已存在"错误。

**解决**：
- 编写 `migrate(colName, colDef)` 函数
- 通过 `PRAGMA table_info('items')` 检测列是否存在
- 不存在才执行 `ALTER TABLE ADD COLUMN`
- `db.js` 可安全重复运行，零副作用

> **文件**：`server/db.js:30-38`

---

### 问题 6：前端代码重复

**现象**：
- `Chart` ECharts 容器组件在 `Analytics.jsx` 和 `Profile.jsx` 中各定义了一份（~45 行完全一致）
- 1-10 星评分组件在 `List.jsx`、`Search.jsx`、`MovieDetail.jsx` 三处重复（~10 行）
- `analytics.js` 中 `/all`、`/personal/all`、各独立端点的 SQL 查询大量重复

**解决**（本次维护中完成）：
- 提取 `components/Chart.jsx` — 两处 import 替代内联定义
- 提取 `components/StarRating.jsx` — 三处替换，同时修正 ★/☆ 语义
- `analytics.js` 提取 7 个共享查询函数（`getRatingDistribution`、`getCategoryStats` 等），代码量 **-40%**

---

### 问题 7：搜索排名 N+1 查询

**现象**：搜索返回 50 条结果，每条执行一次 `COUNT(*) WHERE douban_rating > ?` 来计算排名，即 1 次列表查询 + 50 次排名查询 = 51 次 DB 访问。

**当前状态**：在 2243 条数据下延迟可接受（< 100ms）。未来数据量增长时需优化为一次查询 + 应用层排序，或使用 SQLite 窗口函数 `RANK()`。

---

## 四、主要功能

### 🔍 电影搜索与排名
- 豆瓣电影模糊搜索（名称 / 导演）
- 返回豆瓣评分排序 + 简要排名
- 点击展开**四维排名面板**：总排名 / 同年排名 / 同类型排名 / 同导演排名
- 每项显示排名位置 + 前 X% 百分位 + 可视化进度条

### 📋 电影数据管理
- 2243 部豆瓣电影数据（名称 / 海报 / 评分 / 导演 / 演员 / 年份 / 分类 / 地区 / 简介）
- 手动添加 / 编辑 / 删除电影
- 多条件筛选：年份 / 分类（12 种）/ 进度 / 评分范围 / 有互动
- 6 种排序：用户评分正倒序 / 豆瓣评分正倒序 / 日期正倒序
- 分页加载（每页 50 条，"加载更多"）

### ✅ 用户观影管理
- **统一进度状态**：想看 📌 / 在看 👀 / 已看 ✅，三色标记区分
- **1-10 星自主评分**（组件化，列表/搜索/详情三页复用）
- **个人影评**撰写与展示
- **批量操作**：多选 → 一键设置进度 / 添加到清单
- 进度与 `watched` 字段自动推导（"已看" → watched=1）

### 📊 双维度数据分析

**全站分析看板**（6 图表 + 概览）：
| 图表 | 类型 |
|------|------|
| 评分分布 | 柱状图（5 档：1-2/3-4/5-6/7-8/9-10） |
| 分类平均分 | 柱状图（31 个分类，拆分聚合） |
| 导演 Top10 | 柱状图 |
| 年份趋势 | 折线图 |
| 月度观看量 | 柱状图 |
| 标签偏好 | 雷达图（Top 8） |

**个人分析主页**（9 图表 + 8 可点击卡片）：
| 图表 | 类型 |
|------|------|
| 我的评分分布 | 柱状图 |
| 观看进度分布 | 饼图（想看/在看/已看） |
| 我的评分 vs 豆瓣 | 散点图（hover 显示片名） |
| 我的分类偏好 | 柱状图 |
| 观影年份分布 | 柱状图 |
| 导演偏好 | 柱状图 |
| 地区分布 | 柱状图 |
| 演员频次 Top15 | 横向柱状图 |
| 评分档位 | 高(≥8)/中(5-7)/低(≤4) 三卡片 |

- 8 张统计卡片**全部可点击** → 跳转到对应筛选后的列表页
- Tab 切换：个人分析图表 | 我的影评列表

### 📋 自定义清单
- 创建 / 编辑 / 删除多个清单（如"诺兰全集""2024 年度十佳"）
- 从搜索页 / 列表页 / 详情页一键添加电影
- 批量添加（多选 → 选择清单）
- 清单内独立管理观影进度
- **双向同步**：清单内改进度 → 自动同步到全局电影；全局改进度 → 同步到所有包含该电影的清单
- 清单详情表格：海报 / 名称 / 导演 / 年份 / 评分 / 进度 / 移除

### 🎨 UI/UX
- 亮色主题（白底黑字）
- Inter 字体 + 全站抗锯齿
- 毛玻璃吸顶导航
- 卡片 hover 上浮 + 阴影动画
- 电影海报懒加载 + 防盗链代理 + 失败 fallback
- 响应式布局（适配手机）

---

## 五、仍存在的问题

| 严重性 | 问题 | 说明 |
|--------|------|------|
| 🔴 高 | **无用户认证** | API 完全对外开放，任何人可增删改数据。上线前必须接入 JWT 登录系统 |
| 🔴 高 | **CORS 过于宽松** | `cors()` 无参数，接受所有来源的跨域请求 |
| 🟡 中 | **数据库文件入 Git** | `data.db` 含用户评分/影评等隐私数据，公开仓库存在泄露风险 |
| 🟡 中 | **前端用 alert() 做反馈** | 8 处 alert() 调用，体验粗糙，应替换为 Toast 组件 |
| 🟡 中 | **简介爬虫依赖手动 Cookie** | 豆瓣反爬升级后，简介爬取需手动从浏览器导出 Cookie |
| 🟡 中 | **标签/分类/导演存为字符串** | 不是范式化设计（多对多关系），扩展性有限 |
| 🟢 低 | **Express 5 兼容性 workaround** | `keepAliveTimeout=0` 为临时方案，长期应等官方修复 |
| 🟢 低 | **ECharts 导致打包体积大** | 单 chunk 1.4MB，可按需引入或动态 import 拆分 |

---

## 六、是否可以上线使用

### 结论：功能就绪，安全未就绪

| 维度 | 状态 | 说明 |
|------|------|------|
| 功能完整性 | ✅ 就绪 | 全部核心功能已交付，数据储备充足（2243 部） |
| 代码质量 | ✅ 就绪 | SQL 参数化、错误处理、组件复用、索引优化均完成 |
| 部署可行性 | ✅ 就绪 | 前端纯静态 + 后端 Node 单进程 + SQLite 单文件，1C1G VPS 即可 |
| **安全性** | ❌ 未就绪 | 缺认证、CORS 过宽、隐私数据入 Git，三项必须在上线前解决 |
| 用户体验 | ⚠️ 基本达标 | 功能流畅，但 alert() 反馈、评分星等细节待打磨 |

### 上线前必做清单

- [ ] 接入 JWT 多用户认证（方案已设计，见 `unified-auth-plan`）
- [ ] 收紧 CORS 配置（仅允许前端域名）
- [ ] `.gitignore` 忽略 `*.db`，改用 seed 脚本初始化数据
- [ ] `npm run build` 生产构建 + PM2 进程守护
- [ ] Nginx 反向代理 + Let's Encrypt HTTPS


---

> **最后更新**：2026-06-01 · 基于项目源码审计 + REASONIX.md 编写
