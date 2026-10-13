import React, { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import type { Category } from '../types';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (category: Category) => void;
  stockCriteria: 'all' | 'in_stock' | 'out_of_stock' | 'below_min' | 'negative';
  onChangeStockCriteria: (criteria: any) => void;
  createdTime: 'all' | 'custom';
  onChangeCreatedTime: (val: 'all' | 'custom') => void;
  customDate?: string;
  onChangeCustomDate: (date: string) => void;
  supplierFilter: string;
  onChangeSupplierFilter: (val: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onSelectAll,
  onOpenCreateModal,
  onOpenEditModal,
  stockCriteria,
  onChangeStockCriteria,
  createdTime,
  onChangeCreatedTime,
  customDate,
  onChangeCustomDate,
  supplierFilter,
  onChangeSupplierFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <aside className="category-sidebar-card">
      {/* 1. Nhóm hàng Header */}
      <div>
        <div className="category-sidebar-header">
          <h3>Nhóm hàng</h3>
          <button
            type="button"
            className="category-action-link"
            onClick={onOpenCreateModal}
            title="Thêm nhóm hàng mới"
          >
            <Plus size={14} style={{ display: 'inline', marginRight: 2 }} />
            Tạo mới
          </button>
        </div>

        {/* Ô tìm kiếm nhóm hàng */}
        <div style={{ position: 'relative', marginTop: 10, marginBottom: 10 }}>
          <input
            type="text"
            className="category-search-input"
            placeholder="🔍 Tìm kiếm nhóm hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Danh sách nhóm hàng */}
        <div className="category-list-scroll">
          {filteredCategories.map((cat) => {
            const isChecked = selectedCategoryIds.includes(cat.id);
            return (
              <div key={cat.id} className="category-item-row">
                <label className="category-item-left">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCategory(cat.id)}
                  />
                  <span>
                    {cat.name} ({cat.productCount})
                  </span>
                </label>
                <button
                  type="button"
                  className="category-edit-btn"
                  title="Sửa / Xóa nhóm hàng"
                  onClick={() => onOpenEditModal(cat)}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            );
          })}
          {filteredCategories.length === 0 && (
            <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>
              Không tìm thấy nhóm hàng
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
          <button
            type="button"
            onClick={onSelectAll}
            style={{ background: 'none', border: 'none', color: '#0F766E', cursor: 'pointer', padding: 0 }}
          >
            {selectedCategoryIds.length === categories.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>
        </div>
      </div>

      {/* 2. Tiêu chí Tồn kho */}
      <div className="filter-group-card">
        <div className="filter-group-title">Tồn kho</div>
        <select
          className="filter-select"
          value={stockCriteria}
          onChange={(e) => onChangeStockCriteria(e.target.value)}
        >
          <option value="all">Tất cả trạng thái tồn</option>
          <option value="in_stock">Còn hàng (&gt; 0)</option>
          <option value="out_of_stock">Hết hàng (= 0)</option>
          <option value="below_min">Dưới định mức tồn</option>
          <option value="negative">Tồn âm (&lt; 0)</option>
        </select>
      </div>

      {/* 3. Thời gian tạo */}
      <div className="filter-group-card">
        <div className="filter-group-title">Thời gian tạo</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="created_time_radio"
              checked={createdTime === 'all'}
              onChange={() => onChangeCreatedTime('all')}
            />
            Toàn thời gian
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              name="created_time_radio"
              checked={createdTime === 'custom'}
              onChange={() => onChangeCreatedTime('custom')}
            />
            Tùy chỉnh ngày
          </label>
          {createdTime === 'custom' && (
            <input
              type="date"
              className="filter-input"
              value={customDate || ''}
              onChange={(e) => onChangeCustomDate(e.target.value)}
              style={{ marginTop: 4 }}
            />
          )}
        </div>
      </div>

      {/* 4. Nhà cung cấp */}
      <div className="filter-group-card">
        <div className="filter-group-title">Nhà cung cấp</div>
        <input
          type="text"
          className="filter-input"
          placeholder="Chọn hoặc nhập NCC..."
          value={supplierFilter}
          onChange={(e) => onChangeSupplierFilter(e.target.value)}
        />
      </div>
    </aside>
  );
};
