import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLists, createList, updateList, deleteList } from '../api';

export default function Lists() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchLists();
      setLists(data);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      await updateList(editingId, name.trim(), desc.trim());
    } else {
      await createList(name.trim(), desc.trim());
    }
    setName(''); setDesc(''); setShowForm(false); setEditingId(null);
    load();
  };

  const startEdit = (list) => {
    setName(list.name);
    setDesc(list.description || '');
    setEditingId(list.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这个清单？清单内的电影也会被移除。')) return;
    await deleteList(id);
    load();
  };

  if (loading) return <p className="loading">加载中...</p>;

  return (
    <div className="lists-page">
      <div className="lists-header">
        <h2>📋 我的清单</h2>
        <button className="btn" onClick={() => { setShowForm(!showForm); setEditingId(null); setName(''); setDesc(''); }}>
          {showForm ? '取消' : '+ 新建清单'}
        </button>
      </div>

      {showForm && (
        <form className="list-form" onSubmit={handleSubmit}>
          <input
            placeholder="清单名称（必填）" value={name} onChange={e => setName(e.target.value)}
            autoFocus className="list-form-name"
          />
          <textarea
            placeholder="描述（可选）" value={desc} onChange={e => setDesc(e.target.value)}
            rows={2} className="list-form-desc"
          />
          <div className="list-form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? '保存' : '创建'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>取消</button>
          </div>
        </form>
      )}

      {lists.length === 0 ? (
        <p className="empty">还没有清单，点击「+ 新建清单」创建第一个吧！</p>
      ) : (
        <div className="list-grid">
          {lists.map(list => (
            <div key={list.id} className="list-card" onClick={() => navigate(`/lists/${list.id}`)}>
              <div className="list-card-body">
                <h3>{list.name}</h3>
                {list.description && <p>{list.description}</p>}
              </div>
              <div className="list-card-actions" onClick={e => e.stopPropagation()}>
                <button className="btn-sm" onClick={() => startEdit(list)}>编辑</button>
                <button className="btn-sm btn-danger" onClick={() => handleDelete(list.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
