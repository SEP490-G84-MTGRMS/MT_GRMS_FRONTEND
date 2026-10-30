import axios from 'axios';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      const isAuthPage =
        window.location.pathname.startsWith('/auth') ||
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (!isAuthPage) {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);
