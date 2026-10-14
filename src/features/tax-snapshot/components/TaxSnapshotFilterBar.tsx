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
    <div className="tax-filter-wrapper flex flex-wrap items-center justify-between gap-3">
      {/* Left: Filter options */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        {/* Search Input */}
        <div className="relative min-w-[220px] max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo ghi chú, mã kỳ..."
            value={filterParams.keyword || ''}
            onChange={(e) => onFilterChange({ keyword: e.target.value })}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
          />
        </div>

        {/* Year Select */}
        <select
          value={filterParams.year || CURRENT_YEAR}
          onChange={(e) => onFilterChange({ year: Number(e.target.value) })}
          aria-label="Chọn năm tài chính"
          className="px-3.5 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
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
          className="px-3.5 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
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
          className="px-3.5 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
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
          <Plus className="w-4 h-4" />
          <span>Tạo kỳ tính thuế</span>
        </button>
      </div>
    </div>
  );
};
