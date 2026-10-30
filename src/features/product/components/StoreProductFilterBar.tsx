import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { StoreProductFilterValues, StoreSummary } from '../types/storeProduct.types';
import { Search } from 'lucide-react';

interface StoreProductFilterBarProps {
  initialValues: StoreProductFilterValues;
  stores: StoreSummary[];
  categories: string[];
  totalCount: number;
  filteredCount: number;
  onSearch: (values: StoreProductFilterValues) => void;
  onReset: () => void;
}

export const StoreProductFilterBar: FC<StoreProductFilterBarProps> = ({
  initialValues,
  stores,
  categories,
  totalCount,
  filteredCount,
  onSearch,
  onReset,
}) => {
  const [formValues, setFormValues] = useState<StoreProductFilterValues>(initialValues);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(formValues);
  };

  const handleReset = () => {
    setFormValues({
      searchTerm: '',
      storeId: 'ALL',
      categoryFilter: 'ALL',
      statusFilter: 'ALL',
      stockAlertFilter: 'ALL',
    });
    onReset();
  };

  return (
    <form className="po-filter-box" onSubmit={handleSubmit}>
      {/* ── ROW 1: Tìm kiếm, Chọn Cửa hàng, Ngành hàng & Nút Tìm kiếm ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {/* Ô tìm kiếm từ khóa */}
          <div className="po-filter-field">
            <label className="po-filter-label">Tìm kiếm:</label>
            <div className="po-ctrl-search" style={{ width: 260 }}>
              <Search size={14} className="po-ctrl-search-icon" />
              <input
                type="text"
                className="po-ctrl-search-input"
                placeholder="Tìm tên sản phẩm, mã SKU, barcode..."
                value={formValues.searchTerm}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, searchTerm: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Chọn Cửa hàng */}
          <div className="po-filter-field">
            <label className="po-filter-label">Cửa hàng / Chi nhánh:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 220, fontWeight: 600 }}
              value={formValues.storeId}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, storeId: e.target.value }))
              }
            >
              <option value="ALL">Tất cả cửa hàng trong chuỗi</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn Ngành hàng */}
          <div className="po-filter-field">
            <label className="po-filter-label">Ngành hàng:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 180 }}
              value={formValues.categoryFilter}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, categoryFilter: e.target.value }))
              }
            >
              <option value="ALL">Tất cả ngành hàng</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nút hành động bên phải Hàng 1 */}
        <div className="po-filter-row-right">
          <button
            type="submit"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 18px', fontWeight: 700 }}
          >
            <span>Tìm kiếm</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={handleReset}
          >
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* ── ROW 2: Trạng thái kinh doanh, Cảnh báo tồn & Bộ đếm ── */}
      <div className="po-filter-row">
        <div className="po-filter-row-left">
          {/* Trạng thái kinh doanh */}
          <div className="po-filter-field">
            <label className="po-filter-label">Trạng thái:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 160 }}
              value={formValues.statusFilter}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  statusFilter: e.target.value as StoreProductFilterValues['statusFilter'],
                }))
              }
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Active">Đang kinh doanh</option>
              <option value="Inactive">Tạm ngừng bán</option>
            </select>
          </div>

          <div className="po-bar-divider" />

          {/* Cảnh báo mức tồn kho */}
          <div className="po-filter-field">
            <label className="po-filter-label">Cảnh báo tồn kho:</label>
            <select
              className="po-ctrl-select"
              style={{ width: 190 }}
              value={formValues.stockAlertFilter}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  stockAlertFilter: e.target.value as StoreProductFilterValues['stockAlertFilter'],
                }))
              }
            >
              <option value="ALL">Tất cả mức tồn</option>
              <option value="LOW">Cần bổ sung (Dưới định mức)</option>
              <option value="OUT_OF_STOCK">Hết hàng (Tồn bằng 0)</option>
              <option value="NORMAL">Tồn kho an toàn</option>
            </select>
          </div>
        </div>

        {/* Đếm số lượng sản phẩm */}
        <div className="po-filter-row-right">
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            Hiển thị <b>{filteredCount}</b> / <b>{totalCount}</b> sản phẩm
          </span>
        </div>
      </div>
    </form>
  );
};

export default StoreProductFilterBar;
