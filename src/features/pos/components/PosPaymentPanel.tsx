import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { Plus, X } from 'lucide-react';
import type { Customer } from '../types/pos.types';
import { useAuthStore } from '../../../stores/useAuthStore';

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
  const { user } = useAuthStore();
  const isStoreOwner = user?.role === 'STORE_OWNER';

  // Nếu vai trò là nhân viên thu ngân mà phương thức hiện tại đang là ghi nợ -> Tự động chuyển về tiền mặt
  useEffect(() => {
    if (!isStoreOwner && paymentMethod === 'debt') {
      onPaymentMethodChange('cash');
    }
  }, [isStoreOwner, paymentMethod, onPaymentMethodChange]);

  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSearchingCustomer(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tính toán các khoản giảm giá và thành tiền
  const orderDiscountAmount = Math.round((totalItemAmount * orderDiscountPercent) / 100);
  const couponDiscountAmount = couponCode.trim().toUpperCase() === 'VIP10' ? 20000 : 0;
  const subTotalBeforePoints = Math.max(0, totalItemAmount - orderDiscountAmount - couponDiscountAmount);

  // Điểm tích lũy: mỗi điểm = 100đ
  const maxPointAmount = customer ? Math.min(customer.loyaltyPoints * 100, subTotalBeforePoints) : 0;
  const pointsDeduction = usePoints && customer ? maxPointAmount : 0;

  const finalAmount = Math.max(0, subTotalBeforePoints - pointsDeduction);
  const changeAmount = Math.max(0, cashTendered - finalAmount);

  // Tìm kiếm khách hàng thuần túy CHỈ BẰNG SỐ ĐIỆN THOẠI (SĐT)
  const phoneQuery = customerSearchInput.replace(/\D/g, '');

  const filteredCustomers = customerSearchList.filter((c) => {
    if (!phoneQuery) return false;
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    return cleanPhone.includes(phoneQuery);
  });

  return (
    <div className="pos-payment-panel">
      {/* Vùng cuộn thông tin thanh toán (nếu màn hình thấp) */}
      <div className="pos-payment-scroll-area">
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

      {/* 1. KHÁCH HÀNG (F4) - CHỈ TÌM BẰNG SỐ ĐIỆN THOẠI */}
      <fieldset className="pos-fieldset">
        <legend className="pos-legend">
          <b>Khách hàng (F4) - Chỉ tìm bằng SĐT</b>
        </legend>

        <div style={{ display: 'flex', gap: 6, position: 'relative' }} ref={dropdownRef}>
          <input
            type="tel"
            id="customer_search"
            value={customerSearchInput}
            onChange={(e) => {
              // Chỉ cho phép nhập số điện thoại
              const val = e.target.value.replace(/[^\d\s.-]/g, '');
              setCustomerSearchInput(val);
              setIsSearchingCustomer(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredCustomers.length > 0) {
                e.preventDefault();
                onSelectCustomer(filteredCustomers[0]);
                setCustomerSearchInput('');
                setIsSearchingCustomer(false);
              }
            }}
            onFocus={() => {
              if (customerSearchInput.trim()) {
                setIsSearchingCustomer(true);
              }
            }}
            placeholder="Nhập số điện thoại khách hàng (F4)..."
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

          {/* Dropdown tìm kiếm khách hàng chỉ theo SĐT */}
          {isSearchingCustomer && customerSearchInput.trim() && (
            <div className="pos-customer-dropdown">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.slice(0, 8).map((cust) => (
                  <div
                    key={cust.id}
                    className="pos-customer-dropdown-item"
                    onClick={() => {
                      onSelectCustomer(cust);
                      setCustomerSearchInput('');
                      setIsSearchingCustomer(false);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f766e' }}>
                        📞 {cust.phone}
                      </span>
                      <b style={{ color: '#1e293b' }}>{cust.name}</b>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#16a34a', display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                      <span>Mã: {cust.code} &bull; {cust.membershipTier}</span>
                      <span>Tích lũy: {cust.loyaltyPoints} điểm</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 12, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                  Không tìm thấy khách hàng với SĐT &quot;{customerSearchInput}&quot;. Bấm [+] để thêm mới.
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
              <div style={{ marginTop: 4, fontSize: 11, color: '#334155', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span>Đã nợ: <b style={{ color: '#0f766e' }}>{customer.debtCount || 0} lần</b></span>
                <span>&bull;</span>
                <span>Đang nợ: <b style={{ color: customer.currentDebt > 0 ? '#dc2626' : '#16a34a' }}>{customer.currentDebt.toLocaleString('vi-VN')} đ</b></span>
                {customer.totalDebtPurchased ? (
                  <>
                    <span>&bull;</span>
                    <span>Tổng từng nợ: <b>{customer.totalDebtPurchased.toLocaleString('vi-VN')} đ</b></span>
                  </>
                ) : null}
              </div>
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

        <div style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12.5, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input
              type="radio"
              name="pay_method"
              checked={paymentMethod === 'cash'}
              onChange={() => onPaymentMethodChange('cash')}
            />
            <b>Tiền mặt (F8)</b>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
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
          {/* Chỉ Chủ cửa hàng hoặc Quản trị viên mới nhìn thấy và được thực hiện Bán nợ */}
          {isStoreOwner && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
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
          )}
        </div>

        {/* Nhập tiền khách đưa & tiền thừa (ở chế độ tiền mặt) */}
        {paymentMethod === 'cash' && (
          <table className="pos-calc-table" style={{ marginTop: 4 }}>
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
                      fontSize: 14,
                      padding: '3px 8px',
                    }}
                  />{' '}
                  đ
                </td>
              </tr>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td><b>Tiền thừa trả khách:</b></td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#16a34a' }}>
                  {changeAmount.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tbody>
          </table>
        )}

        {/* Hiển thị thông tin sổ nợ khi chọn Ghi nợ (chỉ cho Chủ cửa hàng - không giới hạn hạn mức) */}
        {isStoreOwner && paymentMethod === 'debt' && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 6, backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: 12 }}>
            {!customer ? (
              <div style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span><strong>Chưa chọn khách hàng:</strong> Vui lòng tìm và chọn khách hàng trước khi thực hiện ghi nợ.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                  📒 Thông tin sổ nợ khách hàng:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Số lần đã mua nợ:</span>
                  <strong style={{ color: '#0f766e' }}>{customer.debtCount || 0} lần</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Tổng tiền từng mua nợ:</span>
                  <span>{(customer.totalDebtPurchased || customer.currentDebt).toLocaleString('vi-VN')} đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Số tiền đang nợ hiện tại:</span>
                  <strong style={{ color: customer.currentDebt > 0 ? '#dc2626' : '#16a34a' }}>
                    {customer.currentDebt.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: 5, color: '#1e293b' }}>
                  <span>Tổng nợ sau đơn này:</span>
                  <strong style={{ color: '#b45309', fontSize: 13 }}>
                    {(customer.currentDebt + finalAmount).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 4, backgroundColor: '#ecfdf5', color: '#047857', fontSize: 11.5 }}>
                  ✓ Đơn hàng <b>{finalAmount.toLocaleString('vi-VN')} đ</b> sẽ được cộng dồn vào sổ nợ của khách.
                </div>
              </div>
            )}
          </div>
        )}
      </fieldset>
      </div>

      {/* NÚT THANH TOÁN TO TOÀN CHIỀU RỘNG (Luôn cố định đáy) */}
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
