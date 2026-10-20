import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierFilterState } from '../types/supplier.types';
import { Search, RotateCcw, Filter } from 'lucide-react';

interface Props {
  filters: SupplierFilterState;
  onSearch: (appliedFilters: SupplierFilterState) => void;
  onReset: () => void;
}

export const SupplierFilterBar: FC<Props> = ({
  filters,
  onSearch,
  onReset,
}) => {
  // Draft filter state: only applied when clicking "Tìm kiếm" or pressing Enter
  const [draftFilters, setDraftFilters] = useState<SupplierFilterState>(filters);

  // Sync draft state if external filters change (e.g. from reset)
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onSearch({ ...draftFilters, pageIndex: 1 });
  };

  const handleResetClick = () => {
    const emptyFilters: SupplierFilterState = {
      searchTerm: '',
      supplierType: '',
      category: '',
      debtStatus: '',
      ratingFilter: '',
      status: '',
      pageIndex: 1,
      pageSize: filters.pageSize || 10,
    };
    setDraftFilters(emptyFilters);
    onReset();
  };

  const hasActiveFilters = Boolean(
    draftFilters.searchTerm.trim() ||
    draftFilters.category ||
    draftFilters.debtStatus ||
    draftFilters.status
  );

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
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* ── Dòng 1: Tìm kiếm + Loại hình + Phân loại + Công nợ + Trạng thái ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* 1. Keyword search */}
        <div style={{ position: 'relative', width: 280, minWidth: 220, flex: '1 1 240px' }}>
          <Search
            size={14}
            color="#94a3b8"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={draftFilters.searchTerm}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Tìm theo Mã NCC, tên NCC, SĐT, người liên hệ, MST..."
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


        {/* 3. Phân loại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Phân loại:
          </label>
          <select
            value={draftFilters.category}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, category: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.category ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.category ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.category ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả phân loại --</option>
            <option value="FRESH">Nông sản tươi</option>
            <option value="AMBIENT">Đồ khô / Gia vị</option>
            <option value="FROZEN">Hàng đông lạnh</option>
            <option value="UTILITIES">Tiện ích / Điện nước</option>
            <option value="RENT">Mặt bằng kho bãi</option>
            <option value="LOGISTICS">Vận chuyển logistics</option>
          </select>
        </div>

        {/* 4. Trạng thái công nợ AP */}
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
            <span>Công nợ AP:</span>
          </label>
          <select
            value={draftFilters.debtStatus}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, debtStatus: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.debtStatus ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.debtStatus ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.debtStatus ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả công nợ --</option>
            <option value="has_debt">🟡 Đang có nợ AP</option>
            <option value="overdue">🔴 Nợ quá hạn (Overdue)</option>
            <option value="no_debt">🟢 Không nợ (0 đ)</option>
          </select>
        </div>

        {/* 5. Trạng thái hoạt động */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Trạng thái:
          </label>
          <select
            value={draftFilters.status || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.status ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.status ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.status ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Active">🟢 Đang hoạt động</option>
            <option value="Inactive">⚪ Tạm ngưng</option>
          </select>
        </div>
      </div>

      {/* ── Dòng 2: Phân cách nét đứt + Nút Tìm kiếm & Đặt lại ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
          {hasActiveFilters && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                fontSize: 11.5,
                fontWeight: 600,
                border: '1px solid #ccfbf1',
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
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
            onClick={handleResetClick}
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
