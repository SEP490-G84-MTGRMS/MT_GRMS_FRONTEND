// src/pages/store/components/SubscriptionCheckoutModal.tsx
import { useState, type FC } from 'react';
import {
  X,
  QrCode,
  Wallet,
  CheckCircle2,
  Building2,
  Warehouse,
  ShieldCheck,
} from 'lucide-react';
import type { SubscriptionPlanItem, StoreInfo } from '../storeData';

interface SubscriptionCheckoutModalProps {
  plan: SubscriptionPlanItem;
  storeInfo: StoreInfo;
  onClose: () => void;
  onSuccess: (result: {
    planName: string;
    months: number;
    totalAmount: number;
    paymentMethod: 'Wallet' | 'VietQR';
  }) => void;
}

export const SubscriptionCheckoutModal: FC<SubscriptionCheckoutModalProps> = ({
  plan,
  storeInfo,
  onClose,
  onSuccess,
}) => {
  // Billing cycle: '6m' | '12m' | '24m'
  const [cycle, setCycle] = useState<'6m' | '12m' | '24m'>('12m');
  const [extraBranches, setExtraBranches] = useState<number>(0);
  const [extraWarehouses, setExtraWarehouses] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Wallet' | 'VietQR'>('Wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const months = cycle === '6m' ? 6 : cycle === '12m' ? 12 : 24;
  const bonusMonths = cycle === '12m' ? 1 : cycle === '24m' ? 3 : 0;

  // Calculation
  const basePrice = plan.monthlyPrice * months;
  const branchAddonPrice = extraBranches * 270000 * months;
  const warehouseAddonPrice = extraWarehouses * 150000 * months;
  const subTotal = basePrice + branchAddonPrice + warehouseAddonPrice;
  const vatAmount = Math.round(subTotal * 0.1); // VAT 10%
  const grandTotal = subTotal + vatAmount;

  const hasEnoughWalletBalance = storeInfo.walletBalance >= grandTotal;

  const handleConfirmPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setTimeout(() => {
        onSuccess({
          planName: plan.name,
          months: months + bonusMonths,
          totalAmount: grandTotal,
          paymentMethod,
        });
      }, 1200);
    }, 1000);
  };

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        {/* Header */}
        <div className="store-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: plan.themeColor,
              }}
            />
            <div className="store-modal-title">
              Đăng ký & Nâng cấp: {plan.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="store-modal-body">
          {isCompleted ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <CheckCircle2 size={54} color="#00C853" strokeWidth={2.2} />
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                Gia hạn & Kích hoạt Thành công!
              </div>
              <div style={{ fontSize: 14, color: '#475569', maxWidth: 420 }}>
                Hệ thống đã nâng cấp gian hàng của bạn lên <strong>{plan.name}</strong> với thời hạn{' '}
                <strong>{months + bonusMonths} tháng</strong>. Dữ liệu đã được đồng bộ tự động.
              </div>
            </div>
          ) : (
            <>
              {/* 1. Chọn thời hạn thuê bao */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 10,
                    display: 'block',
                  }}
                >
                  1. Chọn chu kỳ đăng ký
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setCycle('12m')}
                    style={{
                      padding: '14px 10px',
                      borderRadius: 16,
                      border: cycle === '12m' ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: cycle === '12m' ? '#F0F6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 8,
                        backgroundColor: '#FF3B30',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                      }}
                    >
                      TẶNG 1 THÁNG
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      1 Năm (12 tháng)
                    </span>
                    <span style={{ fontSize: 12, color: '#0066FF', fontWeight: 600 }}>
                      + 1 tháng miễn phí
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCycle('24m')}
                    style={{
                      padding: '14px 10px',
                      borderRadius: 16,
                      border: cycle === '24m' ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: cycle === '24m' ? '#F0F6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: -10,
                        right: 8,
                        backgroundColor: '#FF9500',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                      }}
                    >
                      TẶNG 3 THÁNG
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      2 Năm (24 tháng)
                    </span>
                    <span style={{ fontSize: 12, color: '#0066FF', fontWeight: 600 }}>
                      + 3 tháng miễn phí
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCycle('6m')}
                    style={{
                      padding: '14px 10px',
                      borderRadius: 16,
                      border: cycle === '6m' ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: cycle === '6m' ? '#F0F6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      6 Tháng
                    </span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      Tiêu chuẩn
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Tiện ích bổ sung */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 10,
                    display: 'block',
                  }}
                >
                  2. Tiện ích mở rộng (Tùy chọn)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Thêm chi nhánh */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Building2 size={18} color="#0066FF" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                          Chi nhánh
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          +270k /tháng
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setExtraBranches(Math.max(0, extraBranches - 1))}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {extraBranches}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExtraBranches(extraBranches + 1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Thêm kho hàng */}
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Warehouse size={18} color="#0066FF" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                          Kho phụ
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          +150k /tháng
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => setExtraWarehouses(Math.max(0, extraWarehouses - 1))}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {extraWarehouses}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExtraWarehouses(extraWarehouses + 1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Chọn phương thức thanh toán */}
              <div>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 10,
                    display: 'block',
                  }}
                >
                  3. Phương thức thanh toán
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* Trừ tiền ví */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Wallet')}
                    style={{
                      padding: '14px',
                      borderRadius: 16,
                      border: paymentMethod === 'Wallet' ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: paymentMethod === 'Wallet' ? '#F0F6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <Wallet size={22} color={paymentMethod === 'Wallet' ? '#0066FF' : '#64748B'} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                        Trừ tiền Ví gian hàng
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                        Số dư: {new Intl.NumberFormat('vi-VN').format(storeInfo.walletBalance)} đ
                      </div>
                    </div>
                  </button>

                  {/* Quét mã VietQR */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('VietQR')}
                    style={{
                      padding: '14px',
                      borderRadius: 16,
                      border: paymentMethod === 'VietQR' ? '2px solid #0066FF' : '1px solid #E2E8F0',
                      backgroundColor: paymentMethod === 'VietQR' ? '#F0F6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <QrCode size={22} color={paymentMethod === 'VietQR' ? '#0066FF' : '#64748B'} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                        Quét mã VietQR
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>
                        Chuyển khoản Napas247
                      </div>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'Wallet' && !hasEnoughWalletBalance && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: '#DC2626',
                      fontWeight: 600,
                    }}
                  >
                    ⚠️ Số dư ví không đủ (thiếu{' '}
                    {new Intl.NumberFormat('vi-VN').format(grandTotal - storeInfo.walletBalance)} đ).
                    Vui lòng chọn hình thức <strong>Quét mã VietQR</strong> hoặc Nạp thêm ví.
                  </div>
                )}
              </div>

              {/* Tóm tắt đơn thanh toán */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: 16,
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                  <span>Gói {plan.name} ({months} tháng + tặng {bonusMonths} tháng):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {new Intl.NumberFormat('vi-VN').format(basePrice)} đ
                  </span>
                </div>
                {(extraBranches > 0 || extraWarehouses > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                    <span>Tiện ích chi nhánh & kho ({months} tháng):</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {new Intl.NumberFormat('vi-VN').format(branchAddonPrice + warehouseAddonPrice)} đ
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569' }}>
                  <span>Thuế GTGT (VAT 10%):</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {new Intl.NumberFormat('vi-VN').format(vatAmount)} đ
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0F172A',
                    paddingTop: 8,
                    borderTop: '1px dashed #CBD5E1',
                  }}
                >
                  <span>Tổng tiền thanh toán:</span>
                  <span style={{ color: '#0066FF', fontFamily: 'var(--font-mono)', fontSize: 18 }}>
                    {new Intl.NumberFormat('vi-VN').format(grandTotal)} đ
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#64748B',
                }}
              >
                <ShieldCheck size={16} color="#00C853" />
                <span>Cam kết an toàn dữ liệu, hóa đơn điện tử tự động gửi về email sau khi thanh toán.</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isCompleted && (
          <div className="store-modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessing || (paymentMethod === 'Wallet' && !hasEnoughWalletBalance)}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  paymentMethod === 'Wallet' && !hasEnoughWalletBalance
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  paymentMethod === 'Wallet' && !hasEnoughWalletBalance ? 0.6 : 1,
              }}
            >
              {isProcessing ? 'Đang kích hoạt...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
