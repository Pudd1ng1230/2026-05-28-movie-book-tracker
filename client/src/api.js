import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const fetchItems = (params) => api.get('/items', { params }).then(r => r.data);
export const fetchItem = (id) => api.get(`/items/${id}`).then(r => r.data);
export const createItem = (data) => api.post('/items', data).then(r => r.data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then(r => r.data);
export const deleteItem = (id) => api.delete(`/items/${id}`).then(r => r.data);
export const fetchAnalytics = () => api.get('/analytics/all').then(r => r.data);

// 用户操作
export const toggleWatched = (id, watched) => api.patch(`/items/${id}/watched`, { watched }).then(r => r.data);
export const setProgress = (id, progress) => api.patch(`/items/${id}/progress`, { progress }).then(r => r.data);
export const fetchPersonalAnalytics = () => api.get('/analytics/personal/all').then(r => r.data);

// 豆瓣搜索
export const searchItems = (q) => api.get('/items/search', { params: { q } }).then(r => r.data);
export const fetchItemRanking = (id) => api.get(`/items/${id}/ranking`).then(r => r.data);
