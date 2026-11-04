import type { FC } from 'react';
import { Search, RotateCw, X } from 'lucide-react';
import type { PromotionFilterState } from '../../types/promotion.types';
import { MOCK_BRANCHES } from '../../mock/promotionMockData';

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
  return (
    <div className="promotion-filter-bar">
      <div className="promotion-filter-left">
        {/* Search */}
        <div className="promotion-search-box">
          <Search className="w-4 h-4 promotion-search-icon" />
          <input
            type="text"
            value={filter.searchTerm}
            onChange={(e) => onFilterChange({ ...filter, searchTerm: e.target.value })}
            placeholder="Tìm theo tên CTKM, mã chương trình..."
            className="promotion-search-input"
          />
          {filter.searchTerm && (
            <button
              onClick={() => onFilterChange({ ...filter, searchTerm: '' })}
              className="promotion-clear-btn"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Type */}
        <select
          value={filter.type}
          onChange={(e) => onFilterChange({ ...filter, type: e.target.value })}
          className="promotion-select"
        >
          <option value="ALL">Tất cả hình thức</option>
          <option value="ORDER_DISCOUNT">Chiết khấu đơn hàng</option>
          <option value="BUY_X_GET_Y">Mua X tặng Y</option>
          <option value="PRODUCT_DISCOUNT">Giảm giá sản phẩm</option>
        </select>

        {/* Filter Status */}
        <select
          value={filter.status}
          onChange={(e) => onFilterChange({ ...filter, status: e.target.value })}
          className="promotion-select"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang chạy</option>
          <option value="UPCOMING">Sắp diễn ra</option>
          <option value="PAUSED">Tạm dừng</option>
          <option value="EXPIRED">Đã kết thúc</option>
        </select>

        {/* Filter Branch */}
        <select
          value={filter.branch}
          onChange={(e) => onFilterChange({ ...filter, branch: e.target.value })}
          className="promotion-select"
        >
          <option value="ALL">Tất cả chi nhánh</option>
          {MOCK_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <button
          onClick={onRefresh}
          className="btn-secondary-pill"
          title="Tải lại dữ liệu"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>
    </div>
  );
};
