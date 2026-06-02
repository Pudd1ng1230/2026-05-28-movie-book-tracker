# Client — 前端

React 19 + Vite 8 + @hello-pangea/dnd + ECharts 暗色主题电影管理界面

## 页面与路由

| 路由 | 页面 | 功能 |
|------|------|------|
| `/` | List.jsx | 电影清单：卡片网格、筛选（年份/分类/排序）、进度下拉、1-10 星评分、批量操作、加到清单 |
| `/search` | Search.jsx | 电影搜索：名称/导演模糊搜索 + 四维排名面板 + 快捷操作 |
| `/movie/:id` | MovieDetail.jsx | 电影详情：大海报 + 完整信息 + 双评分 + 四维排名 + 影评编辑 |
| `/lists` | Lists.jsx | 清单管理：创建/编辑/删除清单（名称+描述） |
| `/lists/:id` | ListDetail.jsx | 清单详情：表格视图（海报/名称/导演/年份/评分/观影状态）+ 搜索添加 |
| `/analytics` | Analytics.jsx | 全站分析：ECharts 6 图 + 概览卡片 + 高分榜 |
| `/profile` | Profile.jsx | 个人主页：8 张可点击统计卡片 + 8 个分析图表 + 影评列表 |
| `/add` | AddEdit.jsx | 添加电影表单 |
| `/edit/:id` | AddEdit.jsx | 编辑电影表单 |

## 组件树

```
App（吸顶毛玻璃导航 + 路由）
 ├── Poster          # 图片代理 + 加载失败 fallback 🎬
 ├── Background      # (暗色主题，纯 CSS)
 └── 各页面组件
```

## 数据流

```
useBoards()  →  boards, activeId
useTasks(activeId)  →  tasks, loading, error
    ↓
App → Board → Column → Card → AddCardForm
    子组件通过回调通知 App：
    Card.onPin(id) → App → useTasks → API → setTasks
```

## Hooks

| Hook | 职责 |
|------|------|
| `useTasks` | 任务 CRUD + 拖拽乐观更新 + 搜索 + 回收站 |
| `useBoards` | 板块状态管理（useRef 防闭包过期） |
| `useTimer` | 计时器（Date.now() 防漂移 + 暂停时自动存后端） |

## 共享组件

| 组件 | 说明 |
|------|------|
| `Poster.jsx` | 通过 `/api/proxy-image` 代理豆瓣图片，绕过防盗链；加载失败自动显示 🎬 |
| `App.css` | 全局暗色主题：CSS 变量（`--bg:#1c1c28` / `--text:#e4e4f0` 等）+ 响应式 700px |

## API 通信

所有请求通过 `services/api.js` → Axios → Vite proxy → 后端 `:3001`

## 样式系统

- **底色**：`#1c1c28`（午夜蓝紫灰）
- **字体**：Inter（Google Fonts）
- **主色**：青 `#4db8c8` / 橙 `#e87850` / 金 `#f5a623`
- **卡片**：半透明暗底 + hover 上浮 `translateY(-1px)` + 辉光边框
- **导航**：毛玻璃 `backdrop-filter: blur(12px)`
- **响应式**：`@media (max-width: 700px)` 纵向布局

## 启动

```bash
cd client && npm install && npm run dev
# → http://localhost:3000
```
