import { type FC, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { generatePaginationRange } from './pagination.utils';
import './TablePagination.css';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Enterprise standard pagination footer for all data tables.
 */
export const TablePagination: FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'mục',
  isLoading = false,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const fromItem = totalItems === 0 ? 0 : Math.min((safeCurrentPage - 1) * pageSize + 1, totalItems);
  const toItem = Math.min(safeCurrentPage * pageSize, totalItems);
  const paginationRange = generatePaginationRange(safeCurrentPage, totalPages);

  // Automatically reset to last valid page if out of bounds due to external filter changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePageChange = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage && !isLoading) {
      onPageChange(targetPage);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (onPageSizeChange && !isLoading) {
      onPageSizeChange(newPageSize);
      // Ensure we do not land on an out-of-range page
      const newTotalPages = Math.max(1, Math.ceil(totalItems / newPageSize));
      if (currentPage > newTotalPages) {
        onPageChange(1);
      }
    }
  };

  return (
    <div className={`table-pagination-container ${className}`.trim()}>
      {/* 1. Left: Records summary & Page Size Selector */}
      <div className="table-pagination-left">
        <div className="table-pagination-info">
          Hiển thị <strong>{fromItem} - {toItem}</strong> trên tổng số{' '}
          <strong>{totalItems.toLocaleString('vi-VN')}</strong> {itemLabel}
        </div>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="table-pagination-size-wrapper">
            <span>Số dòng:</span>
            <select
              className="table-pagination-size-select"
              value={pageSize}
              disabled={isLoading}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Right: Navigation buttons */}
      <div className="table-pagination-controls">
        <div className="table-pagination-pages">
          {/* Previous Page */}
          <button
            type="button"
            className="table-pagination-btn"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => handlePageChange(currentPage - 1)}
            title="Trang trước"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Number & Ellipsis buttons */}
          {paginationRange.map((item, index) => {
            if (item === '...') {
              return (
                <span key={`dots-${index}`} className="table-pagination-ellipsis">
                  &hellip;
                </span>
              );
            }

            const pageNumber = item as number;
            const isActive = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                type="button"
                className={`table-pagination-btn ${isActive ? 'active' : ''}`}
                disabled={isLoading}
                onClick={() => handlePageChange(pageNumber)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            className="table-pagination-btn"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => handlePageChange(currentPage + 1)}
            title="Trang tiếp theo"
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
