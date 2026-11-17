import React from 'react';
import { RefreshCw } from 'lucide-react';

export type FinanceTabKey = 'overview' | 'pnl';

interface FinanceHeaderProps {
  todayLabel: string;
  activeTab: FinanceTabKey;
  onTabChange: (tab: FinanceTabKey) => void;
  isRefreshing: boolean;
  onRefreshAll: () => void;
}

/**
 * Top Header and Control Bar for Finance Overview Page.
 * Features an interactive Accounting Mode switch, action buttons, and Sub-tabs navigation.
 */
export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  todayLabel,
  activeTab,
  onTabChange,
  isRefreshing,
  onRefreshAll,
}) => {
  return (
    <div className="finance-header-wrapper">
      <div className="finance-overview-header">
        <div className="finance-overview-title">
          <h1>Tổng quan tài chính & lãi lỗ</h1>
          <p>
            Theo dõi tiền thực tại quầy, két sắt, ngân hàng và lãi ròng cửa hàng từ một nguồn dữ liệu ({todayLabel})
          </p>
        </div>

        <div className="finance-overview-actions">
          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="finance-btn-secondary"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Cập nhật</span>
          </button>

        </div>
      </div>

      {/* Sub-tabs Navigation Bar */}
      <nav className="finance-subtabs-bar" role="tablist" aria-label="Phân hệ tài chính">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`finance-subtab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onTabChange('overview')}
        >
          Sức khỏe tiền mặt
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pnl'}
          className={`finance-subtab-btn ${activeTab === 'pnl' ? 'active' : ''}`}
          onClick={() => onTabChange('pnl')}
        >
          Lãi lỗ (P&L)
        </button>
      </nav>
    </div>
  );
};
