import type { FC } from 'react';
import { AlertTriangle, X, Check, RotateCcw } from 'lucide-react';
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
          maxWidth: 920,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
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

        <div style={{ padding: '14px 18px', fontSize: 13, color: '#334155' }}>
          <p style={{ margin: '0 0 12px 0', lineHeight: 1.45 }}>
            <b>{mismatchedItems.length}</b> mặt hàng từ chối — tổng{' '}
            <b style={{ color: '#dc2626' }}>{totalRejectedQty}</b> ĐV ·{' '}
            <b style={{ color: '#b45309' }}>{fmtCurrency(totalReturnAmount)} đ</b>
          </p>

          <div
            style={{
              maxHeight: 320,
              overflow: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              backgroundColor: '#f8fafc',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: 820,
                borderCollapse: 'collapse',
                fontSize: 12,
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: 130 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 140 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã SP</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tên sản phẩm</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right' }}>SL đặt</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#0d9488' }}>Chấp nhận</th>
                  <th style={{ padding: '8px 8px', textAlign: 'right', color: '#dc2626' }}>Từ chối</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Lý do</th>
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
                      <td
                        style={{
                          padding: '8px 10px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#0d9488',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={it.productCode}
                      >
                        {it.productCode}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          lineHeight: 1.35,
                        }}
                      >
                        {it.productName}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', color: '#475569', whiteSpace: 'nowrap' }}>
                        {it.orderedQty} {it.unit}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0d9488', whiteSpace: 'nowrap' }}>
                        {it.receivedQty} {it.unit}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#9a3412',
                          fontWeight: 600,
                          fontSize: 11.5,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                        }}
                      >
                        {reasonLabel}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: '#0f172a',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmtCurrency(rejected * (it.unitPrice || 0))} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

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
