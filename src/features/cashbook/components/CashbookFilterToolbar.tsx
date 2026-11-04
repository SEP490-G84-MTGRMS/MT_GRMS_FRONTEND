import type { FC } from 'react';
import type { CashbookFilterParams, TransactionType } from '../types/cashbook.types';

interface CashbookFilterToolbarProps {
  filters: CashbookFilterParams;
  onChangeFilter: (updated: Partial<CashbookFilterParams>) => void;
  onResetFilter: () => void;
}

export const CashbookFilterToolbar: FC<CashbookFilterToolbarProps> = ({
  filters,
  onChangeFilter,
  onResetFilter,
}) => {
  const branchOptions = [
    { id: 'ALL', label: 'Toàn hệ thống' },
    { id: 'BR-01', label: 'Chi nhánh Q1' },
    { id: 'BR-02', label: 'Chi nhánh Q7' },
  ];

  const typeOptions: { id: TransactionType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Tất cả loại phiếu' },
    { id: 'RECEIPT', label: '🟢 Phiếu Thu (+)' },
    { id: 'PAYMENT', label: '🔴 Phiếu Chi (-)' },
    { id: 'ADJUSTMENT', label: '🟠 Điều chỉnh kiểm kê' },
  ];

  const periodOptions: { id: CashbookFilterParams['datePeriod']; label: string }[] = [
    { id: 'this_month', label: 'Tháng này' },
    { id: 'today', label: 'Hôm nay' },
    { id: 'last_7_days', label: '7 ngày qua' },
    { id: 'last_month', label: 'Tháng trước' },
  ];

  return (
    <div className="cashbook-toolbar-card">
      <div className="toolbar-filter-row">
        {/* Lọc loại giao dịch */}
        <div className="toolbar-pills-group">
          {typeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`pill-filter-btn ${
                (filters.transactionType || 'ALL') === opt.id ? 'active' : ''
              }`}
              onClick={() => onChangeFilter({ transactionType: opt.id })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Ô tìm kiếm */}
        <div className="toolbar-search-input">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Tìm theo mã GD, đối tượng, diễn giải..."
            value={filters.searchQuery || ''}
            onChange={(e) => onChangeFilter({ searchQuery: e.target.value })}
          />
        </div>
      </div>

      <div className="toolbar-filter-row">
        {/* Lọc chi nhánh & thời gian */}
        <div className="toolbar-pills-group">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Chi nhánh:
          </span>
          {branchOptions.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`pill-filter-btn ${(filters.branchId || 'ALL') === b.id ? 'active' : ''}`}
              onClick={() => onChangeFilter({ branchId: b.id })}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="toolbar-pills-group">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Thời gian:
          </span>
          {periodOptions.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`pill-filter-btn ${
                (filters.datePeriod || 'this_month') === p.id ? 'active' : ''
              }`}
              onClick={() => onChangeFilter({ datePeriod: p.id })}
            >
              {p.label}
            </button>
          ))}

          <button
            type="button"
            className="pill-filter-btn"
            style={{ color: 'var(--text-faint)', borderColor: 'var(--border-light)' }}
            onClick={onResetFilter}
          >
            🔄 Đặt lại
          </button>
        </div>
      </div>
    </div>
  );
};
