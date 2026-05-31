import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchListItems, removeFromList, updateListItemProgress } from '../api';

const PROGRESS_LABELS = { '想看': '📌', '在看': '👀', '已看': '✅' };

export default function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <p className="loading">加载中...</p>;

  return (
    <div className="list-detail-page">
      <button className="btn btn-secondary" onClick={() => navigate('/lists')} style={{ marginBottom: 16 }}>← 返回清单</button>

      {items.length === 0 ? (
        <p className="empty">清单中还没有电影。去 <a href="/search">搜索页</a> 添加吧！</p>
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
                    {item.poster ? (
                      <img src={item.poster} alt={item.name} className="list-table-poster" loading="lazy" />
                    ) : (
                      <span style={{ fontSize: 24 }}>🎬</span>
                    )}
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
