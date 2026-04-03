import axios from 'axios';

const responseInterceptor = [
  (res) => res,
  (err) => {
    // Only redirect to login on 401 if NOT already on an auth page
    // (prevents infinite redirect loop when backend is slow / cookie expired)
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    if (err.response?.status === 401 && !isAuthPage) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
];

// Ensure the base URL always ends with /api
let baseApiUrl = import.meta.env.VITE_API_URL || '/api';
if (baseApiUrl.startsWith('http') && !baseApiUrl.endsWith('/api')) {
  baseApiUrl = baseApiUrl.replace(/\/$/, '') + '/api';
}

// Standard API — 15s timeout
const api = axios.create({
  baseURL: baseApiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
api.interceptors.response.use(...responseInterceptor);

// AI API — 60s timeout (Gemini can be slow)
export const aiApi = axios.create({
  baseURL: baseApiUrl,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
aiApi.interceptors.response.use(...responseInterceptor);

export default api;
