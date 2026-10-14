import { useState } from 'react';
import type { FC } from 'react';
import { Plus, X } from 'lucide-react';
import type { Customer } from '../types/pos.types';

interface Props {
  customer: Customer | null;
  onSelectCustomer: (cust: Customer | null) => void;
  onOpenAddCustomerModal: () => void;
  totalItemAmount: number;
  orderDiscountPercent: number;
  onOpenOrderDiscountModal: () => void;
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  usePoints: boolean;
  onToggleUsePoints: (use: boolean) => void;
  paymentMethod: 'cash' | 'vietqr' | 'debt';
  onPaymentMethodChange: (method: 'cash' | 'vietqr' | 'debt') => void;
  cashTendered: number;
  onCashTenderedChange: (val: number) => void;
  onOpenVietQrModal: () => void;
  onSubmitCheckout: () => void;
  customerSearchList: Customer[];
}

export const PosPaymentPanel: FC<Props> = ({
  customer,
  onSelectCustomer,
  onOpenAddCustomerModal,
  totalItemAmount,
  orderDiscountPercent,
  onOpenOrderDiscountModal,
  couponCode,
  onCouponCodeChange,
  usePoints,
  onToggleUsePoints,
  paymentMethod,
  onPaymentMethodChange,
  cashTendered,
  onCashTenderedChange,
  onOpenVietQrModal,
  onSubmitCheckout,
  customerSearchList,
}) => {
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Tính toán các khoản giảm giá và thành tiền
  const orderDiscountAmount = Math.round((totalItemAmount * orderDiscountPercent) / 100);
  const couponDiscountAmount = couponCode.trim().toUpperCase() === 'VIP10' ? 20000 : 0;
  const subTotalBeforePoints = Math.max(0, totalItemAmount - orderDiscountAmount - couponDiscountAmount);

  // Điểm tích lũy: mỗi điểm = 100đ
  const maxPointAmount = customer ? Math.min(customer.loyaltyPoints * 100, subTotalBeforePoints) : 0;
  const pointsDeduction = usePoints && customer ? maxPointAmount : 0;

  const finalAmount = Math.max(0, subTotalBeforePoints - pointsDeduction);
  const changeAmount = Math.max(0, cashTendered - finalAmount);

  const filteredCustomers = customerSearchList.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchInput.toLowerCase()) ||
      c.phone.includes(customerSearchInput) ||
      c.code.toLowerCase().includes(customerSearchInput.toLowerCase())
  );

  return (
    <div className="pos-payment-panel">
      {/* Header Quầy */}
      <div className="pos-panel-top-row">
        <div>
          <b>Quầy #01</b>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <hr className="pos-divider" />

      {/* 1. KHÁCH HÀNG (F4) */}
      <fieldset className="pos-fieldset">
        <legend className="pos-legend">
          <b>Khách hàng (F4)</b>
        </legend>

        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          <input
            type="text"
            id="customer_search"
            value={customerSearchInput}
            onChange={(e) => {
              setCustomerSearchInput(e.target.value);
              setIsSearchingCustomer(true);
            }}
            onFocus={() => setIsSearchingCustomer(true)}
            placeholder="Tìm khách hàng (F4)..."
            className="pos-input"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="pos-btn-secondary"
            onClick={onOpenAddCustomerModal}
            title="Thêm khách hàng mới"
            style={{ padding: '0 10px', height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={14} />
          </button>

          {/* Dropdown tìm kiếm khách hàng */}
          {isSearchingCustomer && customerSearchInput.trim() && (
            <div className="pos-customer-dropdown">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className="pos-customer-dropdown-item"
                    onClick={() => {
                      onSelectCustomer(cust);
                      setCustomerSearchInput(`${cust.name} (${cust.phone})`);
                      setIsSearchingCustomer(false);
                    }}
                  >
                    <div>
                      <b>{cust.name}</b> ({cust.code}) - {cust.phone}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#16a34a' }}>
                      Điểm tích lũy: {cust.loyaltyPoints} điểm &bull; {cust.membershipTier}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 10, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                  Không tìm thấy. Bấm [+] để thêm mới.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thẻ khách hàng đã chọn */}
        {customer ? (
          <div className="pos-selected-customer-card">
            <div>
              <b>{customer.name}</b> ({customer.code})<br />
              <span className="pos-loyalty-text">
                Điểm: <b>{customer.loyaltyPoints} điểm</b> ({customer.membershipTier})
              </span>
              {customer.allowDebt ? (
                <div style={{ marginTop: 4, fontSize: 11, color: '#334155' }}>
                  <span>Hạn mức: <b style={{ color: '#0f766e' }}>{customer.debtLimit.toLocaleString('vi-VN')} đ</b></span>
                  {' '}&bull;{' '}
                  <span>Đang nợ: <b style={{ color: customer.currentDebt > 0 ? '#dc2626' : '#16a34a' }}>{customer.currentDebt.toLocaleString('vi-VN')} đ</b></span>
                </div>
              ) : (
                <div style={{ marginTop: 3, fontSize: 11, color: '#94a3b8' }}>
                  Chưa kích hoạt hạn mức mua nợ
                </div>
              )}
            </div>
            <button
              type="button"
              className="pos-btn-secondary"
              onClick={() => {
                onSelectCustomer(null);
                setCustomerSearchInput('');
              }}
              style={{ fontSize: 11.5, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <X size={12} />
              <span>Bỏ chọn</span>
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
            Khách vãng lai (không tích điểm, không bán nợ)
          </div>
        )}
      </fieldset>

      {/* 2. TÍNH TIỀN HÓA ĐƠN */}
      <fieldset className="pos-fieldset">
        <legend className="pos-legend">
          <b>Tính tiền hóa đơn</b>
        </legend>

        <table className="pos-calc-table">
          <tbody>
            <tr>
              <td>Tổng tiền hàng:</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {totalItemAmount.toLocaleString('vi-VN')} đ
              </td>
            </tr>
            <tr>
              <td>
                <span
                  className="pos-link"
                  onClick={onOpenOrderDiscountModal}
                  title="Nhấp để tùy chỉnh chiết khấu đơn"
                >
                  Giảm giá ({orderDiscountPercent}%) [KM]:
                </span>
              </td>
              <td style={{ textAlign: 'right', color: '#dc2626' }}>
                -{orderDiscountAmount.toLocaleString('vi-VN')} đ
              </td>
            </tr>
            <tr>
              <td>Mã coupon:</td>
              <td style={{ textAlign: 'right' }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => onCouponCodeChange(e.target.value)}
                  placeholder="Nhập mã..."
                  style={{ width: 80, fontSize: 12, padding: '2px 4px', textAlign: 'center' }}
                  className="pos-input"
                />{' '}
                {couponDiscountAmount > 0 ? `-${couponDiscountAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
              </td>
            </tr>
            <tr>
              <td><b>Khách cần trả (trước điểm):</b></td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>
                {subTotalBeforePoints.toLocaleString('vi-VN')} đ
              </td>
            </tr>
            <tr>
              <td>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={usePoints}
                    disabled={!customer || customer.loyaltyPoints === 0}
                    onChange={(e) => onToggleUsePoints(e.target.checked)}
                  />
                  <span>Dùng điểm ({pointsDeduction.toLocaleString('vi-VN')}):</span>
                </label>
              </td>
              <td style={{ textAlign: 'right', color: '#16a34a' }}>
                -{pointsDeduction.toLocaleString('vi-VN')} đ
              </td>
            </tr>
            <tr className="pos-total-row">
              <td>
                <b style={{ fontSize: 14 }}>KHÁCH CẦN TRẢ:</b>
              </td>
              <td style={{ textAlign: 'right' }}>
                <b style={{ fontSize: 18, color: 'var(--blue-primary)' }}>
                  {finalAmount.toLocaleString('vi-VN')} đ
                </b>
              </td>
            </tr>
          </tbody>
        </table>
      </fieldset>

      {/* 3. PHƯƠNG THỨC THANH TOÁN */}
      <fieldset className="pos-fieldset">
        <legend className="pos-legend">
          <b>Hình thức thanh toán</b>
        </legend>

        <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 13, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="pay_method"
              checked={paymentMethod === 'cash'}
              onChange={() => onPaymentMethodChange('cash')}
            />
            <b>Tiền mặt (F8)</b>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="pay_method"
              checked={paymentMethod === 'vietqr'}
              onChange={() => {
                onPaymentMethodChange('vietqr');
                onOpenVietQrModal();
              }}
            />
            <b>Chuyển khoản VietQR</b>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="radio"
              name="pay_method"
              checked={paymentMethod === 'debt'}
              onChange={() => onPaymentMethodChange('debt')}
            />
            <b style={{ color: paymentMethod === 'debt' ? '#d97706' : 'inherit' }}>
              Ghi nợ (Bán nợ)
            </b>
          </label>
        </div>

        {/* Nhập tiền khách đưa & tiền thừa (ở chế độ tiền mặt) */}
        {paymentMethod === 'cash' && (
          <table className="pos-calc-table" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td>Tiền khách đưa:</td>
                <td style={{ textAlign: 'right' }}>
                  <input
                    type="number"
                    value={cashTendered || ''}
                    onChange={(e) => onCashTenderedChange(Number(e.target.value))}
                    className="pos-input"
                    style={{
                      width: 120,
                      textAlign: 'right',
                      fontWeight: 800,
                      fontSize: 15,
                    }}
                  />{' '}
                  đ
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td><b>Tiền thừa trả khách:</b></td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#16a34a' }}>
                  {changeAmount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Hiển thị thông tin kiểm tra công nợ khi chọn Ghi nợ */}
        {paymentMethod === 'debt' && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 6, backgroundColor: '#fffbeb', border: '1px solid #fef3c7', fontSize: 12 }}>
            {!customer ? (
              <div style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span><strong>Chưa chọn khách hàng:</strong> Vui lòng tìm và chọn khách hàng định danh trước khi thực hiện ghi nợ.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Hạn mức nợ cho phép:</span>
                  <strong>{customer.debtLimit ? customer.debtLimit.toLocaleString('vi-VN') + ' đ' : '0 đ (Chưa cấp)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Nợ hiện tại:</span>
                  <span style={{ color: customer.currentDebt > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {customer.currentDebt.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 4 }}>
                  <span>Dự kiến sau đơn:</span>
                  <strong style={{ color: (customer.currentDebt + finalAmount) > (customer.debtLimit || 0) ? '#dc2626' : '#1e293b' }}>
                    {(customer.currentDebt + finalAmount).toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                {!customer.allowDebt ? (
                  <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 11 }}>
                    ⚠️ Khách hàng này chưa được cấu hình cho phép mua nợ. Cần quyền quản trị viên duyệt nếu tiếp tục.
                  </div>
                ) : (customer.currentDebt + finalAmount) > customer.debtLimit ? (
                  <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 11 }}>
                    ⚠️ <strong>Vượt hạn mức nợ {((customer.currentDebt + finalAmount) - customer.debtLimit).toLocaleString('vi-VN')} đ.</strong> Hệ thống sẽ yêu cầu xác nhận duyệt ngoại lệ khi thanh toán.
                  </div>
                ) : (
                  <div style={{ marginTop: 6, padding: '4px 8px', borderRadius: 4, backgroundColor: '#dcfce7', color: '#15803d', fontSize: 11 }}>
                    ✓ Nằm trong hạn mức cho phép. Khả dụng còn lại: {(customer.debtLimit - (customer.currentDebt + finalAmount)).toLocaleString('vi-VN')} đ.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>

      {/* NÚT THANH TOÁN TO TOÀN CHIỀU RỘNG */}
      <button
        type="button"
        className={`pos-checkout-big-btn ${paymentMethod === 'debt' ? 'pos-btn-debt' : ''}`}
        style={paymentMethod === 'debt' ? { backgroundColor: '#d97706', borderColor: '#b45309' } : undefined}
        onClick={() => {
          if (paymentMethod === 'vietqr') {
            onOpenVietQrModal();
          } else {
            onSubmitCheckout();
          }
        }}
      >
        {paymentMethod === 'debt'
          ? `GHI NỢ ĐƠN HÀNG (${finalAmount.toLocaleString('vi-VN')} đ)`
          : `THANH TOÁN (${finalAmount.toLocaleString('vi-VN')} đ)`}
      </button>
    </div>
  );
};
