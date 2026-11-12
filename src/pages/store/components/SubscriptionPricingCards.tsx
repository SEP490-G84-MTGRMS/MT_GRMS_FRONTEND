// src/pages/store/components/SubscriptionPricingCards.tsx
import { useState, useEffect, type FC } from "react";
import {
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanItem } from "../storeData";
import { storeApi, type BackendPricingPlanResponse } from "../api/storeApi";

interface SubscriptionPricingCardsProps {
  onSelectPlan: (plan: SubscriptionPlanItem) => void;
  currentPlanName?: string;
}

export const mapBackendPlanToCardItem = (
  backend: BackendPricingPlanResponse,
  _currentPlanName?: string,
  index: number = 0,
): SubscriptionPlanItem => {
  const code = (backend.code || backend.id || `PLAN-${index}`).toUpperCase();
  const isTrial = code === "TRIAL" || code.includes("TRIAL");
  const isPro = code === "PRO";

  let name = "Gói Thường (Cửa Hàng Độc Lập)";
  let monthlyPrice = 99000;
  let yearlyPrice = 99000 * 12;
  let tagline = "Dành cho tiệm tạp hóa, siêu thị mini độc lập.";
  let branchNote = "1 chi nhánh kiêm kho hàng";
  let feats: string[] = [];
  let themeColor = "#10B981";
  let badgeBg = "#ECFDF5";
  let buttonBg = "#E2E8F0";
  let buttonText = "#0F172A";
  let highlight = false;

  if (isTrial) {
    name = "Gói Dùng Thử (Trải Nghiệm)";
    monthlyPrice = 0;
    yearlyPrice = 0;
    tagline = "";
    branchNote = "";
    feats = [
      "1 tài khoản chủ cửa hàng quản trị",
      "Mở khóa sẵn Quản lý nhân viên (Trải nghiệm)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Quy đổi Thùng sang Lon 1 chạm",
      "Quét mã vạch bán hàng & kiểm kho",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Không tự động gia hạn sau khi hết hạn",
    ];
    themeColor = "#64748B";
    badgeBg = "#F1F5F9";
    buttonBg = "#F1F5F9";
    buttonText = "#334155";
    highlight = false;
  } else if (isPro) {
    name = "Gói Pro (Chuỗi Cửa Hàng)";
    monthlyPrice = Number(backend.monthlyPrice) || 249000;
    yearlyPrice = Number(backend.yearlyPrice) || monthlyPrice * 12;
    tagline =
      backend.description ||
      "Dành cho chuỗi siêu thị bán lẻ, chuyên môn hóa quy trình và điều chuyển kho chuỗi.";
    branchNote = "Mặc định sẵn 2 chi nhánh (Mua thêm: +80k/chi nhánh/tháng)";
    feats = [
      "Mặc định sẵn 2 chi nhánh kiêm kho hàng",
      "Đã bao gồm sẵn Quản lý nhân viên (Không giới hạn tài khoản)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Điều chuyển hàng hóa giữa các chi nhánh chuỗi",
      "Báo cáo doanh thu & P&L đa chi nhánh",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Hỗ trợ ưu tiên qua tổng đài 1900 6522",
    ];
    themeColor = "var(--blue-primary)";
    badgeBg = "#EBF5FF";
    buttonBg = "var(--blue-primary)";
    buttonText = "#FFFFFF";
    highlight = true;
  } else {
    // STANDARD
    name = "Gói Thường (Cửa Hàng Độc Lập)";
    monthlyPrice = Number(backend.monthlyPrice) || 99000;
    yearlyPrice = Number(backend.yearlyPrice) || monthlyPrice * 12;
    tagline =
      backend.description || "Dành cho tiệm tạp hóa, siêu thị mini độc lập.";
    branchNote = "1 chi nhánh kiêm kho hàng";
    feats = [
      "1 tài khoản chủ cửa hàng quản trị",
      "Tùy chọn: Mua thêm Quản lý & Phân quyền nhân viên (+30k/tháng)",
      "Quản lý tồn kho theo Lô & Hạn sử dụng FEFO 3 mức màu",
      "Quy đổi Thùng sang Lon 1 chạm",
      "Quét mã vạch bán hàng & kiểm kho",
      "Giải pháp thanh toán Napas VietQR tự động",
      "Không hỗ trợ quản lý chuỗi đa chi nhánh",
    ];
    themeColor = "#10B981";
    badgeBg = "#ECFDF5";
    buttonBg = "#E2E8F0";
    buttonText = "#0F172A";
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
  const [plans, setPlans] =
    useState<SubscriptionPlanItem[]>(SUBSCRIPTION_PLANS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await storeApi.getPricingPlans();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        // Lấy 3 gói cước chính thức: TRIAL (trái) -> STANDARD (giữa) -> PRO (phải)
        const officialData = res.data.filter((p) => {
          const c = (p.code || p.id || "").toUpperCase();
          return c === "TRIAL" || c === "STANDARD" || c === "PRO";
        });

        if (officialData.length > 0) {
          // Sắp xếp thứ tự: TRIAL (1) -> STANDARD (2) -> PRO (3)
          const orderMap: Record<string, number> = {
            TRIAL: 1,
            STANDARD: 2,
            PRO: 3,
          };
          officialData.sort((a, b) => {
            const codeA = (a.code || a.id || "").toUpperCase();
            const codeB = (b.code || b.id || "").toUpperCase();
            return (orderMap[codeA] || 99) - (orderMap[codeB] || 99);
          });

          // Nếu API chưa trả về gói TRIAL thì bổ sung gói TRIAL vào đầu danh sách
          const hasTrial = officialData.some(
            (p) => (p.code || p.id || "").toUpperCase() === "TRIAL",
          );
          let allPlansData = officialData;
          if (!hasTrial) {
            allPlansData = [
              {
                id: "plan_trial",
                code: "TRIAL",
                name: "Gói Dùng Thử (Trải Nghiệm)",
                description:
                  "Trải nghiệm toàn diện các tính năng cao cấp của MT-GRMS hoàn toàn miễn phí trong 3 ngày.",
                monthlyPrice: 0,
                yearlyPrice: 0,
                status: "ACTIVE",
              },
              ...officialData,
            ];
          }

          const mappedPlans = allPlansData.map((backendPlan, idx) =>
            mapBackendPlanToCardItem(backendPlan, currentPlanName, idx),
          );
          setPlans(mappedPlans);
        } else {
          setPlans(SUBSCRIPTION_PLANS);
        }
      } else {
        setPlans(SUBSCRIPTION_PLANS);
      }
    } catch (err: unknown) {
      console.warn(
        "Không thể kết nối API gói cước, sử dụng danh sách gói chuẩn cục bộ:",
        err,
      );
      setPlans(SUBSCRIPTION_PLANS);
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

  return (
    <div className="pricing-cards-grid">
      {plans.map((plan) => {
        const isCurrentPlan = currentPlanName
          ? plan.name.toLowerCase().includes(currentPlanName.toLowerCase()) ||
            currentPlanName.toLowerCase().includes(plan.name.toLowerCase()) ||
            currentPlanName.toUpperCase().includes(plan.code.toUpperCase())
          : false;

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
                    ✨ 3 ngày 0 đ
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
            {isCurrentPlan ? (
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
                style={{
                  backgroundColor: "#F1F5F9",
                  color: "#1E293B",
                  border: "1px solid #CBD5E1",
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s ease",
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
                  backgroundColor: "var(--blue-primary)",
                  color: "#FFFFFF",
                  border: "none",
                  fontWeight: 700,
                  boxShadow: plan.highlight
                    ? "0 4px 14px rgba(15, 118, 110, 0.32)"
                    : "0 2px 8px rgba(15, 118, 110, 0.16)",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s ease",
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
