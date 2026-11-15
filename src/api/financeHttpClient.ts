import axios, { type AxiosError } from 'axios';
import { mapProblemDetailsToVietnamese } from './problemDetailsMapper';
import { attachSessionRefresh } from './sessionRefresh';

export interface EnhancedAxiosError extends AxiosError {
  vietnameseMessage?: string;
}

/**
 * Instance Axios chuyên dụng cho phân hệ Tài chính - Sổ quỹ - Thuế (MT-GRMS)
 * BaseURL: '/api' (tương ứng với các route BE: /api/tax/household, /api/cashbook, /api/expenses, ...)
 */
export const financeHttpClient = axios.create({
  baseURL: import.meta.env.VITE_FINANCE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // 15s cho các thao tác kế toán, đối soát
});

financeHttpClient.interceptors.request.use((config) => {
  let tenantId = localStorage.getItem('tenant_id') || 'tenant_mt_mart_01';
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
    // keep default seed tenant
  }
  if (config.headers) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});

attachSessionRefresh(financeHttpClient);

financeHttpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 1. Ánh xạ lỗi tiếng Việt rõ ràng
    const vietnameseMessage = mapProblemDetailsToVietnamese(error);
    const enhancedError: EnhancedAxiosError = error;
    enhancedError.vietnameseMessage = vietnameseMessage;

    return Promise.reject(enhancedError);
  }
);
