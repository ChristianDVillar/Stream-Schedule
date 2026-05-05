import axios from 'axios';
import { isTokenExpired, clearAuth } from '../../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
export const API_BASE_URL = `${API_URL}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

function shouldSkipLogoutOn401(config) {
  const url = config?.url || '';
  const method = (config?.method || '').toUpperCase();
  if (url.includes('/user/login') || url.includes('/user/register') || url.includes('/user/google-login')) return true;
  if (method === 'POST' && url.includes('/upload/file')) return true;
  if (method === 'POST' && url.includes('/content') && !url.match(/\/content\/\d+/)) return true;
  if (method === 'GET' && url.includes('/upload/stats')) return true;
    if (method === 'GET' && (url.includes('/discord/guilds') || url.includes('/discord/invite-url'))) return true;
    if (method === 'GET' && url.includes('/akoenet/guilds')) return true;
  if (method === 'GET' && url.includes('/instagram/')) return true;
  if (method === 'GET' && url.includes('/user/connected-accounts')) return true;
  return false;
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && isTokenExpired(token) && !shouldSkipLogoutOn401(config)) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Token expired'));
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginOrRegister =
      error.config?.url?.includes('/user/login') ||
      error.config?.url?.includes('/user/register') ||
      error.config?.url?.includes('/user/google-login');
    const skipLogout = isLoginOrRegister || shouldSkipLogoutOn401(error.config);
    if (error.response?.status === 401 && !skipLogout) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

