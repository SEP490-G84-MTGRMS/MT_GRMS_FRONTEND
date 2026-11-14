import { type FC, useEffect, useState } from 'react';
import { SearchIcon, RefreshIcon } from '../../admin/components';
import { employeeApi } from '../../employee/api/employeeApi';
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type ExpenseFilterParams,
  type ExpenseQuickStatus,
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
  branches?: { id: string; name: string }[];
}

export const ExpenseFilterBar: FC<ExpenseFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  onPeriodLabelChange,
  branches,
}) => {
  const currentMonthIso = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [searchInput, setSearchInput] = useState(filters.keyword || '');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('this-month');
  const [customMonth, setCustomMonth] = useState(currentMonthIso);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [internalBranches, setInternalBranches] = useState<{ id: string; name: string }[]>([]);

  // Tự động tải danh sách chi nhánh nếu component cha không truyền xuống
  useEffect(() => {
    if (!branches || branches.length === 0) {
      let isMounted = true;
      employeeApi.getBranches().then((list) => {
        if (isMounted && list && list.length > 0) {
          setInternalBranches(list);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [branches]);

  const activeBranches = branches && branches.length > 0 ? branches : internalBranches;

  // Synchronize search input when external filters (such as URL search param) change
  useEffect(() => {
    setSearchInput(filters.keyword || '');
  }, [filters.keyword]);

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

  const STATUS_CHIPS: { id: ExpenseQuickStatus; label: string }[] = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
    { id: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
    { id: 'PAID', label: 'Đã thanh toán' },
    { id: 'SUSPICIOUS', label: 'Bất thường' },
  ];

  const handleChipClick = (id: ExpenseQuickStatus) => {
    onFilterChange({
      quickStatus: id,
      status: id === 'PAID' ? 'Paid' : id === 'PENDING_PAYMENT' ? 'Pending' : undefined,
    });
  };

  const handleReset = () => {
    setSearchInput('');
    setSelectedPeriod('this-month');
    setCustomMonth(currentMonthIso);
    setCustomFrom('');
    setCustomTo('');
    const range = calculatePeriodRange('this-month');
    if (onPeriodLabelChange) {
      onPeriodLabelChange(range.label);
    }
    onFilterChange({
      quickStatus: 'ALL',
      status: undefined,
    });
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
            style={{ fontWeight: 600, color: 'var(--blue-primary, #0F766E)' }}
          >
            <option value="this-month">Tháng này ({calculatePeriodRange('this-month').label})</option>
            <option value="last-month">Tháng trước ({calculatePeriodRange('last-month').label})</option>
            <option value="this-quarter">Quý này ({calculatePeriodRange('this-quarter').label})</option>
            <option value="this-year">Năm nay ({calculatePeriodRange('this-year').label})</option>
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
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
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

        {/* 5 Quick Chips (Pill buttons): Tất cả | Chờ duyệt | Chờ thanh toán | Đã thanh toán | Bất thường */}
        <div className="expense-quick-chips">
          {STATUS_CHIPS.map((chip) => {
            const isActive = (filters.quickStatus || 'ALL') === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.id)}
                className={`expense-pill-btn ${isActive ? 'active' : ''}`}
              >
                {chip.label}
              </button>
            );
          })}
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
