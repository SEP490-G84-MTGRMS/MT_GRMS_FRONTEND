// src/pages/store/components/SubscriptionPricingCards.tsx
import { useState, useEffect, type FC } from 'react';
import { Check, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanItem } from '../storeData';
import { storeApi, type BackendPricingPlanResponse } from '../api/storeApi';

interface SubscriptionPricingCardsProps {
  onSelectPlan: (plan: SubscriptionPlanItem) => void;
  currentPlanName?: string;
}

export const mapBackendPlanToCardItem = (
  backend: BackendPricingPlanResponse,
  _currentPlanName?: string,
  index: number = 0
): SubscriptionPlanItem => {
  const code = (backend.code || backend.id || `PLAN-${index}`).toUpperCase();
  const isPro = code === 'PRO';
  
  // Chuẩn hóa tên gói chính thức
  const name = isPro
    ? 'Gói Pro (Chuỗi Cửa Hàng)'
    : 'Gói Thường (Cửa Hàng Độc Lập)';
  
  const monthlyPrice = Number(backend.monthlyPrice) || (isPro ? 249000 : 99000);
  const yearlyPrice = Number(backend.yearlyPrice) || monthlyPrice * 12;

  // Tagline
  const tagline =
    backend.description ||
    (isPro
      ? 'Dành cho chuỗi siêu thị bán lẻ, chuyên môn hóa quy trình và điều chuyển kho chuỗi.'
      : 'Dành cho tiệm tạp hóa, siêu thị mini độc lập (1 điểm bán kiêm kho tại chỗ).');

  // Branch note
  const branchNote = isPro
    ? 'Mặc định sẵn 2 chi nhánh (Mua thêm: +80k/chi nhánh/tháng)'
    : '1 chi nhánh kiêm kho hàng';

  // Features list
  const feats: string[] = [];
  if (isPro) {
    feats.push('Mặc định sẵn 2 chi nhánh kiêm kho hàng');
    feats.push('Đã bao gồm sẵn Quản lý nhân viên (Không giới hạn tài khoản)');
    feats.push('Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu');
    feats.push('Điều chuyển hàng hóa giữa các chi nhánh chuỗi');
    feats.push('Báo cáo doanh thu & P&L đa chi nhánh');
    feats.push('Giải pháp thanh toán Napas VietQR tự động');
    feats.push('Hỗ trợ ưu tiên qua tổng đài 1900 6522');
  } else {
    feats.push('1 tài khoản chủ cửa hàng quản trị');
    feats.push('Tùy chọn: Mua thêm Quản lý & Phân quyền nhân viên (+30k/tháng)');
    feats.push('Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu');
    feats.push('Quy đổi Thùng sang Lon 1 chạm');
    feats.push('Quét mã vạch bán hàng & kiểm kho');
    feats.push('Giải pháp thanh toán Napas VietQR tự động');
    feats.push('Không hỗ trợ quản lý chuỗi đa chi nhánh');
  }

  // Styling & Theme
  let themeColor = 'var(--blue-primary)';
  let badgeBg = '#EBF5FF';
  let buttonBg = 'var(--blue-primary)';
  let buttonText = '#FFFFFF';
  let highlight = isPro;

  if (!isPro) {
    themeColor = '#10B981';
    badgeBg = '#ECFDF5';
    buttonBg = '#E2E8F0';
    buttonText = '#0F172A';
  }

  return {
    id: backend.id || `plan-${code.toLowerCase()}`,
    code,
    name,
    monthlyPrice,
    yearlyPrice,
    tagline,
    branchNote,
    warehouseNote: undefined,
    features: feats,
    highlight,
    themeColor,
    badgeBg,
    buttonBg,
    buttonText,
  };
};

