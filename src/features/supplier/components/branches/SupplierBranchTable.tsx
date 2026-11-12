import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { SupplierBranchTableRow } from './SupplierBranchTableRow';
import { TablePagination } from '../../../../components/common';
import { ArrowUpDown, Store, Plus } from 'lucide-react';

interface SupplierBranchTableProps {
  assignments: SupplierBranchAssignmentItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (item: SupplierBranchAssignmentItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'branchCode'
  | 'branchName'
  | 'supplierCode'
  | 'supplierName'
  | 'deliveryDays'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const SupplierBranchTable: FC<SupplierBranchTableProps> = ({
  assignments,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onOpenAssignModal,
}) => {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField(null);
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedAssignments = useMemo(() => {
    if (!sortField) return assignments;

    return [...assignments].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      switch (sortField) {
        case 'branchCode':
          valA = a.branchCode.toLowerCase();
          valB = b.branchCode.toLowerCase();
          break;
        case 'branchName':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
          break;
        case 'supplierCode':
          valA = a.supplierCode.toLowerCase();
          valB = b.supplierCode.toLowerCase();
          break;
        case 'supplierName':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'deliveryDays':
          valA = (a.deliveryDaysDisplay || '').toLowerCase();
          valB = (b.deliveryDaysDisplay || '').toLowerCase();
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assignments, sortField, sortDir]);

  // Synchronize scroll horizontal between header and body
  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const updateScrollState = () => {
      if (bodyRef.current) {
        setHasScrollY(bodyRef.current.scrollHeight > bodyRef.current.clientHeight);
      }
    };

    updateScrollState();

    let observer: ResizeObserver | null = null;
    if (bodyRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateScrollState();
      });
      observer.observe(bodyRef.current);
    }

    window.addEventListener('resize', updateScrollState);
    return () => {
      window.removeEventListener('resize', updateScrollState);
      if (observer) observer.disconnect();
    };
  }, [sortedAssignments, pageSize]);

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '11%' }} /> {/* MÃ CỬA HÀNG */}
      <col style={{ width: '20%' }} /> {/* TÊN CỬA HÀNG / CHI NHÁNH */}
      <col style={{ width: '11%' }} /> {/* MÃ NCC */}
      <col style={{ width: '18%' }} /> {/* TÊN NHÀ CUNG CẤP */}
      <col style={{ width: '14%' }} /> {/* NGÀY GIAO */}
      <col style={{ width: '12%' }} /> {/* TRẠNG THÁI */}
      <col style={{ width: '14%' }} /> {/* THAO TÁC */}
    </colgroup>
  );

  const thBaseStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
  };

  const renderSortableHeader = (label: string, field: SortField, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          ...thBaseStyle,
          textAlign: align,
          color: isSorted ? '#0f766e' : '#334155',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          }}
        >
          <span>{label}</span>
          <ArrowUpDown
            size={12}
            color={isSorted ? '#0f766e' : '#94a3b8'}
            style={{ opacity: isSorted ? 1 : 0.6 }}
          />
        </div>
      </th>
    );
  };

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table">
          {tableColGroup}
          <thead>
            <tr>
              {renderSortableHeader('Mã Cửa Hàng', 'branchCode')}
              {renderSortableHeader('Tên Cửa Hàng / Chi Nhánh', 'branchName')}
              {renderSortableHeader('Mã NCC', 'supplierCode')}
              {renderSortableHeader('Tên Nhà Cung Cấp', 'supplierName')}
              {renderSortableHeader('Ngày giao', 'deliveryDays')}
              {renderSortableHeader('Trạng Thái', 'status', 'center')}
              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Thao Tác</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Body Scroll Container (Tự động lấp đầy chiều cao cân đối) ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table">
          {tableColGroup}
          <tbody>
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((item) => (
                <SupplierBranchTableRow
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                    fontSize: 13,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Store size={38} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Chưa có dữ liệu phân bổ nhà cung cấp nào phù hợp với bộ lọc
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Bạn có thể xóa bớt điều kiện lọc hoặc gán nhà cung cấp phân bổ cho các cửa hàng.
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAssignModal}
                      className="po-btn po-btn-primary"
                      style={{ marginTop: 8, height: 32, padding: '0 16px' }}
                    >
                      <Plus size={14} />
                      <span>Gán với cửa hàng ngay</span>
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang chuẩn 1, 2, 3... ── */}
      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[15, 24, 36, 48]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        itemLabel="phân bổ"
      />
    </div>
  );
};
