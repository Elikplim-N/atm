import axios from 'axios';

// In local dev, requests to /api are proxied to the local server (see
// vite.config.js). On Vercel the client and server are separate projects on
// separate domains, so VITE_API_URL must point at the deployed server.
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('atm_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
