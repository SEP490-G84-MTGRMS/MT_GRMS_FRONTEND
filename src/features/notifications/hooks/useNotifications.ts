import { useCallback, useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuthStore } from '../../../stores/useAuthStore';
import { notificationApi } from '../api/notificationApi';
import type { NotificationListResponse } from '../types';

function resolveHubUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, '')}/hubs/notifications`;
  }
  return '/hubs/notifications';
}

export function useNotifications(enabled = true) {
  const session = useAuthStore((state) => {
    const user = state.user;
    return user?.tenantId ? JSON.stringify([user.tenantId, user.id, user.role, user.branchId]) : null;
  });
  const [snapshot, setSnapshot] = useState<{ session: string; data: NotificationListResponse }>();
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !session) return;
    const version = ++requestVersion.current;
    setLoading(true);
    try {
      const data = await notificationApi.getMyNotifications(20);
      if (version === requestVersion.current) setSnapshot({ session, data });
    } catch {
      // Giữ nguyên state hiện tại nếu tạm mất kết nối
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [enabled, session]);

  // Mutations started in an old session must not trigger a refresh for that session.
  const refreshRef = useRef<typeof fetchNotifications | null>(null);
  useEffect(() => {
    refreshRef.current = fetchNotifications;
    return () => { refreshRef.current = null; };
  }, [fetchNotifications]);

  useEffect(() => {
    if (!enabled || !session) return;
    void fetchNotifications();

    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    let disposed = false;
    let refreshTimer: number | undefined;
    let startPromise: Promise<void> | null = null;
    const scheduleRefresh = () => {
      if (disposed || refreshTimer !== undefined) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void fetchNotifications();
      }, 150);
    };
    connection.on('ReceiveNotification', scheduleRefresh);
    connection.onreconnected(scheduleRefresh);
    connection.onclose(() => {
      if (!disposed) scheduleRefresh();
    });

    const startConnection = () => {
      if (disposed || connection.state !== 'Disconnected' || startPromise) return;
      startPromise = connection
        .start()
        .catch(() => {
          // Ignore transient negotiation errors when unmounting or offline
        })
        .finally(() => {
          startPromise = null;
          if (disposed && connection.state !== 'Disconnected') {
            void connection.stop().catch(() => undefined);
          }
        });
    };
    const refreshWhileVisible = () => {
      if (document.visibilityState !== 'visible') return;
      scheduleRefresh();
      startConnection();
    };
    const connectTimer = window.setTimeout(startConnection, 50);
    const poll = window.setInterval(refreshWhileVisible, 30_000);
    window.addEventListener('focus', refreshWhileVisible);
    document.addEventListener('visibilitychange', refreshWhileVisible);

    return () => {
      disposed = true;
      requestVersion.current++;
      window.clearTimeout(connectTimer);
      window.clearTimeout(refreshTimer);
      window.clearInterval(poll);
      window.removeEventListener('focus', refreshWhileVisible);
      document.removeEventListener('visibilitychange', refreshWhileVisible);
      if (startPromise) {
        void startPromise.finally(() => {
          if (connection.state !== 'Disconnected') void connection.stop().catch(() => undefined);
        });
      } else if (connection.state !== 'Disconnected') {
        void connection.stop().catch(() => undefined);
      }
    };
  }, [enabled, session, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
    } catch {
      // Restore the server view if the mutation failed.
    }
    if (refreshRef.current === fetchNotifications) void fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
    } catch {
      // Restore the server view if the mutation failed.
    }
    if (refreshRef.current === fetchNotifications) void fetchNotifications();
  }, [fetchNotifications]);

  const current = enabled && snapshot?.session === session ? snapshot.data : undefined;
  return {
    items: current?.items ?? [],
    unreadCount: current?.unreadCount ?? 0,
    loading: enabled && !!session && loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
