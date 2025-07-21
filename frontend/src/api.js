import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export async function register({ username, email, password }) {
  return axios.post(`${API_URL}/user/register`, { username, email, password });
}

export async function login({ email, password }) {
  return axios.post(`${API_URL}/user/login`, { email, password });
}

export async function generateLicense({ userId, token }) {
  return axios.post(`${API_URL}/user/generate-license`, { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function getAllUsers(token) {
  return axios.get(`${API_URL}/user/admin/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export async function adminGenerateLicense({ userId, token }) {
  return axios.post(`${API_URL}/user/admin/generate-license`, { userId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
} 