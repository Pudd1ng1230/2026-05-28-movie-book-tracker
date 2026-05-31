import { useState, useEffect } from 'react';
import { searchItems, fetchItemRanking, toggleWatched, setProgress, updateItem } from '../api';

/** 排名条目展示组件 */
function RankBadge({ label, data }) {
  if (!data || data.total === 0) return null;
  return (
    <div className="rank-badge">
      <span className="rank-label">{label}</span>
      <span className="rank-value">
        #{data.rank}/{data.total}
      </span>
      <span className="rank-pct">前 {data.percentile}%</span>
      <div className="rank-bar">
        <div
          className="rank-bar-fill"
          style={{ width: `${Math.max(data.percentile, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [rankingCache, setRankingCache] = useState({});
  const [rankingLoading, setRankingLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setExpandedId(null);
    try {
      const data = await searchItems(q);
      setResults(data);
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRanking = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);

    if (!rankingCache[id]) {
      setRankingLoading(true);
      try {
        const data = await fetchItemRanking(id);
        setRankingCache((prev) => ({ ...prev, [id]: data.ranking }));
      } catch (err) {
        console.error('获取排名失败:', err);
      } finally {
        setRankingLoading(false);
      }
    }
  };

  const handleToggleWatched = async (e, movie) => {
    e.stopPropagation();
    const newVal = movie.watched ? 0 : 1;
    await toggleWatched(movie.id, newVal);
    setResults(prev => prev.map(m => m.id === movie.id ? { ...m, watched: newVal } : m));
  };

  const handleProgress = async (e, id, progress) => {
    e.stopPropagation();
    await setProgress(id, progress);
    setResults(prev => prev.map(m => m.id === id ? { ...m, watch_progress: progress, watched: progress === '已看' ? 1 : m.watched } : m));
    if (progress === '已看') await toggleWatched(id, 1);
  };

  const handleRate = async (e, movie, rating) => {
    e.stopPropagation();
    await updateItem(movie.id, { rating });
    setResults(prev => prev.map(m => m.id === movie.id ? { ...m, rating } : m));
  };

  // 自动搜索：输入后延迟搜索
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch({ preventDefault: () => {} });
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-page">
      <h2>电影搜索</h2>
      <p className="search-hint">输入电影名称，查看它在数据库中的各项排名</p>

      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="输入电影名称或导演..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="submit">搜索</button>
      </form>

      {loading && <p className="loading">搜索中...</p>}

      {results.length > 0 && (
        <div className="search-results">
          <p className="result-count">找到 {results.length} 部电影</p>

          <div className="search-list">
            {results.map((movie) => (
              <div key={movie.id} className="search-card">
                <div
                  className="search-card-header"
                  onClick={() => toggleRanking(movie.id)}
                >
                  <div className="search-card-poster">
                    {movie.poster ? (
                      <img src={movie.poster} alt={movie.name} />
                    ) : (
                      <div className="no-poster">🎬</div>
                    )}
                  </div>
                  <div className="search-card-info">
                    <h3>{movie.name}</h3>
                    <div className="search-card-meta">
                      {movie.year && <span>{movie.year}</span>}
                      {movie.director && <span>导演: {movie.director}</span>}
                      {movie.category && <span className="category-tag">{movie.category.split('/')[0]}</span>}
                    </div>
                    <div className="search-card-scores">
                      {movie.douban_rating && (
                        <span className="douban-score">豆瓣 ★ {movie.douban_rating}</span>
                      )}
                      {movie.douban_votes && (
                        <span className="douban-votes">{movie.douban_votes.toLocaleString()} 人评价</span>
                      )}
                      <span className="overall-mini">
                        总排名 #{movie.overall_rank}/{movie.overall_total}
                      </span>
                    </div>
                    {/* 用户快捷操作 */}
                    <div className="user-actions" style={{marginTop:4}} onClick={e => e.stopPropagation()}>
                      <button
                        className={`watched-btn ${movie.watched ? 'watched' : ''}`}
                        onClick={(e) => handleToggleWatched(e, movie)}
                      >
                        {movie.watched ? '✓ 已看' : '○ 未看'}
                      </button>
                      <select
                        className={`progress-select ${movie.watch_progress === '想看' ? 'want' : movie.watch_progress === '在看' ? 'watching' : movie.watch_progress === '已看' ? 'watched-tag' : ''}`}
                        value={movie.watch_progress || ''}
                        onChange={e => handleProgress(e, movie.id, e.target.value)}
                      >
                        <option value="">进度...</option>
                        <option value="想看">想看</option>
                        <option value="在看">在看</option>
                        <option value="已看">已看</option>
                      </select>
                      <div className="quick-rate">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <span
                            key={n}
                            className={`star ${movie.rating && n <= movie.rating ? 'active' : ''}`}
                            onClick={(e) => handleRate(e, movie, n)}
                          >
                            {n <= 5 ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="expand-arrow">
                    {expandedId === movie.id ? '▾' : '▸'}
                  </div>
                </div>

                {expandedId === movie.id && (
                  <div className="ranking-panel">
                    {rankingLoading && !rankingCache[movie.id] ? (
                      <p className="loading">加载排名数据...</p>
                    ) : rankingCache[movie.id] ? (
                      <div className="ranking-grid">
                        <RankBadge label="总排名" data={rankingCache[movie.id].overall} />
                        <RankBadge label={`${movie.year || '?'} 年排名`} data={rankingCache[movie.id].by_year} />
                        <RankBadge
                          label={`${(movie.category || '/')[0] || '?'} 类型排名`}
                          data={rankingCache[movie.id].by_category}
                        />
                        <RankBadge
                          label={`导演 ${movie.director || '?'}`}
                          data={rankingCache[movie.id].by_director}
                        />
                      </div>
                    ) : (
                      <p className="error-text">无法加载排名数据</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <p className="empty">未找到匹配的电影，试试其他关键词</p>
      )}
    </div>
  );
}
