import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import {
  ArrowUpDown,
  Building2,
} from 'lucide-react';
import type { SupplierSummary } from '../types/supplier.types';
import { SupplierTableRow } from './SupplierTableRow';
import { TablePagination } from '../../../components/common';

interface Props {
  suppliers: SupplierSummary[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onViewDetail: (supplier: SupplierSummary) => void;
  onEdit: (supplier: SupplierSummary) => void;
  canEdit?: boolean;
}

type SortField =
  | 'code'
  | 'name'
  | 'taxCode'
  | 'contactPerson'
  | 'phone'
  | 'address'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const SupplierTable: FC<Props> = ({
  suppliers,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  canEdit = true,
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

  const sortedSuppliers = useMemo(() => {
    if (!sortField) return suppliers;

    return [...suppliers].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'code':
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'taxCode':
          valA = (a.taxCode || '').toLowerCase();
          valB = (b.taxCode || '').toLowerCase();
          break;
        case 'contactPerson':
          valA = (a.contactPerson || '').toLowerCase();
          valB = (b.contactPerson || '').toLowerCase();
          break;
        case 'phone':
          valA = a.phone || '';
          valB = b.phone || '';
          break;
        case 'address':
          valA = (a.address || '').toLowerCase();
          valB = (b.address || '').toLowerCase();
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
  }, [suppliers, sortField, sortDir]);

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasScrollY, setHasScrollY] = useState(false);

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
  }, [sortedSuppliers, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '9%' }} />
      <col style={{ width: '17%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '12%' }} />
    </colgroup>
  );

  const thBaseStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '6px 5px',
    fontSize: 10.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    boxSizing: 'border-box',
    borderBottom: '1px solid #cbd5e1',
    userSelect: 'none',
  };

  const sortIcon = (field: SortField) => (
    <ArrowUpDown
      size={11}
      style={{ color: sortField === field ? '#0f766e' : '#94a3b8', flexShrink: 0 }}
    />
  );

  return (
    <div className="so-list-table-card so-list-table-card--dense">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table">
          {tableColGroup}
          <thead>
            <tr>
              <th
                onClick={() => handleSort('code')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã NCC"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã NCC</span>
                  {sortIcon('code')}
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên NCC"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên NCC</span>
                  {sortIcon('name')}
                </div>
              </th>

              <th
                onClick={() => handleSort('taxCode')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã số thuế"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>MST</span>
                  {sortIcon('taxCode')}
                </div>
              </th>

              <th
                onClick={() => handleSort('contactPerson')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo người liên hệ"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Người LH</span>
                  {sortIcon('contactPerson')}
                </div>
              </th>

              <th
                onClick={() => handleSort('phone')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo số điện thoại"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>SĐT</span>
                  {sortIcon('phone')}
                </div>
              </th>

              <th
                onClick={() => handleSort('address')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo địa chỉ"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Địa chỉ</span>
                  {sortIcon('address')}
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer' }}
                title="Sắp xếp theo trạng thái"
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    width: '100%',
                  }}
                >
                  <span>Trạng thái</span>
                  {sortIcon('status')}
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Thao tác</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Body Scroll Container (Vertical scroll strictly in rows area) ── */}
      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table">
          {tableColGroup}
          <tbody>
            {sortedSuppliers.length > 0 ? (
              sortedSuppliers.map((supplier) => (
                <SupplierTableRow
                  key={supplier.id}
                  supplier={supplier}
                  onViewDetail={onViewDetail}
                  onEdit={onEdit}
                  canEdit={canEdit}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: '#64748b',
                    fontSize: 13,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Building2 size={36} color="#cbd5e1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Không tìm thấy nhà cung cấp nào phù hợp
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      Vui lòng thử thay đổi từ khóa tìm kiếm hoặc bấm &quot;Đặt lại&quot; bộ lọc.
                    </span>
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
        itemLabel="nhà cung cấp"
      />
    </div>
  );
};
