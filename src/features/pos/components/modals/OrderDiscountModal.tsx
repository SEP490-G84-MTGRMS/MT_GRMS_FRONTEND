import { useState } from 'react';
import type { FC } from 'react';

interface Props {
  isOpen: boolean;
  totalItemAmount: number;
  currentDiscountPercent: number;
  onClose: () => void;
  onApply: (discountPercent: number) => void;
}

export const OrderDiscountModal: FC<Props> = ({
  isOpen,
  totalItemAmount,
  currentDiscountPercent,
  onClose,
  onApply,
}) => {
  const [discountType, setDiscountType] = useState<'percent' | 'vnd'>('percent');
  const [val, setVal] = useState<number>(currentDiscountPercent);

  if (!isOpen) return null;

  const calculatedDiscount =
    discountType === 'percent'
      ? Math.round((totalItemAmount * val) / 100)
      : Math.min(totalItemAmount, val);

  const autoPromotion = Math.round(totalItemAmount * 0.05); // 5% auto promo demo

  const handleSave = () => {
    const finalPercent =
      discountType === 'percent'
        ? val
        : totalItemAmount > 0
        ? Math.round((val / totalItemAmount) * 100)
        : 0;
    onApply(finalPercent);
    onClose();
  };

  return (
    <div className="pos-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pos-modal-dialog" style={{ maxWidth: 460 }}>
        <div className="pos-modal-header">
          <b>Chiết khấu toàn đơn</b>
          <button type="button" className="pos-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pos-modal-body">
          <table className="pos-form-table" style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td width="42%">Tổng tiền hàng:</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {totalItemAmount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
              <tr>
                <td>Giảm giá đơn:</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => setVal(Math.max(0, Number(e.target.value)))}
                      className="pos-input"
                      style={{ width: 70, textAlign: 'right', fontWeight: 600 }}
                    />
                    <button
                      type="button"
                      className={`pos-btn-secondary ${discountType === 'vnd' ? 'active' : ''}`}
                      onClick={() => setDiscountType('vnd')}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      VND
                    </button>
                    <button
                      type="button"
                      className={`pos-btn-secondary ${discountType === 'percent' ? 'active' : ''}`}
                      onClick={() => setDiscountType('percent')}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      %
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td>Khuyến mại tự động:</td>
                <td style={{ textAlign: 'right', color: '#64748b' }}>
                  {autoPromotion.toLocaleString('vi-VN')} đ
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td><b>Tổng giảm giá:</b></td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                  -{calculatedDiscount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="pos-modal-footer">
          <button type="button" className="pos-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="pos-btn-primary" onClick={handleSave}>
            <b>Áp dụng</b>
          </button>
        </div>
      </div>
    </div>
  );
};
