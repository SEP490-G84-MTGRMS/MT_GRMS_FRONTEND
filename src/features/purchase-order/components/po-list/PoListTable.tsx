import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  Truck,
  Eye,
  Edit3,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
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
}

type SortField = 'poCode' | 'supplier' | 'branch' | 'lastUpdated' | 'expectedDelivery' | 'itemCount' | 'totalAmount' | 'status';
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
        case 'supplier':
          valA = a.supplierName.toLowerCase();
          valB = b.supplierName.toLowerCase();
          break;
        case 'branch':
          valA = a.branchName.toLowerCase();
          valB = b.branchName.toLowerCase();
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

  // Render Status Badge
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
    <div
      style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Table Container with Sticky Header ── */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          maxHeight: 'calc(100vh - 230px)',
          minHeight: 280,
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1120,
            borderCollapse: 'separate',
            borderSpacing: 0,
            fontSize: 13,
            textAlign: 'left',
          }}
        >
          {/* Column widths */}
          <colgroup>
            <col style={{ width: '13%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
          </colgroup>

          {/* Sticky Header */}
          <thead>
            <tr
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {/* 1. Mã PO */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('poCode')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Mã PO</span>
                  <ArrowUpDown size={12} color={sortField === 'poCode' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 2. Nhà cung cấp */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('supplier')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Nhà cung cấp</span>
                  <ArrowUpDown size={12} color={sortField === 'supplier' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 3. Chi nhánh nhận */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('branch')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Chi nhánh nhận</span>
                  <ArrowUpDown size={12} color={sortField === 'branch' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 4. Nguồn tạo / Người nhập */}
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #cbd5e1', background: '#f8fafc' }}>
                Nguồn tạo / Người nhập
              </th>

              {/* 5. Ngày sửa cuối */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('lastUpdated')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Ngày sửa cuối</span>
                  <ArrowUpDown size={12} color={sortField === 'lastUpdated' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 6. Dự kiến giao */}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('expectedDelivery')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>Dự kiến giao</span>
                  <ArrowUpDown size={12} color={sortField === 'expectedDelivery' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 7. Số mặt hàng */}
              <th
                style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('itemCount')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Số SKU</span>
                  <ArrowUpDown size={12} color={sortField === 'itemCount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 8. Tổng tiền */}
              <th
                style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('totalAmount')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, width: '100%' }}>
                  <span>Tổng tiền</span>
                  <ArrowUpDown size={12} color={sortField === 'totalAmount' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 9. Trạng thái */}
              <th
                style={{
                  padding: '10px 10px',
                  textAlign: 'center',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => handleSort('status')}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <span>Trạng thái</span>
                  <ArrowUpDown size={12} color={sortField === 'status' ? '#0d9488' : '#94a3b8'} />
                </div>
              </th>

              {/* 10. Thao tác */}
              <th
                style={{
                  padding: '10px 14px 10px 8px',
                  textAlign: 'right',
                  borderBottom: '1px solid #cbd5e1',
                  background: '#f8fafc',
                }}
              >
                Thao tác
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {sortedOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 14,
                  }}
                >
                  Không tìm thấy đơn mua hàng PO nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              sortedOrders.map((order) => {
                return (
                  <tr
                    key={order.id}
                    onClick={() => onViewDetail(order)}
                    style={{
                      height: 60,
                      cursor: 'pointer',
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
                    {/* 1. Mã PO & Mã cửa hàng */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            padding: '1px 5px',
                            borderRadius: 4,
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            width: 'fit-content',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {order.storeRefCode}
                        </span>
                      </div>
                    </td>

                    {/* 2. Nhà cung cấp */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          {order.supplierName}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: '#64748b',
                          }}
                        >
                          {order.supplierCode}
                        </span>
                      </div>
                    </td>

                    {/* 3. Chi nhánh nhận */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                        {order.branchName}
                      </span>
                    </td>

                    {/* 4. Nguồn tạo / Người nhập */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
                        <FileText size={13} color="#94a3b8" />
                        <span>{order.createdSource}</span>
                      </div>
                    </td>

                    {/* 5. Ngày sửa cuối */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {order.lastUpdated}
                      </span>
                    </td>

                    {/* 6. Dự kiến giao */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0f172a', fontSize: 12.5, fontWeight: 600 }}>
                        <Truck size={14} color="#0d9488" />
                        <span>{order.expectedDelivery}</span>
                      </div>
                    </td>

                    {/* 7. Số mặt hàng */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
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

                    {/* 8. Tổng tiền */}
                    <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
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

                    {/* 9. Trạng thái */}
                    <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {renderStatusBadge(order.status)}
                    </td>

                    {/* 10. Thao tác */}
                    <td
                      style={{
                        padding: '8px 14px 8px 8px',
                        textAlign: 'right',
                        verticalAlign: 'middle',
                      }}
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
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#0d9488';
                            e.currentTarget.style.color = '#0d9488';
                            e.currentTarget.style.backgroundColor = '#f0fdfa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.color = '#334155';
                            e.currentTarget.style.backgroundColor = '#ffffff';
                          }}
                          title="Xem chi tiết đơn mua hàng"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

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
                              fontSize: 12,
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#64748b',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#0284c7';
                              e.currentTarget.style.color = '#0284c7';
                              e.currentTarget.style.backgroundColor = '#f0f9ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.backgroundColor = '#ffffff';
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

      {/* ── Footer Phân trang (Paging) ── */}
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
        }}
      >
        {/* Bên trái: Thông tin số lượng & Chọn số bản ghi / trang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            Hiển thị <b>{startItem}</b> - <b>{endItem}</b> trên <b>{totalCount}</b> đơn mua hàng PO
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
