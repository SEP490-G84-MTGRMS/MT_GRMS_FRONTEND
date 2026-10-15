import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, BellIcon } from '../../features/admin/components';
import { useAuthStore } from '../../stores/useAuthStore';

interface AdminTopbarProps {
  onSearch?: (query: string) => void;
}

export const AdminTopbar: FC<AdminTopbarProps> = ({ onSearch }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };
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

        <button
          type="button"
          onClick={handleLogout}
          style={{
            height: 38,
            padding: '0 14px',
            borderRadius: '9999px',
            background: '#FFF0F0',
            border: '1px solid #FFD6D6',
            color: '#FF3B30',
            fontSize: 12.5,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          title="Đăng xuất khỏi hệ thống"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};
