import type { FC } from 'react';
import { RotateCw, X } from 'lucide-react';
import type { DebtFilterStatus } from '../types/customer.types';

interface CustomerFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedTier: string;
  onTierChange: (val: string) => void;
  selectedDebtStatus: DebtFilterStatus;
  onDebtStatusChange: (val: DebtFilterStatus) => void;
  onOpenCreate?: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const CustomerFilterBar: FC<CustomerFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedTier,
  onTierChange,
  selectedDebtStatus,
  onDebtStatusChange,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="filter-bar">
      {/* Search box chuẩn prototype: 🔍 Tìm tên, SĐT, mã KH, mã số thuế... */}
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          id="crm-cust-search"
          type="text"
          className="input"
          placeholder="Tìm tên, SĐT, mã KH, mã số thuế..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="customer-clear-btn"
            title="Xóa tìm kiếm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3 Quick Chips lọc nhanh chuẩn prototype */}
      <div className="flex-gap">
        <button
          type="button"
          className={`pill-btn ${selectedDebtStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => onDebtStatusChange('ALL')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`pill-btn ${selectedDebtStatus === 'DEBT' ? 'active' : ''}`}
          onClick={() => onDebtStatusChange('DEBT')}
        >
          Đang nợ
        </button>
        <button
          type="button"
          className={`pill-btn ${selectedDebtStatus === 'OVER_LIMIT' ? 'active' : ''}`}
          onClick={() => onDebtStatusChange('OVER_LIMIT')}
        >
          Vượt hạn mức
        </button>

        {/* Bộ lọc nhóm / hạng thẻ thành viên */}
        <select
          value={selectedTier}
          onChange={(e) => onTierChange(e.target.value)}
          className="select"
          style={{
            height: '32px',
            padding: '0 12px',
            fontSize: '12.5px',
            borderRadius: '9999px',
            border: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg-card, #ffffff)',
            color: 'var(--text-main, #0f172a)',
            cursor: 'pointer',
          }}
          title="Lọc theo nhóm / hạng thẻ thành viên"
        >
          <option value="ALL">Tất cả nhóm khách</option>
          <option value="Standard">Thành viên (Standard)</option>
          <option value="Silver">Thân thiết (Silver)</option>
          <option value="Gold">Bán buôn nhỏ (Gold)</option>
          <option value="VIP">Khách sỉ / VIP</option>
        </select>

        {/* Nút tải lại */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Tải lại danh sách"
          className="pill-btn"
          style={{ padding: '0 10px' }}
        >
          <RotateCw
            className="w-3.5 h-3.5"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              color: isRefreshing ? 'var(--teal-primary, #0f766e)' : 'inherit',
            }}
          />
        </button>
      </div>
    </div>
  );
};
