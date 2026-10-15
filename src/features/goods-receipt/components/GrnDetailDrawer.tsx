import { useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  Truck,
  Building2,
  Store,
  AlertTriangle,
  Package,
  Printer,
  FileText,
  User,
} from 'lucide-react';
import type { GoodsReceiptListItem } from '../types/grn.types';

interface GrnDetailDrawerProps {
  receipt: GoodsReceiptListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (receipt: GoodsReceiptListItem) => void;
  onAction?: (action: string, receipt: GoodsReceiptListItem) => void;
}

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN').format(val);
};

export const GrnDetailDrawer: FC<GrnDetailDrawerProps> = ({
  receipt,
  isOpen,
  onClose,
  onPrint,
  onAction,
}) => {
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

  if (!isOpen || !receipt) return null;

  const totalOrdered = receipt.items.reduce((acc, it) => acc + it.orderedQty, 0);
  const totalReceived = receipt.items.reduce((acc, it) => acc + it.receivedQty, 0);
  const totalDiff = totalReceived - totalOrdered;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Drawer content panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 780,
          height: '100%',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1001,
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── 1. Drawer Header ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: '#e6f7ff',
                color: '#0066cc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  {receipt.code}
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 4,
                    backgroundColor:
                      receipt.status === 'CONFIRMED'
                        ? '#f6ffed'
                        : receipt.status === 'MISMATCH'
                        ? '#fff2f0'
                        : receipt.status === 'TODAY'
                        ? '#e6f7ff'
                        : '#fffbe6',
                    color:
                      receipt.status === 'CONFIRMED'
                        ? '#389e0d'
                        : receipt.status === 'MISMATCH'
                        ? '#cf1322'
                        : receipt.status === 'TODAY'
                        ? '#0050b3'
                        : '#d48806',
                    border: `1px solid ${
                      receipt.status === 'CONFIRMED'
                        ? '#b7eb8f'
                        : receipt.status === 'MISMATCH'
                        ? '#ffccc7'
                        : receipt.status === 'TODAY'
                        ? '#91d5ff'
                        : '#ffe58f'
                    }`,
                  }}
                >
                  {receipt.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Loại: <b>{receipt.typeLabel}</b> • Ngày: {receipt.receiveDate}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="po-btn po-btn-outline"
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Đóng (Escape)"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── 2. Drawer Body (Scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* A. Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Store size={13} />
                Nhà cung cấp:
              </span>
              <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                {receipt.supplierName} ({receipt.supplierCode})
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} />
                Chi nhánh tiếp nhận:
              </span>
              <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                {receipt.branchName}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileText size={13} />
                Mã PO tham chiếu:
              </span>
              <div style={{ fontWeight: 700, color: '#0066cc', marginTop: 2 }}>
                {receipt.poReference}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={13} />
                Thủ kho / Phụ trách:
              </span>
              <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 2 }}>
                {receipt.receiverName}
              </div>
            </div>
          </div>

          {/* B. Mismatch Alert Callout if status === 'MISMATCH' */}
          {receipt.status === 'MISMATCH' && (
            <div
              style={{
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ color: '#cf1322', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cf1322' }}>
                  Cảnh báo: Phát hiện chênh lệch số lượng hàng giao!
                </div>
                <div style={{ fontSize: 12, color: '#434343', marginTop: 2 }}>
                  {receipt.notes || 'Hàng thực nhận không khớp với số lượng trên đơn PO. Vui lòng kiểm tra biên bản.'}
                </div>
              </div>
            </div>
          )}

          {/* C. Items Table */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#334155',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Chi tiết mặt hàng & Đối soát PO ({receipt.items.length} SKU):</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                Đơn vị tính: VNĐ
              </span>
            </div>

            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>
                      Mặt hàng / SKU
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 60 }}>
                      ĐVT
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 75 }}>
                      SL Đặt
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 75 }}>
                      Thực nhận
                    </th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 70 }}>
                      Lệch
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 95 }}>
                      Đơn giá
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#334155', width: 105 }}>
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((it, idx) => {
                    const isDiff = it.differenceQty !== 0;
                    return (
                      <tr
                        key={it.id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isDiff ? '#fff8f8' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{it.productName}</div>
                          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span>Mã: {it.productCode}</span>
                            {it.batchCode && (
                              <span
                                style={{
                                  backgroundColor: '#e2e8f0',
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#334155',
                                }}
                              >
                                Lô: {it.batchCode}
                              </span>
                            )}
                            {it.expiryDate && (
                              <span
                                style={{
                                  backgroundColor: '#e0f2fe',
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: '#0369a1',
                                }}
                              >
                                HSD: {it.expiryDate}
                              </span>
                            )}
                          </div>
                          {it.note && (
                            <div style={{ fontSize: 11, color: '#cf1322', fontStyle: 'italic', marginTop: 2 }}>
                              * {it.note}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'center', color: '#475569' }}>
                          {it.unit}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                          {it.orderedQty}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>
                          {it.receivedQty}
                        </td>
                        <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800 }}>
                          {it.differenceQty < 0 ? (
                            <span style={{ color: '#cf1322' }}>{it.differenceQty}</span>
                          ) : it.differenceQty > 0 ? (
                            <span style={{ color: '#0066cc' }}>+{it.differenceQty}</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>0</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                          {formatCurrency(it.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* D. Summary Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ color: '#64748b', fontSize: 12 }}>Tổng kết số lượng:</div>
              <div style={{ marginTop: 2 }}>
                Đặt theo PO: <b>{totalOrdered}</b> • Thực nhận: <b>{totalReceived}</b>
                {totalDiff !== 0 && (
                  <span style={{ marginLeft: 8, fontWeight: 700, color: totalDiff < 0 ? '#cf1322' : '#0066cc' }}>
                    ({totalDiff < 0 ? `Thiếu ${Math.abs(totalDiff)}` : `Thừa +${totalDiff}`})
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#64748b', fontSize: 12 }}>Tổng tiền phiếu nhập:</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--blue-primary, #0066cc)',
                  fontFamily: 'monospace',
                }}
              >
                {formatCurrency(receipt.totalAmount)} ₫
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Drawer Footer ── */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b' }}>
            MT-GRMS Supply Chain • Phân hệ FE-05 Goods Receipt
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {receipt.status === 'TODAY' && (
              <button
                type="button"
                onClick={() => onAction?.('RECEIVE_NOW', receipt)}
                className="po-btn po-btn-primary"
                style={{ height: 32, padding: '0 14px', fontSize: 12, fontWeight: 700 }}
              >
                <Truck size={14} />
                <span>Nhập kho ngay</span>
              </button>
            )}

            {receipt.status === 'MISMATCH' && (
              <button
                type="button"
                onClick={() => onAction?.('RESOLVE_MISMATCH', receipt)}
                className="po-btn"
                style={{
                  height: 32,
                  padding: '0 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: '#fff1f0',
                  color: '#cf1322',
                  border: '1px solid #ffa39e',
                }}
              >
                <AlertTriangle size={14} />
                <span>Xử lý lệch</span>
              </button>
            )}

            {receipt.status === 'CONFIRMED' && (
              <button
                type="button"
                onClick={() => onPrint?.(receipt)}
                className="po-btn po-btn-outline"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                <Printer size={14} />
                <span>In phiếu</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="po-btn po-btn-outline"
              style={{ height: 32, padding: '0 14px', fontSize: 12 }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
