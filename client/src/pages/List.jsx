import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchItems, deleteItem } from '../api';

const typeLabels = { movie: '电影', tv: '剧集', book: '书籍' };

export default function List() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');

  const load = () => fetchItems({ type, search, sort }).then(setItems);

  useEffect(() => { load(); }, [type, sort]);

  const handleSearch = (e) => { e.preventDefault(); load(); };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    await deleteItem(id);
    load();
  };

  return (
    <div>
      <form className="filters" onSubmit={handleSearch}>
        <input
          placeholder="搜索名称..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="">全部类型</option>
          <option value="movie">电影</option>
          <option value="tv">剧集</option>
          <option value="book">书籍</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="">默认排序</option>
          <option value="rating_desc">评分从高到低</option>
          <option value="rating_asc">评分从低到高</option>
          <option value="date_desc">日期从新到旧</option>
          <option value="date_asc">日期从旧到新</option>
        </select>
        <button type="submit">搜索</button>
      </form>

      <div className="item-grid">
        {items.map(item => (
          <div key={item.id} className="item-card">
            <div className="item-poster">
              {item.poster ? (
                <img src={item.poster} alt={item.name} />
              ) : (
                <div className="no-poster">{typeLabels[item.type] || item.type}</div>
              )}
            </div>
            <div className="item-info">
              <h3>{item.name}</h3>
              {item.year && <span className="year">{item.year}</span>}
              {item.director && <span className="director">{item.director}</span>}
              <div className="item-meta">
                <span className="type-badge">{typeLabels[item.type]}</span>
                {item.rating && <span className="rating">★ {item.rating}</span>}
              </div>
              {item.review && <p className="review">{item.review}</p>}
              {item.tags.length > 0 && (
                <div className="tags">
                  {item.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
                </div>
              )}
              <div className="item-actions">
                <Link to={`/edit/${item.id}`} className="btn-sm">编辑</Link>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}>删除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="empty">还没有记录，<Link to="/add">去添加</Link></p>
      )}
    </div>
  );
}
