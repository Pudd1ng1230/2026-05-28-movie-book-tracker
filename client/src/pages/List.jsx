import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchItems, deleteItem, toggleWatched, setProgress, updateItem } from '../api';

const typeLabels = { movie: '电影', tv: '剧集', book: '书籍' };
const PROGRESS_OPTIONS = ['', '想看', '在看', '已看'];

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

  const handleToggleWatched = async (item) => {
    const newVal = item.watched ? 0 : 1;
    await toggleWatched(item.id, newVal);
    load();
  };

  const handleProgress = async (id, progress) => {
    await setProgress(id, progress);
    // 如果选了"已看"，自动标记已看
    if (progress === '已看') await toggleWatched(id, 1);
    load();
  };

  const handleRate = async (item, rating) => {
    await updateItem(item.id, { rating });
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
                {item.douban_rating && (
                  <span className="rating" style={{fontSize:12,color:'#f5a623'}}>豆瓣 ★{item.douban_rating}</span>
                )}
                {item.rating && (
                  <span className="rating">我的 ★{item.rating}</span>
                )}
              </div>

              {/* 用户操作区 */}
              <div className="user-actions">
                <button
                  className={`watched-btn ${item.watched ? 'watched' : ''}`}
                  onClick={() => handleToggleWatched(item)}
                  title={item.watched ? '取消已看' : '标记已看'}
                >
                  {item.watched ? '✓ 已看' : '○ 未看'}
                </button>

                <select
                  className={`progress-select ${item.watch_progress === '想看' ? 'want' : item.watch_progress === '在看' ? 'watching' : item.watch_progress === '已看' ? 'watched-tag' : ''}`}
                  value={item.watch_progress || ''}
                  onChange={e => handleProgress(item.id, e.target.value)}
                >
                  {PROGRESS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt || '进度...'}</option>
                  ))}
                </select>

                <div className="quick-rate">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <span
                      key={n}
                      className={`star ${item.rating && n <= item.rating ? 'active' : ''}`}
                      onClick={() => handleRate(item, n)}
                      title={`${n}分`}
                    >
                      {n <= 5 ? '★' : '☆'}
                    </span>
                  ))}
                  {item.rating && <span className="user-rating-label">{item.rating}分</span>}
                </div>
              </div>

              {item.review && <p className="user-review-mini">💬 {item.review}</p>}

              {item.tags && item.tags.length > 0 && (
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
        <p className="empty">还没有记录，<Link to="/search">去搜索电影</Link> 或 <Link to="/add">手动添加</Link></p>
      )}
    </div>
  );
}
