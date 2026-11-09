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
  onReceiveOrder?: (order: PurchaseOrderListItem) => void;
}

const canShowReceiveAction = (order: PurchaseOrderListItem): boolean => {
  const grn = (order.activeGoodsReceiptStatus || '').toUpperCase();
  if (grn === 'DRAFT' || grn === 'COMPLETED') return true;
  if (order.status === 'CANCELLED' || order.status === 'REJECTED') return false;
  return (
    order.status === 'SENT' ||
    order.status === 'CONFIRMED' ||
    order.status === 'APPROVED' ||
    order.status === 'DISPATCHED' ||
    order.status === 'PARTIALLY_RECEIVED' ||
    order.status === 'RECEIVED'
  );
};

const receiveActionTitle = (order: PurchaseOrderListItem): string => {
  const grn = (order.activeGoodsReceiptStatus || '').toUpperCase();
  if (grn === 'COMPLETED') return `Xem phiếu nhập ${order.activeGoodsReceiptCode || ''}`.trim();
  if (grn === 'DRAFT') return `Tiếp tục xác nhận phiếu nháp ${order.activeGoodsReceiptCode || ''}`.trim();
  return 'Nhận hàng / Nhập kho theo PO này';
};

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
  onReceiveOrder,
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
      <col style={{ width: '10%' }} />
      <col style={{ width: '6%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '7%' }} />
      <col style={{ width: '12%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '5%' }} />
      <col style={{ width: '9%' }} />
      <col style={{ width: '8%' }} />
      <col style={{ width: '6%' }} />
    </colgroup>
  );

  const tableFitStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    tableLayout: 'fixed',
  };

  const thBaseStyle: CSSProperties = {
    backgroundColor: '#f8fafc',
    padding: '8px 8px',
    fontSize: 11.5,
    fontWeight: 700,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const cellWrap: CSSProperties = {
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    lineHeight: 1.35,
  };

  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    const colors: Record<string, string> = {
      SENT: '#b45309',
      CONFIRMED: '#15803d',
      PARTIALLY_RECEIVED: '#4338ca',
      RECEIVED: '#0369a1',
      CANCELLED: '#dc2626',
    };
    const labels: Record<string, string> = {
      SENT: 'Đã gửi',
      CONFIRMED: 'Đã chốt',
      PARTIALLY_RECEIVED: 'Nhận 1 phần',
      RECEIVED: 'Đã nhập',
      CANCELLED: 'Đã hủy',
    };

    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 700,
          maxWidth: '100%',
          color: colors[status] || '#334155',
          background: 'none',
          border: 'none',
          padding: 0,
          ...cellWrap,
        }}
        title={labels[status] || status}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="so-list-table-card">
      <div
        ref={headerRef}
        className="so-list-table-head"
        style={{ paddingRight: hasScrollY ? 6 : 0, overflowX: 'hidden' }}
      >
        <table className="so-list-table" style={tableFitStyle}>
          {tableColGroup}
          <thead>
            <tr>
              <th
                onClick={() => handleSort('poCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã PO</span>
                  <ArrowUpDown size={11} color={sortField === 'poCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('branchCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã CN</span>
                  <ArrowUpDown size={11} color={sortField === 'branchCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('branch')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Chi nhánh</span>
                  <ArrowUpDown size={11} color={sortField === 'branch' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('supplierCode')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Mã NCC</span>
                  <ArrowUpDown size={11} color={sortField === 'supplierCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('supplier')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Nhà cung cấp</span>
                  <ArrowUpDown size={11} color={sortField === 'supplier' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th style={thBaseStyle}>Nguồn tạo</th>

              <th
                onClick={() => handleSort('lastUpdated')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Ngày sửa</span>
                  <ArrowUpDown size={11} color={sortField === 'lastUpdated' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('expectedDelivery')}
                style={{ ...thBaseStyle, cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Giao hàng</span>
                  <ArrowUpDown size={11} color={sortField === 'expectedDelivery' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('itemCount')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>SKU</span>
                  <ArrowUpDown size={11} color={sortField === 'itemCount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('totalAmount')}
                style={{ ...thBaseStyle, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, width: '100%' }}>
                  <span>Tổng tiền</span>
                  <ArrowUpDown size={11} color={sortField === 'totalAmount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th
                onClick={() => handleSort('status')}
                style={{ ...thBaseStyle, textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Trạng thái</span>
                  <ArrowUpDown size={11} color={sortField === 'status' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              <th style={{ ...thBaseStyle, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
        </table>
      </div>

      <div
        ref={bodyRef}
        className="so-list-table-body supplier-table-scroll-container"
        onScroll={handleBodyScroll}
        style={{ overflowX: 'hidden' }}
      >
        <table className="so-list-table" style={tableFitStyle}>
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
                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.poCode}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#0284c7',
                            ...cellWrap,
                          }}
                        >
                          {order.poCode}
                        </span>
                        {order.revisionNumber != null && order.revisionNumber > 1 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0369a1' }}>
                            Rev {order.revisionNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={branchCode}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#475569',
                          ...cellWrap,
                        }}
                      >
                        {branchCode}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.branchName}>
                      <span style={{ fontSize: 12.5, color: '#334155', fontWeight: 500, ...cellWrap }}>
                        {order.branchName}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.supplierCode || '—'}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', ...cellWrap }}>
                        {order.supplierCode || '—'}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.supplierName}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', ...cellWrap }}>
                        {order.supplierName}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.createdSource}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'flex-start',
                          gap: 4,
                          color: '#475569',
                          fontSize: 12,
                          maxWidth: '100%',
                          ...cellWrap,
                        }}
                      >
                        <FileText size={12} color="#94a3b8" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={cellWrap}>{order.createdSource}</span>
                      </div>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.lastUpdated}>
                      <span style={{ fontSize: 12, color: '#64748b', ...cellWrap }}>{order.lastUpdated}</span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={cellWrap} title={order.expectedDelivery}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'flex-start',
                          gap: 4,
                          color: '#0f172a',
                          fontSize: 12,
                          fontWeight: 600,
                          maxWidth: '100%',
                          ...cellWrap,
                        }}
                      >
                        <Truck size={12} color="#0d9488" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={cellWrap}>{order.expectedDelivery}</span>
                      </div>
                    </td>

                    <td className="so-list-td" style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: '#475569',
                        }}
                        title={`${order.itemCount} SKU`}
                      >
                        {order.itemCount}
                      </span>
                    </td>

                    <td
                      className="so-list-td so-list-td--wrap"
                      style={{ textAlign: 'right', ...cellWrap }}
                      title={`${order.totalAmount.toLocaleString('vi-VN')} đ`}
                    >
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 800,
                          color: '#059669',
                          fontFamily: 'monospace',
                          ...cellWrap,
                        }}
                      >
                        {order.totalAmount.toLocaleString('vi-VN')}
                      </span>
                    </td>

                    <td className="so-list-td so-list-td--wrap" style={{ textAlign: 'center', ...cellWrap }}>
                      {renderStatusBadge(order.status)}
                    </td>

                    <td
                      className="so-list-td so-list-td--actions"
                      style={{ textAlign: 'center', overflow: 'visible' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onViewDetail(order)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                          title="Xem chi tiết đơn mua hàng"
                        >
                          <Eye size={12} />
                        </button>

                        {(order.status === 'SENT' || order.status === 'CONFIRMED') && onEditOrder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditOrder(order);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0369a1',
                              cursor: 'pointer',
                            }}
                            title="Sửa SL trên ma trận (còn trước cutoff) rồi chốt lại để cập nhật PO"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}

                        {onReceiveOrder && canShowReceiveAction(order) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReceiveOrder(order);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              backgroundColor:
                                (order.activeGoodsReceiptStatus || '').toUpperCase() === 'COMPLETED'
                                  ? '#ecfdf5'
                                  : '#f0fdfa',
                              border: '1px solid #99f6e4',
                              color: '#0f766e',
                              cursor: 'pointer',
                            }}
                            title={receiveActionTitle(order)}
                          >
                            <PackageCheck size={12} />
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
