import type { FC } from 'react';
import { Search, RotateCw, RotateCcw, X } from 'lucide-react';
import type { PromotionFilterState } from '../../types/promotion.types';

interface PromotionFilterBarProps {
  filter: PromotionFilterState;
  onFilterChange: (newFilter: PromotionFilterState) => void;
  onRefresh: () => void;
}

export const PromotionFilterBar: FC<PromotionFilterBarProps> = ({
  filter,
  onFilterChange,
  onRefresh,
}) => {
  const isFiltered = Boolean(filter.searchTerm || filter.type !== 'ALL' || filter.status !== 'ALL');

  return (
    <div className="so-list-filter" style={{ marginBottom: 16 }}>
      <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 16px' }}>
        {/* 1. Ô Tìm kiếm */}
        <div className="so-list-filter-field" style={{ flex: '1 1 280px', minWidth: 240 }}>
          <label className="so-list-filter-label">Tìm kiếm:</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={filter.searchTerm}
              onChange={(e) => onFilterChange({ ...filter, searchTerm: e.target.value })}
              placeholder="Nhập tên CTKM, mã chương trình..."
              className="so-list-filter-input"
              style={{ width: '100%', paddingLeft: 30, paddingRight: filter.searchTerm ? 28 : 10 }}
            />
            <Search
              size={14}
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            {filter.searchTerm && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filter, searchTerm: '' })}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2,
                }}
                title="Xóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Lọc Hình thức */}
        <div className="so-list-filter-field">
          <label className="so-list-filter-label">Hình thức:</label>
          <select
            value={filter.type}
            onChange={(e) => onFilterChange({ ...filter, type: e.target.value })}
            className={`so-list-filter-select ${filter.type !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="ORDER_DISCOUNT">Chiết khấu đơn hàng</option>
            <option value="BUY_X_GET_Y">Mua X tặng Y</option>
            <option value="PRODUCT_DISCOUNT">Giảm giá sản phẩm</option>
          </select>
        </div>

        {/* 3. Lọc Trạng thái */}
        <div className="so-list-filter-field">
          <label className="so-list-filter-label">Trạng thái:</label>
          <select
            value={filter.status}
            onChange={(e) => onFilterChange({ ...filter, status: e.target.value })}
            className={`so-list-filter-select ${filter.status !== 'ALL' ? 'so-list-filter-select--active' : ''}`}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang chạy</option>
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="EXPIRED">Đã kết thúc</option>
          </select>
        </div>

        {/* Nút Thao tác Filter */}
        <div className="so-list-filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {isFiltered && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filter, searchTerm: '', type: 'ALL', status: 'ALL' })}
              className="so-list-filter-reset"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="so-list-filter-search"
            title="Tải lại dữ liệu"
          >
            <RotateCw size={13} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
