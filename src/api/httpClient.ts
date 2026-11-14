import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

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

// Cơ chế Silent Refresh với Axios Request Queue
interface FailedQueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedQueueItem[] = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest) {
      const url = String(originalRequest.url || '');
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/logout');

      // Nếu chính endpoint đăng nhập hoặc làm mới thất bại -> không gọi refresh lặp vô tận
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Đã retry một lần mà vẫn 401 -> phiên thực sự hết hạn
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Đang có request khác thực hiện refresh -> xếp hàng chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => httpClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi ngầm POST /api/auth/refresh (trình duyệt tự đính kèm HttpOnly Cookie refresh_token)
        await httpClient.post('/auth/refresh');
        processQueue(null);
        return httpClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        // Refresh thất bại (Refresh Token hết hạn) -> Xóa session và chuyển hướng về đăng nhập
        localStorage.removeItem('auth_user');
        localStorage.removeItem('tenant_id');

        const isAuthPage =
          window.location.pathname.startsWith('/auth') ||
          window.location.pathname === '/login' ||
          window.location.pathname === '/register';

        if (!isAuthPage) {
          const currentPath = window.location.pathname + window.location.search;
          const redirectParam = encodeURIComponent(currentPath);

          // Phát sự kiện thông báo Toast phiên hết hạn
          window.dispatchEvent(
            new CustomEvent('session-expired', {
              detail: { message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' },
            })
          );

          window.location.href = `/auth/login?redirect=${redirectParam}`;
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

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
