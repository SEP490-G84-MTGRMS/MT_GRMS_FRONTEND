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

  let tenantId = 'tenant_mt_mart_01';
  try {
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      const parsed = JSON.parse(raw) as { tenantId?: string };
      const stored = parsed.tenantId?.trim();
      const isPlaceholder =
        !stored ||
        stored === 'DEFAULT' ||
        stored === 'default-tenant' ||
        stored === 'TENANT-HCM-01' ||
        stored === 'TENANT-DEFAULT';
      if (!isPlaceholder) {
        tenantId = stored;
      }
    }
  } catch {
    // keep seed tenant
  }
  if (config.headers) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      const isAuthCall = url.includes('/auth/login') || url.includes('/Auth/login');
      if (!isAuthCall) {
        localStorage.removeItem('access_token');
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/auth/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
