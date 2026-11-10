import React, { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import type { Category } from '../types';

interface CategorySidebarProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  onSelectAll: () => void;
  onClearAll?: () => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (category: Category) => void;
  createdTime: 'all' | 'custom';
  onChangeCreatedTime: (val: 'all' | 'custom') => void;
  customDate?: string;
  onChangeCustomDate: (date: string) => void;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategoryIds,
  onToggleCategory,
  onSelectAll,
  onOpenCreateModal,
  onOpenEditModal,
  createdTime,
  onChangeCreatedTime,
  customDate,
  onChangeCustomDate,
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
            placeholder="Tìm kiếm nhóm hàng..."
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
                <label className="category-item-left" style={{ minWidth: 0 }} title={cat.name}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCategory(cat.id)}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      minWidth: 0,
                      flex: 1,
                      fontSize: 12.5,
                      fontWeight: isChecked ? 600 : 400,
                      color: isChecked ? '#0F766E' : '#334155',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.name.length > 25 ? `${cat.name.slice(0, 25)}...` : cat.name}
                    </span>
                    <span style={{ color: '#94A3B8', fontSize: 11.5, fontWeight: 400, flexShrink: 0 }}>
                      ({cat.productCount})
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  className="category-edit-btn"
                  title="Sửa / Xóa nhóm hàng"
                  onClick={() => onOpenEditModal(cat)}
                  style={{ flexShrink: 0 }}
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

      {/* 2. Thời gian tạo */}
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
    </aside>
  );
};