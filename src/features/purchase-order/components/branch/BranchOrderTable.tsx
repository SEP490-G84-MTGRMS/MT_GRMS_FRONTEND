import { useState, useMemo, useRef, useEffect } from 'react';
import type { CSSProperties, FC } from 'react';
import { Building2, ShoppingCart, ArrowUpDown } from 'lucide-react';
import type { BranchListItem } from '../../types/po.types';
import { TablePagination } from '../../../../components/common';
import '../../../../styles/so-list-page.css';

interface BranchOrderTableProps {
  branches: BranchListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onOrder: (branchId: string) => void;
}

type SortField =
  | 'code'
  | 'name'
  | 'managerName'
  | 'matrixProductCount'
  | 'pendingCount'
  | 'status'
  | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

export const BranchOrderTable: FC<BranchOrderTableProps> = ({
  branches,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOrder,
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

  const sortedBranches = useMemo(() => {
    if (!sortField) return branches;

    return [...branches].sort((a, b) => {
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
        case 'managerName':
          valA = a.managerName.toLowerCase();
          valB = b.managerName.toLowerCase();
          break;
        case 'matrixProductCount':
          valA = a.matrixProductCount ?? 0;
          valB = b.matrixProductCount ?? 0;
          break;
        case 'pendingCount':
          valA = a.pendingCount ?? 0;
          valB = b.pendingCount ?? 0;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'lastUpdated':
          valA = a.lastUpdated || '';
          valB = b.lastUpdated || '';
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [branches, sortField, sortDir]);

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
  }, [sortedBranches, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '7%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '15%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '13%' }} />
    </colgroup>
  );

  const thBaseStyle: CSSProperties = {
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

  const renderStatusBadge = (status: BranchListItem['status']) => {
    const isActive = status === 'active';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2px 8px',
          borderRadius: 9999,
          fontSize: 10.5,
          fontWeight: 600,
          backgroundColor: isActive ? '#f0fdf4' : '#f8fafc',
          color: isActive ? '#15803d' : '#64748b',
          border: isActive ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
          whiteSpace: 'nowrap',
        }}
      >
        {isActive ? 'Hoạt động' : 'Tạm ngưng'}
      </span>
    );
  };

  return (
    <div className="so-list-table-card so-list-table-card--dense">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1080, tableLayout: 'fixed' }}>
          {tableColGroup}
          <thead>
            <tr>
              <th
                onClick={() => handleSort('code')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo mã chi nhánh"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Mã CN</span>
                  {sortIcon('code')}
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo tên chi nhánh"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Tên CN</span>
                  {sortIcon('name')}
                </div>
              </th>

              <th style={thBaseStyle}>
                <span>Địa chỉ</span>
              </th>

              <th style={thBaseStyle}>
                <span>SĐT</span>
              </th>

              <th
                onClick={() => handleSort('managerName')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo người quản lý"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Người QL</span>
                  {sortIcon('managerName')}
                </div>
              </th>

              <th
                onClick={() => handleSort('matrixProductCount')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Số sản phẩm đã gán bán tại chi nhánh"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>SP cửa hàng</span>
                  {sortIcon('matrixProductCount')}
                </div>
              </th>

              <th
                onClick={() => handleSort('pendingCount')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Số đơn PO đang chờ"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>PO chờ</span>
                  {sortIcon('pendingCount')}
                </div>
              </th>

              <th
                onClick={() => handleSort('lastUpdated')}
                style={{ ...thBaseStyle, cursor: 'pointer' }}
                title="Sắp xếp theo cập nhật cuối"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <span>Cập nhật</span>
                  {sortIcon('lastUpdated')}
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

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={{ minWidth: 1080, tableLayout: 'fixed' }}>
          {tableColGroup}
          <tbody>
            {sortedBranches.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>
                    Không tìm thấy chi nhánh nào phù hợp
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>
                    Hãy thử thay đổi từ khóa hoặc điều kiện bộ lọc
                  </div>
                </td>
              </tr>
            ) : (
              sortedBranches.map((b) => (
                <tr
                  key={b.id}
                  className="so-list-row"
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        color: '#0f766e',
                        backgroundColor: '#f0fdfa',
                        padding: '1px 6px',
                        borderRadius: 4,
                        border: '1px solid #ccfbf1',
                        fontSize: 11,
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        lineHeight: 1.35,
                        display: 'inline-block',
                        maxWidth: '100%',
                      }}
                      title={b.code}
                    >
                      {b.code}
                    </span>
                  </td>

                  <td className="so-list-td--wrap">
                    <div className="so-list-name" title={b.name}>
                      {b.name}
                    </div>
                  </td>

                  <td className="so-list-td--wrap" style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#475569' }}>
                    {b.address || '—'}
                  </td>

                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', fontSize: 11, color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                    {b.phone || '—'}
                  </td>

                  <td
                    style={{
                      padding: '5px 6px',
                      borderBottom: '1px solid #f1f5f9',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: 11,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      lineHeight: 1.35,
                      verticalAlign: 'top',
                    }}
                  >
                    {b.managerName || '—'}
                  </td>

                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 22,
                          height: 20,
                          padding: '0 6px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: (b.matrixProductCount ?? 0) > 0 ? '#ecfdf5' : '#f1f5f9',
                          color: (b.matrixProductCount ?? 0) > 0 ? '#047857' : '#64748b',
                          border:
                            (b.matrixProductCount ?? 0) > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        }}
                        title="Số sản phẩm đã gán bán tại chi nhánh"
                      >
                        {b.matrixProductCount ?? 0}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>SP</span>
                    </div>
                  </td>

                  <td style={{ padding: '5px 6px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 22,
                          height: 20,
                          padding: '0 6px',
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: (b.pendingCount ?? 0) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: (b.pendingCount ?? 0) > 0 ? '#b45309' : '#64748b',
                          border: (b.pendingCount ?? 0) > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                        }}
                      >
                        {b.pendingCount ?? 0}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#64748b' }}>đơn</span>
                    </div>
                  </td>

                  <td
                    style={{
                      padding: '5px 6px',
                      borderBottom: '1px solid #f1f5f9',
                      color: '#64748b',
                      fontSize: 11,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      lineHeight: 1.35,
                      verticalAlign: 'top',
                    }}
                  >
                    {b.lastUpdated || '—'}
                  </td>

                  <td
                    className="so-list-td--status"
                    style={{
                      padding: '5px 6px',
                      borderBottom: '1px solid #f1f5f9',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    {renderStatusBadge(b.status)}
                  </td>

                  <td
                    className="so-list-td--actions"
                    style={{
                      padding: '5px 6px',
                      borderBottom: '1px solid #f1f5f9',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div className="so-list-actions" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onOrder(b.id)}
                        className="so-list-action-btn"
                        title="Tạo ma trận đặt hàng cho chi nhánh này"
                      >
                        <ShoppingCart size={11} />
                        <span>Đặt hàng</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={pageIndex}
        pageSize={pageSize}
        totalItems={totalCount}
        pageSizeOptions={[10, 15, 20, 30, 50]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange || (() => {})}
        itemLabel="chi nhánh"
      />
    </div>
  );
};
