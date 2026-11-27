// src/pages/store/components/StoreTopStatusBar.tsx
import type { FC } from 'react';
import type { StoreInfo } from '../storeData';

interface StoreTopStatusBarProps {
  storeInfo: StoreInfo;
  onNavigateBranches?: () => void;
}

export const StoreTopStatusBar: FC<StoreTopStatusBarProps> = ({
  storeInfo,
  onNavigateBranches,
}) => {
  const days = storeInfo.daysRemaining;
  const expiryBadgeStyle =
    days <= 7
      ? {
          backgroundColor: '#FFF0F0',
          color: '#FF3B30',
          border: '1px solid #FFD6D6',
        }
      : days <= 15
        ? {
            backgroundColor: '#FFF8EB',
            color: '#FF9500',
            border: '1px solid #FFE8CC',
          }
        : {
            backgroundColor: '#E8F9EE',
            color: '#008738',
            border: '1px solid #BBF7D0',
          };

  return (
    <div className="store-top-status-bar">
      <div className="store-status-col">
        <span className="store-status-label">Gói hiện tại</span>
        <div className="store-status-value">
          <span className="store-badge-trial">{storeInfo.currentPlan || 'Chưa kích hoạt'}</span>
        </div>
      </div>

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

      <div className="store-status-col">
        <span className="store-status-label">Tên cửa hàng</span>
        <div className="store-status-value">{storeInfo.name || '—'}</div>
      </div>

      <div className="store-status-col">
        <span className="store-status-label">Hạn sử dụng còn</span>
        <div className="store-status-value">
          <span
            className={days <= 7 ? 'store-badge-warning-red' : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 12px',
              borderRadius: 9999,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              ...expiryBadgeStyle,
            }}
          >
            {days} ngày
          </span>
        </div>
      </div>
    </div>
  );
};
