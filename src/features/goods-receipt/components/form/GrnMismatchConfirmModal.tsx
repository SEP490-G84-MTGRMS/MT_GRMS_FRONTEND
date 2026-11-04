import type { FC } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import type { GrnItemDetail } from '../../types/grn.types';

interface GrnMismatchConfirmModalProps {
  isOpen: boolean;
  mismatchedItems: GrnItemDetail[];
  onClose: () => void;
  onConfirm: () => void;
}

export const GrnMismatchConfirmModal: FC<GrnMismatchConfirmModalProps> = ({
  isOpen,
  mismatchedItems,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

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
          maxWidth: 540,
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
              Xác nhận chênh lệch hàng hóa so với đơn PO
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
          <p style={{ margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Phát hiện <b>{mismatchedItems.length}</b> mặt hàng có số lượng thực nhận không khớp với số lượng đặt trên PO.
            Hệ thống sẽ lưu phiếu ở trạng thái <b style={{ color: '#dc2626' }}>MISMATCH (Lệch hàng)</b> và lập biên bản đối soát.
          </p>

          <div
            style={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid #f1f5f9',
              borderRadius: 6,
              backgroundColor: '#f8fafc',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '7px 10px', textAlign: 'left' }}>Sản phẩm</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Đặt</th>
                  <th style={{ padding: '7px 8px', textAlign: 'right' }}>Nhận</th>
                  <th style={{ padding: '7px 10px', textAlign: 'center' }}>Lệch</th>
                </tr>
              </thead>
              <tbody>
                {mismatchedItems.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{it.productName}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{it.productCode}</div>
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: '#475569' }}>
                      {it.orderedQty} {it.unit}
                    </td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {it.receivedQty} {it.unit}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: it.differenceQty < 0 ? '#fee2e2' : '#f3e8ff',
                          color: it.differenceQty < 0 ? '#dc2626' : '#7e22ce',
                        }}
                      >
                        {it.differenceQty > 0 ? `+${it.differenceQty}` : it.differenceQty}
                      </span>
                    </td>
                  </tr>
                ))}
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
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 32,
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
            onClick={onConfirm}
            style={{
              height: 32,
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
            <span>Xác nhận lập biên bản & Nhập kho</span>
          </button>
        </div>
      </div>
    </div>
  );
};
