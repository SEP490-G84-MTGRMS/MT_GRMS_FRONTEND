import { useState } from 'react';
import type { FC } from 'react';

interface Props {
  isOpen: boolean;
  totalItemAmount: number;
  currentDiscountPercent: number;
  autoPromoDiscount?: number;
  onClose: () => void;
  onApply: (discountPercent: number) => void;
}

export const OrderDiscountModal: FC<Props> = ({
  isOpen,
  totalItemAmount,
  currentDiscountPercent,
  autoPromoDiscount = 0,
  onClose,
  onApply,
}) => {
  const [discountType, setDiscountType] = useState<'percent' | 'vnd'>('percent');
  const [val, setVal] = useState<number>(currentDiscountPercent);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculatedDiscount =
    discountType === 'percent'
      ? Math.round((totalItemAmount * val) / 100)
      : Math.min(totalItemAmount, val);

  const autoPromotion = Math.min(totalItemAmount, Math.max(0, autoPromoDiscount));
  const effectiveDiscount = Math.min(totalItemAmount, Math.max(calculatedDiscount, autoPromotion));

  const handleSave = () => {
    if (!Number.isFinite(val) || val < 0) {
      setErrorMessage('Mức giảm giá phải là số không âm.');
      return;
    }
    if (discountType === 'percent' && val > 100) {
      setErrorMessage('Chiết khấu theo phần trăm không được vượt quá 100%.');
      return;
    }
    if (discountType === 'vnd' && val > totalItemAmount) {
      setErrorMessage('Tiền giảm giá không được vượt quá tổng tiền hàng.');
      return;
    }
    if (totalItemAmount <= 0) {
      setErrorMessage('Giỏ hàng chưa có giá trị để áp dụng chiết khấu.');
      return;
    }

    setErrorMessage(null);
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
                      min={0}
                      max={discountType === 'percent' ? 100 : totalItemAmount}
                      step={discountType === 'percent' ? 1 : 1000}
                      value={val}
                      onChange={(e) => {
                        setErrorMessage(null);
                        const nextValue = Number(e.target.value);
                        setVal(Number.isFinite(nextValue) ? nextValue : 0);
                      }}
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
                  -{effectiveDiscount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
          {errorMessage && (
            <div role="alert" style={{ marginTop: 10, color: '#b91c1c', fontSize: 12 }}>
              {errorMessage}
            </div>
          )}
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
