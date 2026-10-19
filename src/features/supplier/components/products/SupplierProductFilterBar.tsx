import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { SupplierSummary } from '../../types/supplier.types';

export interface SupplierProductFilterValues {
  searchTerm: string;
  supplierId: string;
  categoryFilter: string;
  statusFilter: string;
}

interface SupplierProductFilterBarProps {
  initialValues: SupplierProductFilterValues;
  suppliers: SupplierSummary[];
  categories: string[];
  totalCount: number;
  filteredCount: number;
  onSearch: (values: SupplierProductFilterValues) => void;
  onReset: () => void;
}

export const SupplierProductFilterBar: FC<SupplierProductFilterBarProps> = ({
  initialValues,
  suppliers,
  categories,
  onSearch,
  onReset,
}) => {
  const [draftFilters, setDraftFilters] = useState<SupplierProductFilterValues>(initialValues);

  useEffect(() => {
    setDraftFilters(initialValues);
  }, [initialValues]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onSearch(draftFilters);
  };

  const handleResetClick = () => {
    const emptyValues: SupplierProductFilterValues = {
      searchTerm: '',
      supplierId: 'ALL',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
    };
    setDraftFilters(emptyValues);
    onReset();
  };

  const hasActiveFilters = Boolean(
    draftFilters.searchTerm.trim() ||
    draftFilters.supplierId !== 'ALL' ||
    draftFilters.categoryFilter !== 'ALL' ||
    draftFilters.statusFilter !== 'ALL'
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
      {/* ── Dòng 1: Tìm kiếm + Nhà Cung Cấp + Ngành Hàng + Trạng Thái ── */}
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
            id="txtProductSearch"
            value={draftFilters.searchTerm}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Tìm theo Barcode, SKU, tên sản phẩm, mã NCC..."
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
            onFocus={(e) => (e.target.style.borderColor = 'var(--blue-primary, #0f766e)')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Nhà cung cấp dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Nhà cung cấp:
          </label>
          <select
            id="filterSupplier"
            value={draftFilters.supplierId}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.supplierId !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.supplierId !== 'ALL' ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.supplierId !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: 240,
            }}
          >
            <option value="ALL">-- Tất cả nhà cung cấp ({suppliers.length}) --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Ngành hàng dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Ngành hàng:
          </label>
          <select
            id="filterCategory"
            value={draftFilters.categoryFilter}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, categoryFilter: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.categoryFilter !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.categoryFilter !== 'ALL' ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.categoryFilter !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: 200,
            }}
          >
            <option value="ALL">-- Tất cả ngành hàng ({categories.length}) --</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Trạng thái dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
            Trạng thái:
          </label>
          <select
            id="filterStatus"
            value={draftFilters.statusFilter}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, statusFilter: e.target.value }))}
            style={{
              height: 34,
              padding: '0 10px',
              borderRadius: 6,
              border: draftFilters.statusFilter !== 'ALL' ? '1px solid #0d9488' : '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: draftFilters.statusFilter !== 'ALL' ? '#0f766e' : '#334155',
              backgroundColor: draftFilters.statusFilter !== 'ALL' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Active">🟢 Đang phân phối (Active)</option>
            <option value="Inactive">⚪ Tạm ngưng (Inactive)</option>
          </select>
        </div>
      </div>

      {/* ── Dòng 2: Phân cách nét đứt + Badge bộ lọc + Nút Tìm kiếm & Đặt lại ── */}
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
            id="btnApplySearch"
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
            id="btnResetFilter"
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
