import { useState, useMemo, useRef, useEffect } from 'react';
import type { FC } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Eye,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import type { BranchListItem } from '../../types/po.types';

interface BranchOrderTableProps {
  branches: BranchListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onViewDetail: (branch: BranchListItem) => void;
  onOrder: (branchId: string) => void;
}

type SortField = 'code' | 'name' | 'managerName' | 'pendingCount' | 'status' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

export const BranchOrderTable: FC<BranchOrderTableProps> = ({
  branches,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
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

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * pageSize + 1;
  const endItem = Math.min(pageIndex * pageSize, totalCount);

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
      <col style={{ width: '10%' }} />
      <col style={{ width: '28%' }} />
      <col style={{ width: '18%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
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
            padding: '3px 9px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: '#dcfce7',
            color: '#15803d',
            whiteSpace: 'nowrap',
          }}
        >
          Hoạt động
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 9px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          whiteSpace: 'nowrap',
        }}
      >
        Ngừng hoạt động
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
            minWidth: 980,
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
                  <span>Tên Chi Nhánh & Địa Chỉ</span>
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

      {/* ── Table Body (Independently Scrollable Container) ── */}
      <div
        ref={bodyRef}
        onScroll={handleBodyScroll}
        style={{
          width: '100%',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          minHeight: 0,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 980,
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
                  colSpan={7}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <Building2 size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Không tìm thấy chi nhánh nào phù hợp</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Hãy thử thay đổi từ khóa hoặc điều kiện bộ lọc</div>
                </td>
              </tr>
            ) : (
              sortedBranches.map((b) => (
                <tr
                  key={b.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  {/* 1. Mã CN */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--blue-primary, #0f766e)',
                        backgroundColor: '#f0fdfa',
                        padding: '3px 8px',
                        borderRadius: 4,
                        border: '1px solid #ccfbf1',
                        fontSize: 12,
                      }}
                    >
                      {b.code}
                    </span>
                  </td>

                  {/* 2. Tên & Địa chỉ */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, marginBottom: 2 }}>
                      {b.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: '#64748b',
                        fontSize: 11.5,
                      }}
                    >
                      <MapPin size={11} style={{ flexShrink: 0, color: '#94a3b8' }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={b.address}
                      >
                        {b.address}
                      </span>
                    </div>
                  </td>

                  {/* 3. Người quản lý & SĐT */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 12.5, marginBottom: 2 }}>
                      {b.managerName || '—'}
                    </div>
                    {b.managerPhone && b.managerPhone !== '—' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11.5 }}>
                        <Phone size={11} style={{ flexShrink: 0, color: '#94a3b8' }} />
                        <span>{b.managerPhone}</span>
                      </div>
                    )}
                  </td>

                  {/* 4. Đơn PO đang chờ */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 24,
                          height: 22,
                          padding: '0 6px',
                          borderRadius: 11,
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: (b.pendingCount ?? 0) > 0 ? '#fef3c7' : '#f1f5f9',
                          color: (b.pendingCount ?? 0) > 0 ? '#b45309' : '#64748b',
                        }}
                      >
                        {b.pendingCount ?? 0}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748b' }}>đơn chờ</span>
                    </div>
                  </td>

                  {/* 5. Cập nhật cuối */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: '#64748b', fontSize: 12 }}>
                    {b.lastUpdated || '—'}
                  </td>

                  {/* 6. Trạng thái */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    {renderStatusBadge(b.status)}
                  </td>

                  {/* 7. Thao tác */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => onOrder(b.id)}
                        className="po-btn po-btn-primary"
                        style={{
                          height: 28,
                          padding: '0 10px',
                          fontSize: 11.5,
                          gap: 4,
                        }}
                        title="Tạo ma trận đặt hàng cho chi nhánh này"
                      >
                        <ShoppingCart size={12} />
                        <span>Đặt hàng</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewDetail(b)}
                        style={{
                          height: 28,
                          width: 28,
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Xem chi tiết chi nhánh"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer Phân trang (Paging) tích hợp theo chuẩn SupplierTable ── */}
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
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> chi nhánh
          </div>

          {onPageSizeChange && (
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
          )}
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
