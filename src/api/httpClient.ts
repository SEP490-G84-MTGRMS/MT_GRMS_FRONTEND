import axios, { AxiosError } from 'axios';
import { attachSessionRefresh } from './sessionRefresh';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Tuân thủ chuẩn ASP.NET Core Model Binding cho mảng: CategoryIds=id1&CategoryIds=id2 (thay vì CategoryIds[]=id1)
  paramsSerializer: {
    indexes: null,
  },
});

httpClient.interceptors.request.use((config) => {
  // Loại bỏ hoàn toàn đọc token từ localStorage - 100% bảo mật qua HttpOnly Cookie

  // Tự động gắn Tenant ID chuẩn của hệ thống để đồng bộ dữ liệu đa người thuê
  let tenantId = localStorage.getItem('tenant_id') || 'tenant_mt_mart_01';
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

attachSessionRefresh(httpClient);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {

    const responseData = error.response?.data as
      | { code?: string; errorCode?: string; detail?: string; message?: string }
      | undefined;
    const problemCode = String(responseData?.code || responseData?.errorCode || '').toUpperCase();
    if (error.response?.status === 403 && problemCode === 'SUBSCRIPTION_REQUIRED') {
      window.dispatchEvent(
        new CustomEvent('subscription-required', {
          detail: {
            code: problemCode,
            message:
              responseData?.detail ||
              responseData?.message ||
              'Gói dịch vụ đã hết hạn. Vui lòng thanh toán hoặc gia hạn gói để tiếp tục sử dụng.',
          },
        })
      );
    }

    return Promise.reject(error);
  }
);
