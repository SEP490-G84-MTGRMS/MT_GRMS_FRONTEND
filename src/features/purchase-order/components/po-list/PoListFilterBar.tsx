import type { FC } from 'react';
import { Search, RotateCcw, Filter, Calendar } from 'lucide-react';
import type { PoListFilterState, PurchaseOrderStatus } from '../../types/po-list.types';
import type { BranchOption } from '../../types/po.types';

interface PoListFilterBarProps {
  filterInputs: PoListFilterState;
  onFilterInputChange: (newFilters: Partial<PoListFilterState>) => void;
  onSearch: () => void;
  onReset: () => void;
  branches: BranchOption[];
  suppliers: { id: string; code: string; name: string }[];
}

export const PoListFilterBar: FC<PoListFilterBarProps> = ({
  filterInputs,
  onFilterInputChange,
  onSearch,
  onReset,
  branches,
  suppliers,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 12,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* ── Dòng 1: Tìm kiếm + Chi nhánh + Nhà cung cấp + Trạng thái ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 1. Keyword search */}
        <div style={{ position: 'relative', width: 260, minWidth: 200, flex: '1 1 240px' }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={filterInputs.keyword}
            onChange={(e) => onFilterInputChange({ keyword: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
            placeholder="Tìm theo Mã PO, NCC, Chi nhánh, SP..."
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 32,
              paddingRight: 10,
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12.5,
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Chi nhánh nhận */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Chi nhánh nhận:
          </label>
          <select
            value={filterInputs.branchId}
            onChange={(e) => onFilterInputChange({ branchId: e.target.value })}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">-- Tất cả chi nhánh --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Nhà cung cấp */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Nhà cung cấp:
          </label>
          <select
            value={filterInputs.supplierId}
            onChange={(e) => onFilterInputChange({ supplierId: e.target.value })}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">-- Tất cả nhà cung cấp --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Trạng thái PO */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Filter size={12} color="#64748b" />
            <span>Trạng thái PO:</span>
          </label>
          <select
            value={filterInputs.status}
            onChange={(e) =>
              onFilterInputChange({ status: e.target.value as 'all' | PurchaseOrderStatus })
            }
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: filterInputs.status !== 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: filterInputs.status !== 'all' ? '#0f766e' : '#334155',
              backgroundColor: filterInputs.status !== 'all' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">-- Tất cả trạng thái --</option>
            <option value="SENT">🟡 SENT (Đã gửi NCC)</option>
            <option value="CONFIRMED">🟢 CONFIRMED (NCC đã chốt)</option>
            <option value="PARTIALLY_RECEIVED">🟣 PARTIALLY_RECEIVED (Nhận 1 phần)</option>
            <option value="RECEIVED">🔵 RECEIVED (Đã nhập kho xong)</option>
            <option value="CANCELLED">🔴 CANCELLED (Đã hủy)</option>
          </select>
        </div>
      </div>

      {/* ── Dòng 2: Khoảng ngày + Nút Tìm kiếm & Đặt lại ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Từ ngày */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13} color="#64748b" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Từ ngày:
            </span>
            <input
              type="date"
              value={filterInputs.dateFrom}
              onChange={(e) => onFilterInputChange({ dateFrom: e.target.value })}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          {/* Đến ngày */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              Đến ngày:
            </span>
            <input
              type="date"
              value={filterInputs.dateTo}
              onChange={(e) => onFilterInputChange({ dateTo: e.target.value })}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={onSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Áp dụng bộ lọc tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
            title="Đặt lại toàn bộ tiêu chí lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>
    </div>
  );
};
