import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const fetchItems = (params) => api.get('/items', { params }).then(r => r.data);
export const fetchItem = (id) => api.get(`/items/${id}`).then(r => r.data);
export const createItem = (data) => api.post('/items', data).then(r => r.data);
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then(r => r.data);
export const deleteItem = (id) => api.delete(`/items/${id}`).then(r => r.data);
export const fetchAnalytics = () => api.get('/analytics/all').then(r => r.data);
