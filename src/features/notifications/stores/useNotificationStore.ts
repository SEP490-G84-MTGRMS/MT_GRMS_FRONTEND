import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppNotification,
  NotificationTab,
  NotificationFilterType,
} from '../types/notification';
import { INITIAL_NOTIFICATIONS } from '../data/mockNotifications';

interface NotificationState {
  notifications: AppNotification[];
  isOpenPopover: boolean;
  isOpenDrawer: boolean;
  activeTab: NotificationTab;
  filterSeverity: NotificationFilterType;
  searchQuery: string;

  // Actions
  setOpenPopover: (open: boolean) => void;
  setOpenDrawer: (open: boolean) => void;
  togglePopover: () => void;
  setActiveTab: (tab: NotificationTab) => void;
  setFilterSeverity: (severity: NotificationFilterType) => void;
  setSearchQuery: (query: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllRead: () => void;
  resetToMock: () => void;

  // Selectors
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      isOpenPopover: false,
      isOpenDrawer: false,
      activeTab: 'unread',
      filterSeverity: 'all',
      searchQuery: '',

      setOpenPopover: (open: boolean) => set({ isOpenPopover: open }),
      setOpenDrawer: (open: boolean) => set({ isOpenDrawer: open }),
      togglePopover: () => set((state) => ({ isOpenPopover: !state.isOpenPopover })),

      setActiveTab: (tab: NotificationTab) => set({ activeTab: tab }),
      setFilterSeverity: (severity: NotificationFilterType) =>
        set({ filterSeverity: severity }),
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      /**
       * Mark a single notification as read
       */
      markAsRead: (id: string) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
          ),
        }));
      },

      /**
       * Mark all unread notifications as read
       */
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((item) => ({
            ...item,
            isRead: true,
          })),
        }));
      },

      /**
       * Delete a single notification by id
       */
      deleteNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((item) => item.id !== id),
        }));
      },

      /**
       * Remove all notifications marked as read
       */
      clearAllRead: () => {
        set((state) => ({
          notifications: state.notifications.filter((item) => !item.isRead),
        }));
      },

      /**
       * Reset notification store back to initial mock data
       */
      resetToMock: () => {
        set({
          notifications: INITIAL_NOTIFICATIONS,
          activeTab: 'unread',
          filterSeverity: 'all',
          searchQuery: '',
        });
      },

      /**
       * Calculate total unread count
       */
      getUnreadCount: () => {
        return get().notifications.filter((item) => !item.isRead).length;
      },
    }),
    {
      name: 'mt_grms_notifications_v1',
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
);
