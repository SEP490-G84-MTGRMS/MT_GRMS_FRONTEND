import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import {
  Building2,
  ShoppingCart,
  ArrowUpDown,
} from 'lucide-react';
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
      <col style={{ width: '8%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '11%' }} />
      <col style={{ width: '10%' }} />
      <col style={{ width: '16%' }} />
    </colgroup>
  );

  const thBaseStyle: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const renderStatusBadge = (status: BranchListItem['status']) => {
    if (status === 'active') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3px 10px',
            borderRadius: 9999,
            fontSize: 11.5,
            fontWeight: 600,
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            whiteSpace: 'nowrap',
          }}
        >
          <span>Hoạt động</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 11.5,
          fontWeight: 600,
          backgroundColor: '#f8fafc',
          color: '#64748b',
          border: '1px solid #e2e8f0',
          whiteSpace: 'nowrap',
        }}
      >
        <span>Ngừng hoạt động</span>
      </span>
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
      {/* ── Table Header (Fixed at top, strictly outside vertical scroll) ── */}
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
            minWidth: 1080,
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
              <th
                onClick={() => handleSort('code')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã CN</span>
                  <ArrowUpDown size={12} color={sortField === 'code' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('name')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Tên Chi Nhánh</span>
                  <ArrowUpDown size={12} color={sortField === 'name' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('managerName')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Người Quản Lý</span>
                  <ArrowUpDown size={12} color={sortField === 'managerName' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('matrixProductCount')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>SP trên Matrix</span>
                  <ArrowUpDown
                    size={12}
                    color={sortField === 'matrixProductCount' ? '#0f766e' : '#94a3b8'}
                  />
                </div>
              </th>

              <th
                onClick={() => handleSort('pendingCount')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Đơn PO Đang Chờ</span>
                  <ArrowUpDown size={12} color={sortField === 'pendingCount' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('lastUpdated')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Cập Nhật Cuối</span>
                  <ArrowUpDown size={12} color={sortField === 'lastUpdated' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{
                  ...thBaseStyle,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Trạng Thái</span>
                  <ArrowUpDown size={12} color={sortField === 'status' ? '#0f766e' : '#94a3b8'} />
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>
                <span>Thao Tác</span>
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* ── Table Body Scroll Container (Sleek scrollbar matching SupplierTable) ── */}
      <div
        ref={bodyRef}
        className="supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{
          width: '100%',
          flex: '1 1 auto',
          overflowY: 'auto',
          overflowX: 'auto',
          minHeight: 0,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1080,
            tableLayout: 'fixed',
            borderCollapse: 'separate',
            borderSpacing: 0,
            textAlign: 'left',
            fontSize: 12.5,
          }}
        >
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
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: '#ffffff',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  {/* 1. Mã CN */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        color: '#0f766e',
                        backgroundColor: '#f0fdfa',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid #ccfbf1',
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {b.code}
                    </span>
                  </td>

                  {/* 2. Tên chi nhánh */}
                  <td
                    style={{
                      padding: '10px 12px',
                      verticalAlign: 'middle',
                      borderBottom: '1px solid #f1f5f9',
                      fontWeight: 600,
                      color: '#0f172a',
                      fontSize: 13,
                      lineHeight: 1.35,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                    title={b.name}
                  >
                    {b.name}
                  </td>

                  {/* 3. Người quản lý */}
                  <td
                    style={{
                      padding: '10px 12px',
                      verticalAlign: 'middle',
                      borderBottom: '1px solid #f1f5f9',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: 12.5,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                  >
                    {b.managerName || '—'}
                  </td>

                  {/* 4. SP đang nhập trên Order Matrix */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 26,
                          height: 22,
                          padding: '0 8px',
                          borderRadius: 11,
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: (b.matrixProductCount ?? 0) > 0 ? '#ecfdf5' : '#f1f5f9',
                          color: (b.matrixProductCount ?? 0) > 0 ? '#047857' : '#64748b',
                          border:
                            (b.matrixProductCount ?? 0) > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        }}
                        title="Số sản phẩm đang có số lượng trên Order Matrix"
                      >
                        {b.matrixProductCount ?? 0}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>SP</span>
                    </div>
                  </td>

                  {/* 5. Đơn PO đang chờ */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 26,
                          height: 22,
                          padding: '0 8px',
                          borderRadius: 11,
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: (b.pendingCount ?? 0) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: (b.pendingCount ?? 0) > 0 ? '#b45309' : '#64748b',
                          border: (b.pendingCount ?? 0) > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                        }}
                      >
                        {b.pendingCount ?? 0}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>đơn chờ</span>
                    </div>
                  </td>

                  {/* 5. Cập nhật cuối */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: '#64748b', fontSize: 12, borderBottom: '1px solid #f1f5f9' }}>
                    {b.lastUpdated || '—'}
                  </td>

                  {/* 6. Trạng thái */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' }}>
                    {renderStatusBadge(b.status)}
                  </td>

                  {/* 7. Thao tác */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => onOrder(b.id)}
                        className="po-btn po-btn-primary"
                        style={{
                          height: 28,
                          padding: '0 10px',
                          fontSize: 11.5,
                          gap: 4,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          boxShadow: '0 1px 2px rgba(15, 118, 110, 0.15)',
                        }}
                        title="Tạo ma trận đặt hàng cho chi nhánh này"
                      >
                        <ShoppingCart size={12} style={{ flexShrink: 0 }} />
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

      {/* ── Footer Phân trang chuẩn 1, 2, 3... ── */}
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
