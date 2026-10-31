import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { SupplierSummary } from '../../types/supplier.types';

export interface SupplierProductFilterValues {
  searchTerm?: string;
  productSearch: string;
  supplierSearch: string;
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
  const [prevInitial, setPrevInitial] = useState<SupplierProductFilterValues>(initialValues);

  // Sync draft state if external initialValues change
  if (initialValues !== prevInitial) {
    setPrevInitial(initialValues);
    setDraftFilters(initialValues);
  }

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    onSearch(draftFilters);
  };

  const handleResetClick = () => {
    const emptyValues: SupplierProductFilterValues = {
      productSearch: '',
      supplierSearch: '',
      searchTerm: '',
      supplierId: 'ALL',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
    };
    setDraftFilters(emptyValues);
    onReset();
  };

  const hasActiveFilters = Boolean(
    (draftFilters.productSearch || '').trim() ||
    (draftFilters.supplierSearch || '').trim() ||
    draftFilters.supplierId !== 'ALL' ||
    draftFilters.categoryFilter !== 'ALL' ||
    draftFilters.statusFilter !== 'ALL'
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
    <div className="so-list-filter">
      {/* ── Dòng 1: Tìm kiếm theo Tên SP & Nhà cung cấp (Tách riêng biệt, rộng rãi) ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        {/* 1. Tìm theo Tên Sản Phẩm */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Tên sản phẩm:</label>
          <input
            type="text"
            id="txtProductSearch"
            value={draftFilters.productSearch}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, productSearch: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: Dưa leo baby, Sữa tươi, SKU, Barcode..."
            style={{ ...inputStyle, width: 280 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Tìm theo Nhà Cung Cấp */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Nhà cung cấp:</label>
          <input
            type="text"
            id="txtSupplierSearch"
            value={draftFilters.supplierSearch}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierSearch: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: supp-001, Vinamilk..."
            style={{ ...inputStyle, width: 240 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 3. Ngành Hàng */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Ngành hàng:</label>
          <select
            id="filterCategory"
            value={draftFilters.categoryFilter}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, categoryFilter: e.target.value }))}
            style={{ ...selectStyle(draftFilters.categoryFilter !== 'ALL'), minWidth: 150 }}
          >
            <option value="ALL">-- Tất cả ngành hàng ({categories.length}) --</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Trạng Thái */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Trạng thái:</label>
          <select
            id="filterStatus"
            value={draftFilters.statusFilter}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, statusFilter: e.target.value }))}
            style={{ ...selectStyle(draftFilters.statusFilter !== 'ALL'), minWidth: 140 }}
          >
            <option value="ALL">-- Tất cả trạng thái --</option>
            <option value="Active">🟢 Hoạt động</option>
            <option value="Inactive">⚪ Tạm ngưng</option>
          </select>
        </div>
      </div>

      {/* ── Dòng 2: Dropdown Chọn NCC nhanh + Badge + Nút Tìm Kiếm & Đặt Lại ── */}
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
          {/* Dropdown chọn nhanh NCC theo danh sách */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <label style={labelStyle}>Chọn NCC nhanh:</label>
            <select
              id="filterSupplier"
              value={draftFilters.supplierId}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
              style={{
                ...selectStyle(draftFilters.supplierId !== 'ALL'),
                maxWidth: 260,
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

          {/* Badge bộ lọc đang hoạt động */}
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

        {/* Nút Tìm kiếm & Đặt lại (Căn góc phải gọn gàng) */}
        <div className="so-list-filter-actions">
          <button
            type="button"
            className="so-list-filter-search"
            onClick={() => handleSubmit()}
            title="Áp dụng bộ lọc tìm kiếm"
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            className="so-list-filter-reset"
            onClick={handleResetClick}
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
