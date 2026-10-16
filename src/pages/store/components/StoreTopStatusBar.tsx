// src/pages/store/components/StoreTopStatusBar.tsx
import type { FC } from 'react';
import { PlusCircle } from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface StoreTopStatusBarProps {
  storeInfo: StoreInfo;
  onOpenTopupModal: () => void;
}

export const StoreTopStatusBar: FC<StoreTopStatusBarProps> = ({
  storeInfo,
  onOpenTopupModal,
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
      <div className="store-status-col">
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

      {/* 5. Số dư ví & Nút Nạp tiền */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          borderLeft: '1px solid #EDF2F9',
          paddingLeft: 24,
        }}
      >
        <div className="store-status-col">
          <span className="store-status-label">Ví gian hàng</span>
          <div className="store-status-value">
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 16,
                fontWeight: 800,
                color: '#15803D',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Intl.NumberFormat('vi-VN').format(storeInfo.walletBalance)} đ
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTopupModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: '#0066FF',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          title="Nạp tiền vào ví gian hàng qua VietQR Napas247"
        >
          <PlusCircle size={15} strokeWidth={2.2} />
          <span>Nạp ví</span>
        </button>
      </div>
    </div>
  );
};
