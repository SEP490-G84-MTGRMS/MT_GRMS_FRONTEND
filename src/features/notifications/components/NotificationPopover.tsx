import React, { useEffect, useRef } from 'react';
import { BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { NotificationCard } from './NotificationCard';

interface NotificationPopoverProps {
  onClose?: () => void;
}

/**
 * Dropdown Popover container for rapid notification access from the top nav
 */
export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((state) => state.notifications);
  const isOpenPopover = useNotificationStore((state) => state.isOpenPopover);
  const setOpenPopover = useNotificationStore((state) => state.setOpenPopover);
  const setOpenDrawer = useNotificationStore((state) => state.setOpenDrawer);
  const activeTab = useNotificationStore((state) => state.activeTab);
  const setActiveTab = useNotificationStore((state) => state.setActiveTab);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);

  const unreadCount = getUnreadCount();

  // Click outside to dismiss popover
  useEffect(() => {
    if (!isOpenPopover) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(false);
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpenPopover, setOpenPopover, onClose]);

  if (!isOpenPopover) return null;

  const unreadList = notifications.filter((item) => !item.isRead);
  const displayList = activeTab === 'unread' ? unreadList : notifications;

  const handleOpenDrawer = () => {
    setOpenPopover(false);
    setOpenDrawer(true);
  };

  return (
    <div
      ref={popoverRef}
      className="notif-popover-container"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Thông báo"
    >
      {/* Popover Header */}
      <div className="notif-popover-header">
        <div className="notif-popover-title">
          <span>Thông báo</span>
          {unreadCount > 0 && (
            <span className="notif-count-chip">{unreadCount} mới</span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-read-all-btn"
            onClick={markAllAsRead}
          >
            <CheckCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Tabs: Unread vs All */}
      <div className="notif-tab-bar">
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'unread' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('unread')}
        >
          Chưa đọc ({unreadCount})
        </button>
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Tất cả ({notifications.length})
        </button>
      </div>

      {/* List content */}
      <div className="notif-list-body">
        {displayList.length === 0 ? (
          <div className="notif-empty-state">
            <BellOff size={36} className="notif-empty-icon" />
            <span className="notif-empty-title">
              {activeTab === 'unread'
                ? 'Bạn đã đọc hết mọi thông báo!'
                : 'Chưa có thông báo nào'}
            </span>
            <span className="notif-empty-desc">
              Hệ thống sẽ cập nhật thông báo tự động khi có biến động nghiệp vụ.
            </span>
          </div>
        ) : (
          displayList.slice(0, 8).map((notif) => (
            <NotificationCard key={notif.id} notification={notif} />
          ))
        )}
      </div>

      {/* Popover Footer: See all in drawer */}
      <div className="notif-popover-footer">
        <button
          type="button"
          className="notif-see-all-btn"
          onClick={handleOpenDrawer}
        >
          <span>Xem tất cả lịch sử thông báo</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
