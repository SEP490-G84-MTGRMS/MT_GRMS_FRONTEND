import { useState } from 'react';
import type { FC } from 'react';
import { AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';
import type { Customer } from '../../types/pos.types';

interface Props {
  isOpen: boolean;
  customer: Customer | null;
  orderAmount: number;
  onClose: () => void;
  onApprove: (note?: string) => void;
}

export const DebtLimitWarningModal: FC<Props> = ({
  isOpen,
  customer,
  orderAmount,
  onClose,
  onApprove,
}) => {
  const [note, setNote] = useState('Khách quen bảo lãnh - Chủ cửa hàng đã đồng ý');

  if (!isOpen || !customer) return null;

  const currentDebt = customer.currentDebt || 0;
  const debtLimit = customer.debtLimit || 0;
  const totalDebtAfterOrder = currentDebt + orderAmount;
  const exceedAmount = Math.max(0, totalDebtAfterOrder - debtLimit);

  const handleConfirm = () => {
    onApprove(note);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div
          className="pos-modal-header"
          style={{
            backgroundColor: '#fffbeb',
            borderBottomColor: '#fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 700 }}>
            <AlertTriangle size={20} color="#d97706" />
            <span>Cảnh Báo Vượt Hạn Mức Nợ Khách Hàng</span>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="pos-modal-body" style={{ padding: '16px 20px', fontSize: 13 }}>
          {/* Card Thông tin khách hàng */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                <UserCheck size={16} color="#2563eb" />
                <span>{customer.name}</span>
                <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>({customer.code})</span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                }}
              >
                Hạng: {customer.membershipTier}
              </span>
            </div>
            <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>
              SĐT: <b>{customer.phone}</b>
            </div>
          </div>

          {/* Bảng tính nợ & vượt hạn mức */}
          <div
            style={{
              padding: 12,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c', fontWeight: 600, marginBottom: 8 }}>
              <ShieldAlert size={16} />
              <span>Đơn hàng này khiến tổng nợ vượt hạn mức tín dụng được cấp:</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 0', color: '#475569' }}>Hạn mức nợ cho phép (Cấu hình theo hạng):</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{debtLimit.toLocaleString('vi-VN')} đ</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: '#475569' }}>Nợ hiện tại đang ghi nhận:</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                    {currentDebt.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: '#475569' }}>Giá trị đơn hàng bán nợ lần này:</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    +{orderAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
                <tr style={{ borderTop: '1px dashed #fca5a5', borderBottom: '1px dashed #fca5a5' }}>
                  <td style={{ padding: '6px 0', fontWeight: 700, color: '#1e293b' }}>Tổng nợ dự kiến sau đơn:</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#b91c1c' }}>
                    {totalDebtAfterOrder.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 0', fontWeight: 700, color: '#dc2626' }}>Số tiền vượt quá hạn mức:</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#dc2626' }}>
                    +{exceedAmount.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ghi chú duyệt */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
              Ghi chú duyệt ngoại lệ / Căn cứ bán nợ:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="pos-input"
              placeholder="Nhập lý do duyệt nợ vượt hạn mức..."
              style={{ width: '100%', fontSize: 13 }}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
              Quy tắc cửa hàng: Vẫn cho phép xuất nợ ngoại lệ khi có bảo lãnh của quản lý/chủ quầy.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="pos-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}
        >
          <button
            type="button"
            className="pos-btn"
            style={{
              padding: '8px 16px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={onClose}
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            className="pos-btn"
            style={{
              padding: '8px 18px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={handleConfirm}
          >
            <span>Xác Nhận Duyệt Bán Nợ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
