import axios, { type AxiosError } from 'axios';
import { mapProblemDetailsToVietnamese } from './problemDetailsMapper';

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
  timeout: 15000, // 15s cho các thao tác kế toán, đối soát
});

financeHttpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

financeHttpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 1. Ánh xạ lỗi tiếng Việt rõ ràng
    const vietnameseMessage = mapProblemDetailsToVietnamese(error);
    const enhancedError: EnhancedAxiosError = error;
    enhancedError.vietnameseMessage = vietnameseMessage;

    // 2. Xử lý token hết hạn 401
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(enhancedError);
  }
);
