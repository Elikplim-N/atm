import axios from 'axios';

// In a unified single-project deployment, both frontend and serverless API
// are hosted together on the same origin, so API requests should always use
// the relative '/api' path. This avoids any CORS issues or broken cross-origin URLs.
const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const isInvalidUrl = !rawApiUrl || rawApiUrl.includes('gcb-atm-server') || rawApiUrl.includes('placeholder');

const baseURL = isInvalidUrl
  ? '/api'
  : `${rawApiUrl.replace(/\/$/, '')}/api`;

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atm_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
