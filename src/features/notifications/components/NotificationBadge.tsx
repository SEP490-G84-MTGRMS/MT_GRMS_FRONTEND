import React from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../stores/useNotificationStore';

interface NotificationBadgeProps {
  className?: string;
}

/**
 * Notification bell trigger button with dynamic unread badge count
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className = '' }) => {
  const isOpenPopover = useNotificationStore((state) => state.isOpenPopover);
  const togglePopover = useNotificationStore((state) => state.togglePopover);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);

  const unreadCount = getUnreadCount();
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <button
      type="button"
      className={`notif-bell-btn ${isOpenPopover ? 'is-active' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        togglePopover();
      }}
      title="Thông báo hệ thống"
      aria-label="Thông báo"
    >
      <Bell size={16} />
      {unreadCount > 0 && (
        <span className="notif-badge-pill" data-testid="unread-badge">
          {displayCount}
        </span>
      )}
    </button>
  );
};
