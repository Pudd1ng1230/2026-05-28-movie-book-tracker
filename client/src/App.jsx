import { Routes, Route, NavLink } from 'react-router-dom';
import List from './pages/List';
import AddEdit from './pages/AddEdit';
import Search from './pages/Search';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Lists from './pages/Lists';
import ListDetail from './pages/ListDetail';
import MovieDetail from './pages/MovieDetail';
import './App.css';

// v2 — 用户向电影网站
export default function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="logo">🎬 MovieTracker</h1>
        <div className="nav-links">
          <NavLink to="/search">🔍 搜索</NavLink>
          <NavLink to="/">🎬 电影</NavLink>
          <NavLink to="/lists">📋 清单</NavLink>
          <NavLink to="/analytics">全站分析</NavLink>
          <NavLink to="/profile">👤 我的</NavLink>
          <NavLink to="/add" className="nav-secondary">+ 添加</NavLink>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<List />} />
          <Route path="/search" element={<Search />} />
          <Route path="/lists" element={<Lists />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/add" element={<AddEdit />} />
          <Route path="/edit/:id" element={<AddEdit />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}
