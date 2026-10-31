import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import type { SupplierBranchAssignmentItem } from '../../types/supplier.types';
import { SupplierBranchTableRow } from './SupplierBranchTableRow';
import { ArrowUpDown, ChevronLeft, ChevronRight, Store, Plus } from 'lucide-react';

interface SupplierBranchTableProps {
  assignments: SupplierBranchAssignmentItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onToggleStatus: (item: SupplierBranchAssignmentItem) => void;
  onOpenAssignModal: () => void;
}

type SortField =
  | 'branchCode'
  | 'branchName'
  | 'supplierCode'
  | 'supplierName'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const SupplierBranchTable: FC<SupplierBranchTableProps> = ({
  assignments,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onToggleStatus,
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

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

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

  // 6 cột đồng bộ 100% tỉ lệ với màn hình Quản lý Nhà Cung Cấp
  const tableColGroup = (
    <colgroup>
      <col style={{ width: '13%' }} /> {/* MÃ CỬA HÀNG */}
      <col style={{ width: '25%' }} /> {/* TÊN CỬA HÀNG / CHI NHÁNH */}
      <col style={{ width: '14%' }} /> {/* MÃ NCC */}
      <col style={{ width: '24%' }} /> {/* TÊN NHÀ CUNG CẤP */}
      <col style={{ width: '12%' }} /> {/* TRẠNG THÁI */}
      <col style={{ width: '12%' }} /> {/* THAO TÁC */}
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
                  onToggleStatus={onToggleStatus}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
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

      {/* ── Footer Phân trang chuẩn 100% theo SupplierTable ── */}
      <div className="so-list-pager">
        {/* Bên trái: Thông tin số lượng & Bản ghi/trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> phân bổ
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
            <select
              className="so-list-pager-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              <option value={15}>15</option>
              <option value={24}>24</option>
              <option value={36}>36</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Bên phải: Nút Trước / Trang x / y / Sau */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            className="so-list-pager-btn"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
