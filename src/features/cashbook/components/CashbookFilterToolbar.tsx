import { type FC, useState, useEffect } from 'react';
import {
  Search,
  X,
  ChevronDown,
  RotateCcw,
  Building2,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import type { CashbookFilterParams, TransactionType } from '../types/cashbook.types';

interface CashbookFilterToolbarProps {
  filters: CashbookFilterParams;
  onChangeFilter: (updated: Partial<CashbookFilterParams>) => void;
  onResetFilter: () => void;
  branches?: { id: string; name: string }[];
}

export const CashbookFilterToolbar: FC<CashbookFilterToolbarProps> = ({
  filters,
  onChangeFilter,
  onResetFilter,
  branches,
}) => {
  const [searchInput, setSearchInput] = useState(filters.searchQuery || '');
  const [isCustomDate, setIsCustomDate] = useState(filters.datePeriod === 'custom');

  // Debounce search query changes by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (filters.searchQuery || '')) {
        onChangeFilter({ searchQuery: searchInput });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, filters.searchQuery, onChangeFilter]);

  // Sync internal search input if external filter changes (e.g. reset)
  useEffect(() => {
    setSearchInput(filters.searchQuery || '');
  }, [filters.searchQuery]);

  useEffect(() => {
    setIsCustomDate(filters.datePeriod === 'custom');
  }, [filters.datePeriod]);

  const branchOptions = [
    { id: 'ALL', label: 'Toàn hệ thống' },
    ...(branches && branches.length > 0
      ? branches.map((b) => ({ id: b.id, label: b.name }))
      : [
          { id: 'BR-01', label: 'Chi nhánh Q1' },
          { id: 'BR-02', label: 'Chi nhánh Q7' },
        ]),
  ];

  const typeOptions = [
    { id: 'ALL', label: 'Tất cả loại phiếu' },
    { id: 'RECEIPT', label: 'Phiếu Thu (+)' },
    { id: 'PAYMENT', label: 'Phiếu Chi (-)' },
    { id: 'TRANSFER', label: 'Chuyển nội bộ' },
    { id: 'ADJUSTMENT', label: 'Điều chỉnh kiểm kê' },
  ];

  const periodOptions: { id: CashbookFilterParams['datePeriod']; label: string }[] = [
    { id: 'all', label: 'Tất cả thời gian' },
    { id: 'this_month', label: 'Tháng này' },
    { id: 'today', label: 'Hôm nay' },
    { id: 'last_7_days', label: '7 ngày qua' },
    { id: 'last_month', label: 'Tháng trước' },
    { id: 'custom', label: 'Tùy chọn khoảng ngày...' },
  ];

  const isFiltered =
    (filters.branchId && filters.branchId !== 'ALL') ||
    (filters.transactionType && filters.transactionType !== 'ALL') ||
    Boolean(filters.sourceType) ||
    (filters.datePeriod && filters.datePeriod !== 'this_month') ||
    Boolean(filters.searchQuery) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  const handlePeriodChange = (val: CashbookFilterParams['datePeriod']) => {
    if (val === 'custom') {
      setIsCustomDate(true);
      onChangeFilter({ datePeriod: 'custom' });
    } else {
      setIsCustomDate(false);
      onChangeFilter({
        datePeriod: val,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onChangeFilter({ searchQuery: '' });
  };

  const handleQuickChipSelect = (chip: 'ALL' | 'RECEIPT' | 'PAYMENT' | 'INTERNAL_TRANSFER') => {
    if (chip === 'ALL') {
      onChangeFilter({ transactionType: 'ALL', sourceType: undefined });
    } else if (chip === 'RECEIPT') {
      onChangeFilter({ transactionType: 'RECEIPT', sourceType: undefined });
    } else if (chip === 'PAYMENT') {
      onChangeFilter({ transactionType: 'PAYMENT', sourceType: undefined });
    } else if (chip === 'INTERNAL_TRANSFER') {
      onChangeFilter({ transactionType: 'ALL', sourceType: 'INTERNAL_TRANSFER' });
    }
  };

  const currentTypeSelectValue =
    filters.sourceType === 'INTERNAL_TRANSFER' ? 'TRANSFER' : filters.transactionType || 'ALL';

  const handleTypeSelectChange = (val: string) => {
    if (val === 'TRANSFER') {
      onChangeFilter({ transactionType: 'ALL', sourceType: 'INTERNAL_TRANSFER' });
    } else {
      onChangeFilter({ transactionType: val as TransactionType | 'ALL', sourceType: undefined });
    }
  };

  return (
    <div className="cb-filter-panel">
      {/* Top Filter Bar: Search + Filter Selects */}
      <div className="cb-filter-row-top">
        {/* Search Input with Debounce */}
        <div className="cb-search-bar">
          <Search size={18} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            type="text"
            className="cb-search-input"
            placeholder="Tìm theo mã phiếu, đối tượng (khách/NCC), diễn giải..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Dropdowns Row */}
        <div className="cb-filter-select-group">
          {/* Branch Select */}
          <div className="cb-select-wrapper" style={{ minWidth: 160 }}>
            <div className="cb-select-icon-left">
              <Building2 size={16} />
            </div>
            <select
              value={filters.branchId || 'ALL'}
              onChange={(e) => onChangeFilter({ branchId: e.target.value })}
              className="cb-native-select"
              title="Lọc theo chi nhánh"
            >
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
            <div className="cb-select-icon-right">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Transaction Type Select */}
          <div className="cb-select-wrapper" style={{ minWidth: 175 }}>
            <div className="cb-select-icon-left">
              <SlidersHorizontal size={16} />
            </div>
            <select
              value={currentTypeSelectValue}
              onChange={(e) => handleTypeSelectChange(e.target.value)}
              className="cb-native-select"
              title="Lọc theo loại giao dịch"
            >
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="cb-select-icon-right">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Period Select */}
          <div className="cb-select-wrapper" style={{ minWidth: 155 }}>
            <div className="cb-select-icon-left">
              <Calendar size={16} />
            </div>
            <select
              value={filters.datePeriod || 'this_month'}
              onChange={(e) =>
                handlePeriodChange(e.target.value as CashbookFilterParams['datePeriod'])
              }
              className="cb-native-select"
              title="Lọc theo khoảng thời gian"
            >
              {periodOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <div className="cb-select-icon-right">
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Reset Button */}
          {isFiltered && (
            <button
              type="button"
              className="cb-reset-filter-btn"
              onClick={onResetFilter}
              title="Đặt lại tất cả bộ lọc về mặc định"
            >
              <RotateCcw size={14} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-row: Quick Type Chips & Custom Date Range Pickers */}
      <div className="cb-filter-row-bottom">
        {/* Quick Type Selection Pills: 4 Pill Chips chuẩn prototype */}
        <div className="cb-quick-chip-group">
          <span className="cb-quick-chip-label">Phân loại:</span>
          <button
            type="button"
            onClick={() => handleQuickChipSelect('ALL')}
            className={`cb-quick-chip ${!filters.sourceType && (!filters.transactionType || filters.transactionType === 'ALL') ? 'active-all' : ''}`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => handleQuickChipSelect('RECEIPT')}
            className={`cb-quick-chip ${!filters.sourceType && filters.transactionType === 'RECEIPT' ? 'active-receipt' : ''}`}
          >
            Thu tiền
          </button>
          <button
            type="button"
            onClick={() => handleQuickChipSelect('PAYMENT')}
            className={`cb-quick-chip ${!filters.sourceType && filters.transactionType === 'PAYMENT' ? 'active-payment' : ''}`}
          >
            Chi tiền
          </button>
          <button
            type="button"
            onClick={() => handleQuickChipSelect('INTERNAL_TRANSFER')}
            className={`cb-quick-chip ${filters.sourceType === 'INTERNAL_TRANSFER' ? 'active-transfer' : ''}`}
            title="Lọc các bút toán kép chuyển quỹ nội bộ (sourceType = INTERNAL_TRANSFER)"
          >
            Chuyển nội bộ
          </button>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {isCustomDate && (
          <div className="cb-custom-date-box">
            <span>Từ:</span>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onChangeFilter({ startDate: e.target.value })}
              className="cb-custom-date-input"
            />
            <span>Đến:</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onChangeFilter({ endDate: e.target.value })}
              className="cb-custom-date-input"
            />
          </div>
        )}
      </div>
    </div>
  );
};
