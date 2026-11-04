// src/pages/store/components/StoreWalletTopupModal.tsx
import { useState, type FC } from 'react';
import { X, CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';
import type { StoreInfo } from '../storeData';

interface StoreWalletTopupModalProps {
  storeInfo: StoreInfo;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const PRESET_AMOUNTS = [500000, 1000000, 2000000, 5000000];

export const StoreWalletTopupModal: FC<StoreWalletTopupModalProps> = ({
  storeInfo,
  onClose,
  onSuccess,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const amountToTopup = customAmount
    ? parseInt(customAmount.replace(/\D/g, ''), 10) || 0
    : selectedAmount;

  const transferCode = `WAL ${storeInfo.code} ${Math.floor(1000 + Math.random() * 9000)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(transferCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmTopup = () => {
    if (amountToTopup < 50000) {
      alert('Số tiền nạp tối thiểu là 50.000 đ');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setTimeout(() => {
        onSuccess(amountToTopup);
      }, 1200);
    }, 1000);
  };

  return (
    <div className="store-modal-backdrop" onClick={onClose}>
      <div
        className="store-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580 }}
      >
        {/* Header */}
        <div className="store-modal-header">
          <div className="store-modal-title">Nạp tiền Ví gian hàng MT-GRMS</div>
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
                Nạp tiền Thành công!
              </div>
              <div style={{ fontSize: 14, color: '#475569', maxWidth: 400 }}>
                Ví gian hàng đã được cộng{' '}
                <strong style={{ color: '#15803D' }}>
                  +{new Intl.NumberFormat('vi-VN').format(amountToTopup)} đ
                </strong>
                . Bạn có thể sử dụng ngay để mua gói hoặc dịch vụ gia tăng.
              </div>
            </div>
          ) : (
            <>
              {/* Chọn số tiền nạp */}
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
                  Chọn mệnh giá nạp nhanh
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                  }}
                >
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !customAmount && selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount('');
                        }}
                        style={{
                          padding: '12px 6px',
                          borderRadius: 14,
                          border: isSelected
                            ? '2px solid var(--blue-primary)'
                            : '1px solid #CBD5E1',
                          backgroundColor: isSelected ? 'var(--blue-light)' : '#FFFFFF',
                          color: isSelected ? 'var(--blue-primary)' : '#1E293B',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {new Intl.NumberFormat('vi-VN').format(amt)} đ
                      </button>
                    );
                  })}
                </div>

                {/* Hoặc tự nhập */}
                <div style={{ marginTop: 12 }}>
                  <input
                    type="text"
                    placeholder="Hoặc nhập số tiền khác (VNĐ)..."
                    value={customAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCustomAmount(
                        val ? new Intl.NumberFormat('vi-VN').format(Number(val)) : ''
                      );
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid #CBD5E1',
                      fontSize: 13.5,
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Khung VietQR Chuyển khoản */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 20,
                  padding: '20px',
                  display: 'flex',
                  gap: 20,
                  alignItems: 'center',
                }}
              >
                {/* QR Code SVG / Placeholder Box */}
                <div
                  style={{
                    width: 140,
                    height: 140,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <svg
                    width="100"
                    height="100"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="100" height="100" fill="white" />
                    {/* Corner boxes */}
                    <rect x="10" y="10" width="26" height="26" stroke="#0F172A" strokeWidth="4" fill="none" />
                    <rect x="17" y="17" width="12" height="12" fill="#0F172A" />
                    <rect x="64" y="10" width="26" height="26" stroke="#0F172A" strokeWidth="4" fill="none" />
                    <rect x="71" y="17" width="12" height="12" fill="#0F172A" />
                    <rect x="10" y="64" width="26" height="26" stroke="#0F172A" strokeWidth="4" fill="none" />
                    <rect x="17" y="71" width="12" height="12" fill="#0F172A" />
                    {/* Pattern bits */}
                    <rect x="44" y="12" width="6" height="18" fill="#0066FF" />
                    <rect x="54" y="24" width="6" height="6" fill="#0F172A" />
                    <rect x="42" y="42" width="16" height="16" fill="#0066FF" />
                    <rect x="12" y="44" width="6" height="12" fill="#0F172A" />
                    <rect x="24" y="52" width="6" height="6" fill="#0F172A" />
                    <rect x="64" y="44" width="14" height="6" fill="#0F172A" />
                    <rect x="82" y="52" width="8" height="18" fill="#0F172A" />
                    <rect x="44" y="68" width="6" height="18" fill="#0F172A" />
                    <rect x="54" y="64" width="18" height="6" fill="#0066FF" />
                    <rect x="64" y="76" width="14" height="14" fill="#0F172A" />
                  </svg>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#0066FF',
                      letterSpacing: '0.04em',
                      marginTop: 4,
                    }}
                  >
                    VIETQR · NAPAS247
                  </span>
                </div>

                {/* Thông tin chuyển khoản */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Ngân hàng thụ hưởng</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                    MB Bank (Ngân hàng Quân Đội)
                  </div>

                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Số tài khoản</div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#0066FF',
                    }}
                  >
                    1900 6522 8888
                  </div>

                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Nội dung chuyển khoản</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#FFFFFF',
                      padding: '4px 10px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#DC2626',
                      }}
                    >
                      {transferCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: 2,
                      }}
                      title="Sao chép nội dung"
                    >
                      {isCopied ? <Check size={14} color="#00C853" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Số tiền cần nạp */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: 14,
                  border: '1px solid #BBF7D0',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#166534' }}>
                  Số tiền thanh toán:
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#15803D',
                  }}
                >
                  {new Intl.NumberFormat('vi-VN').format(amountToTopup)} đ
                </span>
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
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirmTopup}
              disabled={isProcessing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 22px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--blue-primary)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--blue-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--blue-primary)';
              }}
            >
              <span>{isProcessing ? 'Đang kiểm tra giao dịch...' : 'Xác nhận đã chuyển khoản'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
