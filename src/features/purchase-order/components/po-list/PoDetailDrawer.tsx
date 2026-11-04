import { useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  Truck,
  Building2,
  Factory,
  MessageSquare,
  PackageOpen,
} from 'lucide-react';
import type { PurchaseOrderListItem, PurchaseOrderStatus } from '../../types/po-list.types';

interface PoDetailDrawerProps {
  order: PurchaseOrderListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PoDetailDrawer: FC<PoDetailDrawerProps> = ({ order, isOpen, onClose }) => {
  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const totalOrderedItems = order.items.reduce((sum, it) => sum + it.orderedQty, 0);

  const renderStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'SENT':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
            }}
          >
            🟡 Đã gửi NCC
          </span>
        );
      case 'CONFIRMED':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
            }}
          >
            🟢 NCC đã chốt
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#e0e7ff',
              color: '#4338ca',
              border: '1px solid #c7d2fe',
            }}
          >
            🟣 Nhận 1 phần
          </span>
        );
      case 'RECEIVED':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            🔵 Đã nhập kho
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
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
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* ── Backdrop Overlay ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* ── Slide-over Drawer Panel ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 720,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 51,
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── 1. DRAWER HEADER (Sticky Top) ── */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {/* Row 1: Title & Close */}
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#0284c7',
                }}
              >
                {order.poCode}
              </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                }}
              >
                {order.storeRefCode}
              </span>
              {renderStatusBadge(order.status)}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Đóng ngăn kéo (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Row 2: Metadata Ribbon */}
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              fontSize: 12,
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Factory size={13} color="#0d9488" />
              <span style={{ color: '#64748b' }}>NCC:</span>
              <strong style={{ color: '#0f172a' }}>{order.supplierName}</strong>
            </div>

            <span style={{ color: '#cbd5e1' }}>|</span>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={13} color="#0d9488" />
              <span style={{ color: '#64748b' }}>Chi nhánh:</span>
              <strong style={{ color: '#0f172a' }}>{order.branchName}</strong>
            </div>

            <span style={{ color: '#cbd5e1' }}>|</span>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Truck size={13} color="#0d9488" />
              <span style={{ color: '#64748b' }}>Dự kiến giao:</span>
              <strong style={{ color: '#0f172a' }}>{order.expectedDelivery}</strong>
            </div>
          </div>
        </div>

        {/* ── 2. DRAWER BODY (Scrollable Item Table) ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {order.items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b',
              }}
            >
              <PackageOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#334155' }}>
                Không có mặt hàng nào trong đơn PO này
              </h3>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  <th
                    style={{
                      padding: '8px 8px',
                      textAlign: 'center',
                      width: 36,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    #
                  </th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #cbd5e1' }}>
                    Tên mặt hàng & Mã SKU
                  </th>
                  <th
                    style={{
                      padding: '8px 8px',
                      textAlign: 'center',
                      width: 50,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    ĐVT
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      width: 80,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    SL đặt
                  </th>
                  {order.status === 'PARTIALLY_RECEIVED' || order.status === 'RECEIVED' ? (
                    <th
                      style={{
                        padding: '8px 10px',
                        textAlign: 'right',
                        width: 85,
                        borderBottom: '1px solid #cbd5e1',
                      }}
                    >
                      SL nhận
                    </th>
                  ) : null}
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      width: 95,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    Đơn giá (đ)
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      width: 110,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    Thành tiền (đ)
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => {
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* 1. STT */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '10px 8px',
                          color: '#64748b',
                          fontSize: 12,
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {index + 1}
                      </td>

                      {/* 2. Tên mặt hàng & Mã SKU */}
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: '#64748b',
                            }}
                          >
                            {item.sku}
                          </span>
                        </div>
                      </td>

                      {/* 3. ĐVT */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '10px 8px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11.5,
                            padding: '2px 6px',
                            borderRadius: 4,
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {item.unit}
                        </span>
                      </td>

                      {/* 4. SL đặt */}
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 10px',
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#0f172a',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {item.orderedQty}
                      </td>

                      {/* 5. SL nhận (nếu có) */}
                      {order.status === 'PARTIALLY_RECEIVED' || order.status === 'RECEIVED' ? (
                        <td
                          style={{
                            textAlign: 'right',
                            padding: '10px 10px',
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: 700,
                            color:
                              item.receivedQty !== undefined && item.receivedQty < item.orderedQty
                                ? '#d97706'
                                : '#059669',
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          {item.receivedQty ?? 0}
                        </td>
                      ) : null}

                      {/* 6. Đơn giá */}
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 10px',
                          fontFamily: 'monospace',
                          fontSize: 12.5,
                          color: '#334155',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {item.price.toLocaleString('vi-VN')}
                      </td>

                      {/* 7. Thành tiền */}
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 12px',
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#059669',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {item.total.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 3. DRAWER FOOTER (Sticky Bottom) ── */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 10,
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Ghi chú đơn hàng */}
          {order.note && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: 12,
                color: '#475569',
              }}
            >
              <MessageSquare size={14} color="#64748b" style={{ flexShrink: 0 }} />
              <span>Ghi chú: {order.note}</span>
            </div>
          )}

          {/* Tổng kết tiền đơn hàng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                Tổng quy mô: <b>{order.itemCount} SKU</b> • <b>{totalOrderedItems} món</b>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                Tổng cộng PO:
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#059669',
                  fontFamily: 'monospace',
                }}
              >
                {order.totalAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
