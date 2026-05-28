import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchItem, createItem, updateItem } from '../api';

const empty = {
  name: '', type: 'movie', category: '', tags: '', director: '',
  year: '', rating: '', review: '', date: '', poster: '', summary: '',
};

export default function AddEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const isEdit = Boolean(id);

  useEffect(() => {
    if (id) {
      fetchItem(id).then(data => {
        setForm({
          ...data,
          tags: data.tags.join(', '),
          year: data.year || '',
          rating: data.rating || '',
        });
      });
    }
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : null,
      rating: form.rating ? Number(form.rating) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    if (!payload.name.trim()) return alert('请输入名称');

    if (isEdit) {
      await updateItem(id, payload);
    } else {
      await createItem(payload);
    }
    navigate('/');
  };

  return (
    <div className="form-page">
      <h2>{isEdit ? '编辑' : '添加'}条目</h2>
      <form onSubmit={handleSubmit} className="item-form">
        <div className="form-row">
          <label>名称 *</label>
          <input name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div className="form-row">
          <label>类型</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="movie">电影</option>
            <option value="tv">剧集</option>
            <option value="book">书籍</option>
          </select>
        </div>

        <div className="form-row">
          <label>分类</label>
          <input name="category" value={form.category} onChange={handleChange} placeholder="如：科幻、爱情、悬疑" />
        </div>

        <div className="form-row">
          <label>标签（逗号分隔）</label>
          <input name="tags" value={form.tags} onChange={handleChange} placeholder="如：经典, 烧脑, 催泪" />
        </div>

        <div className="form-row">
          <label>导演/作者</label>
          <input name="director" value={form.director} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>年份</label>
          <input name="year" type="number" value={form.year} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>评分 (1-10)</label>
          <input name="rating" type="number" min="1" max="10" value={form.rating} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>日期</label>
          <input name="date" type="date" value={form.date} onChange={handleChange} />
        </div>

        <div className="form-row">
          <label>海报 URL</label>
          <input name="poster" value={form.poster} onChange={handleChange} placeholder="图片链接" />
        </div>

        <div className="form-row">
          <label>简介</label>
          <textarea name="summary" value={form.summary} onChange={handleChange} rows={3} />
        </div>

        <div className="form-row">
          <label>短评</label>
          <textarea name="review" value={form.review} onChange={handleChange} rows={2} placeholder="写下你的评价..." />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">{isEdit ? '保存' : '添加'}</button>
          <button type="button" onClick={() => navigate('/')}>取消</button>
        </div>
      </form>
    </div>
  );
}
