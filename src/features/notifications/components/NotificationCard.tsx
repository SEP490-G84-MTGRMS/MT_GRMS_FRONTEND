import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type { AppNotification } from '../types/notification';
import { useNotificationStore } from '../stores/useNotificationStore';

interface NotificationCardProps {
  notification: AppNotification;
  showDelete?: boolean;
}

/**
 * Format ISO date string into human-friendly relative Vietnamese time
 */
const formatRelativeTime = (isoString: string): string => {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(isoString).toLocaleDateString('vi-VN');
};

/**
 * Notification Card Component with icon, quick action and deep linking
 */
export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  showDelete = false,
}) => {
  const navigate = useNavigate();
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);
  const setOpenPopover = useNotificationStore((state) => state.setOpenPopover);
  const setOpenDrawer = useNotificationStore((state) => state.setOpenDrawer);

  const handleCardClick = () => {
    markAsRead(notification.id);
    if (notification.action?.url) {
      setOpenPopover(false);
      setOpenDrawer(false);
      navigate(notification.action.url);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
    if (notification.action?.url) {
      setOpenPopover(false);
      setOpenDrawer(false);
      navigate(notification.action.url);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  // Render appropriate icon based on severity
  const renderIcon = () => {
    switch (notification.severity) {
      case 'critical':
        return <AlertTriangle size={18} />;
      case 'warning':
        return <Clock size={18} />;
      case 'info':
        return <Info size={18} />;
      case 'success':
        return <CheckCircle2 size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  const actionVariantClass = () => {
    switch (notification.action?.variant) {
      case 'danger':
        return 'notif-action-danger';
      case 'secondary':
        return 'notif-action-secondary';
      default:
        return 'notif-action-primary';
    }
  };

  return (
    <div
      className={`notif-card ${!notification.isRead ? 'is-unread' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCardClick();
      }}
    >
      <div className={`notif-icon-box notif-icon-${notification.severity}`}>
        {renderIcon()}
      </div>

      <div className="notif-card-content">
        <div className="notif-card-header">
          <span className="notif-card-title">{notification.title}</span>
          {!notification.isRead && <span className="notif-unread-dot" />}
        </div>

        <p className="notif-card-desc">{notification.message}</p>

        <div className="notif-card-footer">
          <span className="notif-time-text">
            {formatRelativeTime(notification.createdAt)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {notification.action && (
              <button
                type="button"
                className={`notif-action-btn ${actionVariantClass()}`}
                onClick={handleActionClick}
              >
                {notification.action.label}
                <ExternalLink size={12} />
              </button>
            )}

            {showDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Xóa thông báo"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
