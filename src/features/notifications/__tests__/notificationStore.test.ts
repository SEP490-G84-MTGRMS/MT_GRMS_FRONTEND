import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../stores/useNotificationStore';

describe('Notification Center Store (useNotificationStore)', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().resetToMock();
    useNotificationStore.getState().setOpenPopover(false);
    useNotificationStore.getState().setOpenDrawer(false);
  });

  it('should initialize with mock notifications and calculate correct unread count', () => {
    const store = useNotificationStore.getState();
    expect(store.notifications.length).toBeGreaterThan(0);
    const expectedUnread = store.notifications.filter((n) => !n.isRead).length;
    expect(store.getUnreadCount()).toBe(expectedUnread);
  });

  it('should toggle and set popover visibility correctly', () => {
    const { togglePopover, setOpenPopover } = useNotificationStore.getState();

    expect(useNotificationStore.getState().isOpenPopover).toBe(false);
    togglePopover();
    expect(useNotificationStore.getState().isOpenPopover).toBe(true);
    setOpenPopover(false);
    expect(useNotificationStore.getState().isOpenPopover).toBe(false);
  });

  it('should mark a specific notification as read and decrement unread count', () => {
    const { notifications, markAsRead, getUnreadCount } = useNotificationStore.getState();
    const firstUnread = notifications.find((n) => !n.isRead);
    expect(firstUnread).toBeDefined();

    const initialUnreadCount = getUnreadCount();
    markAsRead(firstUnread!.id);

    const updated = useNotificationStore.getState().notifications.find(
      (n) => n.id === firstUnread!.id
    );
    expect(updated?.isRead).toBe(true);
    expect(useNotificationStore.getState().getUnreadCount()).toBe(initialUnreadCount - 1);
  });

  it('should mark all notifications as read and set unread count to zero', () => {
    const { markAllAsRead } = useNotificationStore.getState();
    markAllAsRead();

    expect(useNotificationStore.getState().getUnreadCount()).toBe(0);
    const unreadItems = useNotificationStore
      .getState()
      .notifications.filter((n) => !n.isRead);
    expect(unreadItems.length).toBe(0);
  });

  it('should delete a notification by id', () => {
    const { notifications, deleteNotification } = useNotificationStore.getState();
    const target = notifications[0];
    const initialLength = notifications.length;

    deleteNotification(target.id);

    const afterDelete = useNotificationStore.getState().notifications;
    expect(afterDelete.length).toBe(initialLength - 1);
    expect(afterDelete.some((n) => n.id === target.id)).toBe(false);
  });

  it('should clear all read notifications leaving only unread ones', () => {
    const { clearAllRead } = useNotificationStore.getState();
    clearAllRead();

    const remaining = useNotificationStore.getState().notifications;
    expect(remaining.every((n) => !n.isRead)).toBe(true);
  });

  it('should change tab and filter criteria accurately', () => {
    const { setActiveTab, setFilterSeverity, setSearchQuery } =
      useNotificationStore.getState();

    setActiveTab('all');
    expect(useNotificationStore.getState().activeTab).toBe('all');

    setFilterSeverity('critical');
    expect(useNotificationStore.getState().filterSeverity).toBe('critical');

    setSearchQuery('sữa tươi');
    expect(useNotificationStore.getState().searchQuery).toBe('sữa tươi');
  });
});
