import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { Search, RotateCcw, Filter, Building2, CheckCircle2, SlidersHorizontal } from 'lucide-react';
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
  totalCount,
  filteredCount,
  onSearch,
  onReset,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValues.searchTerm);
  const [supplierId, setSupplierId] = useState(initialValues.supplierId);
  const [categoryFilter, setCategoryFilter] = useState(initialValues.categoryFilter);
  const [statusFilter, setStatusFilter] = useState(initialValues.statusFilter);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Sync internal state when initialValues change from external reset
  useEffect(() => {
    setSearchTerm(initialValues.searchTerm);
    setSupplierId(initialValues.supplierId);
    setCategoryFilter(initialValues.categoryFilter);
    setStatusFilter(initialValues.statusFilter);
  }, [initialValues]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch({
      searchTerm,
      supplierId,
      categoryFilter,
      statusFilter,
    });
  };

  const handleReset = () => {
    setSearchTerm('');
    setSupplierId('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    onReset();
  };

  const hasFilterActive =
    searchTerm.trim() !== '' ||
    supplierId !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const secondaryFiltersCount =
    (supplierId !== 'ALL' ? 1 : 0) +
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="admin-toolbar-card" style={{ marginBottom: 20 }}>
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
          }}
        >
          {/* Main Controls Wrapper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              flex: 1,
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 240, flex: 1, maxWidth: 330 }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                id="txtProductSearch"
                placeholder="Tìm theo Barcode, SKU hoặc tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 36,
                  paddingRight: 12,
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-mid)',
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: 'var(--bg-soft-blue)',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--blue-primary)';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border-mid)';
                  e.target.style.backgroundColor = 'var(--bg-soft-blue)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              type="button"
              className="filter-toggle-mobile"
              onClick={() => setIsMobilePanelOpen((prev) => !prev)}
              style={{
                alignItems: 'center',
                gap: 6,
                height: 38,
                padding: '0 14px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isMobilePanelOpen ? 'var(--blue-light)' : '#ffffff',
                border: '1px solid var(--border-mid)',
                color: isMobilePanelOpen ? 'var(--blue-primary)' : 'var(--text-main)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Bộ lọc</span>
              {secondaryFiltersCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--blue-primary)',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 'var(--radius-pill)',
                    padding: '1px 6px',
                    lineHeight: 1.2,
                  }}
                >
                  {secondaryFiltersCount}
                </span>
              )}
            </button>

            {/* Secondary Filter Group (Inline on desktop, collapsible panel on mobile) */}
            <div className={`filter-secondary-group ${isMobilePanelOpen ? 'is-open' : ''}`}>
              {/* Supplier Filter Dropdown */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Building2
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <select
                  id="filterSupplier"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  style={{
                    height: 38,
                    paddingLeft: 35,
                    paddingRight: 14,
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-mid)',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    maxWidth: 230,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--blue-primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-mid)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="ALL">Tất cả nhà cung cấp ({suppliers.length})</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <Filter
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <select
                  id="filterCategory"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    height: 38,
                    paddingLeft: 35,
                    paddingRight: 14,
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-mid)',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    maxWidth: 200,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--blue-primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-mid)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="ALL">Tất cả ngành hàng ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <CheckCircle2
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <select
                  id="filterStatus"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    height: 38,
                    paddingLeft: 35,
                    paddingRight: 14,
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid var(--border-mid)',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    maxWidth: 190,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--blue-primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-mid)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="Active">Đang phân phối (Active)</option>
                  <option value="Inactive">Tạm ngưng (Inactive)</option>
                </select>
              </div>
            </div>

            {/* Submit Action: Nút Tìm kiếm */}
            <button
              type="submit"
              id="btnApplySearch"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                padding: '0 18px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--blue-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
            >
              <Search size={14} />
              <span>Tìm kiếm</span>
            </button>

            {/* Reset Action: Nút Đặt lại */}
            {hasFilterActive && (
              <button
                type="button"
                id="btnResetFilter"
                onClick={handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: '#ffffff',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Right side: Count */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 38,
              flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Hiển thị{' '}
              <strong
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                }}
              >
                {filteredCount}
              </strong>{' '}
              /{' '}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                }}
              >
                {totalCount}
              </span>{' '}
              mặt hàng
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};
