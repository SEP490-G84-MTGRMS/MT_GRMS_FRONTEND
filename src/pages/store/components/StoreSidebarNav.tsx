// src/pages/store/components/StoreSidebarNav.tsx
import type { FC } from 'react';
import {
  Store,
  Boxes,
  History,
  FileCheck2,
} from 'lucide-react';

export type StoreHubTabKey =
  | 'store-info'
  | 'subscriptions'
  | 'order-history'
  | 'service-confirm';

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
    </aside>
  );
};
