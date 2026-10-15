import type { FC } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Truck,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';
import type { SupplierDispatchGroup } from '../../types/po.types';

interface SupplierDispatchCardProps {
  supplier: SupplierDispatchGroup;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateItemQty: (supplierId: string, itemId: string, newQty: number) => void;
  onUpdateNote: (supplierId: string, note: string) => void;
  onDispatch: (supplier: SupplierDispatchGroup) => void;
}

export const SupplierDispatchCard: FC<SupplierDispatchCardProps> = ({
  supplier,
  isExpanded,
  onToggleExpand,
  onUpdateItemQty,
  onUpdateNote,
  onDispatch,
}) => {
  // Real-time calculations
  const totalAmount = supplier.items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const totalQty = supplier.items.reduce((sum, it) => sum + it.qty, 0);
  const totalSkus = supplier.items.filter((it) => it.qty > 0).length;
  const isMovMet = totalAmount >= supplier.minOrderValue;
  const movShortage = Math.max(0, supplier.minOrderValue - totalAmount);

  // Styling based on urgency
  const urgencyStyles: Record<
    SupplierDispatchGroup['urgency'],
    { border: string; badgeBg: string; badgeColor: string; badgeText: string; icon: string }
  > = {
    critical: {
      border: '#fca5a5',
      badgeBg: '#fee2e2',
      badgeColor: '#b91c1c',
      badgeText: '🔴 KHẨN CẤP (< 2 GIỜ)',
      icon: '⏰',
    },
    today: {
      border: '#fde68a',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309',
      badgeText: '🟡 HÔM NAY',
      icon: '⏰',
    },
    later: {
      border: '#e2e8f0',
      badgeBg: '#f1f5f9',
      badgeColor: '#475569',
      badgeText: '⚪ ĐỢT TỚI',
      icon: '📅',
    },
    completed: {
      border: '#86efac',
      badgeBg: '#dcfce7',
      badgeColor: '#15803d',
      badgeText: '🟢 ĐÃ PHÁT HÀNH PO',
      icon: '✓',
    },
  };

  const currentStyle = urgencyStyles[supplier.status === 'dispatched' ? 'completed' : supplier.urgency];

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${currentStyle.border}`,
        borderRadius: 8,
        marginBottom: 14,
        overflow: 'hidden',
        boxShadow: supplier.urgency === 'critical' ? '0 2px 8px rgba(239, 68, 68, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* ── TẦNG 1: CARD HEADER SUMMARY ── */}
      <div
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          background: supplier.status === 'dispatched' ? '#f0fdf4' : supplier.urgency === 'critical' ? '#fffafb' : '#ffffff',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        {/* Left: Supplier Info & Badges */}
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
              }}
            >
              {supplier.code}
            </span>

            <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              {supplier.name}
            </span>

            {/* Urgency Badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: currentStyle.badgeBg,
                color: currentStyle.badgeColor,
              }}
            >
              {currentStyle.badgeText}
            </span>
          </div>

          {/* Category tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {supplier.categoryTags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Center: Cutoff & Delivery Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Cutoff Timer */}
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>GIỜ CUTOFF ĐƠN</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Clock
                size={14}
                color={supplier.urgency === 'critical' ? '#dc2626' : supplier.urgency === 'today' ? '#d97706' : '#64748b'}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {supplier.cutoffTimeStr}
              </span>
              {supplier.status !== 'dispatched' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: supplier.urgency === 'critical' ? '#dc2626' : '#b45309',
                    background: supplier.urgency === 'critical' ? '#fee2e2' : '#fef3c7',
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  ({supplier.countdownDisplay})
                </span>
              )}
            </div>
          </div>

          {/* Expected Delivery */}
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>DỰ KIẾN GIAO HÀNG</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Truck size={14} color="#0d9488" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f766e' }}>
                {supplier.expectedDelivery}
              </span>
            </div>
          </div>

          {/* Total Amount & MOV */}
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TẠM TÍNH / MOV</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0d9488' }}>
                {totalAmount.toLocaleString('vi-VN')} đ
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                ({totalSkus} SKU • {totalQty} món)
              </span>
            </div>
            {/* MOV Status */}
            <div style={{ fontSize: 11, marginTop: 1 }}>
              {isMovMet ? (
                <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 size={11} /> Đạt đơn tối thiểu ({supplier.minOrderValue.toLocaleString('vi-VN')} đ)
                </span>
              ) : (
                <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <AlertCircle size={11} /> Thiếu {movShortage.toLocaleString('vi-VN')} đ để đạt MOV
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleExpand}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 32,
              padding: '0 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <span>{isExpanded ? 'Thu gọn' : `Xem chi tiết (${supplier.items.length} mặt hàng)`}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {supplier.status === 'dispatched' ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: '#dcfce7',
                border: '1px solid #86efac',
                fontSize: 12,
                fontWeight: 700,
                color: '#15803d',
              }}
            >
              <CheckCircle2 size={14} />
              <span>ĐÃ GỬI PO ({supplier.poCode || 'PO-OK'})</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onDispatch(supplier)}
              disabled={!isMovMet && totalAmount === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 16px',
                borderRadius: 6,
                border: 'none',
                background: !isMovMet
                  ? '#e0f2fe'
                  : supplier.urgency === 'critical'
                  ? '#dc2626'
                  : '#0d9488',
                color: !isMovMet ? '#0369a1' : '#ffffff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isMovMet ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
              }}
              title={
                !isMovMet
                  ? `Đơn chưa đạt giá trị tối thiểu ${supplier.minOrderValue.toLocaleString('vi-VN')} đ`
                  : 'Chốt đơn và phát hành Purchase Order'
              }
            >
              <Send size={13} />
              <span>{!isMovMet ? 'Chốt đơn (Cảnh báo MOV)' : 'Chốt & Tạo PO'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TẦNG 2: BẢNG CHI TIẾT SKU EXPANDED ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '14px 18px' }}>
          {/* MOV Warning Banner if not met */}
          {!isMovMet && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                padding: '8px 12px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#b91c1c',
              }}
            >
              <AlertCircle size={15} color="#dc2626" />
              <span>
                <strong>Cảnh báo đơn tối thiểu (MOV):</strong> Tổng đơn hiện tại{' '}
                <strong>{totalAmount.toLocaleString('vi-VN')} đ</strong> chưa đạt hạn mức tối thiểu{' '}
                <strong>{supplier.minOrderValue.toLocaleString('vi-VN')} đ</strong> của NCC. Vui lòng tăng thêm ít nhất{' '}
                <strong>{movShortage.toLocaleString('vi-VN')} đ</strong> trước khi gửi PO.
              </span>
            </div>
          )}

          {/* Table of SKUs */}
          <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', width: 40, textAlign: 'center' }}>#</th>
                  <th style={{ padding: '8px 12px' }}>Tên mặt hàng & Mã SKU</th>
                  <th style={{ padding: '8px 12px', width: 90 }}>ĐVT</th>
                  <th style={{ padding: '8px 12px', width: 130, textAlign: 'right' }}>Đơn giá (đ)</th>
                  <th style={{ padding: '8px 12px', width: 130, textAlign: 'center' }}>SL đặt hàng</th>
                  <th style={{ padding: '8px 12px', width: 140, textAlign: 'right' }}>Thành tiền (đ)</th>
                  <th style={{ padding: '8px 12px', width: 180 }}>Lịch Cutoff</th>
                </tr>
              </thead>
              <tbody>
                {supplier.items.map((item, idx) => {
                  const lineTotal = item.qty * item.price;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: idx < supplier.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{item.sku}</div>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{item.unit}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 500, color: '#334155' }}>
                        {item.price.toLocaleString('vi-VN')}
                      </td>
                      {/* Inline Quantity Edit */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {supplier.status === 'dispatched' ? (
                          <strong style={{ fontSize: 13, color: '#0f172a' }}>{item.qty}</strong>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              onUpdateItemQty(supplier.id, item.id, val);
                            }}
                            style={{
                              width: 72,
                              height: 28,
                              textAlign: 'center',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                              fontSize: 13,
                              color: item.qty > 0 ? '#0d9488' : '#94a3b8',
                              background: '#ffffff',
                              outline: 'none',
                            }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>
                        {lineTotal.toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: item.groupType === 'daily' ? '#fef2f2' : '#f1f5f9',
                            color: item.groupType === 'daily' ? '#b91c1c' : '#475569',
                            fontWeight: 500,
                          }}
                        >
                          {item.cutoffSchedule}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom of expanded card: Note for supplier & quick submit */}
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Note input */}
            <div style={{ flex: '1 1 350px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                Ghi chú cho NCC:
              </span>
              <input
                type="text"
                value={supplier.note}
                disabled={supplier.status === 'dispatched'}
                onChange={(e) => onUpdateNote(supplier.id, e.target.value)}
                placeholder="VD: Giao trước 7h sáng, giao hóa đơn VAT kèm hàng..."
                style={{
                  flex: 1,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 4,
                  border: '1px solid #cbd5e1',
                  fontSize: 12,
                  outline: 'none',
                  background: supplier.status === 'dispatched' ? '#f1f5f9' : '#ffffff',
                }}
              />
            </div>

            {/* Total recap & Dispatch button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#334155' }}>
                Tổng cộng: <strong style={{ color: '#0d9488', fontSize: 15 }}>{totalAmount.toLocaleString('vi-VN')} đ</strong>
              </span>

              {supplier.status !== 'dispatched' && (
                <button
                  type="button"
                  onClick={() => onDispatch(supplier)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 32,
                    padding: '0 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0d9488',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Send size={13} />
                  <span>Chốt & Gửi PO Ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
