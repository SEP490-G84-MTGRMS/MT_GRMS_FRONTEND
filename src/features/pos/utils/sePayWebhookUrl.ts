const WEBHOOK_PATH = '/api/payments/sepay-webhook';

const trimBackendUrl = (value: string): string =>
  value.trim().replace(/\/+$/, '').replace(/\/api$/i, '');

const isLocalHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

/**
 * URL public mà SePay sẽ gọi.
 *
 * - Production: dùng chính domain đang mở (ví dụ https://thviet.store).
 * - Local: dùng backend trong VITE_API_BASE_URL (mặc định http://localhost:5232).
 * - Test SePay end-to-end ở local: đặt VITE_PUBLIC_BACKEND_URL bằng URL HTTPS tunnel.
 */
export const resolveSePayWebhookUrl = (serverUrl?: string): string => {
  const publicBackendUrl = String(import.meta.env.VITE_PUBLIC_BACKEND_URL || '');
  if (publicBackendUrl.trim()) {
    return `${trimBackendUrl(publicBackendUrl)}${WEBHOOK_PATH}`;
  }

  if (!isLocalHost(window.location.hostname)) {
    return `${window.location.origin}${WEBHOOK_PATH}`;
  }

  if (serverUrl && /^https?:\/\//i.test(serverUrl)) {
    return serverUrl;
  }

  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '');
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return `${trimBackendUrl(apiBaseUrl)}${WEBHOOK_PATH}`;
  }

  return `${window.location.origin}${WEBHOOK_PATH}`;
};
