import type { FC } from 'react';
import { AlertTriangle, X, Check, RotateCcw, Truck } from 'lucide-react';
import type { GrnItemDetail, RejectionReason } from '../../types/grn.types';
import { REJECTION_REASON_LABELS } from '../../types/grn.types';

interface GrnMismatchConfirmModalProps {
  isOpen: boolean;
  mismatchedItems: GrnItemDetail[];
  onClose: () => void;
  onConfirm: (redirectToReturn?: boolean) => void;
}

const fmtCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

export const GrnMismatchConfirmModal: FC<GrnMismatchConfirmModalProps> = ({
  isOpen,
  mismatchedItems,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const totalRejectedQty = mismatchedItems.reduce(
    (sum, it) => sum + Math.max(0, it.orderedQty - (it.receivedQty || 0)),
    0
  );
  const totalReturnAmount = mismatchedItems.reduce(
    (sum, it) => sum + Math.max(0, it.orderedQty - (it.receivedQty || 0)) * (it.unitPrice || 0),
    0
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 720,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#fff1f2',
            borderBottom: '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#e11d48" />
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#9f1239' }}>
              Xác nhận từ chối nhận hàng &amp; Lập Phiếu trả hàng (RTV)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9f1239',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', fontSize: 13, color: '#334155' }}>
          <p style={{ margin: '0 0 10px 0', lineHeight: 1.55 }}>
            Phát hiện <b>{mismatchedItems.length}</b> mặt hàng có số lượng từ chối nhận so với đơn PO (tổng cộng{' '}
            <b style={{ color: '#dc2626' }}>{totalRejectedQty}</b> đơn vị — giá trị trả{' '}
            <b style={{ color: '#b45309' }}>{fmtCurrency(totalReturnAmount)} đ</b>).
          </p>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 12.5,
              color: '#9a3412',
            }}
          >
            <Truck size={18} style={{ flexShrink: 0, marginTop: 2, color: '#ea580c' }} />
            <div style={{ lineHeight: 1.5 }}>
              Hệ thống sẽ <b>tự động lập Phiếu trả hàng (Loại: Từ chối nhận hàng)</b> ở trạng thái{' '}
              <b>Đã bàn giao (Tài xế chở về ngay)</b> để xuất chứng từ ký nhận với tài xế và lưu vào màn hình{' '}
              <b>Quản lý Trả Hàng Nhà Cung Cấp</b>. Chỉ số lượng chấp nhận mới được cộng vào tồn kho chi nhánh.
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              marginBottom: 12,
              fontSize: 12.5,
              color: '#1e3a8a',
              lineHeight: 1.5,
            }}
          >
            <b>Quy tắc nhập kho (1 lần / PO):</b> Sau khi hoàn tất phiếu này, PO sẽ <b>đóng (COMPLETED)</b> kể cả
            khi giao thiếu. Phần còn thiếu <b>không</b> nhập tiếp trên cùng PO — cần <b>tạo đơn đặt bù</b> từ Matrix /
            Dispatch Hub rồi nhập bằng phiếu mới.
          </div>

          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              backgroundColor: '#f8fafc',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Sản phẩm</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>SL Đặt</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#0d9488' }}>Chấp nhận</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#dc2626' }}>Từ chối trả</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lý do từ chối</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Giá trị trả</th>
                </tr>
              </thead>
              <tbody>
                {mismatchedItems.map((it) => {
                  const rejected = Math.max(0, it.orderedQty - (it.receivedQty || 0));
                  const reasonLabel = it.rejectionReason
                    ? REJECTION_REASON_LABELS[it.rejectionReason as RejectionReason] || it.rejectionReason
                    : 'Từ chối nhận hàng';
                  return (
                    <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{it.productCode}</div>
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', color: '#475569' }}>
                        {it.orderedQty} {it.unit}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>
                        {it.receivedQty} {it.unit}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                          }}
                        >
                          {rejected} {it.unit}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#9a3412', fontWeight: 600, fontSize: 11.5 }}>
                        {reasonLabel}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {fmtCurrency(rejected * (it.unitPrice || 0))} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Kiểm tra lại
          </button>
          <button
            type="button"
            onClick={() => onConfirm(true)}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 6,
              border: '1px solid #fdba74',
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <RotateCcw size={14} />
            <span>Xác nhận &amp; Mở Phiếu trả hàng</span>
          </button>
          <button
            type="button"
            onClick={() => onConfirm(false)}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Check size={14} />
            <span>Xác nhận &amp; Hoàn tất nhập kho</span>
          </button>
        </div>
      </div>
    </div>
  );
};
