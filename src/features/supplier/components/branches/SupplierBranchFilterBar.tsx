import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { SupplierSummary } from '../../types/supplier.types';
import type { BranchListItem } from '../../../purchase-order/types/po.types';

export interface SupplierBranchFilterValues {
  supplierSearch: string;
  branchSearch: string;
  supplierId: string;
  branchId: string;
  status: string;
}

interface SupplierBranchFilterBarProps {
  initialValues: SupplierBranchFilterValues;
  suppliers: SupplierSummary[];
  branches: BranchListItem[];
  totalCount: number;
  filteredCount: number;
  onSearch: (values: SupplierBranchFilterValues) => void;
  onReset: () => void;
}

export const SupplierBranchFilterBar: FC<SupplierBranchFilterBarProps> = ({
  initialValues,
  suppliers,
  branches,
  onSearch,
  onReset,
}) => {
  const [draftFilters, setDraftFilters] = useState<SupplierBranchFilterValues>(initialValues);
  const [prevInitial, setPrevInitial] = useState<SupplierBranchFilterValues>(initialValues);

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
    const emptyValues: SupplierBranchFilterValues = {
      supplierSearch: '',
      branchSearch: '',
      supplierId: 'ALL',
      branchId: 'ALL',
      status: 'ALL',
    };
    setDraftFilters(emptyValues);
    onReset();
  };

  const hasActiveFilters = Boolean(
    (draftFilters.supplierSearch || '').trim() ||
    (draftFilters.branchSearch || '').trim() ||
    draftFilters.supplierId !== 'ALL' ||
    draftFilters.branchId !== 'ALL' ||
    draftFilters.status !== 'ALL'
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
      {/* ── Dòng 1: Tìm kiếm theo Nhà cung cấp & Cửa hàng / Chi nhánh ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px 20px',
        }}
      >
        {/* 1. Tìm theo Nhà Cung Cấp */}
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
            placeholder="VD: SUP-001, Vinamilk..."
            style={{ ...inputStyle, width: 260 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 2. Tìm theo Cửa hàng / Chi nhánh */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Cửa hàng / Chi nhánh:</label>
          <input
            type="text"
            id="txtBranchSearch"
            value={draftFilters.branchSearch}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, branchSearch: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="VD: BR-01, Nguyễn Trãi, Quận 1..."
            style={{ ...inputStyle, width: 260 }}
            onFocus={(e) => (e.target.style.borderColor = '#0d9488')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* 3. Lọc theo Chi nhánh (Dropdown) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Chi nhánh:</label>
          <select
            id="filterBranch"
            value={draftFilters.branchId}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, branchId: e.target.value }))}
            style={{ ...selectStyle(draftFilters.branchId !== 'ALL'), minWidth: 160 }}
          >
            <option value="ALL">-- Tất cả chi nhánh ({branches.length}) --</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Trạng Thái */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <label style={labelStyle}>Trạng thái:</label>
          <select
            id="filterStatus"
            value={draftFilters.status}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value }))}
            style={{ ...selectStyle(draftFilters.status !== 'ALL'), minWidth: 140 }}
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
              id="filterSupplierQuick"
              value={draftFilters.supplierId}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierId: e.target.value }))}
              style={{
                ...selectStyle(draftFilters.supplierId !== 'ALL'),
                maxWidth: 280,
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

        {/* Nút Tìm kiếm & Đặt lại (Căn góc phải chuẩn UX) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            id="btnBranchSearch"
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
            id="btnBranchReset"
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
