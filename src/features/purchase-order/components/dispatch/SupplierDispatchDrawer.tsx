import { useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageSquare,
  PackageOpen,
} from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

interface SupplierDispatchDrawerProps {
  supplier: SupplierDispatchGroup | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevSupplier: () => void;
  onNextSupplier: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex?: number;
  totalSuppliersCount?: number;
  onUpdateItemQty: (supplierId: string, itemId: string, newQty: number) => void;
  onDeleteItem: (supplierId: string, itemId: string) => void;
  onUpdateNote: (supplierId: string, note: string) => void;
  onDispatch: (supplier: SupplierDispatchGroup) => void;
}

export const SupplierDispatchDrawer: FC<SupplierDispatchDrawerProps> = ({
  supplier,
  isOpen,
  onClose,
  onPrevSupplier,
  onNextSupplier,
  hasPrev,
  hasNext,
  currentIndex,
  totalSuppliersCount,
  onUpdateItemQty,
  onDeleteItem,
  onUpdateNote,
  onDispatch,
}) => {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !supplier) return null;

  // Real-time calculations
  const totalAmount = supplier.items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalQty = supplier.items.reduce((sum, it) => sum + it.qty, 0);
  const totalSkus = supplier.items.filter((it) => it.qty > 0).length;
  const isMovMet = totalAmount >= supplier.minOrderValue;
  const movShortage = Math.max(0, supplier.minOrderValue - totalAmount);
  const isDispatched = supplier.status === 'dispatched';
  const isCritical = supplier.urgency === 'critical' && !isDispatched;

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
          {/* Row 1: Supplier title + Prev/Next controls + Close */}
          <div
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 5,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  flexShrink: 0,
                }}
              >
                {supplier.code}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={supplier.name}
              >
                {supplier.name}
              </h2>
            </div>

            {/* Quick Navigation [↑ NCC trước] [↓ NCC tiếp theo] & Close button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {currentIndex !== undefined && totalSuppliersCount !== undefined && (
                <span style={{ fontSize: 12, color: '#64748b', marginRight: 4, fontWeight: 500 }}>
                  {currentIndex + 1}/{totalSuppliersCount}
                </span>
              )}

              <button
                type="button"
                onClick={onPrevSupplier}
                disabled={!hasPrev}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 30,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: hasPrev ? '#334155' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: hasPrev ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
                title="Xem nhà cung cấp trước (Phím tắt ↑)"
              >
                <ChevronUp size={15} />
                <span style={{ display: 'inline' }}>Trước</span>
              </button>

              <button
                type="button"
                onClick={onNextSupplier}
                disabled={!hasNext}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  height: 30,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: hasNext ? '#334155' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: hasNext ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
                title="Xem nhà cung cấp tiếp theo (Phím tắt ↓)"
              >
                <ChevronDown size={15} />
                <span style={{ display: 'inline' }}>Tiếp</span>
              </button>

              <div style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', margin: '0 4px' }} />

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
          </div>

          {/* Row 2: Sub-header metadata badges bar */}
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: 12,
            }}
          >
            {/* Cutoff time */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color={isCritical ? '#dc2626' : '#64748b'} />
              <span>Cutoff:</span>
              <strong style={{ color: isCritical ? '#dc2626' : '#1e293b' }}>
                {supplier.cutoffTimeStr}
              </strong>
              {isCritical ? (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  🔴 {supplier.countdownDisplay}
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>({supplier.countdownDisplay})</span>
              )}
            </div>

            <span style={{ color: '#cbd5e1' }}>|</span>

            {/* Delivery time */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Truck size={13} color="#0d9488" />
              <span>Giao:</span>
              <strong style={{ color: '#0f172a' }}>{supplier.expectedDelivery}</strong>
            </div>

            <span style={{ color: '#cbd5e1' }}>|</span>

            {/* MOV Status */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {isMovMet ? (
                <>
                  <CheckCircle2 size={13} color="#059669" />
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    Đạt MOV ({supplier.minOrderValue.toLocaleString('vi-VN')} đ)
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} color="#d97706" />
                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                    Chưa đạt MOV ({supplier.minOrderValue.toLocaleString('vi-VN')} đ) — Thiếu{' '}
                    {movShortage.toLocaleString('vi-VN')} đ
                  </span>
                </>
              )}
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
          {supplier.items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748b',
              }}
            >
              <PackageOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#334155' }}>
                Không có mặt hàng nào
              </h3>
              <p style={{ margin: 0, fontSize: 13 }}>
                Tất cả mặt hàng của nhà cung cấp này đã bị xóa hoặc chưa được chọn từ bảng lưới.
              </p>
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
                      width: 95,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    Đơn giá (đ)
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'center',
                      width: 105,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    SL đặt hàng
                  </th>
                  <th
                    style={{
                      padding: '8px 10px',
                      textAlign: 'right',
                      width: 110,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    Thành tiền (đ)
                  </th>
                  <th
                    style={{
                      padding: '8px 8px',
                      textAlign: 'center',
                      width: 40,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplier.items.map((item, index) => {
                  const lineTotal = item.qty * item.price;

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
                            background: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {item.unit}
                        </span>
                      </td>

                      {/* 4. Đơn giá */}
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

                      {/* 5. SL đặt hàng (Inline Editable Input) */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '10px 6px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <input
                          type="number"
                          min={0}
                          value={item.qty}
                          disabled={isDispatched}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            onUpdateItemQty(supplier.id, item.id, val);
                          }}
                          style={{
                            width: 78,
                            height: 32,
                            padding: '0 8px',
                            textAlign: 'right',
                            fontFamily: 'monospace',
                            fontSize: 13,
                            fontWeight: 700,
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            color: '#0f172a',
                            backgroundColor: isDispatched ? '#f1f5f9' : '#ffffff',
                            transition: 'border-color 0.15s ease',
                          }}
                          onFocus={(e) => {
                            if (!isDispatched) e.target.style.borderColor = '#0d9488';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#cbd5e1';
                          }}
                        />
                      </td>

                      {/* 6. Thành tiền */}
                      <td
                        style={{
                          textAlign: 'right',
                          padding: '10px 10px',
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#059669',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        {lineTotal.toLocaleString('vi-VN')} đ
                      </td>

                      {/* 7. Xóa mặt hàng */}
                      <td
                        style={{
                          textAlign: 'center',
                          padding: '10px 8px',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <button
                          type="button"
                          disabled={isDispatched}
                          onClick={() => onDeleteItem(supplier.id, item.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: 'none',
                            background: 'transparent',
                            color: isDispatched ? '#cbd5e1' : '#94a3b8',
                            cursor: isDispatched ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isDispatched) {
                              e.currentTarget.style.color = '#ef4444';
                              e.currentTarget.style.backgroundColor = '#fee2e2';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isDispatched ? '#cbd5e1' : '#94a3b8';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Xóa mặt hàng này khỏi PO"
                        >
                          <Trash2 size={15} />
                        </button>
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
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Note Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} color="#64748b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={supplier.note}
              disabled={isDispatched}
              onChange={(e) => onUpdateNote(supplier.id, e.target.value)}
              placeholder="Ghi chú cho NCC (VD: Giao trước 07:00 sáng giúp cửa hàng)..."
              style={{
                flex: 1,
                height: 34,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 12.5,
                color: '#1e293b',
                outline: 'none',
                backgroundColor: isDispatched ? '#f8fafc' : '#ffffff',
              }}
              onFocus={(e) => {
                if (!isDispatched) e.target.style.borderColor = '#0d9488';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e1';
              }}
            />
          </div>

          {/* Totals & Submit CTA button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            {/* Left summary numbers */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>
                  Tổng cộng ({totalSkus} SKU • {totalQty} món):
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#059669',
                    fontFamily: 'monospace',
                  }}
                >
                  {totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Right CTA button */}
            <div>
              {isDispatched ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Đã phát hành {supplier.poCode}</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={totalAmount === 0}
                  onClick={() => onDispatch(supplier)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 38,
                    padding: '0 20px',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: '#ffffff',
                    backgroundColor: isCritical ? '#dc2626' : '#0d9488',
                    border: 'none',
                    cursor: totalAmount === 0 ? 'not-allowed' : 'pointer',
                    opacity: totalAmount === 0 ? 0.6 : 1,
                    boxShadow: isCritical
                      ? '0 2px 6px rgba(220, 38, 38, 0.3)'
                      : '0 2px 6px rgba(13, 148, 136, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (totalAmount > 0) {
                      e.currentTarget.style.backgroundColor = isCritical ? '#b91c1c' : '#0f766e';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (totalAmount > 0) {
                      e.currentTarget.style.backgroundColor = isCritical ? '#dc2626' : '#0d9488';
                    }
                  }}
                >
                  <Send size={15} />
                  <span>🚀 Chốt & Gửi PO Ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
