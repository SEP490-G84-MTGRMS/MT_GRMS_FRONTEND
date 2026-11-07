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

  const selectActive = (active: boolean) =>
    active
      ? { borderColor: '#0d9488', color: '#0f766e', backgroundColor: '#f0fdfa' }
      : undefined;

  return (
    <div className="so-list-filter">
      <div className="so-list-filter-row">
        <div className="so-list-filter-field">
          <label className="so-list-filter-label" htmlFor="batch-product-name">
            Tên sản phẩm:
          </label>
          <input
            id="batch-product-name"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.productName}
            onChange={(e) => onFilterChange('productName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: Sữa Vinamilk..."
            style={{ width: 200 }}
          />
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label" htmlFor="batch-sku">
            Mã SKU:
          </label>
          <input
            id="batch-sku"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.sku}
            onChange={(e) => onFilterChange('sku', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: DY-SUA-01..."
            style={{ width: 140, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label" htmlFor="batch-code">
            Mã lô:
          </label>
          <input
            id="batch-code"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.batchCode}
            onChange={(e) => onFilterChange('batchCode', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: BAT-202608-03..."
            style={{ width: 160, fontFamily: 'var(--font-mono, monospace)' }}
          />
        </div>

        <div className="so-list-filter-field">
          <label className="so-list-filter-label" htmlFor="batch-supplier">
            Nhà cung cấp:
          </label>
          <input
            id="batch-supplier"
            className="so-list-filter-input"
            type="text"
            value={filterInputs.supplierName}
            onChange={(e) => onFilterChange('supplierName', e.target.value)}
            onKeyDown={onEnter}
            placeholder="VD: Tươi Sạch..."
            style={{ width: 180 }}
          />
        </div>
      </div>

      <div className="so-list-filter-row so-list-filter-row--footer">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div className="so-list-filter-field">
            <label className="so-list-filter-label" htmlFor="batch-branch">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} color="#64748b" />
                Chi nhánh:
              </span>
            </label>
            {isEmployee ? (
              <div
                className="so-list-filter-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  minWidth: 140,
                }}
                title="Nhân viên chỉ xem dữ liệu chi nhánh được phân công"
              >
                {employeeBranchName}
              </div>
            ) : (
              <select
                id="batch-branch"
                className="so-list-filter-select"
                value={filterInputs.branchId}
                onChange={(e) => onFilterChange('branchId', e.target.value)}
                style={selectActive(filterInputs.branchId !== 'ALL')}
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

          <div className="so-list-filter-field">
            <label className="so-list-filter-label" htmlFor="batch-status">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Filter size={13} color="#64748b" />
                Trạng thái:
              </span>
            </label>
            <select
              id="batch-status"
              className="so-list-filter-select"
              value={filterInputs.status}
              onChange={(e) => onFilterChange('status', e.target.value as 'ALL' | BatchStatus)}
              style={selectActive(filterInputs.status !== 'ALL')}
            >
              <option value="ALL">-- Tất cả --</option>
              <option value="Expired">Quá hạn (≤ 0 ngày)</option>
              <option value="Critical">Khẩn cấp (1 - 3 ngày)</option>
              <option value="Warning">Cảnh báo (4 - 30 ngày)</option>
              <option value="Normal">An toàn (&gt; 30 ngày)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="po-btn po-btn-primary" onClick={onSearch}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button type="button" className="po-btn po-btn-secondary" onClick={onReset}>
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
          <button type="button" className="po-btn po-btn-secondary" onClick={onPrint}>
            <Printer size={14} />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
