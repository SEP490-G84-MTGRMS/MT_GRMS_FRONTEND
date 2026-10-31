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
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        width: '100%',
      }}
    >
      {/* ── Table Header (Fixed at top, strictly outside vertical scroll container) ── */}
      <div
        ref={headerRef}
        style={{
          width: '100%',
          overflowX: 'hidden',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #cbd5e1',
          flexShrink: 0,
          boxSizing: 'border-box',
          paddingRight: hasScrollY ? 6 : 0,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 880,
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
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
        className="supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{
          overflowY: 'auto',
          overflowX: 'auto',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 880,
            height: sortedAssignments.length > 0 && sortedAssignments.length <= 12 ? '100%' : 'auto',
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
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
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748b',
          backgroundColor: '#ffffff',
          flexWrap: 'wrap',
          gap: 10,
          flexShrink: 0,
          zIndex: 15,
        }}
      >
        {/* Bên trái: Thông tin số lượng & Bản ghi/trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> phân bổ
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                height: 28,
                padding: '0 8px',
                borderRadius: 5,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value={12}>12</option>
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
            disabled={pageIndex <= 1}
            onClick={() => onPageChange(pageIndex - 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              opacity: pageIndex <= 1 ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={13} />
            <span>Trước</span>
          </button>

          <span style={{ padding: '0 8px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              opacity: pageIndex >= totalPages ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>Sau</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
