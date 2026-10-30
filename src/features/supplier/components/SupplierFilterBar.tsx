import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { SupplierFilterState } from '../types/supplier.types';
import { Search, RotateCcw } from 'lucide-react';

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
  const [prevFilters, setPrevFilters] = useState<SupplierFilterState>(filters);

  // Sync draft state if external filters change (e.g. from reset)
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setDraftFilters(filters);
  }

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onSearch({ ...draftFilters, pageIndex: 1 });
  };

  const handleResetClick = () => {
    const emptyFilters: SupplierFilterState = {
      searchTerm: '',
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      supplierType: '',
      category: '',
      debtStatus: '',
      ratingFilter: '',
      status: '',
      pageIndex: 1,
      pageSize: filters.pageSize || 12,
    };
    setDraftFilters(emptyFilters);
    onReset();
  };

  const hasActiveFilters = Boolean(
    (draftFilters.code || '').trim() ||
    (draftFilters.name || '').trim() ||
    (draftFilters.contactPerson || '').trim() ||
    (draftFilters.phone || '').trim() ||
    (draftFilters.searchTerm || '').trim() ||
    draftFilters.status
  );

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#475569',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const inputStyle: React.CSSProperties = {
    height: 32,
    padding: '0 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 12.5,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  };

  const selectStyle = (isActive: boolean): React.CSSProperties => ({
    height: 32,
    padding: '0 10px',
    borderRadius: 6,
    border: isActive ? '1px solid #0d9488' : '1px solid #cbd5e1',
    fontSize: 12.5,
    fontWeight: 600,
    color: isActive ? '#0f766e' : '#334155',
    backgroundColor: isActive ? '#f0fdfa' : '#ffffff',
    cursor: 'pointer',
    outline: 'none',
  });

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
      {/* ── Dòng 1: 4 ô input tìm kiếm (Text nằm ngang, ô rộng rãi, thoáng đẹp) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        {/* 1. Mã Nhà Cung Cấp */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Mã NCC:</label>
          <input
            type="text"
            value={draftFilters.code || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, code: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: SUP-001..."
            style={{ ...inputStyle, width: 150 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Tên Nhà Cung Cấp */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Tên NCC:</label>
          <input
            type="text"
            value={draftFilters.name || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: Vinamilk, Khải Anh..."
            style={{ ...inputStyle, width: 280 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 3. Người Liên Hệ */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Người liên hệ:</label>
          <input
            type="text"
            value={draftFilters.contactPerson || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, contactPerson: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: Anh Nam, Đại diện..."
            style={{ ...inputStyle, width: 190 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 4. Số Điện Thoại */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Số ĐT:</label>
          <input
            type="text"
            value={draftFilters.phone || ''}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, phone: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: 0901234567..."
            style={{ ...inputStyle, width: 150, fontFamily: 'var(--font-mono)' }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>
      </div>

      {/* ── Dòng 2: Trạng thái + Nút Tìm Kiếm & Đặt Lại ── */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Trạng Thái Hoạt Động */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Trạng thái:</label>
            <select
              value={draftFilters.status || ''}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
              style={{ ...selectStyle(Boolean(draftFilters.status)), minWidth: 150 }}
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="Active">🟢 Hoạt động</option>
              <option value="Inactive">⚪ Tạm ngưng</option>
            </select>
          </div>

          {/* Active Filter Badge */}
          {hasActiveFilters && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 4,
                backgroundColor: '#f0fdfa',
                color: '#0f766e',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #ccfbf1',
                whiteSpace: 'nowrap',
              }}
            >
              Đang áp dụng bộ lọc
            </span>
          )}
        </div>

        {/* Nút Tìm kiếm & Đặt lại (Nằm xuống dòng 2, căn góc phải gọn gàng) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={() => handleSubmit()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: 'var(--blue-primary, #0f766e)',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)',
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
              padding: '0 14px',
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
