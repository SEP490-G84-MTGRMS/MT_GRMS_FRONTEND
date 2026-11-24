import { type FC, useEffect, useState, type KeyboardEvent } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
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

export interface ExpenseFilterBarProps {
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

  // Tự động tải danh sách chi nhánh nếu component cha không truyền prop branches
  useEffect(() => {
    if (branches === undefined) {
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

  // Synchronize search input and period dropdown when external filters (such as URL search param) change
  useEffect(() => {
    setSearchInput(filters.keyword || '');
  }, [filters.keyword]);

  useEffect(() => {
    if (!filters.fromDate && !filters.toDate && selectedPeriod !== 'all') {
      setSelectedPeriod('all');
    }
  }, [filters.fromDate, filters.toDate, selectedPeriod]);

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

  const handleManualSearch = () => {
    onFilterChange({ keyword: searchInput });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSearch();
    }
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
      keyword: '',
      category: undefined,
      branchId: undefined,
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
    onReset();
  };

  const isFiltered =
    Boolean(searchInput) ||
    Boolean(filters.category) ||
    Boolean(filters.branchId) ||
    Boolean(filters.status) ||
    (filters.quickStatus && filters.quickStatus !== 'ALL') ||
    selectedPeriod !== 'this-month';

  return (
    <div className="so-list-filter" style={{ marginBottom: 8 }}>
      {/* ── ROW 1: Responsive CSS Grid ── */}
      <div className="so-filter-grid-4">
        {/* Col 1: Search voucher code / description / vendor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Chứng từ:</span>
          <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
            <input
              type="text"
              className="so-list-filter-input"
              style={{ width: '100%', minWidth: 0, paddingLeft: 28, paddingRight: 24 }}
              placeholder="Mã phiếu, NCC, diễn giải..."
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
                  onFilterChange({ keyword: '' });
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

        {/* Col 2: Expense category dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Danh mục:</span>
          <select
            className={`so-list-filter-select ${filters.category ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.category || ''}
            onChange={(e) =>
              onFilterChange({ category: (e.target.value as ExpenseCategory) || undefined })
            }
            title="Lọc theo danh mục chi phí"
          >
            <option value="">-- Tất cả danh mục chi --</option>
            {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Col 3: Branch dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Chi nhánh:</span>
          <select
            className={`so-list-filter-select ${filters.branchId ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.branchId || ''}
            onChange={(e) => onFilterChange({ branchId: e.target.value || undefined })}
            title="Lọc theo chi nhánh"
          >
            <option value="">-- Tất cả chi nhánh --</option>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Col 4: Payment status dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Thanh toán:</span>
          <select
            className={`so-list-filter-select ${filters.status ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.status || ''}
            onChange={(e) => {
              const s = (e.target.value as 'Pending' | 'Paid' | 'Cancelled') || undefined;
              onFilterChange({
                status: s,
              });
            }}
            title="Lọc theo trạng thái thanh toán"
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Paid">Đã thanh toán</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* ── ROW 2: Responsive CSS Grid ── */}
      <div className="so-filter-grid-4 so-filter-grid-row2">
        {/* Col 1: Expense period / date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Thời gian:</span>
          <select
            className={`so-list-filter-select ${selectedPeriod !== 'this-month' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={selectedPeriod}
            onChange={(e) => handlePeriodSelect(e.target.value as PeriodType)}
            title="Kỳ thời gian báo cáo"
          >
            <option value="this-month">Tháng này</option>
            <option value="last-month">Tháng trước</option>
            <option value="this-quarter">Quý này</option>
            <option value="this-year">Năm nay</option>
            <option value="by-month">Chọn tháng cụ thể...</option>
            <option value="custom">Tùy chọn khoảng ngày...</option>
            <option value="all">Toàn bộ thời gian</option>
          </select>
        </div>

        {/* Col 2: Approval status / Anti-Splitting dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Duyệt chi:</span>
          <select
            className={`so-list-filter-select ${filters.quickStatus === 'PENDING_APPROVAL' || filters.quickStatus === 'SUSPICIOUS' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={
              filters.quickStatus === 'PENDING_APPROVAL' || filters.quickStatus === 'SUSPICIOUS'
                ? filters.quickStatus
                : 'ALL'
            }
            onChange={(e) => {
              const val = e.target.value as ExpenseQuickStatus;
              onFilterChange({ quickStatus: val });
            }}
            title="Lọc trạng thái duyệt chi hoặc dấu hiệu nghi vấn"
          >
            <option value="ALL">-- Tất cả duyệt chi --</option>
            <option value="PENDING_APPROVAL">Chờ duyệt chi</option>
            <option value="SUSPICIOUS">Nghi vấn chẻ nhỏ (Anti-Splitting)</option>
          </select>
        </div>

        {/* Col 3: Custom Month / Date range or Filter Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {selectedPeriod === 'by-month' ? (
            <input
              type="month"
              value={customMonth}
              onChange={(e) => handleCustomMonthChange(e.target.value)}
              className="so-list-filter-input"
              style={{ width: '100%', minWidth: 0 }}
              title="Chọn tháng cụ thể"
            />
          ) : selectedPeriod === 'custom' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', minWidth: 0 }}>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => handleCustomDateChange(e.target.value, undefined)}
                className="so-list-filter-input"
                style={{ width: '48%', minWidth: 0, height: 28, fontSize: 11 }}
                title="Từ ngày"
              />
              <span style={{ fontSize: 11, color: '#64748b' }}>-</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => handleCustomDateChange(undefined, e.target.value)}
                className="so-list-filter-input"
                style={{ width: '48%', minWidth: 0, height: 28, fontSize: 11 }}
                title="Đến ngày"
              />
            </div>
          ) : isFiltered ? (
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
          ) : null}
        </div>

        {/* Col 4: Action buttons */}
        <div className="so-list-filter-actions" style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="so-list-filter-search"
            onClick={handleManualSearch}
            title="Tìm kiếm theo điều kiện đã chọn"
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

export default ExpenseFilterBar;

