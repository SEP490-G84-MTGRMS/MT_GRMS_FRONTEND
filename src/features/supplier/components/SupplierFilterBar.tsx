import { useState, useEffect } from 'react';
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
  // Draft filter state: only applied when clicking "Tìm kiếm"
  const [draftFilters, setDraftFilters] = useState<SupplierFilterState>(filters);

  // Sync draft state if external filters change (e.g. from reset)
  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="admin-toolbar-card" style={{ border: '1px solid #cbd5e1', borderRadius: 10 }}>
      <form
        onSubmit={handleSubmit}
        className="admin-search-row"
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%' }}
      >
        {/* Ô tìm kiếm */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <input
              type="text"
              className="admin-search-input"
              style={{ paddingLeft: 16, width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8 }}
              placeholder="Tìm theo Mã NCC (SUP-...), tên NCC, MST, người liên hệ, SĐT..."
              value={draftFilters.searchTerm}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>

          {/* Select Loại hình */}
          <select
            value={draftFilters.supplierType}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, supplierType: e.target.value }))}
            style={{
              height: 40,
              padding: '0 28px 0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: 'var(--bg-soft-blue)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả loại hình</option>
            <option value="Goods">Hàng hóa (Goods)</option>
            <option value="Service">Dịch vụ (Service)</option>
            <option value="Both">Cả hai (Both)</option>
          </select>

          {/* Select Phân loại */}
          <select
            value={draftFilters.category}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, category: e.target.value }))}
            style={{
              height: 40,
              padding: '0 28px 0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: 'var(--bg-soft-blue)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả phân loại</option>
            <option value="FRESH">Nông sản tươi</option>
            <option value="AMBIENT">Đồ khô / Gia vị</option>
            <option value="FROZEN">Hàng đông lạnh</option>
            <option value="UTILITIES">Tiện ích / Điện nước</option>
            <option value="RENT">Mặt bằng kho bãi</option>
            <option value="LOGISTICS">Vận chuyển logistics</option>
          </select>

          {/* Select Công nợ */}
          <select
            value={draftFilters.debtStatus}
            onChange={(e) => setDraftFilters((prev) => ({ ...prev, debtStatus: e.target.value }))}
            style={{
              height: 40,
              padding: '0 28px 0 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: 'var(--bg-soft-blue)',
              fontFamily: 'inherit',
              fontSize: 13,
              color: 'var(--text-main)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả công nợ</option>
            <option value="has_debt">Đang có nợ AP</option>
            <option value="overdue">Nợ quá hạn (Overdue)</option>
            <option value="no_debt">Không nợ (0 đ)</option>
          </select>

          {/* Nút Tìm kiếm */}
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            style={{ height: 40, padding: '0 16px', gap: 6, cursor: 'pointer', borderRadius: 8 }}
          >
            <Search size={14} />
            <span>Tìm kiếm</span>
          </button>

          {/* Nút Đặt lại / Reset */}
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            style={{ height: 40, padding: '0 14px', gap: 6, cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: 8 }}
            onClick={handleResetClick}
          >
            <RotateCcw size={14} />
            <span>Đặt lại</span>
          </button>
      </form>
    </div>
  );
};
