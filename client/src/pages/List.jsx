import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchItems, deleteItem, setProgress, updateItem, fetchLists, addToList } from '../api';
import Poster from '../components/Poster';

const PROGRESS_OPTIONS = ['', '想看', '在看', '已看'];
const PAGE_SIZE = 50;

export default function List() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [progress, setProgressFilter] = useState('');
  const [ratingMin, setRatingMin] = useState('');
  const [ratingMax, setRatingMax] = useState('');
  const [hasInteraction, setHasInteraction] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [offset, setOffset] = useState(0);
  const [lists, setLists] = useState([]);

  useEffect(() => { fetchLists().then(setLists).catch(() => {}); }, []);

  const buildParams = (overrides = {}) => {
    const p = { limit: PAGE_SIZE, offset: 0, ...overrides };
    if (search) p.search = search;
    if (sort) p.sort = sort;
    if (progress) p.progress = progress;
    if (ratingMin) p.rating_min = ratingMin;
    if (ratingMax) p.rating_max = ratingMax;
    if (hasInteraction) p.has_interaction = hasInteraction;
    if (year) p.year = year;
    if (category) p.category = category;
    return p;
  };

  // 加载 / 筛选变化
  useEffect(() => {
    setOffset(0);
    fetchItems(buildParams()).then(data => {
      setItems(data.items);
      setTotal(data.total);
    });
  }, [sort, progress, ratingMin, ratingMax, hasInteraction, year, category]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    fetchItems(buildParams()).then(data => {
      setItems(data.items);
      setTotal(data.total);
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    await deleteItem(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(t => t - 1);
  };

  const handleProgress = async (id, progress) => {
    const watchedVal = progress === '已看' ? 1 : 0;
    setItems(prev => prev.map(i => i.id === id ? { ...i, watch_progress: progress, watched: watchedVal } : i));
    await setProgress(id, progress);
  };

  const handleRate = async (item, rating) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, rating } : i));
    await updateItem(item.id, { rating });
  };

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    fetchItems(buildParams({ offset: newOffset })).then(data => {
      setItems(prev => [...prev, ...data.items]);
      setTotal(data.total);
      setOffset(newOffset);
    });
  };

  const hasMore = items.length < total;

  return (
    <div>
      <form className="filters" onSubmit={handleSearch}>
        <input placeholder="搜索名称..." value={search} onChange={e => setSearch(e.target.value)} />
        <input placeholder="年份(如 2023)" value={year} onChange={e => setYear(e.target.value)} style={{width:110}} />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">全部分类</option>
          <option value="剧情">剧情</option><option value="喜剧">喜剧</option>
          <option value="动作">动作</option><option value="爱情">爱情</option>
          <option value="科幻">科幻</option><option value="悬疑">悬疑</option>
          <option value="动画">动画</option><option value="纪录片">纪录片</option>
          <option value="恐怖">恐怖</option><option value="犯罪">犯罪</option>
          <option value="奇幻">奇幻</option><option value="战争">战争</option>
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="">默认排序</option>
          <option value="user_rating_desc">我的评分 ↓</option>
          <option value="user_rating_asc">我的评分 ↑</option>
          <option value="douban_rating_desc">豆瓣评分 ↓</option>
          <option value="douban_rating_asc">豆瓣评分 ↑</option>
          <option value="date_desc">日期从新到旧</option>
          <option value="date_asc">日期从旧到新</option>
        </select>
        <button type="submit">搜索</button>
      </form>

      <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:12}}>
        共 {total} 条，已加载 {items.length} 条
      </p>

      <div className="item-grid">
        {items.map(item => (
          <div key={item.id} className="item-card">
            <div className="item-poster">
              <Poster src={item.poster} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
            </div>
            <div className="item-info">
              <h3>{item.name}</h3>
              {item.year && <span className="year">{item.year}</span>}
              {item.director && <span className="director">{item.director}</span>}
              <div className="item-meta">
                <span className="type-badge">电影</span>
                {item.douban_rating ? (
                  <span className="rating" style={{fontSize:12,color:'#f5a623'}}>豆瓣 ★{item.douban_rating}</span>
                ) : (
                  <span className="rating" style={{fontSize:12,color:'var(--text-muted)'}}>暂无豆瓣评分</span>
                )}
                {item.rating ? (
                  <span className="rating">我的 ★{item.rating}</span>
                ) : (
                  <span className="rating" style={{fontSize:12,color:'var(--text-muted)'}}>未打分</span>
                )}
              </div>
              <div className="user-actions">
                <select
                  className={`progress-select ${item.watch_progress === '想看' ? 'want' : item.watch_progress === '在看' ? 'watching' : item.watch_progress === '已看' ? 'watched-tag' : ''}`}
                  value={item.watch_progress || ''}
                  onChange={e => handleProgress(item.id, e.target.value)}
                >
                  {PROGRESS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '状态...'}</option>)}
                </select>
                <div className="quick-rate">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <span key={n} className={`star ${item.rating && n <= item.rating ? 'active' : ''}`}
                      onClick={() => handleRate(item, n)} title={`${n}分`}>
                      {n <= 5 ? '★' : '☆'}
                    </span>
                  ))}
                  {item.rating && <span className="user-rating-label">{item.rating}分</span>}
                </div>
              </div>
              {item.review && <p className="user-review-mini">💬 {item.review}</p>}
              {item.tags && item.tags.length > 0 && (
                <div className="tags">{item.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
              )}
              <div className="item-actions">
                <Link to={`/edit/${item.id}`} className="btn-sm">编辑</Link>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(item.id)}>删除</button>
                {lists.length > 0 && (
                  <select
                    className="add-to-list-select"
                    value=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      try {
                        await addToList(Number(e.target.value), item.id);
                        e.target.value = '';
                        alert('已添加到清单！');
                      } catch (err) {
                        alert(err.response?.data?.error || '添加失败');
                      }
                    }}
                  >
                    <option value="">+ 清单</option>
                    {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{textAlign:'center',margin:'20px 0 40px'}}>
          <button onClick={loadMore} disabled={loading} className="btn-sm" style={{padding:'10px 32px',fontSize:14}}>
            {loading ? '加载中...' : `加载更多 (${total - items.length} 条剩余)`}
          </button>
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="empty">还没有记录，<Link to="/search">去搜索电影</Link> 或 <Link to="/add">手动添加</Link></p>
      )}
    </div>
  );
}