export const SubscriptionPricingCards: FC<SubscriptionPricingCardsProps> = ({
  onSelectPlan,
  currentPlanName,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>(SUBSCRIPTION_PLANS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const fetchPlans = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await storeApi.getPricingPlans();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Chỉ lấy đúng 2 gói chuẩn: STANDARD (Gói Thường 99k) và PRO (Gói Pro 249k)
        const officialData = res.data.filter((p) => {
          const c = (p.code || p.id || '').toUpperCase();
          return c === 'STANDARD' || c === 'PRO';
        });

        if (officialData.length > 0) {
          // Đảm bảo thứ tự hiển thị: Gói Thường trước, Gói Pro sau
          officialData.sort((a, b) => {
            const codeA = (a.code || a.id || '').toUpperCase();
            const codeB = (b.code || b.id || '').toUpperCase();
            if (codeA === 'STANDARD') return -1;
            if (codeB === 'STANDARD') return 1;
            return 0;
          });

          const mappedPlans = officialData.map((backendPlan, idx) =>
            mapBackendPlanToCardItem(backendPlan, currentPlanName, idx)
          );
          setPlans(mappedPlans);
        } else {
          setPlans(SUBSCRIPTION_PLANS);
        }
      } else {
        setPlans(SUBSCRIPTION_PLANS);
      }
    } catch (err: unknown) {
      console.warn('Không thể kết nối API gói cước, sử dụng danh sách gói chuẩn cục bộ:', err);
      setPlans(SUBSCRIPTION_PLANS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [currentPlanName]);

  const toggleExpand = (planId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  if (isLoading) {
    return (
      <div className="pricing-cards-grid">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="pricing-card"
            style={{ minHeight: 460, opacity: 0.65 }}
          >
            <div
              style={{
                width: '60%',
                height: 26,
                background: '#E2E8F0',
                borderRadius: 8,
                marginBottom: 16,
              }}
            />
            <div
              style={{
                width: '40%',
                height: 42,
                background: '#E2E8F0',
                borderRadius: 8,
                marginBottom: 16,
              }}
            />
            <div
              style={{
                width: '90%',
                height: 16,
                background: '#F1F5F9',
                borderRadius: 6,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: '80%',
                height: 16,
                background: '#F1F5F9',
                borderRadius: 6,
                marginBottom: 24,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  style={{
                    width: '100%',
                    height: 18,
                    background: '#F8FAFC',
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                width: '100%',
                height: 48,
                background: '#E2E8F0',
                borderRadius: 24,
                marginTop: 32,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          background: '#FFF5F5',
          border: '1px solid #FED7D7',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          maxWidth: 600,
          margin: '24px auto',
        }}
      >
        <AlertCircle size={32} color="#E53E3E" style={{ margin: '0 auto 12px auto' }} />
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#C53030',
            marginBottom: 8,
          }}
        >
          {loadError}
        </div>
        <button
          type="button"
          onClick={fetchPlans}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--blue-primary)',
            color: '#FFFFFF',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div
        style={{
          background: '#F8FAFC',
          border: '1px dashed #CBD5E1',
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          color: '#64748B',
          fontSize: 15,
        }}
      >
        Hiện chưa có gói cước dịch vụ nào khả dụng trong hệ thống.
      </div>
    );
  }

  return (
    <div className="pricing-cards-grid">
      {plans.map((plan) => {
        const isExpanded = !!expandedCards[plan.id];
        const displayedFeatures = isExpanded
          ? plan.features
          : plan.features.slice(0, 6);

        const isCurrentPlan = currentPlanName
          ? plan.name.toLowerCase().includes(currentPlanName.toLowerCase()) ||
            currentPlanName.toLowerCase().includes(plan.name.toLowerCase()) ||
            currentPlanName.toUpperCase().includes(plan.code.toUpperCase())
          : false;

        return (
          <div
            key={plan.id}
            className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}
          >
            <div>
              {/* Card Title */}
              <div className="pricing-card-title">{plan.name}</div>

              {/* Price Row */}
              <div className="pricing-card-price-row">
                {plan.monthlyPrice === 0 ? (
                  <span className="pricing-card-price" style={{ color: '#10B981' }}>
                    Miễn phí
                  </span>
                ) : (
                  <>
                    <span className="pricing-card-price" style={{ fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Intl.NumberFormat('vi-VN').format(plan.monthlyPrice)}
                    </span>
                    <span className="pricing-card-currency">đ</span>
                  </>
                )}
              </div>

              {/* Tagline */}
              <div className="pricing-card-tagline">{plan.tagline}</div>

              {/* Branch / Warehouse Notes */}
              <div style={{ minHeight: 48, marginBottom: 12 }}>
                <div className="pricing-addon-note">{plan.branchNote}</div>
                {plan.warehouseNote && (
                  <div className="pricing-addon-note" style={{ color: '#475569' }}>
                    {plan.warehouseNote}
                  </div>
                )}
              </div>

              {/* Features List */}
              <ul className="pricing-feature-list">
                {displayedFeatures.map((feat, idx) => (
                  <li key={idx} className="pricing-feature-item">
                    <Check
                      size={17}
                      strokeWidth={2.2}
                      color="var(--blue-primary)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Expand / Collapse Button */}
              {plan.features.length > 6 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(plan.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    margin: '0 auto 20px auto',
                    padding: '4px 8px',
                  }}
                >
                  <span>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
                  {isExpanded ? (
                    <ChevronUp size={15} strokeWidth={2} />
                  ) : (
                    <ChevronDown size={15} strokeWidth={2} />
                  )}
                </button>
              )}
            </div>

            {/* CTA Button */}
            {isCurrentPlan ? (
              <button
                type="button"
                className="pricing-cta-button"
                disabled
                style={{
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1.5px solid #A7F3D0',
                  cursor: 'default',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                ✓ Gói hiện tại đang dùng
              </button>
            ) : plan.monthlyPrice === 0 ? (
              <button
                type="button"
                className="pricing-cta-button"
                style={{
                  backgroundColor: '#F1F5F9',
                  color: '#1E293B',
                  border: '1px solid #CBD5E1',
                  fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onSelectPlan(plan)}
              >
                Trải nghiệm miễn phí
              </button>
            ) : (
              <button
                type="button"
                className="pricing-cta-button"
                style={{
                  backgroundColor: 'var(--blue-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  boxShadow: plan.highlight ? '0 4px 14px rgba(15, 118, 110, 0.32)' : '0 2px 8px rgba(15, 118, 110, 0.16)',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onSelectPlan(plan)}
              >
                Nâng cấp ngay
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
