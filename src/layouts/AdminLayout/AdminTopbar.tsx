import type { FC } from 'react';
import { SearchIcon, BellIcon } from '../../features/admin/components';

interface AdminTopbarProps {
  onSearch?: (query: string) => void;
}

export const AdminTopbar: FC<AdminTopbarProps> = ({ onSearch }) => {
  return (
    <header className="admin-topbar">
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 480 }}>
        <div className="admin-search-wrapper">
          <span className="admin-search-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <SearchIcon size={16} color="var(--text-faint)" />
          </span>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm nhanh chuỗi cửa hàng, subdomain, MST, email..."
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--bg-soft-blue)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: 'var(--text-muted)',
          }}
          title="Thông báo hệ thống"
        >
          <BellIcon size={18} color="var(--text-muted)" />
          <span
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--red-accent)',
              border: '1.5px solid #ffffff',
            }}
          />
        </button>

        <div className="admin-profile-pill">
          <div className="admin-avatar">AD</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              Super Admin
            </span>
            <span style={{ fontSize: 11, color: 'var(--blue-primary)', fontWeight: 600 }}>
              Quản trị Nền tảng
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
