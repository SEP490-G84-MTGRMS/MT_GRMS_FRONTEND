import { useState, useEffect, type FC } from 'react';
import { Search, RotateCw, RotateCcw, X } from 'lucide-react';
import type { PromotionFilterState } from '../../types/promotion.types';

interface PromotionFilterBarProps {
  filter: PromotionFilterState;
  onFilterChange: (newFilter: PromotionFilterState) => void;
  onRefresh: () => void;
  codeTerm?: string;
  onCodeTermChange?: (val: string) => void;
}

export const PromotionFilterBar: FC<PromotionFilterBarProps> = ({
  filter,
  onFilterChange,
  onRefresh,
  codeTerm = '',
  onCodeTermChange,
}) => {
  const [draftCode, setDraftCode] = useState(codeTerm);
  const [draftName, setDraftName] = useState(filter.searchTerm);

  useEffect(() => {
    setDraftCode(codeTerm);
  }, [codeTerm]);

  useEffect(() => {
    setDraftName(filter.searchTerm);
  }, [filter.searchTerm]);

  const isFiltered = Boolean(
    filter.searchTerm || codeTerm || draftCode || draftName || filter.type !== 'ALL' || filter.status !== 'ALL'
  );

  const applySearch = () => {
    onCodeTermChange?.(draftCode);
    onFilterChange({ ...filter, searchTerm: draftName });
  };

  const handleReset = () => {
    setDraftCode('');
    setDraftName('');
    onCodeTermChange?.('');
    onFilterChange({ ...filter, searchTerm: '', type: 'ALL', status: 'ALL' });
  };

  return (
    <div className="so-list-filter" style={{ marginBottom: 14 }}>
      <div className="so-list-filter-row" style={{ alignItems: 'center', gap: '10px 14px', flexWrap: 'wrap' }}>
        {/* 1. Ô lọc Mã CTKM */}
        <div className="so-list-filter-field" style={{ flex: '0 1 190px', minWidth: 165 }}>
          <label className="so-list-filter-label">Mã CTKM:</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Nhập mã CTKM..."
              className="so-list-filter-input"
              style={{ width: '100%', paddingRight: draftCode ? 26 : 10 }}
            />
            {draftCode && (
              <button
                type="button"
                onClick={() => setDraftCode('')}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}
                title="Xóa mã CTKM"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 2. Ô lọc Tên chương trình */}
        <div className="so-list-filter-field" style={{ flex: '1 1 220px', minWidth: 200 }}>
          <label className="so-list-filter-label">Tên CTKM:</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Nhập tên chương trình..."
              className="so-list-filter-input"
              style={{ width: '100%', paddingLeft: 28, paddingRight: draftName ? 26 : 10 }}
            />
            <Search
              size={14}
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            {draftName && (
              <button
                type="button"
                onClick={() => setDraftName('')}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 2 }}
                title="Xóa tìm kiếm"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 3. Lọc Hình thức */}
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

        {/* 4. Lọc Trạng thái */}
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
          <button
            type="button"
            onClick={applySearch}
            className="so-list-filter-search"
            title="Tìm kiếm"
          >
            <Search size={13} />
            <span>Tìm kiếm</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isFiltered}
            className="so-list-filter-reset"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Đặt lại</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="so-list-filter-reset"
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
