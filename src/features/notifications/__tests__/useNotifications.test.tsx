import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { notificationApi } from '../api/notificationApi';
import { useNotifications } from '../hooks/useNotifications';

const callbacks = vi.hoisted(() => ({ receive: () => {}, reconnect: () => {} }));

vi.mock('@microsoft/signalr', () => ({
  LogLevel: { Warning: 3 },
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    configureLogging() { return this; }
    build() {
      return {
        state: 'Disconnected',
        on: (_: string, callback: () => void) => { callbacks.receive = callback; },
        onreconnected: (callback: () => void) => { callbacks.reconnect = callback; },
        onclose: () => {},
        start: async () => {},
        stop: async () => {},
      };
    }
  },
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (select: (state: object) => unknown) => select({
    user: { tenantId: 'tenant-1', id: 'owner-1', role: 'STORE_OWNER' },
  }),
}));

vi.mock('../api/notificationApi', () => ({
  notificationApi: { getMyNotifications: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

it('keeps the badge authoritative after duplicate pushes and reconnect', async () => {
  const fetchNotifications = vi.mocked(notificationApi.getMyNotifications);
  fetchNotifications.mockResolvedValue({ items: [], unreadCount: 0 });
  const { result } = renderHook(() => useNotifications());
  await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2));

  const item = { id: 'notice-1', type: 'TRANSFER_RECEIVE_REQUIRED', title: 'Chờ nhận hàng', message: 'Phiếu 1', isRead: false, createdAt: '2026-11-22T00:00:00Z' };
  fetchNotifications.mockResolvedValue({ items: [item], unreadCount: 1 });
  act(() => {
    callbacks.receive();
    callbacks.receive();
  });
  await waitFor(() => expect(result.current.unreadCount).toBe(1));
  expect(result.current.items).toEqual([item]);
  expect(fetchNotifications).toHaveBeenCalledTimes(3);

  fetchNotifications.mockResolvedValue({ items: [{ ...item, isRead: true }], unreadCount: 0 });
  act(() => callbacks.reconnect());
  await waitFor(() => expect(result.current.unreadCount).toBe(0));
  expect(result.current.items[0].isRead).toBe(true);
});
