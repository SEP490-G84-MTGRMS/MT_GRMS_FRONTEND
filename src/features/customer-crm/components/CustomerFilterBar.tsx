import type { FC } from 'react';
import { Search, UserPlus, RotateCw, X } from 'lucide-react';
import type { DebtFilterStatus } from '../types/customer.types';

interface CustomerFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedTier: string;
  onTierChange: (val: string) => void;
  selectedDebtStatus: DebtFilterStatus;
  onDebtStatusChange: (val: DebtFilterStatus) => void;
  onOpenCreate: () => void;
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
  onOpenCreate,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="customer-filter-bar">
      {/* Search & Select filters */}
      <div className="customer-filter-left">
        {/* Search Input */}
        <div className="customer-search-box">
          <Search className="w-4 h-4 customer-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo SĐT, Họ tên, Tên đại lý..."
            className="customer-search-input"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="customer-clear-btn"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Membership Tier Filter */}
        <select
          value={selectedTier}
          onChange={(e) => onTierChange(e.target.value)}
          className="customer-select"
        >
          <option value="ALL">Tất cả hạng thẻ</option>
          <option value="Standard">Standard (Chuẩn)</option>
          <option value="Silver">Silver (Bạc)</option>
          <option value="Gold">Gold (Vàng)</option>
          <option value="VIP">VIP</option>
        </select>

        {/* Debt Status Filter */}
        <select
          value={selectedDebtStatus}
          onChange={(e) => onDebtStatusChange(e.target.value as DebtFilterStatus)}
          className="customer-select"
        >
          <option value="ALL">Tất cả trạng thái nợ</option>
          <option value="NO_DEBT">Không nợ (0 đ)</option>
          <option value="IN_LIMIT">Còn nợ trong hạn mức</option>
          <option value="OVER_LIMIT">Cảnh báo: Vượt hạn mức</option>
        </select>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Tải lại danh sách"
          className="action-icon-btn"
          style={{ width: '38px', height: '38px' }}
        >
          <RotateCw
            className="w-4 h-4"
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              color: isRefreshing ? 'var(--blue-primary)' : 'inherit',
            }}
          />
        </button>

        <button
          onClick={onOpenCreate}
          className="btn-primary-pill"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm khách hàng</span>
        </button>
      </div>
    </div>
  );
};