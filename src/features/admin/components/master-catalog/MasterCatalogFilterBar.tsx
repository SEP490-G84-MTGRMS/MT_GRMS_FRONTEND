import type { FC } from 'react';
import { Search, Download, Upload, Plus } from 'lucide-react';

interface MasterCatalogFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  brands: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  onDownloadTemplate: () => void;
  onOpenImportModal: () => void;
  onOpenCreateModal: () => void;
}

export const MasterCatalogFilterBar: FC<MasterCatalogFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedBrand,
  onBrandChange,
  brands,
  selectedCategory,
  onCategoryChange,
  categories,
  onDownloadTemplate,
  onOpenImportModal,
  onOpenCreateModal,
}) => {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '16px 20px',
        border: '1px solid #EDF2F9',
        boxShadow: '0 4px 12px rgba(0, 30, 90, 0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      {/* Cột trái: Bộ lọc tìm kiếm */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flex: 1 }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Quét mã EAN-13, tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '9999px',
              border: '1px solid #E2E8F0',
              fontSize: '13.5px',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
        </div>

        {/* Brand Dropdown */}
        <select
          value={selectedBrand}
          onChange={(e) => onBrandChange(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
            fontSize: '13px',
            fontFamily: 'inherit',
            background: '#FFFFFF',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">Tất cả thương hiệu</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
            fontSize: '13px',
            fontFamily: 'inherit',
            background: '#FFFFFF',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">Tất cả ngành hàng</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Cột phải: Các nút hành động */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onDownloadTemplate}
          title="Tải tệp Excel mẫu để điền dữ liệu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '9999px',
            border: '1px solid #DBE9FE',
            background: '#F0F6FF',
            color: '#0066FF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <Download size={15} strokeWidth={2} />
          <span>Tải mẫu Excel</span>
        </button>

        <button
          type="button"
          onClick={onOpenImportModal}
          title="Import hàng loạt từ tệp Excel"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '9999px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            color: '#0F172A',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          <Upload size={15} strokeWidth={2} />
          <span>Import Excel</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreateModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 18px',
            borderRadius: '9999px',
            border: 'none',
            background: '#0066FF',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 102, 255, 0.25)',
            transition: 'background 0.15s ease',
          }}
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Thêm Hàng Mẫu</span>
        </button>
      </div>
    </div>
  );
};
