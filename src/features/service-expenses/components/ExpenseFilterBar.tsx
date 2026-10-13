import { type FC, useEffect, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type ExpenseFilterParams,
  type ExpenseStatus,
} from '../types/expense.types';

interface ExpenseFilterBarProps {
  filters: ExpenseFilterParams;
  onFilterChange: (updated: Partial<ExpenseFilterParams>) => void;
  onReset: () => void;
}

export const ExpenseFilterBar: FC<ExpenseFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
}) => {
  const [searchInput, setSearchInput] = useState(filters.keyword || '');

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== (filters.keyword || '')) {
        onFilterChange({ keyword: searchInput });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, filters.keyword, onFilterChange]);

  const handleReset = () => {
    setSearchInput('');
    onReset();
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[24px] p-4 mb-6 shadow-sm flex flex-wrap items-center gap-3">
      {/* Search Bar with Debounce */}
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo mã chi phí, nhà cung cấp, nội dung..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff] focus:bg-white transition-colors"
        />
      </div>

      {/* Branch Selection */}
      <div className="min-w-[170px]">
        <select
          value={filters.branchId || ''}
          onChange={(e) => onFilterChange({ branchId: e.target.value || undefined })}
          aria-label="Lọc theo chi nhánh"
          className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff] focus:bg-white text-gray-700"
        >
          <option value="">Toàn bộ chi nhánh</option>
          <option value="BR-01">Quận 1 (Trụ sở chính)</option>
          <option value="BR-02">Bình Thạnh</option>
          <option value="BR-03">Thủ Đức</option>
        </select>
      </div>

      {/* Category Selection */}
      <div className="min-w-[170px]">
        <select
          value={filters.category || ''}
          onChange={(e) =>
            onFilterChange({
              category: (e.target.value as ExpenseCategory) || '',
            })
          }
          aria-label="Lọc theo danh mục chi phí"
          className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff] focus:bg-white text-gray-700"
        >
          <option value="">Toàn bộ danh mục</option>
          {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {EXPENSE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Status Selection */}
      <div className="min-w-[160px]">
        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange({
              status: (e.target.value as ExpenseStatus) || '',
            })
          }
          aria-label="Lọc theo trạng thái chi phí"
          className="w-full px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0066ff] focus:bg-white text-gray-700"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ thanh toán</option>
          <option value="Paid">Đã thanh toán</option>
          <option value="Cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Reset Filter Button */}
      <button
        type="button"
        onClick={handleReset}
        title="Đặt lại bộ lọc"
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Đặt lại</span>
      </button>
    </div>
  );
};
