import React from 'react';
import { X, Search, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../stores/useNotificationStore';
import type { NotificationFilterType } from '../types/notification';
import { NotificationCard } from './NotificationCard';

/**
 * Extended Slide Drawer for inspecting, filtering and managing full notification history
 */
export const NotificationDrawer: React.FC = () => {
  const isOpenDrawer = useNotificationStore((state) => state.isOpenDrawer);
  const setOpenDrawer = useNotificationStore((state) => state.setOpenDrawer);
  const notifications = useNotificationStore((state) => state.notifications);
  const filterSeverity = useNotificationStore((state) => state.filterSeverity);
  const setFilterSeverity = useNotificationStore((state) => state.setFilterSeverity);
  const searchQuery = useNotificationStore((state) => state.searchQuery);
  const setSearchQuery = useNotificationStore((state) => state.setSearchQuery);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAllRead = useNotificationStore((state) => state.clearAllRead);
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);

  if (!isOpenDrawer) return null;

  const unreadCount = getUnreadCount();

  // Filter list by severity and search term
  const filteredList = notifications.filter((item) => {
    const matchSeverity =
      filterSeverity === 'all' ? true : item.severity === filterSeverity;
    const matchQuery =
      searchQuery.trim() === ''
        ? true
        : item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSeverity && matchQuery;
  });

  const filterOptions: { label: string; value: NotificationFilterType }[] = [
    { label: 'Tất cả', value: 'all' },
    { label: '🔴 Khẩn cấp', value: 'critical' },
    { label: '🟡 Cảnh báo', value: 'warning' },
    { label: '🔵 Thông tin', value: 'info' },
    { label: '🟢 Hoàn thành', value: 'success' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="notif-drawer-backdrop"
        onClick={() => setOpenDrawer(false)}
        role="presentation"
      />

      {/* Slide Panel */}
      <div className="notif-drawer-panel" role="dialog" aria-label="Trung tâm thông báo">
        {/* Drawer Header */}
        <div className="notif-drawer-header">
          <div className="notif-drawer-title">
            <Bell size={20} color="#2563eb" />
            <span>Trung tâm thông báo</span>
            {unreadCount > 0 && (
              <span className="notif-count-chip">{unreadCount} chưa đọc</span>
            )}
          </div>
          <button
            type="button"
            className="notif-drawer-close-btn"
            onClick={() => setOpenDrawer(false)}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Controls: Search & Severity Chips */}
        <div className="notif-drawer-controls">
          <div className="notif-search-input-wrap">
            <Search size={15} className="notif-search-icon" />
            <input
              type="text"
              className="notif-search-input"
              placeholder="Tìm kiếm thông báo, số điện thoại, mã đơn..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="notif-filter-chips">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`notif-chip ${filterSeverity === opt.value ? 'is-active' : ''}`}
                onClick={() => setFilterSeverity(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body List */}
        <div className="notif-drawer-body">
          {filteredList.length === 0 ? (
            <div className="notif-empty-state">
              <Search size={36} className="notif-empty-icon" />
              <span className="notif-empty-title">Không tìm thấy thông báo</span>
              <span className="notif-empty-desc">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc mức độ khác.
              </span>
            </div>
          ) : (
            filteredList.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                showDelete={true}
              />
            ))
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="notif-drawer-footer">
          <button
            type="button"
            className="notif-drawer-footer-btn notif-delete-read-btn"
            onClick={clearAllRead}
            title="Dọn dẹp các thông báo đã đọc"
          >
            <Trash2 size={14} />
            Dọn dẹp đã đọc
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-drawer-footer-btn notif-read-all-btn"
              onClick={markAllAsRead}
              style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}
            >
              <CheckCheck size={14} />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>
    </>
  );
};
