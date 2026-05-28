import { Routes, Route, NavLink } from 'react-router-dom';
import List from './pages/List';
import AddEdit from './pages/AddEdit';
import Analytics from './pages/Analytics';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="logo">My Tracker</h1>
        <div className="nav-links">
          <NavLink to="/">清单</NavLink>
          <NavLink to="/add">添加</NavLink>
          <NavLink to="/analytics">数据分析</NavLink>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<List />} />
          <Route path="/add" element={<AddEdit />} />
          <Route path="/edit/:id" element={<AddEdit />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
}
