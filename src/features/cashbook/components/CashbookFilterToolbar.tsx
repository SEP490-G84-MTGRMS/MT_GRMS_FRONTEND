import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC, KeyboardEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { CashbookFilterParams, TransactionType, CashAccount } from '../types/cashbook.types';

export interface CashbookFilterToolbarProps {
  filters: CashbookFilterParams;
  onChangeFilter: (updated: Partial<CashbookFilterParams>) => void;
  onResetFilter: () => void;
  branches?: { id: string; name: string }[];
  accounts?: CashAccount[];
}

export const CashbookFilterToolbar: FC<CashbookFilterToolbarProps> = ({
  filters,
  onChangeFilter,
  onResetFilter,
  branches = [],
  accounts = [],
}) => {
  const [voucherInput, setVoucherInput] = useState(filters.searchQuery || '');
  const [counterpartyInput, setCounterpartyInput] = useState(filters.counterpartyQuery || '');

  const voucherRef = useRef(voucherInput);
  voucherRef.current = voucherInput;

  const counterpartyRef = useRef(counterpartyInput);
  counterpartyRef.current = counterpartyInput;

  // Synchronize inputs only when external filters differ from current user buffer (e.g. on reset or url search)
  useEffect(() => {
    const externalQuery = filters.searchQuery || '';
    if (externalQuery !== voucherRef.current) {
      setVoucherInput(externalQuery);
    }
  }, [filters.searchQuery]);

  useEffect(() => {
    const externalCp = filters.counterpartyQuery || '';
    if (externalCp !== counterpartyRef.current) {
      setCounterpartyInput(externalCp);
    }
  }, [filters.counterpartyQuery]);

  // Debounced search for voucher & description (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (voucherInput !== (filters.searchQuery || '')) {
        onChangeFilter({ searchQuery: voucherInput });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [voucherInput, filters.searchQuery, onChangeFilter]);

  // Debounced search for counterparty (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (counterpartyInput !== (filters.counterpartyQuery || '')) {
        onChangeFilter({ counterpartyQuery: counterpartyInput });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [counterpartyInput, filters.counterpartyQuery, onChangeFilter]);

  const handleManualSearch = useCallback(() => {
    onChangeFilter({
      searchQuery: voucherInput,
      counterpartyQuery: counterpartyInput,
    });
  }, [voucherInput, counterpartyInput, onChangeFilter]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSearch();
    }
  };

  const handlePeriodChange = (val: CashbookFilterParams['datePeriod']) => {
    if (val === 'custom') {
      onChangeFilter({ datePeriod: 'custom' });
      return;
    }
    if (val === 'all') {
      onChangeFilter({
        datePeriod: 'all',
        startDate: undefined,
        endDate: undefined,
      });
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let start: string | undefined;
    let end: string | undefined;

    if (val === 'today') {
      const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      start = todayStr;
      end = todayStr;
    } else if (val === 'last_7_days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      end = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else if (val === 'this_month') {
      const lastDay = new Date(year, month + 1, 0);
      start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    } else if (val === 'last_month') {
      const firstDayPrev = new Date(year, month - 1, 1);
      const lastDayPrev = new Date(year, month, 0);
      start = `${firstDayPrev.getFullYear()}-${String(firstDayPrev.getMonth() + 1).padStart(2, '0')}-01`;
      end = `${lastDayPrev.getFullYear()}-${String(lastDayPrev.getMonth() + 1).padStart(2, '0')}-${String(lastDayPrev.getDate()).padStart(2, '0')}`;
    }

    onChangeFilter({
      datePeriod: val,
      startDate: start,
      endDate: end,
    });
  };

  const handleTypeSelectChange = (val: string) => {
    if (val === 'TRANSFER') {
      onChangeFilter({ transactionType: 'ALL', sourceType: 'INTERNAL_TRANSFER' });
    } else {
      onChangeFilter({ transactionType: val as TransactionType | 'ALL', sourceType: undefined });
    }
  };

  const currentTypeSelectValue =
    filters.sourceType === 'INTERNAL_TRANSFER' ? 'TRANSFER' : filters.transactionType || 'ALL';

  return (
    <div className="so-list-filter">
      {/* ── ROW 1: Responsive CSS Grid ── */}
      <div className="so-filter-grid-4">
        {/* Col 1: Mã chứng từ / diễn giải */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Chứng từ:</span>
          <input
            type="text"
            className="so-list-filter-input"
            style={{ width: '100%', minWidth: 0 }}
            placeholder="Mã phiếu, diễn giải..."
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Col 2: Tìm đối tượng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Đối tượng:</span>
          <input
            type="text"
            className="so-list-filter-input"
            style={{ width: '100%', minWidth: 0 }}
            placeholder="Khách hàng / NCC..."
            value={counterpartyInput}
            onChange={(e) => setCounterpartyInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Col 3: Tài khoản quỹ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Quỹ / Két:</span>
          <select
            className={`so-list-filter-select ${filters.accountId && filters.accountId !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.accountId || 'ALL'}
            onChange={(e) => onChangeFilter({ accountId: e.target.value })}
            title="Lọc theo tài khoản quỹ"
          >
            <option value="ALL">-- Tất cả tài khoản --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName}
              </option>
            ))}
          </select>
        </div>

        {/* Col 4: Loại giao dịch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Loại GD:</span>
          <select
            className={`so-list-filter-select ${filters.transactionType && filters.transactionType !== 'ALL' || filters.sourceType ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={currentTypeSelectValue}
            onChange={(e) => handleTypeSelectChange(e.target.value)}
            title="Lọc theo loại giao dịch"
          >
            <option value="ALL">-- Tất cả loại phiếu --</option>
            <option value="RECEIPT">Phiếu Thu (+)</option>
            <option value="PAYMENT">Phiếu Chi (-)</option>
            <option value="TRANSFER">Chuyển nội bộ (⇄)</option>
            <option value="ADJUSTMENT">Điều chỉnh kiểm kê</option>
          </select>
        </div>
      </div>

      {/* ── ROW 2: Responsive CSS Grid ── */}
      <div className="so-filter-grid-4 so-filter-grid-row2">
        {/* Col 1: Chi nhánh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Chi nhánh:</span>
          <select
            className={`so-list-filter-select ${filters.branchId && filters.branchId !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.branchId || 'ALL'}
            onChange={(e) => onChangeFilter({ branchId: e.target.value, accountId: 'ALL' })}
            title="Lọc theo chi nhánh"
          >
            <option value="ALL">-- Toàn hệ thống (chỉ xem) --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Col 2: Thời gian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Thời gian:</span>
          <select
            className={`so-list-filter-select ${filters.datePeriod && filters.datePeriod !== 'this_month' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.datePeriod || 'this_month'}
            onChange={(e) => handlePeriodChange(e.target.value as CashbookFilterParams['datePeriod'])}
            title="Lọc theo khoảng thời gian"
          >
            <option value="this_month">Tháng này</option>
            <option value="today">Hôm nay</option>
            <option value="last_7_days">7 ngày qua</option>
            <option value="last_month">Tháng trước</option>
            <option value="all">Tất cả thời gian</option>
            <option value="custom">Tùy chọn ngày...</option>
          </select>
        </div>

        {/* Col 3: Trạng thái */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span className="so-list-filter-label" style={{ minWidth: 65 }}>Trạng thái:</span>
          <select
            className={`so-list-filter-select ${filters.status && filters.status !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
            style={{ width: '100%', minWidth: 0 }}
            value={filters.status || 'ALL'}
            onChange={(e) => onChangeFilter({ status: e.target.value as any })}
            title="Lọc theo trạng thái bút toán"
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="ACTIVE">Hợp lệ</option>
            <option value="VOIDED">Đã gạch bỏ</option>
            <option value="COMPENSATING">Bút toán bù trừ</option>
          </select>
        </div>

        {/* Col 4: Button group Tìm kiếm & Đặt lại */}
        <div className="so-list-filter-actions" style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <button
            type="button"
            className="so-list-filter-search"
            onClick={handleManualSearch}
            title="Tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button
            type="button"
            className="so-list-filter-reset"
            onClick={onResetFilter}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Date Range Pickers if 'custom' is active */}
      {filters.datePeriod === 'custom' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingTop: 8,
            borderTop: '1px dashed #e2e8f0',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <span style={{ fontWeight: 600 }}>Khoảng ngày: Từ</span>
          <input
            type="date"
            className="so-list-filter-input"
            style={{ height: 28, fontSize: 12 }}
            value={filters.startDate || ''}
            onChange={(e) => onChangeFilter({ startDate: e.target.value })}
          />
          <span style={{ fontWeight: 600 }}>Đến</span>
          <input
            type="date"
            className="so-list-filter-input"
            style={{ height: 28, fontSize: 12 }}
            value={filters.endDate || ''}
            onChange={(e) => onChangeFilter({ endDate: e.target.value })}
          />
        </div>
      )}
    </div>
  );
};
