import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { Banknote, QrCode, CheckCircle2, PackageCheck } from 'lucide-react';
import type { PreOrderDTO } from '../../types/inventory.types';

interface Props {
  isOpen: boolean;
  preOrder: PreOrderDTO | null;
  onClose: () => void;
  onConfirmFulfill: (
    preOrderId: string,
    data: {
      paymentMethod: 'CASH' | 'VIETQR';
      amountPaid: number;
      cashTendered?: number;
      changeAmount?: number;
      note?: string;
    }
  ) => Promise<void>;
}

export const FulfillPreOrderModal: FC<Props> = ({
  isOpen,
  preOrder,
  onClose,
  onConfirmFulfill,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [note, setNote] = useState('Khách nhận hàng đầy đủ tại quầy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preOrder) {
      setCashTendered(preOrder.remainingAmount);
      setNote('Khách nhận hàng đầy đủ tại quầy');
      setPaymentMethod('CASH');
    }
  }, [preOrder]);

  if (!isOpen || !preOrder) return null;

  const remaining = preOrder.remainingAmount;
  const changeAmount = paymentMethod === 'CASH' ? Math.max(0, cashTendered - remaining) : 0;
  const isCashSufficient = paymentMethod !== 'CASH' || cashTendered >= remaining;

  // VietQR URL động cho số tiền còn lại
  const qrUrl = `https://api.vietqr.io/image/970422-0974742130-compact2.png?amount=${remaining}&addInfo=${encodeURIComponent(
    preOrder.preOrderId
  )}&accountName=MT%20GROCERY%20STORE`;

  const handleSubmit = async () => {
    if (!isCashSufficient) {
      alert(`Tiền khách đưa (${cashTendered.toLocaleString('vi-VN')} đ) chưa đủ để thanh toán phần còn lại (${remaining.toLocaleString('vi-VN')} đ)!`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmFulfill(preOrder.preOrderId, {
        paymentMethod,
        amountPaid: remaining,
        cashTendered: paymentMethod === 'CASH' ? cashTendered : undefined,
        changeAmount,
        note,
      });
      onClose();
    } catch (e: any) {
      alert(`Lỗi khi giao hàng: ${e?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 620, width: '92%' }}>
        {/* Header Modal */}
        <div className="pos-modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PackageCheck size={20} color="#0f766e" />
            <b>Thanh Toán &amp; Giao Hàng Đặt Trước — {preOrder.preOrderId}</b>
          </div>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body Modal */}
        <div className="pos-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '16px' }}>
          {/* Thông tin khách hàng */}
          <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Khách hàng: <b>{preOrder.customerName}</b></span>
              <span>SĐT: <b>{preOrder.customerPhone || 'N/A'}</b></span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Thời gian hẹn: <span style={{ color: '#b45309', fontWeight: 600 }}>{preOrder.pickupAppointment}</span> &bull; Trạng thái: <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Đang giữ kho</span>
            </div>
          </div>

          {/* Bảng kê mặt hàng đặt trước */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', fontWeight: 700, fontSize: 12, color: '#334155' }}>
              DANH SÁCH MẶT HÀNG GIAO CHO KHÁCH ({preOrder.items.length} món)
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '6px 10px' }}>Tên mặt hàng</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', width: 70 }}>SL</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {preOrder.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>
                      {(item.quantity * item.unitPrice).toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tóm tắt thanh toán tiền cọc & số tiền còn lại */}
          <div style={{ padding: '12px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Tổng giá trị đơn hàng:</span>
              <b>{preOrder.totalOrderAmount.toLocaleString('vi-VN')} đ</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#15803d', marginBottom: 6 }}>
              <span>Tiền khách đã cọc trước:</span>
              <b>- {preOrder.depositAmount.toLocaleString('vi-VN')} đ</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #93c5fd', paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>SỐ TIỀN CẦN THU NỐT:</span>
              <b style={{ fontSize: 18, color: '#dc2626' }}>{remaining.toLocaleString('vi-VN')} đ</b>
            </div>
          </div>

          {/* Chọn phương thức thanh toán nốt phần còn lại */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8, display: 'block' }}>
              Phương thức thu tiền còn lại:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: paymentMethod === 'CASH' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'CASH' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  color: paymentMethod === 'CASH' ? '#0f766e' : '#475569',
                }}
              >
                <Banknote size={16} />
                <span>Tiền mặt (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VIETQR')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  borderRadius: 6,
                  border: paymentMethod === 'VIETQR' ? '2px solid #0f766e' : '1px solid #cbd5e1',
                  backgroundColor: paymentMethod === 'VIETQR' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  color: paymentMethod === 'VIETQR' ? '#0f766e' : '#475569',
                }}
              >
                <QrCode size={16} />
                <span>Chuyển khoản VietQR</span>
              </button>
            </div>
          </div>

          {/* Nếu chọn TIỀN MẶT: Ô nhập tiền khách đưa & tiền thối */}
          {paymentMethod === 'CASH' && (
            <div style={{ padding: 12, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tiền khách đưa:</span>
                <input
                  type="number"
                  min={remaining}
                  step={5000}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  style={{
                    width: 160,
                    textAlign: 'right',
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: isCashSufficient ? '1.5px solid #16a34a' : '1.5px solid #dc2626',
                    fontWeight: 700,
                    fontSize: 15,
                    color: isCashSufficient ? '#15803d' : '#dc2626',
                  }}
                />
              </div>

              {/* Nút bấm gợi ý tiền mặt */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setCashTendered(remaining)}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Đúng {remaining.toLocaleString('vi-VN')} đ
                </button>
                <button
                  type="button"
                  onClick={() => setCashTendered(Math.ceil(remaining / 50000) * 50000 || 50000)}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Tròn {(Math.ceil(remaining / 50000) * 50000 || 50000).toLocaleString('vi-VN')} đ
                </button>
                <button
                  type="button"
                  onClick={() => setCashTendered(Math.ceil(remaining / 100000) * 100000 || 100000)}
                  style={{ padding: '3px 8px', fontSize: 11, borderRadius: 4, border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                >
                  Tròn {(Math.ceil(remaining / 100000) * 100000 || 100000).toLocaleString('vi-VN')} đ
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px dashed #cbd5e1', paddingTop: 6 }}>
                <span>Tiền thừa trả lại khách:</span>
                <b style={{ color: changeAmount > 0 ? '#16a34a' : '#64748b', fontSize: 14 }}>
                  {changeAmount.toLocaleString('vi-VN')} đ
                </b>
              </div>
            </div>
          )}

          {/* Nếu chọn VIETQR: Hiển thị mã QR động */}
          {paymentMethod === 'VIETQR' && (
            <div style={{ padding: 14, backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 6, textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Quét mã VietQR để thanh toán nốt <b>{remaining.toLocaleString('vi-VN')} VNĐ</b>
              </div>
              <div style={{ width: 170, height: 170, margin: '0 auto', padding: 6, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={qrUrl} alt="VietQR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                Nội dung CK: <b>{preOrder.preOrderId}</b> &bull; Napas 247
              </div>
            </div>
          )}

          {/* Ghi chú giao hàng */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
              Ghi chú xuất hàng:
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12.5 }}
            />
          </div>
        </div>

        {/* Footer Modal */}
        <div className="pos-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" className="pos-btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="pos-btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !isCashSufficient}
              style={{ padding: '8px 18px', fontSize: 13.5, backgroundColor: '#0f766e' }}
            >
              <CheckCircle2 size={15} />
              <span>{isSubmitting ? 'Đang xử lý...' : `✓ Xác Nhận Thu ${remaining.toLocaleString('vi-VN')} đ & Giao Hàng`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
