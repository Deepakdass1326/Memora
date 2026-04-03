import axios from 'axios';

const responseInterceptor = [
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
];

// Standard API — 15s timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
api.interceptors.response.use(...responseInterceptor);

// AI API — 60s timeout (Gemini can be slow)
export const aiApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
aiApi.interceptors.response.use(...responseInterceptor);

export default api;
