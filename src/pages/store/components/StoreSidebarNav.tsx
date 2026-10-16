// src/pages/store/components/StoreSidebarNav.tsx
import type { FC } from 'react';
import {
  Store,
  Boxes,
  History,
  FileCheck2,
  User,
  Wallet,
  ShieldCheck,
} from 'lucide-react';

export type StoreHubTabKey =
  | 'store-info'
  | 'subscriptions'
  | 'order-history'
  | 'service-confirm'
  | 'account-profile'
  | 'wallet'
  | 'terms';

interface StoreSidebarNavProps {
  activeTab: StoreHubTabKey;
  onSelectTab: (tab: StoreHubTabKey) => void;
}

export const StoreSidebarNav: FC<StoreSidebarNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <aside className="store-hub-sidebar" aria-label="Thanh điều hướng gian hàng">
      {/* Nhóm 1: Gian hàng */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Gian hàng</div>
        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'store-info' ? 'active' : ''}`}
          onClick={() => onSelectTab('store-info')}
        >
          <span className="store-sidebar-icon">
            <Store size={18} strokeWidth={1.8} />
          </span>
          <span>Thông tin gian hàng</span>
        </button>
      </div>

      {/* Nhóm 2: Gói dịch vụ */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Gói dịch vụ MT-GRMS</div>
        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
          onClick={() => onSelectTab('subscriptions')}
        >
          <span className="store-sidebar-icon">
            <Boxes size={18} strokeWidth={1.8} />
          </span>
          <span>Gói dịch vụ</span>
        </button>

        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'order-history' ? 'active' : ''}`}
          onClick={() => onSelectTab('order-history')}
        >
          <span className="store-sidebar-icon">
            <History size={18} strokeWidth={1.8} />
          </span>
          <span>Lịch sử mua hàng</span>
        </button>

        <button
          type="button"
          className={`store-sidebar-item ${activeTab === 'service-confirm' ? 'active' : ''}`}
          onClick={() => onSelectTab('service-confirm')}
        >
          <span className="store-sidebar-icon">
            <FileCheck2 size={18} strokeWidth={1.8} />
          </span>
          <span>Bản xác nhận dịch vụ</span>
        </button>
      </div>

      {/* Nhóm 3: Khác */}
      <div className="store-sidebar-group">
        <div className="store-sidebar-title">Khác & Tài khoản</div>
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
