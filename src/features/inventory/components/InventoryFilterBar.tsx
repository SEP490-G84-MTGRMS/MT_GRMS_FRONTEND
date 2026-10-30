import type { CSSProperties, FC, KeyboardEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { InventoryFilterState } from '../types/inventory.types';
import { INVENTORY_CATEGORIES, INVENTORY_LOCATIONS } from '../lib/mockInventoryData';

interface Props {
  draft: InventoryFilterState;
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

const labelStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: '#475569',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const inputStyle: CSSProperties = {
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 12.5,
  color: '#0f172a',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = (active: boolean): CSSProperties => ({
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  border: active ? '1px solid #0d9488' : '1px solid #cbd5e1',
  fontSize: 12.5,
  fontWeight: 600,
  color: active ? '#0f766e' : '#334155',
  backgroundColor: active ? '#f0fdfa' : '#ffffff',
  cursor: 'pointer',
  outline: 'none',
});

export const InventoryFilterBar: FC<Props> = ({
  draft,
  lockBranch,
  onChange,
  onSearch,
  onReset,
}) => {
  const hasActive = Boolean(
    draft.sku.trim() ||
    draft.productName.trim() ||
    draft.branchKeyword.trim() ||
    draft.keyword.trim() ||
    draft.branchId ||
    draft.category ||
    draft.location ||
    draft.stockStatus
  );

  const onEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 0,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="inv-branch">Chi nhánh:</label>
          <input
            id="inv-branch"
            type="text"
            value={draft.branchKeyword}
            disabled={lockBranch}
            onChange={(e) => onChange({ branchKeyword: e.target.value })}
            onKeyDown={onEnter}
            placeholder="VD: BR-01, Nguyễn Trãi..."
            style={{
              ...inputStyle,
              width: 220,
              backgroundColor: lockBranch ? '#f1f5f9' : '#ffffff',
            }}
            onFocus={(e) => {
              if (!lockBranch) e.target.style.borderColor = '#0d9488';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cbd5e1';
            }}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="inv-name">Tên sản phẩm:</label>
          <input
            id="inv-name"
            type="text"
            value={draft.productName}
            onChange={(e) => onChange({ productName: e.target.value })}
            onKeyDown={onEnter}
            placeholder="VD: Sữa Vinamilk, Pepsi..."
            style={{ ...inputStyle, width: 260 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle} htmlFor="inv-sku">Mã SKU:</label>
          <input
            id="inv-sku"
            type="text"
            value={draft.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            onKeyDown={onEnter}
            placeholder="VD: DY-SUA-01..."
            style={{ ...inputStyle, width: 160, fontFamily: 'var(--font-mono, monospace)' }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px dashed #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle} htmlFor="inv-category">Nhóm hàng:</label>
            <select
              id="inv-category"
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

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle} htmlFor="inv-location">Vị trí kệ:</label>
            <select
              id="inv-location"
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

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle} htmlFor="inv-status">Tồn kho:</label>
            <select
              id="inv-status"
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="po-btn po-btn-primary" style={{ height: 32 }} onClick={onSearch}>
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>
          <button type="button" className="po-btn po-btn-secondary" style={{ height: 32 }} onClick={onReset} disabled={!hasActive}>
            <RotateCcw size={14} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
