import { type FC, useEffect, useState } from 'react';
import { SearchIcon, RefreshIcon } from '../../admin/components';
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type ExpenseFilterParams,
  type ExpenseStatus,
} from '../types/expense.types';
import {
  calculatePeriodRange,
  type PeriodType,
} from '../utils/datePeriodUtils';

interface ExpenseFilterBarProps {
  filters: ExpenseFilterParams;
  onFilterChange: (updated: Partial<ExpenseFilterParams>) => void;
  onReset: () => void;
  onPeriodLabelChange?: (label: string) => void;
}

export const ExpenseFilterBar: FC<ExpenseFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  onPeriodLabelChange,
}) => {
  const [searchInput, setSearchInput] = useState(filters.keyword || '');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this-month');
  const [customMonth, setCustomMonth] = useState('2026-10');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (filters.keyword || '')) {
        onFilterChange({ keyword: searchInput });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, filters.keyword, onFilterChange]);

  // Apply date range according to selected period
  const applyPeriod = (
    period: PeriodType,
    monthVal?: string,
    fromVal?: string,
    toVal?: string
  ) => {
    const range = calculatePeriodRange(period, monthVal, fromVal, toVal);
    onFilterChange({
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
    if (onPeriodLabelChange) {
      onPeriodLabelChange(range.label);
    }
  };

  const handlePeriodSelect = (p: PeriodType) => {
    setSelectedPeriod(p);
    if (p === 'by-month') {
      applyPeriod('by-month', customMonth);
    } else if (p === 'custom') {
      applyPeriod('custom', undefined, customFrom, customTo);
    } else {
      applyPeriod(p);
    }
  };

  const handleCustomMonthChange = (val: string) => {
    setCustomMonth(val);
    applyPeriod('by-month', val);
  };

  const handleCustomDateChange = (fromVal?: string, toVal?: string) => {
    const f = fromVal !== undefined ? fromVal : customFrom;
    const t = toVal !== undefined ? toVal : customTo;
    if (fromVal !== undefined) setCustomFrom(fromVal);
    if (toVal !== undefined) setCustomTo(toVal);
    applyPeriod('custom', undefined, f, t);
  };

  const handleReset = () => {
    setSearchInput('');
    setSelectedPeriod('this-month');
    setCustomMonth('2026-10');
    setCustomFrom('');
    setCustomTo('');
    const range = calculatePeriodRange('this-month');
    if (onPeriodLabelChange) {
      onPeriodLabelChange(range.label);
    }
    onReset();
  };

  return (
    <div className="expense-filter-bar">
      <div className="expense-filter-inputs">
        {/* Search Bar with Debounce */}
        <div className="expense-search-wrapper">
          <div className="expense-search-icon">
            <SearchIcon size={16} color="#94a3b8" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã chi phí, nhà cung cấp, nội dung..."
            className="expense-search-input"
          />
        </div>

        {/* Period Selector (Tháng này, tháng trước, quý này, tùy chỉnh...) */}
        <div>
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodSelect(e.target.value as PeriodType)}
            aria-label="Kỳ thời gian"
            className="expense-filter-select"
            style={{ fontWeight: 600, color: 'var(--blue-primary, #0066ff)' }}
          >
            <option value="this-month">Tháng này (10/2026)</option>
            <option value="last-month">Tháng trước (09/2026)</option>
            <option value="this-quarter">Quý 4/2026</option>
            <option value="this-year">Năm 2026</option>
            <option value="by-month">Chọn tháng bất kỳ...</option>
            <option value="custom">Tùy chọn khoảng ngày...</option>
            <option value="all">Toàn bộ thời gian</option>
          </select>
        </div>

        {/* Specific Month Picker when 'by-month' is selected */}
        {selectedPeriod === 'by-month' && (
          <div>
            <input
              type="month"
              value={customMonth}
              onChange={(e) => handleCustomMonthChange(e.target.value)}
              className="expense-date-input"
              title="Chọn tháng cụ thể"
            />
          </div>
        )}

        {/* Custom Date Range Picker when 'custom' is selected */}
        {selectedPeriod === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => handleCustomDateChange(e.target.value, undefined)}
              className="expense-date-input"
              placeholder="Từ ngày"
              title="Từ ngày"
            />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>-</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => handleCustomDateChange(undefined, e.target.value)}
              className="expense-date-input"
              placeholder="Đến ngày"
              title="Đến ngày"
            />
          </div>
        )}

        {/* Branch Selection */}
        <div>
          <select
            value={filters.branchId || ''}
            onChange={(e) => onFilterChange({ branchId: e.target.value || undefined })}
            aria-label="Lọc theo chi nhánh"
            className="expense-filter-select"
          >
            <option value="">Tất cả chi nhánh</option>
            <option value="BR-01">Quận 1 (Trụ sở)</option>
            <option value="BR-02">Bình Thạnh</option>
            <option value="BR-03">Thủ Đức</option>
          </select>
        </div>

        {/* Category Selection */}
        <div>
          <select
            value={filters.category || ''}
            onChange={(e) =>
              onFilterChange({ category: (e.target.value as ExpenseCategory) || undefined })
            }
            aria-label="Lọc theo danh mục"
            className="expense-filter-select"
          >
            <option value="">Tất cả danh mục chi</option>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selection */}
        <div>
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({ status: (e.target.value as ExpenseStatus) || undefined })
            }
            aria-label="Lọc theo trạng thái"
            className="expense-filter-select"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Paid">Đã thanh toán</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Reset Filter Button */}
      <button
        type="button"
        onClick={handleReset}
        className="btn-secondary-pill"
        title="Đặt lại bộ lọc về mặc định"
      >
        <RefreshIcon size={14} color="currentColor" />
        <span>Đặt lại</span>
      </button>
    </div>
  );
};
