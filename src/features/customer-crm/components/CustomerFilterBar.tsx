import { useState, useEffect, type FC, type KeyboardEvent } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import type { DebtFilterStatus } from '../types/customer.types';

export interface CustomerFilterBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  selectedTier?: string;
  onTierChange?: (val: string) => void;
  selectedDebtStatus: DebtFilterStatus;
  onDebtStatusChange: (val: DebtFilterStatus) => void;
  sortOrder?: string;
  onSortOrderChange?: (sort: string) => void;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onSearchSubmit?: () => void;
  onResetFilters?: () => void;
}

export const CustomerFilterBar: FC<CustomerFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedTier = 'ALL',
  onTierChange,
  selectedDebtStatus,
  onDebtStatusChange,
  sortOrder = 'name_asc',
  onSortOrderChange,
  timeRange = 'ALL',
  onTimeRangeChange,
  onSearchSubmit,
  onResetFilters,
}) => {
  const [searchInput, setSearchInput] = useState(searchTerm);

  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchChange(searchInput);
      onSearchSubmit?.();
    }
  };

  const handleManualSearch = () => {
    onSearchChange(searchInput);
    onSearchSubmit?.();
  };

  const handleReset = () => {
    setSearchInput('');
    if (onResetFilters) {
      onResetFilters();
      return;
    }
    onSearchChange('');
    onTierChange?.('ALL');
    onDebtStatusChange('ALL');
    onSortOrderChange?.('name_asc');
    onTimeRangeChange?.('ALL');
  };

  const isFiltered =
    Boolean(searchTerm) ||
    selectedDebtStatus !== 'ALL' ||
    (selectedTier && selectedTier !== 'ALL') ||
    timeRange !== 'ALL' ||
    sortOrder !== 'name_asc';

  return (
    <div className="so-list-filter" style={{ marginBottom: 8 }}>
      {/* ── ROW 1: Responsive CSS Grid ── */}
      <div className="so-filter-grid-3">
        {/* Col 1: Search keyword (name, phone, code) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Tìm kiếm:</span>
          <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
            <input
              type="text"
              className="so-list-filter-input"
              style={{ width: '100%', minWidth: 0, paddingLeft: 28, paddingRight: 24 }}
              placeholder="Tên, SĐT, mã KH..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onSearchChange('');
                }}
                title="Xóa ô tìm kiếm"
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Col 2: Debt status dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Công nợ:</span>
          <select
            className={`so-list-filter-select ${selectedDebtStatus !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={selectedDebtStatus}
            onChange={(e) => onDebtStatusChange(e.target.value as DebtFilterStatus)}
            title="Lọc theo trạng thái công nợ"
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="DEBT">Có công nợ (&gt; 0)</option>
            <option value="NO_DEBT">Không có nợ</option>
          </select>
        </div>

        {/* Col 3: Membership tier selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Hạng thẻ:</span>
          <select
            className={`so-list-filter-select ${selectedTier && selectedTier !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={selectedTier}
            onChange={(e) => onTierChange?.(e.target.value)}
            title="Lọc theo hạng thành viên"
          >
            <option value="ALL">-- Tất cả hạng --</option>
            <option value="Standard">Standard (Chuẩn)</option>
            <option value="Silver">Silver (Bạc)</option>
            <option value="Gold">Gold (Vàng)</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>

      {/* ── ROW 2: Responsive CSS Grid ── */}
      <div className="so-filter-grid-4 so-filter-grid-row2">
        {/* Col 1: Sort order */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Sắp xếp:</span>
          <select
            className={`so-list-filter-select ${sortOrder && sortOrder !== 'name_asc' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={sortOrder}
            onChange={(e) => onSortOrderChange?.(e.target.value)}
            title="Sắp xếp danh sách khách hàng"
          >
            <option value="name_asc">Tên khách hàng (A - Z)</option>
            <option value="name_desc">Tên khách hàng (Z - A)</option>
            <option value="debt_desc">Công nợ giảm dần</option>
            <option value="debt_asc">Công nợ tăng dần</option>
            <option value="points_desc">Điểm tích lũy cao nhất</option>
            <option value="created_desc">Mới tạo gần đây</option>
          </select>
        </div>

        {/* Col 2: Created time range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Thời gian:</span>
          <select
            className={`so-list-filter-select ${timeRange && timeRange !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={timeRange}
            onChange={(e) => onTimeRangeChange?.(e.target.value)}
            title="Khoảng thời gian tạo khách hàng"
          >
            <option value="ALL">Tất cả thời gian</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_year">Năm nay</option>
          </select>
        </div>

        {/* Col 3: Indicator badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {isFiltered && (
            <span
              style={{
                fontSize: 11,
                color: '#0f766e',
                fontWeight: 700,
                backgroundColor: '#ccfbf1',
                padding: '3px 8px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              Đang lọc
            </span>
          )}
        </div>

        {/* Col 4: Action buttons */}
        <div className="so-list-filter-actions" style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="so-list-filter-search"
            onClick={handleManualSearch}
            title="Tìm kiếm theo điều kiện đã nhập"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button
            type="button"
            className="so-list-filter-reset"
            onClick={handleReset}
            title="Đặt lại toàn bộ bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerFilterBar;

