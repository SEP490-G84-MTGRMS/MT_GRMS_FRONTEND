import type { FC } from 'react';
import { Search, RotateCcw, X, Building, Store, Filter } from 'lucide-react';
import type { SupplierReturnFilterState, SupplierReturnStatus } from '../types/supplierReturn.types';
import '../../../styles/so-list-page.css';

interface Props {
  draft: SupplierReturnFilterState;
  totalFiltered: number;
  totalAll: number;
  lockBranch?: boolean;
  suppliers: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  onChange: (patch: Partial<SupplierReturnFilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
  onCreateNew?: () => void;
}

const STATUS_OPTIONS: { value: '' | SupplierReturnStatus; label: string }[] = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PENDING_SUPPLIER', label: 'Chờ NCC duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt (Chờ giao)' },
  { value: 'COMPLETED', label: 'Đã bàn giao' },
  { value: 'REJECTED', label: 'NCC từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export const SupplierReturnFilterBar: FC<Props> = ({
  draft,
  totalFiltered,
  totalAll,
  lockBranch,
  suppliers,
  branches,
  onChange,
  onSearch,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    draft.keyword.trim() || draft.branchId || draft.supplierId || draft.status
  );

  return (
    <div className="so-list-filter">
      {/* ── Row 1: Search Input (Full text) ── */}
      <div className="so-list-filter-row">
        <div style={{ flex: '1 1 360px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={15}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="so-list-filter-input"
            value={draft.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Tìm kiếm theo mã phiếu trả (RTV), mã phiếu nhập gốc (GRN), tên nhà cung cấp..."
            style={{
              width: '100%',
              paddingLeft: 32,
              paddingRight: draft.keyword ? 30 : 10,
            }}
          />
          {draft.keyword && (
            <button
              type="button"
              onClick={() => {
                onChange({ keyword: '' });
              }}
              title="Xóa từ khóa"
              style={{
                position: 'absolute',
                right: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: Select Filters & Search/Reset Actions (Footer) ── */}
      <div className="so-list-filter-row so-list-filter-row--footer">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px' }}>
          {/* Dropdown Chi nhánh */}
          <div className="so-list-filter-field">
            <label className="so-list-filter-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Store size={13} color="#64748b" />
              <span>Chi nhánh:</span>
            </label>
            <select
              className={`so-list-filter-select ${draft.branchId ? 'so-list-filter-select--active' : ''}`}
              value={draft.branchId}
              disabled={lockBranch}
              onChange={(e) => onChange({ branchId: e.target.value })}
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Nhà cung cấp */}
          <div className="so-list-filter-field">
            <label className="so-list-filter-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building size={13} color="#64748b" />
              <span>Nhà cung cấp:</span>
            </label>
            <select
              className={`so-list-filter-select ${draft.supplierId ? 'so-list-filter-select--active' : ''}`}
              value={draft.supplierId}
              onChange={(e) => onChange({ supplierId: e.target.value })}
            >
              <option value="">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Trạng thái */}
          <div className="so-list-filter-field">
            <label className="so-list-filter-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} color="#64748b" />
              <span>Trạng thái:</span>
            </label>
            <select
              className={`so-list-filter-select ${draft.status ? 'so-list-filter-select--active' : ''}`}
              value={draft.status}
              onChange={(e) => onChange({ status: e.target.value as SupplierReturnStatus | '' })}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter badge counter */}
          {hasActiveFilters && (
            <div className="so-list-filter-badge">
              Đang lọc: {totalFiltered} / {totalAll} phiếu
            </div>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div className="so-list-filter-actions">
          <button
            type="button"
            className="so-list-filter-search"
            onClick={onSearch}
            title="Áp dụng bộ lọc tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="so-list-filter-reset"
            onClick={onReset}
            disabled={!hasActiveFilters}
            title="Khôi phục bộ lọc mặc định"
            style={{ opacity: hasActiveFilters ? 1 : 0.6 }}
          >
            <RotateCcw size={14} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
