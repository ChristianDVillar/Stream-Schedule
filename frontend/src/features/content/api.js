import { apiClient } from '../../shared/api/client';

export async function getStreamItems(type, sort = 'recent') {
  const params = { sort };
  if (type) params.type = type;
  const res = await apiClient.get('/stream-items', { params });
  return res.data;
}

export async function deleteStreamItem(id) {
  const res = await apiClient.delete(`/stream-items/${id}`);
  return res.data;
}

export async function getSuggestions() {
  const res = await apiClient.get('/suggestions');
  return res.data;
}

export async function deleteSuggestion(id) {
  await apiClient.delete(`/suggestions/${id}`);
}

export async function getTimeline(hours = 24) {
  const res = await apiClient.get('/timeline', { params: { hours } });
  return res.data;
}

export async function getTodos() {
  const res = await apiClient.get('/todos');
  return res.data;
}

export async function createTodo({ title, order }) {
  const res = await apiClient.post('/todos', { title, order });
  return res.data;
}

export async function updateTodo(id, { title, completed, order }) {
  const res = await apiClient.patch(`/todos/${id}`, { title, completed, order });
  return res.data;
}

export async function deleteTodo(id) {
  await apiClient.delete(`/todos/${id}`);
}

