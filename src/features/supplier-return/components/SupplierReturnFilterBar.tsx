import type { CSSProperties, FC } from 'react';
import { Search, RotateCcw, Plus } from 'lucide-react';
import type { SupplierReturnFilterState } from '../types/supplierReturn.types';

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
  onCreateNew: () => void;
}

const selectStyle = (active: boolean): CSSProperties => ({
  height: 34,
  padding: '0 10px',
  borderRadius: 6,
  border: active ? '1px solid #0d9488' : '1px solid #cbd5e1',
  fontSize: 12,
  fontWeight: 600,
  color: active ? '#0f766e' : '#334155',
  backgroundColor: active ? '#f0fdfa' : '#ffffff',
  cursor: 'pointer',
  outline: 'none',
});

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
  onCreateNew,
}) => {
  const hasActive = Boolean(
    draft.keyword.trim() || draft.branchId || draft.supplierId || draft.status
  );

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {/* Search Input */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 240px', minWidth: 220 }}>
          <input
            type="text"
            value={draft.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Tìm mã phiếu trả, mã GRN, NCC..."
            style={{
              flex: 1,
              height: 34,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Branch Filter */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Chi nhánh:</label>
          <select
            value={draft.branchId}
            disabled={lockBranch}
            onChange={(e) => onChange({ branchId: e.target.value })}
            style={selectStyle(Boolean(draft.branchId))}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Supplier Filter */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Nhà cung cấp:</label>
          <select
            value={draft.supplierId}
            onChange={(e) => onChange({ supplierId: e.target.value })}
            style={selectStyle(Boolean(draft.supplierId))}
          >
            <option value="">Tất cả nhà cung cấp</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Trạng thái:</label>
          <select
            value={draft.status}
            onChange={(e) => onChange({ status: e.target.value as SupplierReturnFilterState['status'] })}
            style={selectStyle(Boolean(draft.status))}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Khởi tạo (DRAFT)</option>
            <option value="PENDING_SUPPLIER">Chờ phản hồi NCC</option>
            <option value="APPROVED">Đã duyệt (Chờ bàn giao)</option>
            <option value="REJECTED">Từ chối toàn bộ</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {/* Search & Reset Buttons */}
        <button
          type="button"
          className="po-btn po-btn-primary"
          style={{ height: 34, padding: '0 12px' }}
          onClick={onSearch}
        >
          <Search size={14} />
          <span>Tìm kiếm</span>
        </button>
        <button
          type="button"
          className="po-btn po-btn-secondary"
          style={{ height: 34, padding: '0 12px' }}
          onClick={onReset}
          disabled={!hasActive}
        >
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>

        {/* Create New Return Button */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{
              height: 34,
              padding: '0 14px',
              backgroundColor: '#0f766e',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={onCreateNew}
          >
            <Plus size={16} />
            <span>+ Lập phiếu trả hàng</span>
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#475569' }}>
        Hiển thị {totalFiltered}/{totalAll} phiếu trả hàng
      </div>
    </div>
  );
};
