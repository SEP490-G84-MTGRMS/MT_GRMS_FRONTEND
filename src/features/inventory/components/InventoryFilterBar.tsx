import type { CSSProperties, FC } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { InventoryFilterState } from '../types/inventory.types';
import { INVENTORY_BRANCHES, INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../lib/mockInventoryData';

interface Props {
  draft: InventoryFilterState;
  totalFiltered: number;
  totalAll: number;
  lockBranch?: boolean;
  onChange: (patch: Partial<InventoryFilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
}

const CAT_LABEL: Record<string, string> = {
  Dairy: 'Sữa',
  Beverage: 'Đồ uống',
  Fresh: 'Tươi sống',
  Frozen: 'Đông lạnh',
  RTE: 'Ăn liền',
  Snack: 'Snack',
  'Personal Care': 'Chăm sóc cá nhân',
};

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

export const InventoryFilterBar: FC<Props> = ({
  draft,
  totalFiltered,
  totalAll,
  lockBranch,
  onChange,
  onSearch,
  onReset,
}) => {
  const hasActive = Boolean(
    draft.keyword.trim() || draft.branchId || draft.category || draft.location || draft.stockStatus
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '1 1 240px', minWidth: 220 }}>
          <input
            type="text"
            value={draft.keyword}
            onChange={(e) => onChange({ keyword: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Tìm SKU hoặc tên sản phẩm..."
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

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Chi nhánh:</label>
          <select
            value={draft.branchId}
            disabled={lockBranch}
            onChange={(e) => onChange({ branchId: e.target.value })}
            style={selectStyle(Boolean(draft.branchId))}
          >
            <option value="">Tất cả chi nhánh</option>
            {INVENTORY_BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Nhóm hàng:</label>
          <select
            value={draft.category}
            onChange={(e) => onChange({ category: e.target.value })}
            style={selectStyle(Boolean(draft.category))}
          >
            <option value="">Tất cả nhóm</option>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CAT_LABEL[c] || c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Vị trí kệ:</label>
          <select
            value={draft.location}
            onChange={(e) => onChange({ location: e.target.value })}
            style={selectStyle(Boolean(draft.location))}
          >
            <option value="">Tất cả vị trí</option>
            {INVENTORY_LOCATIONS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tồn kho:</label>
          <select
            value={draft.stockStatus}
            onChange={(e) => onChange({ stockStatus: e.target.value as InventoryFilterState['stockStatus'] })}
            style={selectStyle(Boolean(draft.stockStatus))}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="OK">Đủ hàng</option>
            <option value="Low">Sắp hết</option>
            <option value="Out">Hết hàng</option>
          </select>
        </div>

        <button type="button" className="po-btn po-btn-primary" style={{ height: 34 }} onClick={onSearch}>
          <Search size={14} />
          <span>Tìm kiếm</span>
        </button>
        <button type="button" className="po-btn po-btn-secondary" style={{ height: 34 }} onClick={onReset} disabled={!hasActive}>
          <RotateCcw size={14} />
          <span>Đặt lại</span>
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: '#475569' }}>
        Hiển thị {totalFiltered}/{totalAll} dòng tồn kho
      </div>
    </div>
  );
};
