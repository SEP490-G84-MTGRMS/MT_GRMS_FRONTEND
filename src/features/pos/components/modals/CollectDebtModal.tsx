import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Banknote, QrCode, History, DollarSign, CheckCircle2 } from 'lucide-react';
import type { Invoice } from '../../types/inventory.types';

interface Props {
  isOpen: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onCollectDebt: (
    invoiceId: string,
    payment: {
      amount: number;
      method: 'CASH' | 'VIETQR';
      note: string;
      cashierName: string;
    }
  ) => void;
}

export const CollectDebtModal: FC<Props> = ({
  isOpen,
  invoice,
  onClose,
  onCollectDebt,
}) => {
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [note, setNote] = useState<string>('Khách ghé thanh toán nợ tại quầy');
  const [cashierName] = useState<string>('Nguyễn Bá Sơn');

  useEffect(() => {
    if (invoice) {
      setPayAmount(invoice.debtAmount || 0);
      setNote(`Thanh toán nợ hóa đơn ${invoice.invoiceId}`);
      setPayMethod('CASH');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const totalAmount = invoice.totalMerchandiseAmount - invoice.totalDiscount;
  const remainingDebt = invoice.debtAmount || 0;
  const paidDebt = invoice.paidDebtAmount || 0;

  const handleFullPayment = () => {
    setPayAmount(remainingDebt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (payAmount <= 0) {
      alert('Vui lòng nhập số tiền thu nợ lớn hơn 0!');
      return;
    }

    if (payAmount > remainingDebt) {
      alert(
        `Số tiền thu (${payAmount.toLocaleString(
          'vi-VN'
        )} đ) không được vượt quá số nợ còn lại (${remainingDebt.toLocaleString('vi-VN')} đ)!`
      );
      return;
    }

    onCollectDebt(invoice.invoiceId, {
      amount: payAmount,
      method: payMethod,
      note: note.trim() || 'Thu nợ đơn bán lẻ',
      cashierName,
    });
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 620 }}>
        {/* Header */}
        <div
          className="pos-modal-header"
          style={{
            backgroundColor: '#f0fdf4',
            borderBottomColor: '#bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#166534', fontWeight: 700 }}>
            <DollarSign size={20} color="#16a34a" />
            <span>Thu Tiền Nợ Hóa Đơn: {invoice.invoiceId}</span>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="pos-modal-body" style={{ padding: '16px 20px', fontSize: 13 }}>
          {/* Tóm tắt hóa đơn & khách hàng */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12.5 }}>
              <div>
                <span style={{ color: '#64748b' }}>Khách hàng: </span>
                <strong style={{ color: '#0f172a' }}>{invoice.customerName}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Số điện thoại: </span>
                <strong style={{ color: '#0f172a' }}>{invoice.customerPhone || 'Không có'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Ngày lập đơn: </span>
                <span>{invoice.createdAt}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Tổng tiền hóa đơn: </span>
                <strong style={{ color: '#0f172a' }}>{totalAmount.toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px dashed #cbd5e1',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ color: '#64748b', fontSize: 12 }}>Đã trả trước đó: </span>
                <strong style={{ color: '#16a34a' }}>{paidDebt.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div style={{ fontSize: 13.5 }}>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>CÒN NỢ CẦN THU: </span>
                <strong style={{ color: '#dc2626', fontSize: 16 }}>{remainingDebt.toLocaleString('vi-VN')} đ</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nhập số tiền thu */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontWeight: 600, color: '#334155' }}>Số tiền thu đợt này (*):</label>
                <button
                  type="button"
                  onClick={handleFullPayment}
                  style={{
                    fontSize: 11.5,
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #93c5fd',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Thu toàn bộ ({remainingDebt.toLocaleString('vi-VN')} đ)
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value)))}
                  className="pos-input"
                  style={{
                    width: '100%',
                    paddingRight: 40,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                  min={1000}
                  max={remainingDebt}
                  required
                />
                <span
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 600,
                    color: '#64748b',
                  }}
                >
                  đ
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: '#64748b' }}>
                Còn nợ sau lần thu này:{' '}
                <strong style={{ color: remainingDebt - payAmount === 0 ? '#16a34a' : '#d97706' }}>
                  {Math.max(0, remainingDebt - payAmount).toLocaleString('vi-VN')} đ
                </strong>
                {remainingDebt - payAmount === 0 && ' (Sẽ hoàn tất toàn bộ nợ của hóa đơn)'}
              </div>
            </div>

            {/* Phương thức thu tiền */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Phương thức nhận tiền (*):
              </label>
              <div style={{ display: 'flex', gap: 14 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: `1.5px solid ${payMethod === 'CASH' ? '#16a34a' : '#cbd5e1'}`,
                    backgroundColor: payMethod === 'CASH' ? '#f0fdf4' : '#ffffff',
                    fontWeight: payMethod === 'CASH' ? 700 : 500,
                    color: payMethod === 'CASH' ? '#166534' : '#334155',
                  }}
                >
                  <input
                    type="radio"
                    name="collect_debt_method"
                    checked={payMethod === 'CASH'}
                    onChange={() => setPayMethod('CASH')}
                  />
                  <Banknote size={16} />
                  <span>Tiền mặt (CASH)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: `1.5px solid ${payMethod === 'VIETQR' ? '#2563eb' : '#cbd5e1'}`,
                    backgroundColor: payMethod === 'VIETQR' ? '#eff6ff' : '#ffffff',
                    fontWeight: payMethod === 'VIETQR' ? 700 : 500,
                    color: payMethod === 'VIETQR' ? '#1e40af' : '#334155',
                  }}
                >
                  <input
                    type="radio"
                    name="collect_debt_method"
                    checked={payMethod === 'VIETQR'}
                    onChange={() => setPayMethod('VIETQR')}
                  />
                  <QrCode size={16} />
                  <span>Chuyển khoản VietQR</span>
                </label>
              </div>
            </div>

            {/* Ghi chú thu nợ */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Ghi chú giao dịch:
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="pos-input"
                placeholder="VD: Khách trả tiền mặt tại quầy ca chiều..."
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            {/* Lịch sử các lần thu nợ trước (nếu có) */}
            {invoice.debtPaymentRecords && invoice.debtPaymentRecords.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#475569', marginBottom: 8, fontSize: 12 }}>
                  <History size={14} />
                  <span>Lịch sử các lần thanh toán nợ trước ({invoice.debtPaymentRecords.length} lần):</span>
                </div>
                <div style={{ maxHeight: 110, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                    <thead style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                      <tr>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Thời gian</th>
                        <th style={{ padding: '4px 8px', textAlign: 'right' }}>Số tiền</th>
                        <th style={{ padding: '4px 8px', textAlign: 'center' }}>HTTT</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Người thu</th>
                        <th style={{ padding: '4px 8px', textAlign: 'left' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.debtPaymentRecords.map((rec) => (
                        <tr key={rec.paymentId} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '4px 8px' }}>{rec.paidAt}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                            {rec.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            {rec.paymentMethod === 'CASH' ? 'Tiền mặt' : 'VietQR'}
                          </td>
                          <td style={{ padding: '4px 8px' }}>{rec.cashierName}</td>
                          <td style={{ padding: '4px 8px', color: '#64748b' }}>{rec.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 18,
                paddingTop: 12,
                borderTop: '1px solid #e2e8f0',
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
                type="submit"
                className="pos-btn"
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Xác Nhận Thu Nợ ({payAmount.toLocaleString('vi-VN')} đ)</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
