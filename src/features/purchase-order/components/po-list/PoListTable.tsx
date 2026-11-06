import { useState, useMemo, useRef, useEffect, type CSSProperties, type FC } from 'react';
import {
  Truck,
  Eye,
  Edit3,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  PackageCheck,
} from 'lucide-react';
import type { PurchaseOrderListItem, PurchaseOrderStatus } from '../../types/po-list.types';

interface PoListTableProps {
  orders: PurchaseOrderListItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onViewDetail: (order: PurchaseOrderListItem) => void;
  onEditOrder?: (order: PurchaseOrderListItem) => void;
  onReceiveGoods?: (order: PurchaseOrderListItem) => void;
}

type SortField =
  | 'poCode'
  | 'branchCode'
  | 'branch'
  | 'supplierCode'
  | 'supplier'
  | 'lastUpdated'
  | 'expectedDelivery'
  | 'itemCount'
  | 'totalAmount'
  | 'status';
type SortDirection = 'asc' | 'desc';

export const PoListTable: FC<PoListTableProps> = ({
  orders,
  totalCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEditOrder,
  onReceiveGoods,
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

  const sortedOrders = useMemo(() => {
    if (!sortField) return orders;

    return [...orders].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortField) {
        case 'poCode':
          valA = a.poCode;
          valB = b.poCode;
          break;
        case 'branchCode':
          valA = (a.branchCode || a.storeRefCode || '').toLowerCase();
          valB = (b.branchCode || b.storeRefCode || '').toLowerCase();
          break;
        case 'branch':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
          break;
        case 'supplierCode':
          valA = a.supplierCode.toLowerCase();
          valB = b.supplierCode.toLowerCase();
          break;
        case 'supplier':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'lastUpdated':
          valA = a.lastUpdated;
          valB = b.lastUpdated;
          break;
        case 'expectedDelivery':
          valA = a.expectedDelivery;
          valB = b.expectedDelivery;
          break;
        case 'itemCount':
          valA = a.itemCount;
          valB = b.itemCount;
          break;
        case 'totalAmount':
          valA = a.totalAmount;
          valB = b.totalAmount;
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
  }, [orders, sortField, sortDir]);

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
  }, [sortedOrders, pageSize]);

  const handleBodyScroll = () => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  };

  const tableColGroup = (
    <colgroup>
      <col style={{ width: '11%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '14%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '9%' }} />
    </colgroup>
  );

  const thBaseStyle: CSSProperties = {
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

  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              whiteSpace: 'nowrap',
            }}
          >
            🟡 Đã gửi NCC
          </span>
        );
      case 'CONFIRMED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              whiteSpace: 'nowrap',
            }}
          >
            🟢 NCC đã chốt
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
              whiteSpace: 'nowrap',
            }}
          >
            🟣 Nhận 1 phần
          </span>
        );
      case 'RECEIVED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              whiteSpace: 'nowrap',
            }}
          >
            🔵 Đã nhập kho
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              whiteSpace: 'nowrap',
            }}
          >
            🔴 Đã hủy
          </span>
        );
    }
  };

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0 }}
      >
        <table className="so-list-table" style={{ minWidth: 1360 }}>
          {tableColGroup}
          <thead>
            <tr>
              <th
                onClick={() => handleSort('poCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Mã PO</span>
                  <ArrowUpDown size={12} color={sortField === 'poCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('branchCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Mã CN</span>
                  <ArrowUpDown size={12} color={sortField === 'branchCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('branch')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Chi nhánh nhận</span>
                  <ArrowUpDown size={12} color={sortField === 'branch' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Mã NCC</span>
                  <ArrowUpDown size={12} color={sortField === 'supplierCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('supplier')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Nhà cung cấp</span>
                  <ArrowUpDown size={12} color={sortField === 'supplier' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th style={thBaseStyle}>Nguồn tạo / Người nhập</th>

              <th
                onClick={() => handleSort('lastUpdated')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Ngày sửa cuối</span>
                  <ArrowUpDown size={12} color={sortField === 'lastUpdated' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('expectedDelivery')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Dự kiến giao</span>
                  <ArrowUpDown size={12} color={sortField === 'expectedDelivery' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('itemCount')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Số SKU</span>
                  <ArrowUpDown size={12} color={sortField === 'itemCount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('totalAmount')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, width: '100%' }}>
                  <span>Tổng tiền</span>
                  <ArrowUpDown size={12} color={sortField === 'totalAmount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Trạng thái</span>
                  <ArrowUpDown size={12} color={sortField === 'status' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
      >
        <table className="so-list-table" style={{ minWidth: 1360 }}>
          {tableColGroup}
          <tbody>
            {sortedOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 14,
                    whiteSpace: 'normal',
                  }}
                >
                  Không tìm thấy đơn mua hàng PO nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                const branchCode = order.branchCode || order.storeRefCode || '—';
                return (
                  <tr
                    key={order.id}
                    className="so-list-row"
                    onClick={() => onViewDetail(order)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="so-list-td">
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: '#0284c7',
                        }}
                      >
                        {order.poCode}
                      </span>
                    </td>

                    <td className="so-list-td">
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#475569',
                        }}
                      >
                        {branchCode}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap">
                      <span style={{ fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                        {order.branchName}
                      </span>
                    </td>

                    <td className="so-list-td">
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                        {order.supplierCode || '—'}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap">
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {order.supplierName}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
                        <FileText size={13} color="#94a3b8" />
                        <span>{order.createdSource}</span>
                      </div>
                    </td>

                    <td className="so-list-td">
                      <span style={{ fontSize: 12, color: '#64748b' }}>{order.lastUpdated}</span>
                    </td>

                    <td className="so-list-td">
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0f172a', fontSize: 12.5, fontWeight: 600 }}>
                        <Truck size={14} color="#0d9488" />
                        <span>{order.expectedDelivery}</span>
                      </div>
                    </td>

                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {order.itemCount} SKU
                      </span>
                    </td>

                    <td className="so-list-td" style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: '#059669',
                          fontFamily: 'monospace',
                        }}
                      >
                        {order.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </td>

                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      {renderStatusBadge(order.status)}
                    </td>

                    <td
                      className="so-list-td so-list-td--actions"
                      style={{ textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => onViewDetail(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            height: 28,
                            padding: '0 8px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                          title="Xem chi tiết đơn mua hàng"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {(order.status === 'CONFIRMED' || order.status === 'SENT' || order.status === 'PARTIALLY_RECEIVED') && onReceiveGoods && (
                          <button
                            type="button"
                            onClick={() => onReceiveGoods(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              height: 28,
                              padding: '0 8px',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              backgroundColor: '#0f766e',
                              border: 'none',
                              color: '#ffffff',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            title="Tiến hành kiểm đếm và nhận hàng từ nhà cung cấp cho đơn PO này"
                          >
                            <PackageCheck size={12} />
                            <span>Nhận hàng</span>
                          </button>
                        )}

                        {(order.status === 'SENT' || order.status === 'CONFIRMED') && onEditOrder && (
                          <button
                            type="button"
                            onClick={() => onEditOrder(order)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#64748b',
                              cursor: 'pointer',
                            }}
                            title="Chỉnh sửa đơn mua hàng"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="so-list-pager">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> đơn mua hàng PO
          </div>

          {onPageSizeChange && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#64748b' }}>Bản ghi/trang:</span>
              <select
                className="so-list-pager-select"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>

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
