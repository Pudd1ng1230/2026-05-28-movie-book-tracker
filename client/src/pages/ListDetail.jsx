import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchListItems, removeFromList, updateListItemProgress, searchItems, addToList } from '../api';
import Poster from '../components/Poster';

const PROGRESS_LABELS = { '想看': '📌', '在看': '👀', '已看': '✅' };

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchListItems(id);
      setItems(data);
    } catch (e) { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleRemove = async (itemId) => {
    await removeFromList(id, itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleProgress = async (itemId, progress) => {
    await updateListItemProgress(id, itemId, progress);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, list_progress: progress } : i));
  };

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await searchItems(q.trim());
      // 过滤掉已在清单中的电影
      const existingIds = new Set(items.map(i => i.id));
      setSearchResults(data.filter(m => !existingIds.has(m.id)));
    } catch (e) { setSearchResults([]); }
    setSearching(false);
  }, [items]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const handleAdd = async (itemId) => {
    try {
      await addToList(Number(id), itemId);
      alert('已添加到清单！');
      // 从搜索结果中移除
      setSearchResults(prev => prev.filter(m => m.id !== itemId));
      // 重新加载清单
      load();
    } catch (err) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  if (loading) return <p className="loading">加载中...</p>;

  return (
    <div className="list-detail-page">
      <button className="btn btn-secondary" onClick={() => navigate('/lists')} style={{ marginBottom: 16 }}>← 返回清单</button>

      {/* 搜索添加区域 */}
      <div style={{ marginBottom: 20 }}>
        <button
          className="btn-sm"
          onClick={() => setShowSearch(!showSearch)}
          style={{ marginBottom: showSearch ? 10 : 0 }}
        >
          {showSearch ? '关闭搜索' : '+ 搜索添加电影'}
        </button>
        {showSearch && (
          <div className="search-box" style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="输入电影名称搜索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}
        {showSearch && searching && <p className="loading" style={{ marginTop: 8, fontSize: 14 }}>搜索中...</p>}
        {showSearch && searchResults.length > 0 && (
          <div className="search-results-mini" style={{ marginTop: 10 }}>
            {searchResults.slice(0, 10).map(m => (
              <div key={m.id} className="search-result-row">
                <span style={{ flex: 1 }}>{m.name} {m.year && `(${m.year})`}</span>
                <button className="btn-sm" onClick={() => handleAdd(m.id)}>+ 添加</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="empty">清单中还没有电影。点击上方「+ 搜索添加电影」开始添加吧！</p>
      ) : (
        <div className="list-detail-table-wrap">
          <table className="list-detail-table">
            <thead>
              <tr>
                <th>海报</th>
                <th>名称</th>
                <th>导演</th>
                <th>年份</th>
                <th>评分</th>
                <th>观影状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <Poster src={item.poster} alt={item.name} className="list-table-poster" />
                  </td>
                  <td className="list-table-name">{item.name}</td>
                  <td className="list-table-meta">{item.director || '-'}</td>
                  <td className="list-table-meta">{item.year || '-'}</td>
                  <td className="list-table-meta">
                    {item.rating ? `★ ${item.rating}` : item.douban_rating ? `豆瓣 ${item.douban_rating}` : '-'}
                  </td>
                  <td>
                    <select
                      value={item.list_progress || ''}
                      onChange={e => handleProgress(item.id, e.target.value)}
                      className={`progress-select ${item.list_progress === '想看' ? 'want' : item.list_progress === '在看' ? 'watching' : item.list_progress === '已看' ? 'watched-tag' : ''}`}
                    >
                      <option value="">—</option>
                      <option value="想看">📌 想看</option>
                      <option value="在看">👀 在看</option>
                      <option value="已看">✅ 已看</option>
                    </select>
                    {item.list_progress && (
                      <span style={{ marginLeft: 6, fontSize: 14 }}>
                        {PROGRESS_LABELS[item.list_progress]}
                      </span>
                    )}
                  </td>
                  <td>
                    <button className="btn-sm btn-danger" onClick={() => handleRemove(item.id)}>移除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
