import { create } from 'zustand';

export interface AlertNotification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  createdAt: string;
}

interface NotificationState {
  notifications: AlertNotification[];
  addNotification: (noti: Omit<AlertNotification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (noti) => {
    const newAlert: AlertNotification = {
      ...noti,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ notifications: [newAlert, ...state.notifications] }));
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearAll: () => set({ notifications: [] }),
}));
