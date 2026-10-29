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

  // Tự động gắn Tenant ID chuẩn của hệ thống để đồng bộ dữ liệu đa người thuê
  let tenantId = 'tenant_mt_mart_01';
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.tenantId && user.tenantId !== 'TENANT-DEFAULT' && user.tenantId !== 'TENANT-HCM-01') {
        tenantId = user.tenantId;
      }
    } catch {
      // fallback tenantId
    }
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
      localStorage.removeItem('access_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
