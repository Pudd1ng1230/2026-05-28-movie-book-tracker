import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const fetchItems = (params) => api.get('/items', { params }).then(r => r.data);
export const fetchItem = (id) => api.get(`/items/${id}`).then(r => r.data);
export const createItem = (data) => api.post('/items', data).then(r => r.data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then(r => r.data);
export const deleteItem = (id) => api.delete(`/items/${id}`).then(r => r.data);
export const fetchAnalytics = () => api.get('/analytics/all').then(r => r.data);

// 用户操作
export const setProgress = (id, progress) => api.patch(`/items/${id}/progress`, { progress }).then(r => r.data);
export const fetchPersonalAnalytics = () => api.get('/analytics/personal/all').then(r => r.data);

// ── 自定义清单 ──
export const fetchLists = () => api.get('/lists').then(r => r.data);
export const createList = (name, description) => api.post('/lists', { name, description }).then(r => r.data);
export const updateList = (id, name, description) => api.put(`/lists/${id}`, { name, description }).then(r => r.data);
export const deleteList = (id) => api.delete(`/lists/${id}`).then(r => r.data);
export const fetchListItems = (listId) => api.get(`/lists/${listId}/items`).then(r => r.data);
export const addToList = (listId, itemId) => api.post(`/lists/${listId}/items`, { item_id: itemId }).then(r => r.data);
export const removeFromList = (listId, itemId) => api.delete(`/lists/${listId}/items/${itemId}`).then(r => r.data);
export const updateListItemProgress = (listId, itemId, progress) => api.patch(`/lists/${listId}/items/${itemId}/progress`, { progress }).then(r => r.data);
export const batchProgress = (ids, progress) => api.patch('/items/batch/progress', { ids, progress }).then(r => r.data);
export const batchAddToList = (listId, itemIds) => api.post(`/lists/${listId}/items/batch`, { item_ids: itemIds }).then(r => r.data);

// 豆瓣搜索
export const searchItems = (q) => api.get('/items/search', { params: { q } }).then(r => r.data);
export const fetchItemRanking = (id) => api.get(`/items/${id}/ranking`).then(r => r.data);
