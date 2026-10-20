// src/pages/store/components/AccountSidebarNav.tsx
import type { FC } from 'react';
import { User, Wallet, ShieldCheck } from 'lucide-react';

export type AccountTabKey = 'account-profile' | 'wallet' | 'terms';

interface AccountSidebarNavProps {
  activeTab: AccountTabKey;
  onSelectTab: (tab: AccountTabKey) => void;
}

export const AccountSidebarNav: FC<AccountSidebarNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside className="store-hub-sidebar" aria-label="Thanh điều hướng tài khoản">
      {/* Nhóm 1: Tài khoản */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Tài khoản & Bảo mật</div>
        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'account-profile' ? 'active' : ''}`}
          onClick={() => onSelectTab('account-profile')}
        >
          <span className="store-sidebar-icon">
            <User size={18} strokeWidth={1.8} />
          </span>
          <span>Tài khoản người dùng</span>
        </button>
      </div>

      {/* Nhóm 2: Ví tiền */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Tài chính gian hàng</div>
        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => onSelectTab('wallet')}
        >
          <span className="store-sidebar-icon">
            <Wallet size={18} strokeWidth={1.8} />
          </span>
          <span>Ví tiền & Thanh toán</span>
        </button>
      </div>

      {/* Nhóm 3: Điều khoản */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Quy định & Cam kết</div>
        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'terms' ? 'active' : ''}`}
          onClick={() => onSelectTab('terms')}
        >
          <span className="store-sidebar-icon">
            <ShieldCheck size={18} strokeWidth={1.8} />
          </span>
          <span>Điều khoản sử dụng</span>
        </button>
      </div>
    </aside>
  );
};
