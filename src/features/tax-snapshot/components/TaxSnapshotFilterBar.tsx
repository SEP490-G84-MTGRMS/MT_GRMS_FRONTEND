import type { FC } from 'react';
import { Plus, Search } from 'lucide-react';
import type { TaxSnapshotFilterParams, TaxSnapshotStatus } from '../types/taxSnapshot';

interface Props {
  filterParams: TaxSnapshotFilterParams;
  onFilterChange: (params: Partial<TaxSnapshotFilterParams>) => void;
  onOpenCreateModal: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const AVAILABLE_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export const TaxSnapshotFilterBar: FC<Props> = ({
  filterParams,
  onFilterChange,
  onOpenCreateModal,
}) => {
  const years = AVAILABLE_YEARS;

  return (
    <div className="tax-filter-bar">
      {/* Left: Filter options */}
      <div className="tax-filter-left">
        {/* Search Input */}
        <div className="tax-search-box">
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Tìm theo ghi chú, mã kỳ..."
            value={filterParams.keyword || ''}
            onChange={(e) => onFilterChange({ keyword: e.target.value })}
            className="tax-search-input"
          />
        </div>

        {/* Year Select */}
        <select
          value={filterParams.year || CURRENT_YEAR}
          onChange={(e) => onFilterChange({ year: Number(e.target.value) })}
          aria-label="Chọn năm tài chính"
          className="tax-select"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              Năm {y}
            </option>
          ))}
        </select>

        {/* Quarter Select */}
        <select
          value={filterParams.quarter || ''}
          onChange={(e) => onFilterChange({ quarter: e.target.value ? Number(e.target.value) : undefined })}
          aria-label="Chọn quý kê khai"
          className="tax-select"
        >
          <option value="">Tất cả các quý</option>
          <option value="1">Quý 1 (T1 - T3)</option>
          <option value="2">Quý 2 (T4 - T6)</option>
          <option value="3">Quý 3 (T7 - T9)</option>
          <option value="4">Quý 4 (T10 - T12)</option>
        </select>

        {/* Status Select */}
        <select
          value={filterParams.status || 'ALL'}
          onChange={(e) => onFilterChange({ status: e.target.value as TaxSnapshotStatus | 'ALL' })}
          aria-label="Lọc theo trạng thái tờ khai"
          className="tax-select"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Draft">Nháp (Draft)</option>
          <option value="Finalized">Đã chốt số liệu</option>
          <option value="Submitted">Đã nộp tờ khai</option>
          <option value="Paid">Đã nộp thuế</option>
        </select>
      </div>

      {/* Right: Actions */}
      <div>
        <button onClick={onOpenCreateModal} className="btn-primary-pill">
          <Plus size={16} />
          <span>Tạo kỳ tính thuế mới</span>
        </button>
      </div>
    </div>
  );
};
