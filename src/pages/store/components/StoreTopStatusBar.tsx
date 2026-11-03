// src/pages/store/components/StoreTopStatusBar.tsx
import type { FC } from 'react';
import { PlusCircle } from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface StoreTopStatusBarProps {
  storeInfo: StoreInfo;
  onOpenTopupModal: () => void;
  onNavigateBranches?: () => void;
}

export const StoreTopStatusBar: FC<StoreTopStatusBarProps> = ({
  storeInfo,
  onOpenTopupModal,
  onNavigateBranches,
}) => {
  return (
    <div className="store-top-status-bar">
      {/* 1. Gói hiện tại */}
      <div className="store-status-col">
        <span className="store-status-label">Gói hiện tại</span>
        <div className="store-status-value">
          <span className="store-badge-trial">{storeInfo.currentPlan}</span>
        </div>
      </div>

      {/* 2. Số chi nhánh */}
      <div
        className="store-status-col"
        onClick={onNavigateBranches}
        style={{ cursor: onNavigateBranches ? 'pointer' : 'default' }}
        title="Bấm để chuyển sang Quản lý chi nhánh"
      >
        <span className="store-status-label">Số chi nhánh</span>
        <div className="store-status-value">
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {storeInfo.branchesCount > 90 ? '99+' : storeInfo.branchesCount}
          </span>
        </div>
      </div>

      {/* 3. Ngành hàng */}
      <div className="store-status-col">
        <span className="store-status-label">Ngành hàng</span>
        <div className="store-status-value">{storeInfo.industry}</div>
      </div>

      {/* 4. Hạn sử dụng còn */}
      <div className="store-status-col">
        <span className="store-status-label">Hạn sử dụng còn</span>
        <div className="store-status-value">
          <span className="store-badge-warning-red">
            {storeInfo.daysRemaining} ngày
          </span>
        </div>
      </div>

      {/* 5. Ví gian hàng & Nút nạp ví */}
      <div className="store-status-col store-status-wallet">
        <div>
          <span className="store-status-label">Ví gian hàng</span>
          <div className="store-status-value">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                color: '#0066FF',
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(storeInfo.walletBalance)} đ
            </span>
          </div>
        </div>

        <button
          type="button"
          className="store-btn-topup"
          onClick={onOpenTopupModal}
          title="Nạp tiền vào ví gian hàng qua Napas VietQR"
        >
          <PlusCircle size={15} strokeWidth={2.2} />
          <span>Nạp ví</span>
        </button>
      </div>
    </div>
  );
};
