import { useEffect, useRef, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationItem } from '../types';

interface NotificationBellProps {
  badgeBorderColor?: string;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return date.toLocaleDateString('vi-VN');
}

export const NotificationBell: FC<NotificationBellProps> = ({ badgeBorderColor = '#0F766E' }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { items, unreadCount, loading, refresh, markAsRead, markAllAsRead } = useNotifications(true);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void refresh();
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }
    setOpen(false);
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleToggle}
        title={unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Thông báo'}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: open ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          color: '#ffffff',
          transition: 'background-color 0.15s ease',
        }}
      >
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 8,
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${badgeBorderColor}`,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 420,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.16)',
            border: '1px solid #E2E8F0',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              Thông báo ({unreadCount})
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#0F766E',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCheck size={14} /> Đọc tất cả
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 350 }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                Đang tải thông báo...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#64748B' }}>
                Chưa có thông báo nào.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleItemClick(item)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid #F8FAFC',
                    backgroundColor: item.isRead ? '#FFFFFF' : '#F0FDFA',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: item.isRead ? 600 : 700, color: '#0F172A' }}>
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0F766E', flexShrink: 0 }} />
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>{item.message}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{formatRelativeTime(item.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
