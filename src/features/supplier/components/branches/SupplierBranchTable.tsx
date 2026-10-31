import { useState, useMemo } from 'react';
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
  | 'supplierCode'
  | 'supplierName'
  | 'branchCode'
  | 'branchName'
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
        case 'supplierCode':
          valA = a.supplierCode.toLowerCase();
          valB = b.supplierCode.toLowerCase();
          break;
        case 'supplierName':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'branchCode':
          valA = a.branchCode.toLowerCase();
          valB = b.branchCode.toLowerCase();
          break;
        case 'branchName':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
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

  const renderSortableHeader = (label: string, field: SortField, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          padding: '10px 12px',
          textAlign: align,
          fontSize: 12,
          fontWeight: 700,
          color: isSorted ? '#0f766e' : '#475569',
          backgroundColor: '#f8fafc',
          borderBottom: '2px solid #e2e8f0',
          cursor: 'pointer',
          userSelect: 'none',
          whiteSpace: 'nowrap',
          position: 'sticky',
          top: 0,
          zIndex: 10,
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
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* ── Table Container with Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th
                style={{
                  width: 48,
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                STT
              </th>
              {renderSortableHeader('Mã CH', 'branchCode')}
              {renderSortableHeader('Tên Cửa Hàng / Chi Nhánh', 'branchName')}
              {renderSortableHeader('Mã NCC', 'supplierCode')}
              {renderSortableHeader('Tên Nhà Cung Cấp', 'supplierName')}
              {renderSortableHeader('Trạng Thái', 'status')}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAssignments.length > 0 ? (
              sortedAssignments.map((item, idx) => (
                <SupplierBranchTableRow
                  key={item.id}
                  index={startItem + idx}
                  item={item}
                  onToggleStatus={onToggleStatus}
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

      {/* ── Footer Phân trang chuẩn theo SupplierTable ── */}
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
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
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
              padding: '0 10px',
              borderRadius: 5,
              border: '1px solid #cbd5e1',
              backgroundColor: pageIndex <= 1 ? '#f8fafc' : '#ffffff',
              color: pageIndex <= 1 ? '#94a3b8' : '#334155',
              cursor: pageIndex <= 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={14} /> Trước
          </button>

          <span style={{ padding: '0 6px', fontWeight: 600, color: '#0f172a' }}>
            Trang {pageIndex} / {totalPages}
          </span>

          <button
            type="button"
            disabled={pageIndex >= totalPages}
            onClick={() => onPageChange(pageIndex + 1)}
            style={{
              height: 28,
              padding: '0 10px',
              borderRadius: 5,
              border: '1px solid #cbd5e1',
              backgroundColor: pageIndex >= totalPages ? '#f8fafc' : '#ffffff',
              color: pageIndex >= totalPages ? '#94a3b8' : '#334155',
              cursor: pageIndex >= totalPages ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Sau <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
