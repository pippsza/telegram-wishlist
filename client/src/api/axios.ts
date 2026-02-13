import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

let token: string | null = null;

export function setAuthToken(t: string | null) {
  token = t;
}

api.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
