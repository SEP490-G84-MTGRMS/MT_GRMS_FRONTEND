import { type FC } from 'react';
import { CreditCard, Lock, LogOut } from 'lucide-react';

interface SubscriptionLockOverlayProps {
  isOwner: boolean;
  onGoToBilling: () => void;
  onLogout?: () => void;
  reasonMessage?: string | null;
  lockReason?: 'NO_PLAN' | 'EXPIRED';
}

export const SubscriptionLockOverlay: FC<SubscriptionLockOverlayProps> = ({
  isOwner,
  onGoToBilling,
  onLogout,
  reasonMessage,
  lockReason = 'EXPIRED',
}) => {
  const isNoPlan = lockReason === 'NO_PLAN';
  const title = isNoPlan ? 'Cần mua gói để sử dụng dịch vụ' : 'Gói dịch vụ đã hết hạn';
  const description =
    reasonMessage ||
    (isNoPlan
      ? isOwner
        ? 'Cửa hàng chưa kích hoạt hoặc mua gói dịch vụ nào. Dữ liệu và thao tác nghiệp vụ tạm thời được khóa cho đến khi bạn chọn dùng thử hoặc mua gói.'
        : 'Cửa hàng chưa mua gói dịch vụ. Vui lòng liên hệ Chủ cửa hàng mua gói để sử dụng dịch vụ.'
      : isOwner
        ? 'Thời hạn sử dụng gói dịch vụ của cửa hàng đã kết thúc. Dữ liệu và thao tác nghiệp vụ tạm thời được khóa cho đến khi bạn thanh toán gia hạn gói.'
        : 'Gói dịch vụ của cửa hàng đã hết hạn. Vui lòng liên hệ Chủ cửa hàng thanh toán hoặc gia hạn gói để tiếp tục sử dụng.');
  const ctaLabel = isNoPlan ? 'Mua gói dịch vụ' : 'Thanh toán / Gia hạn gói';

  return (
    <div
      data-testid="subscription-lock-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-lock-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        backgroundColor: 'rgba(15, 23, 42, 0.80)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '88px 20px 24px 20px',
        overflowY: 'auto',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          border: '1px solid #E5EDF8',
          boxShadow: '0 24px 56px rgba(0, 20, 60, 0.30)',
          padding: '32px 28px',
          textAlign: 'center',
          color: '#0F172A',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 20px auto',
            borderRadius: 9999,
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={28} strokeWidth={1.9} color="#0F172A" aria-hidden="true" />
        </div>

        <h2
          id="subscription-lock-title"
          style={{
            margin: '0 0 10px 0',
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: '#0F172A',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: 14,
            lineHeight: 1.6,
            color: '#475569',
          }}
        >
          {description}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
          }}
        >
          {isOwner && (
            <button
              type="button"
              onClick={onGoToBilling}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 22px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0052CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0066FF';
              }}
            >
              <CreditCard size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>{ctaLabel}</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 20px',
                borderRadius: 9999,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#94A3B8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <LogOut size={16} strokeWidth={1.9} aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLockOverlay;

