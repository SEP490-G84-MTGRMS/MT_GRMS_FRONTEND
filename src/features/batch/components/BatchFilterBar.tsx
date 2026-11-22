import { useEffect, useState, type FC, type KeyboardEvent } from 'react';
import { Search, RotateCcw, Filter, Printer, Building2 } from 'lucide-react';
import type { BatchBranchOption, BatchFilterState, BatchStatus, UserRole } from '../types/batch.types';
import { branchApi } from '../../purchase-order/api/branchApi';

interface BatchFilterBarProps {
  filterInputs: BatchFilterState;
  role: UserRole;
  employeeBranchId?: string;
  onFilterChange: <K extends keyof BatchFilterState>(key: K, value: BatchFilterState[K]) => void;
  onSearch: () => void;
  onReset: () => void;
  onPrint: () => void;
}

export const BatchFilterBar: FC<BatchFilterBarProps> = ({
  filterInputs,
  role,
  employeeBranchId = '',
  onFilterChange,
  onSearch,
  onReset,
  onPrint,
}) => {
  const isEmployee = role === 'employee';
  const [branches, setBranches] = useState<BatchBranchOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await branchApi.getBranches({
          keyword: '',
          branchCode: 'all',
          status: 'all',
          pageIndex: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        setBranches(
          items.map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code,
          }))
        );
      } catch {
        if (!cancelled) setBranches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const employeeBranchName =
    branches.find((b) => b.id === employeeBranchId)?.name ||
    branches.find((b) => b.code === employeeBranchId)?.name ||
    employeeBranchId ||
    'Chi nhánh được phân công';

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  const hasActiveFilters = Boolean(
    filterInputs.productName.trim() ||
      filterInputs.sku.trim() ||
      filterInputs.batchCode.trim() ||
      filterInputs.supplierName.trim() ||
      filterInputs.keyword.trim() ||
      filterInputs.branchId !== 'ALL' ||
      filterInputs.status !== 'ALL'
  );

  return (
    <div className="so-list-filter">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '10px 14px',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-product-name"
            style={{
              width: 88,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            Tên SP:
          </label>
          <input
            id="batch-product-name"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.productName}
            onChange={(e) => onFilterChange('productName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="Nhập tên sản phẩm..."
            style={{ flex: 1, minWidth: 0, height: 32 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-sku"
            style={{
              width: 72,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            Mã hàng:
          </label>
          <input
            id="batch-sku"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.sku}
            onChange={(e) => onFilterChange('sku', e.target.value)}
            onKeyDown={onEnter}
            placeholder="Nhập mã hàng..."
            style={{ flex: 1, minWidth: 0, height: 32, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-code"
            style={{
              width: 56,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            Mã lô:
          </label>
          <input
            id="batch-code"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.batchCode}
            onChange={(e) => onFilterChange('batchCode', e.target.value)}
            onKeyDown={onEnter}
            placeholder="Nhập mã lô / phiếu nhập..."
            style={{ flex: 1, minWidth: 0, height: 32, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <label
            htmlFor="batch-supplier"
            style={{
              width: 72,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: '#475569',
              whiteSpace: 'nowrap',
            }}
          >
            NCC:
          </label>
          <input
            id="batch-supplier"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.supplierName}
            onChange={(e) => onFilterChange('supplierName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="Nhập tên nhà cung cấp..."
            style={{ flex: 1, minWidth: 0, height: 32 }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="batch-branch"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              <Building2 size={13} color="#64748b" />
              Chi nhánh:
            </label>
            {isEmployee ? (
              <div
                className="so-list-filter-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 32,
                  padding: '0 10px',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  fontSize: 12.5,
                  minWidth: 140,
                }}
                title="Nhân viên chỉ xem dữ liệu chi nhánh được phân công"
              >
                {employeeBranchName}
              </div>
            ) : (
              <select
                id="batch-branch"
                className={`so-list-filter-select ${filterInputs.branchId !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
                value={filterInputs.branchId}
                onChange={(e) => onFilterChange('branchId', e.target.value)}
                style={{ height: 32, minWidth: 160, fontSize: 12.5, fontWeight: 600 }}
              >
                <option value="ALL">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ? `${b.code} — ${b.name}` : b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <label
              htmlFor="batch-status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                whiteSpace: 'nowrap',
              }}
            >
              <Filter size={13} color="#64748b" />
              Trạng thái:
            </label>
            <select
              id="batch-status"
              className={`so-list-filter-select ${filterInputs.status !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
              value={filterInputs.status}
              onChange={(e) => onFilterChange('status', e.target.value as 'ALL' | BatchStatus)}
              style={{ height: 32, minWidth: 160, fontSize: 12.5, fontWeight: 600 }}
            >
              <option value="ALL">-- Tất cả --</option>
              <option value="Expired">Quá hạn (≤ 0 ngày)</option>
              <option value="Critical">Khẩn cấp (1 - 3 ngày)</option>
              <option value="Warning">Cảnh báo (4 - 30 ngày)</option>
              <option value="Normal">An toàn (&gt; 30 ngày)</option>
            </select>
          </div>

          {hasActiveFilters && <span className="so-list-filter-badge">Đang lọc</span>}
        </div>

        <div
          className="so-list-filter-actions"
          style={{
            justifyContent: 'flex-end',
            width: 'max-content',
            flexWrap: 'nowrap',
            gap: 8,
            marginLeft: 0,
          }}
        >
          <button type="button" className="so-list-filter-search" onClick={onSearch}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button type="button" className="so-list-filter-reset" onClick={onReset}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
          <button type="button" className="so-list-filter-reset" onClick={onPrint} title="In báo cáo">
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
