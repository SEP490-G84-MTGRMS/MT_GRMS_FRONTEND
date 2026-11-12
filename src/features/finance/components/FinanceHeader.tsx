import React from 'react';
import { RefreshCw, Printer, BookOpen, Clock } from 'lucide-react';

export type FinanceTabKey = 'all' | 'overview' | 'pnl';

interface FinanceHeaderProps {
  todayLabel: string;
  activeTab: FinanceTabKey;
  onTabChange: (tab: FinanceTabKey) => void;
  accountingMode: boolean;
  onToggleAccountingMode: () => void;
  isRefreshing: boolean;
  canExport: boolean;
  onRefreshAll: () => void;
  onOpenExportModal: () => void;
  onNavigateCashbook: () => void;
  onNavigateCashControl: () => void;
}

/**
 * Top Header and Control Bar for Finance Overview Page.
 * Features an interactive Accounting Mode switch, action buttons, and Sub-tabs navigation.
 */
export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  todayLabel,
  activeTab,
  onTabChange,
  accountingMode,
  onToggleAccountingMode,
  isRefreshing,
  canExport,
  onRefreshAll,
  onOpenExportModal,
  onNavigateCashbook,
  onNavigateCashControl,
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
          {/* Accounting Mode Switch */}
          <label className="finance-accounting-toggle-pill" title="Bật/tắt đối chiếu Kế toán dồn tích vs Thực thu chi">
            <span className="finance-accounting-toggle-text">Chế độ Kế toán</span>
            <button
              type="button"
              role="switch"
              aria-checked={accountingMode}
              className={`finance-switch-control ${accountingMode ? 'on' : ''}`}
              onClick={onToggleAccountingMode}
            >
              <span className="finance-switch-thumb" />
            </button>
          </label>

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

          {/* Export Report Action */}
          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={!canExport}
            className="finance-btn-secondary"
            title="In và xuất báo cáo Lãi lỗ"
          >
            <Printer size={15} />
            <span>In & Xuất Báo Cáo</span>
          </button>

          {/* Navigate to Pending Shifts & Safes */}
          <button
            type="button"
            onClick={onNavigateCashControl}
            className="finance-btn-secondary"
            title="Xem Ca & Két chờ duyệt"
          >
            <Clock size={15} />
            <span>Ca & Két chờ duyệt</span>
          </button>

          {/* Navigate to Cashbook */}
          <button
            type="button"
            onClick={onNavigateCashbook}
            className="btn-primary-teal"
            id="btn-quick-receipt-payment"
            title="Mở Sổ quỹ chi tiết để quản lý Thu / Chi tiền"
          >
            <BookOpen size={15} />
            <span>Mở Sổ quỹ Thu/Chi</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs Navigation Bar */}
      <nav className="finance-subtabs-bar" role="tablist" aria-label="Phân hệ tài chính">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`finance-subtab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => onTabChange('all')}
        >
          Tổng hợp (Tiền mặt & P&L)
        </button>
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
