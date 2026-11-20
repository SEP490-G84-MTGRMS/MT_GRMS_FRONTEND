import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { NotificationListResponse } from '../types';

export const notificationApi = {
  getMyNotifications: async (limit = 20): Promise<NotificationListResponse> => {
    const res = await httpClient.get<ApiResponse<NotificationListResponse>>('/notifications', {
      params: { limit },
    });
    return res.data.data ?? { items: [], unreadCount: 0 };
  },

  markAsRead: async (id: string): Promise<boolean> => {
    const res = await httpClient.patch<ApiResponse<boolean>>(`/notifications/${id}/read`);
    return res.data.data ?? false;
  },

  markAllAsRead: async (): Promise<number> => {
    const res = await httpClient.patch<ApiResponse<number>>('/notifications/read-all');
    return res.data.data ?? 0;
  },
};
