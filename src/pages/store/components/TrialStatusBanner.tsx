import type { FC } from 'react';
import { Clock, ShieldCheck, AlertCircle, Wallet } from 'lucide-react';
import type { TrialStatus } from '../api/storeApi';

interface TrialStatusBannerProps {
  trialStatus: TrialStatus | null;
  onStartTrial?: () => void;
  onOpenWallet?: () => void;
  isActivatingTrial?: boolean;
}

const formatHoChiMinhDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
};

export const TrialStatusBanner: FC<TrialStatusBannerProps> = ({
  trialStatus,
  onStartTrial,
  onOpenWallet,
  isActivatingTrial = false,
}) => {
  if (!trialStatus || trialStatus.state === 'PAID') {
    return null;
  }

  if (trialStatus.state === 'ELIGIBLE') {
    return (
      <section
        aria-label="Trạng thái dùng thử miễn phí"
        style={{
          marginBottom: 18,
          padding: '20px 24px',
          border: '1px solid #DBE9FE',
          borderRadius: 24,
          backgroundColor: '#F7FAFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, maxWidth: 680 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: '#E8F1FF',
              color: '#0066FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} strokeWidth={1.9} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>
              Cửa hàng chưa chọn gói dịch vụ — Sẵn sàng dùng thử miễn phí 3 ngày
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
              Dùng thử miễn phí 3 ngày • Không cần thẻ • Không tự động gia hạn. Thời hạn 72 giờ chỉ bắt đầu tính khi bạn xác nhận kích hoạt, hoặc bạn có thể nạp ví để mua ngay Gói Thường / Gói Pro bên dưới.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onOpenWallet && (
            <button
              type="button"
              onClick={onOpenWallet}
              style={{
                padding: '10px 18px',
                borderRadius: 9999,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Wallet size={16} strokeWidth={1.9} />
              <span>Nạp ví cửa hàng</span>
            </button>
          )}
          {onStartTrial && (
            <button
              type="button"
              disabled={isActivatingTrial}
              onClick={onStartTrial}
              style={{
                padding: '10px 20px',
                borderRadius: 9999,
                border: 'none',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: isActivatingTrial ? 'wait' : 'pointer',
              }}
            >
              {isActivatingTrial ? 'Đang kích hoạt...' : 'Dùng thử miễn phí 3 ngày'}
            </button>
          )}
        </div>
      </section>
    );
  }

  if (trialStatus.state === 'ACTIVE') {
    const expiryLabel = formatHoChiMinhDateTime(trialStatus.trialExpiresAt);
    return (
      <section
        aria-label="Thông tin gói dùng thử đang hoạt động"
        style={{
          marginBottom: 18,
          padding: '16px 22px',
          border: '1px solid #BBF7D0',
          borderRadius: 24,
          backgroundColor: '#F0FDF4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} strokeWidth={1.9} color="#15803D" />
          <div style={{ fontSize: 13.5, color: '#14532D', fontWeight: 600 }}>
            Gói dùng thử 3 ngày đang hoạt động{expiryLabel ? ` — Hết hạn lúc ${expiryLabel} (giờ Việt Nam)` : ''}. Không tự động gia hạn.
          </div>
        </div>
      </section>
    );
  }

  const isExpired = trialStatus.state === 'EXPIRED';
  return (
    <section
      aria-label="Thông báo cần nâng cấp gói dịch vụ"
      style={{
        marginBottom: 18,
        padding: '18px 22px',
        border: '1px solid #FED7AA',
        borderRadius: 24,
        backgroundColor: '#FFFBEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <AlertCircle size={20} strokeWidth={1.9} color="#C2410C" style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#7C2D12' }}>
            {isExpired ? 'Thời gian dùng thử 3 ngày đã kết thúc' : 'Tài khoản cần chọn gói dịch vụ trả phí'}
          </div>
          <div style={{ marginTop: 4, fontSize: 13.5, color: '#9A3412', lineHeight: 1.5 }}>
            {isExpired
              ? 'Vui lòng nạp ví và chọn Gói Thường hoặc Gói Pro bên dưới để mở khóa lại các chức năng bán hàng, kho và báo cáo.'
              : 'Vui lòng chọn Gói Thường hoặc Gói Pro bên dưới (hoặc liên hệ hỗ trợ để đối soát gói) để tiếp tục vận hành cửa hàng.'}
          </div>
        </div>
      </div>
      {onOpenWallet && (
        <button
          type="button"
          onClick={onOpenWallet}
          style={{
            padding: '9px 18px',
            borderRadius: 9999,
            border: '1px solid #FDBA74',
            backgroundColor: '#FFFFFF',
            color: '#9A3412',
            fontWeight: 700,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Wallet size={16} strokeWidth={1.9} />
          <span>Nạp tiền vào ví</span>
        </button>
      )}
    </section>
  );
};
