// src/pages/store/components/SubscriptionPricingCards.tsx
import { useState, useEffect, type FC } from 'react';
import { Check, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import type { SubscriptionPlanItem } from '../storeData';
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
  const name =
    backend.name ||
    (code === 'FREE'
      ? 'Gói Cơ Bản (Miễn Phí)'
      : code === 'PRO'
      ? 'Gói Doanh Nghiệp (Toàn Năng)'
      : `Gói ${code}`);
  const monthlyPrice = Number(backend.monthlyPrice) || 0;
  const yearlyPrice = Number(backend.yearlyPrice) || monthlyPrice * 12;

  const isFree = monthlyPrice === 0 || code === 'FREE';
  const isPro = code === 'PRO' || monthlyPrice >= 900000;

  // Tagline
  const tagline =
    backend.description ||
    (isFree
      ? 'Dành cho mô hình kinh doanh nhỏ, người bắt đầu kinh doanh hoặc bán hàng online.'
      : isPro
      ? 'Dành cho mô hình kinh doanh chuyên nghiệp, chuyên môn hóa quy trình.'
      : 'Dành cho chuỗi cửa hàng quản lý đa chi nhánh và cần dịch vụ cao cấp.');

  // Branch note
  const maxBranches = backend.quotas?.maxBranches ?? (isFree ? 1 : 10);
  const branchNote =
    maxBranches <= 1
      ? '1 chi nhánh /tháng'
      : `Quản lý đa chi nhánh: tối đa ${maxBranches} chi nhánh`;

  // Warehouse note
  const warehouseNote = maxBranches > 1 ? 'Quản lý đa kho: 150k/ +1 kho' : undefined;

  // Features list extraction
  const feats: string[] = [];
  const maxStaff = backend.quotas?.maxEmployees ?? (isFree ? 3 : 100);
  feats.push(
    maxStaff <= 5 ? `${maxStaff} tài khoản truy cập` : 'Không giới hạn tài khoản truy cập'
  );
  feats.push('Không giới hạn tính năng cơ bản');
  feats.push('Không phí khởi tạo');

  if (backend.features?.fefoExpiryAlert) {
    feats.push('Cảnh báo cận date & xuất hàng FEFO');
  }
  if (backend.features?.vietQrDynamic) {
    feats.push('Giải pháp thanh toán Napas VietQR tự động');
  }
  if (backend.features?.multiUnitConversion) {
    feats.push('Quy đổi Thùng sang Lon 1 chạm');
  }
  if (backend.features?.debtZaloBook) {
    feats.push('Sổ nợ khách quen & nhắc nợ Zalo');
  }
  if (backend.features?.barcodeScanning) {
    feats.push('Quét mã vạch bán hàng & kiểm kho');
  }
  if (backend.features?.financialReporting) {
    feats.push('Báo cáo tài chính & P&L chuyên sâu');
  }

  // Support hotline
  if (isPro) {
    feats.push('Hỗ trợ ưu tiên qua tổng đài 1900 6522');
    feats.push('Hỗ trợ liên kết các hãng vận chuyển');
  } else {
    feats.push('Hỗ trợ kỹ thuật trực tuyến MT-GRMS');
  }

  // Styling & Theme
  let themeColor = 'var(--blue-primary)';
  let badgeBg = '#EBF5FF';
  let buttonBg = 'var(--blue-primary)';
  let buttonText = '#FFFFFF';
  let highlight = false;

  if (isFree) {
    themeColor = '#10B981';
    badgeBg = '#ECFDF5';
    buttonBg = '#E2E8F0';
    buttonText = '#0F172A';
    highlight = false;
  } else if (isPro) {
    themeColor = 'var(--blue-primary)';
    badgeBg = '#EBF5FF';
    buttonBg = 'var(--blue-primary)';
    buttonText = '#FFFFFF';
    highlight = true;
  } else {
    themeColor = '#EA580C';
    badgeBg = '#FFF7ED';
    buttonBg = '#F97316';
    buttonText = '#FFFFFF';
    highlight = false;
  }

  return {
    id: backend.id || `plan-${code.toLowerCase()}`,
    code,
    name,
    monthlyPrice,
    yearlyPrice,
    tagline,
    branchNote,
    warehouseNote,
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
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const fetchPlans = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await storeApi.getPricingPlans();
      if (res.success && Array.isArray(res.data)) {
        // Map 100% from Backend response
        const mappedPlans = res.data.map((backendPlan, idx) =>
          mapBackendPlanToCardItem(backendPlan, currentPlanName, idx)
        );
        setPlans(mappedPlans);
      } else {
        setLoadError(res.message || 'Không thể tải danh sách gói cước từ hệ thống.');
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing plans:', err);
      setLoadError('Không thể kết nối đến máy chủ để lấy dữ liệu gói cước.');
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
        {[1, 2, 3, 4].map((i) => (
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
                    <span className="pricing-card-price">
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
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  border: '1px solid #CBD5E1',
                  cursor: 'default',
                  opacity: 0.85,
                }}
              >
                Gói hiện tại đang dùng
              </button>
            ) : plan.monthlyPrice === 0 ? (
              <button
                type="button"
                className="pricing-cta-button"
                style={{
                  backgroundColor: '#E2E8F0',
                  color: '#0F172A',
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
                  backgroundColor: plan.buttonBg,
                  color: plan.buttonText,
                }}
                onClick={() => onSelectPlan(plan)}
              >
                Mua ngay
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
