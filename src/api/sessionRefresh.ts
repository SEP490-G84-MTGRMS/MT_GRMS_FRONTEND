import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

type RefreshRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 12000,
});
let refreshPromise: Promise<void> | null = null;

function expireSession() {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('tenant_id');
  localStorage.removeItem('access_token');
  window.dispatchEvent(new CustomEvent('session-expired', {
    detail: { message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.' },
  }));
  const path = window.location.pathname;
  if (!path.startsWith('/auth') && path !== '/login' && path !== '/register') {
    window.location.assign(`/auth/login?redirect=${encodeURIComponent(path + window.location.search + window.location.hash)}`);
  }
}

async function refreshAccessToken() {
  try {
    await refreshClient.post('/auth/refresh');
    window.dispatchEvent(new CustomEvent('session-refreshed'));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      expireSession();
    } else {
      window.dispatchEvent(new CustomEvent('session-refresh-failed', {
        detail: { message: 'Chưa thể làm mới phiên. Vui lòng kiểm tra kết nối và thử lại.' },
      }));
    }
    throw error;
  }
}

export function attachSessionRefresh(client: AxiosInstance) {
  client.interceptors.response.use((response) => response, async (error: AxiosError) => {
    const request = error.config as RefreshRequest | undefined;
    const authEndpoint = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password|verify-otp)(\/|\?|$)/;
    if (error.response?.status !== 401 || !request || request._retry || authEndpoint.test(request.url || '')) {
      throw error;
    }
    request._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });
    await refreshPromise;
    return client(request);
  });
}
