// src/pages/store/components/SubscriptionPricingCards.tsx
import { useState, useEffect, type FC } from "react";
import {
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { type SubscriptionPlanItem } from "../storeData";
import { storeApi, type BackendPricingPlanResponse } from "../api/storeApi";

interface SubscriptionPricingCardsProps {
  onSelectPlan: (plan: SubscriptionPlanItem) => void;
  currentPlanName?: string;
  onBuyStaffAddon?: () => void;
  hasStaffAddon?: boolean;
  trialState?: 'ELIGIBLE' | 'ACTIVE' | 'EXPIRED' | 'PAID' | 'REVIEW_REQUIRED' | null;
}

function buildDynamicPlanFeatures(
  backend: BackendPricingPlanResponse,
  code: string,
): string[] {
  const isTrial = code === "TRIAL" || code.includes("TRIAL");
  if (isTrial && !backend.quotas && !backend.features) {
    return [
      "1 tài khoản chủ cửa hàng quản trị",
      "Mở khóa sẵn Quản lý nhân viên (Trải nghiệm)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Quy đổi Thùng sang Lon 1 chạm",
      "Quét mã vạch bán hàng & kiểm kho",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Không tự động gia hạn sau khi hết hạn",
    ];
  }

  const items: string[] = [];
  if (backend.description && backend.description.trim()) {
    items.push(backend.description.trim());
  }

  const q = backend.quotas;
  if (q) {
    if (q.maxBranches === -1) {
      items.push("Không giới hạn chi nhánh kinh doanh");
    } else if (q.maxBranches === 1) {
      items.push("1 chi nhánh kiêm kho hàng");
    } else if (q.maxBranches > 1) {
      items.push(`Tối đa ${q.maxBranches} chi nhánh kiêm kho hàng`);
    }

    if (q.maxEmployees === -1 || q.maxEmployees >= 100) {
      items.push("Đã bao gồm Quản lý nhân viên (Không giới hạn tài khoản)");
    } else if (q.maxEmployees === 1 && code === "STANDARD") {
      items.push("1 tài khoản chủ cửa hàng (Tùy chọn mua thêm Quản lý nhân viên +30k/tháng)");
    } else if (q.maxEmployees > 0) {
      items.push(`Tối đa ${q.maxEmployees} tài khoản nhân sự`);
    }

    if (q.maxStorageGb > 0) {
      items.push(`${q.maxStorageGb} GB dung lượng lưu trữ ảnh/tệp`);
    }
  }

  const f = backend.features;
  if (f) {
    if (f.fefoExpiryAlert) items.push("Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu");
    if (f.multiUnitConversion) items.push("Quy đổi đơn vị tính Thùng - Lốc - Lon 1 chạm");
    if (f.barcodeScanning) items.push("Quét mã vạch bán hàng & kiểm kho");
    if (f.vietQrDynamic) items.push("Thanh toán Napas VietQR động tự động");
    if (f.debtZaloBook) items.push("Sổ nợ khách hàng & đối soát nhắc nợ Zalo");
    if (f.financialReporting) items.push("Báo cáo doanh thu & lãi lỗ P&L chuyên sâu");
  }

  if (items.length === 0) {
    items.push("Đầy đủ nghiệp vụ bán lẻ tạp hóa theo cấu hình gói");
  }

  return items;
}

export const mapBackendPlanToCardItem = (
  backend: BackendPricingPlanResponse,
  _currentPlanName?: string,
  index: number = 0,
): SubscriptionPlanItem => {
  const code = (backend.code || backend.id || `PLAN-${index}`).toUpperCase();
  const isTrial = code === "TRIAL" || code.includes("TRIAL");
  const isPro = code === "PRO";

  const fallbackName = isTrial
    ? "Gói Dùng Thử (Trải Nghiệm)"
    : isPro
      ? "Gói Pro (Chuỗi Cửa Hàng)"
      : code === "STANDARD"
        ? "Gói Thường (Cửa Hàng Độc Lập)"
        : code;

  const name = backend.name?.trim() || fallbackName;
  const monthlyPrice = isTrial ? 0 : Math.max(0, Number(backend.monthlyPrice) || 0);
  const yearlyPrice = isTrial
    ? 0
    : Math.max(0, Number(backend.yearlyPrice) || monthlyPrice * 12);
  const tagline = backend.description || "";
  const maxBranches = backend.quotas?.maxBranches;
  const branchNote = isTrial
    ? ""
    : maxBranches === -1
      ? "Không giới hạn chi nhánh"
      : maxBranches && maxBranches > 1
        ? `Mặc định sẵn ${maxBranches} chi nhánh`
        : "1 chi nhánh kiêm kho hàng";

  const feats = buildDynamicPlanFeatures(backend, code);

  let themeColor = "#10B981";
  let badgeBg = "#ECFDF5";
  let buttonBg = "var(--blue-primary)";
  let buttonText = "#FFFFFF";
  let highlight = false;

  if (isTrial) {
    themeColor = "#64748B";
    badgeBg = "#F1F5F9";
    buttonBg = "#F1F5F9";
    buttonText = "#334155";
  } else if (isPro) {
    themeColor = "var(--blue-primary)";
    badgeBg = "#EBF5FF";
    buttonBg = "var(--blue-primary)";
    buttonText = "#FFFFFF";
    highlight = true;
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
  onBuyStaffAddon,
  hasStaffAddon,
  trialState,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await storeApi.getPricingPlans();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const activeData = res.data.filter(
          (p) => (p.status || "ACTIVE").toUpperCase() === "ACTIVE",
        );

        if (activeData.length > 0) {
          activeData.sort((a, b) => {
            const codeA = (a.code || a.id || "").toUpperCase();
            const codeB = (b.code || b.id || "").toUpperCase();
            if (codeA === "TRIAL" && codeB !== "TRIAL") return -1;
            if (codeB === "TRIAL" && codeA !== "TRIAL") return 1;
            return (Number(a.monthlyPrice) || 0) - (Number(b.monthlyPrice) || 0);
          });

          const mappedPlans = activeData.map((backendPlan, idx) =>
            mapBackendPlanToCardItem(backendPlan, currentPlanName, idx),
          );
          setPlans(mappedPlans);
        } else {
          setPlans([]);
          setLoadError("Hiện chưa có gói dịch vụ nào khả dụng từ hệ thống.");
        }
      } else {
        setPlans([]);
        setLoadError("Không thể tải danh sách gói dịch vụ từ máy chủ.");
      }
    } catch (err: unknown) {
      console.warn("Không thể kết nối API gói cước:", err);
      setPlans([]);
      setLoadError("Không thể kết nối máy chủ để tải bảng giá gói dịch vụ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [currentPlanName]);

  if (isLoading) {
    return (
      <div className="pricing-cards-grid">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="pricing-card"
            style={{ minHeight: 460, opacity: 0.65 }}
          >
            <div
              style={{
                width: "60%",
                height: 26,
                background: "#E2E8F0",
                borderRadius: 8,
                marginBottom: 16,
              }}
            />
            <div
              style={{
                width: "40%",
                height: 42,
                background: "#E2E8F0",
                borderRadius: 8,
                marginBottom: 16,
              }}
            />
            <div
              style={{
                width: "90%",
                height: 16,
                background: "#F1F5F9",
                borderRadius: 6,
                marginBottom: 12,
              }}
            />
            <div
              style={{
                width: "80%",
                height: 16,
                background: "#F1F5F9",
                borderRadius: 6,
                marginBottom: 24,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  style={{
                    width: "100%",
                    height: 18,
                    background: "#F8FAFC",
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                width: "100%",
                height: 48,
                background: "#E2E8F0",
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
          background: "#FFF5F5",
          border: "1px solid #FED7D7",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
          maxWidth: 600,
          margin: "24px auto",
        }}
      >
        <AlertCircle
          size={32}
          color="#E53E3E"
          style={{ margin: "0 auto 12px auto" }}
        />
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#C53030",
            marginBottom: 8,
          }}
        >
          {loadError}
        </div>
        <button
          type="button"
          onClick={fetchPlans}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: "var(--radius-pill)",
            background: "var(--blue-primary)",
            color: "#FFFFFF",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
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
          background: "#F8FAFC",
          border: "1px dashed #CBD5E1",
          borderRadius: 16,
          padding: "48px 24px",
          textAlign: "center",
          color: "#64748B",
          fontSize: 15,
        }}
      >
        Hiện chưa có gói cước dịch vụ nào khả dụng trong hệ thống.
      </div>
    );
  }

  const normalizedCurrentPlan = (currentPlanName || "").trim().toLowerCase();
  const isUnselectedPlan =
    trialState === "ELIGIBLE" ||
    !normalizedCurrentPlan ||
    normalizedCurrentPlan.includes("chưa kích hoạt") ||
    normalizedCurrentPlan.includes("chưa chọn");

  const exactMatchedPlan = !isUnselectedPlan
    ? plans.find(
        (p) =>
          p.code.toLowerCase() === normalizedCurrentPlan ||
          p.name.trim().toLowerCase() === normalizedCurrentPlan,
      )
    : undefined;

  const matchedCurrentPlan = !isUnselectedPlan
    ? exactMatchedPlan ??
      plans.find(
        (p) =>
          p.name.toLowerCase().includes(normalizedCurrentPlan) ||
          normalizedCurrentPlan.includes(p.name.toLowerCase()) ||
          (p.code.toUpperCase() === "PRO" &&
            (/\bpro\b/i.test(normalizedCurrentPlan) ||
              normalizedCurrentPlan.includes("chuyên nghiệp"))) ||
          (p.code.toUpperCase() === "STANDARD" &&
            (normalizedCurrentPlan.includes("standard") ||
              normalizedCurrentPlan.includes("thường") ||
              normalizedCurrentPlan.includes("cơ bản"))) ||
          (p.code.toUpperCase() === "TRIAL" &&
            (normalizedCurrentPlan.includes("trial") ||
              normalizedCurrentPlan.includes("dùng thử"))),
      )
    : undefined;

  const isCurrentPro =
    !isUnselectedPlan &&
    (matchedCurrentPlan
      ? matchedCurrentPlan.code.toUpperCase() === "PRO"
      : /\bpro\b/i.test(normalizedCurrentPlan) ||
        normalizedCurrentPlan.includes("chuyên nghiệp"));

  return (
    <div className="pricing-cards-grid">
      {plans.map((plan) => {
        const isCurrentPlan = Boolean(
          matchedCurrentPlan && matchedCurrentPlan.id === plan.id,
        );
        const isActiveCurrentPlan = isCurrentPlan && trialState !== "EXPIRED";
        const isExpiredCurrentPlan = isCurrentPlan && trialState === "EXPIRED";
        const isDowngradeBlocked =
          isCurrentPro && plan.code.toUpperCase() === "STANDARD";
        const isTrialDisabled =
          isCurrentPro || Boolean(trialState && trialState !== "ELIGIBLE");

        return (
          <div
            key={plan.id}
            className={`pricing-card ${plan.highlight ? "highlighted" : ""}`}
          >
            <div>
              {/* Card Title & Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  gap: 8,
                }}
              >
                <div className="pricing-card-title" style={{ margin: 0 }}>
                  {plan.name}
                </div>
                {plan.code === "PRO" && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--blue-primary)",
                      backgroundColor: "#E6FFFA",
                      border: "1px solid #B2F5EA",
                      padding: "3px 10px",
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Phổ biến nhất
                  </span>
                )}
                {plan.code === "TRIAL" && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0F766E",
                      backgroundColor: "#F0FDFA",
                      border: "1px solid #CCFBF1",
                      padding: "3px 10px",
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                    }}
                  >
                    3 ngày 0 đ
                  </span>
                )}
              </div>

              {/* Price Row */}
              <div className="pricing-card-price-row">
                {plan.monthlyPrice === 0 ? (
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                  >
                    <span
                      className="pricing-card-price"
                      style={{ color: "#0F766E" }}
                    >
                      Miễn phí
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      / 3 ngày
                    </span>
                  </div>
                ) : (
                  <>
                    <span
                      className="pricing-card-price"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {new Intl.NumberFormat("vi-VN").format(plan.monthlyPrice)}
                    </span>
                    <span className="pricing-card-currency">đ</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        fontWeight: 600,
                      }}
                    >
                      / tháng
                    </span>
                  </>
                )}
              </div>

              {/* Features List */}
              <ul className="pricing-feature-list">
                {plan.features.map((feat, idx) => (
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

            </div>

            {/* CTA Button */}
            {isActiveCurrentPlan ? (
              <button
                type="button"
                className="pricing-cta-button"
                disabled
                style={{
                  backgroundColor: "#ECFDF5",
                  color: "#059669",
                  border: "1.5px solid #A7F3D0",
                  cursor: "default",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                }}
              >
                ✓ Gói hiện tại đang dùng
              </button>
            ) : plan.monthlyPrice === 0 ? (
              <button
                type="button"
                className="pricing-cta-button"
                disabled={isTrialDisabled}
                style={{
                  backgroundColor: isTrialDisabled ? "#E2E8F0" : "#F1F5F9",
                  color: isTrialDisabled ? "#64748B" : "#1E293B",
                  border: "1px solid #CBD5E1",
                  fontWeight: 700,
                  cursor: isTrialDisabled ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s ease",
                }}
                onClick={() => {
                  if (!isTrialDisabled) onSelectPlan(plan);
                }}
              >
                {isCurrentPro
                  ? 'Không khả dụng ở Gói Pro'
                  : trialState === 'ACTIVE'
                    ? 'Đang trong thời gian dùng thử'
                    : trialState && trialState !== 'ELIGIBLE'
                      ? 'Đã hết lượt dùng thử'
                      : 'Dùng thử miễn phí 3 ngày'}
              </button>
            ) : (
              <button
                type="button"
                className="pricing-cta-button"
                disabled={isDowngradeBlocked}
                style={{
                  backgroundColor: isDowngradeBlocked ? "#E2E8F0" : "var(--blue-primary)",
                  color: isDowngradeBlocked ? "#64748B" : "#FFFFFF",
                  border: isDowngradeBlocked ? "1px solid #CBD5E1" : "none",
                  fontWeight: 700,
                  cursor: isDowngradeBlocked ? "not-allowed" : "pointer",
                  boxShadow: isDowngradeBlocked
                    ? "none"
                    : plan.highlight
                      ? "0 4px 14px rgba(15, 118, 110, 0.32)"
                      : "0 2px 8px rgba(15, 118, 110, 0.16)",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s ease",
                }}
                onClick={() => {
                  if (!isDowngradeBlocked) onSelectPlan(plan);
                }}
              >
                {isDowngradeBlocked
                  ? "Không hỗ trợ hạ cấp"
                  : isExpiredCurrentPlan
                    ? "Gia hạn gói ngay"
                    : "Nâng cấp ngay"}
              </button>
            )}
            {isActiveCurrentPlan && plan.code === "STANDARD" && onBuyStaffAddon && (
              <button type="button" className="store-btn-primary" style={{ marginTop: 10 }} onClick={onBuyStaffAddon}>
                Mua thêm Quản lý nhân viên
              </button>
            )}
            {isActiveCurrentPlan && plan.code === "STANDARD" && hasStaffAddon && (
              <p style={{ margin: "10px 0 0", textAlign: "center", color: "#047857", fontSize: 13 }}>
                Đã mở khóa Quản lý nhân viên
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
