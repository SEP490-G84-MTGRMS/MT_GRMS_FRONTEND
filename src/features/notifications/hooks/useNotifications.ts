import { useCallback, useEffect, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { notificationApi } from '../api/notificationApi';
import type { NotificationItem } from '../types';

function resolveHubUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return `${apiBase.replace(/\/api\/?$/, '')}/hubs/notifications`;
  }
  return '/hubs/notifications';
}

export function useNotifications(enabled = true) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const data = await notificationApi.getMyNotifications(20);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Giữ nguyên state hiện tại nếu tạm mất kết nối
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void fetchNotifications();

    const connection = new HubConnectionBuilder()
      .withUrl(resolveHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (incoming: NotificationItem) => {
      setItems((prev) => {
        if (prev.some((x) => x.id === incoming.id)) return prev;
        return [incoming, ...prev].slice(0, 20);
      });
      if (!incoming.isRead) {
        setUnreadCount((c) => c + 1);
      }
    });

    void connection.start().catch(() => {
      // Fallback vẫn có dữ liệu từ REST API khi tải trang
    });

    return () => {
      void connection.stop();
    };
  }, [enabled, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id && !item.isRead ? { ...item, isRead: true } : item))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationApi.markAsRead(id);
    } catch {
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationApi.markAllAsRead();
    } catch {
      void fetchNotifications();
    }
  }, [fetchNotifications]);

  return {
    items,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
