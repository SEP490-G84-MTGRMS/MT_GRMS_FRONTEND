import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  PlanStatus,
  PlanQuotaConfig,
  PlanFeatureConfig,
  SubscriptionPlan,
} from "../../features/admin/types/plan.types";
import {
  PlanBasicInfoForm,
  PlanQuotasForm,
  PlanFeaturesForm,
  PlanDangerZone,
  PlanLivePreviewCard,
} from "../../features/admin/components/subscriptions/forms";
import {
  validatePlanPricing,
  validatePlanQuotas,
} from "../../features/admin/utils/planValidation";
import { mockPlans } from "../../features/admin/data/mockPlanData";

export const SubscriptionPlanEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [yearlyPrice, setYearlyPrice] = useState<number>(0);
  const [status, setStatus] = useState<PlanStatus>("Active");
  const [description, setDescription] = useState("");
  const [quotas, setQuotas] = useState<PlanQuotaConfig>({
    maxBranches: 1,
    maxEmployees: 3,
    maxStorageGb: 5,
    backupFrequency: "Daily",
  });
  const [features, setFeatures] = useState<PlanFeatureConfig>({
    barcodeScanning: true,
    fefoExpiryAlert: true,
    multiUnitConversion: true,
    vietQrDynamic: true,
    debtZaloBook: false,
    financialReporting: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const found = mockPlans.find((p) => p.id === id || p.code === id);
    if (found) {
      setCurrentPlan(found);
      setName(found.name);
      setMonthlyPrice(found.monthlyPrice);
      setYearlyPrice(found.yearlyPrice);
      setStatus(found.status);
      setDescription(found.description || "");
      setQuotas(found.quotas);
      setFeatures(found.features);
    }
  }, [id]);

  if (!currentPlan) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "var(--bg-soft-blue, #f7faff)",
          padding: "30px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "420px",
            margin: "40px auto",
            background: "#fff",
            padding: "24px",
            borderRadius: "12px",
          }}
        >
          <h3 style={{ color: "#0f172a", margin: "0 0 8px" }}>
            Không tìm thấy gói dịch vụ
          </h3>
          <p
            style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}
          >
            Mã định danh <code>{id}</code> không tồn tại trên hệ thống.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin/subscriptions")}
            style={{
              padding: "8px 20px",
              borderRadius: "9999px",
              border: "none",
              background: "var(--blue-primary, #0066ff)",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Quay lại danh mục
          </button>
        </div>
      </div>
    );
  }

  const handleReset = () => {
    setName(currentPlan.name);
    setMonthlyPrice(currentPlan.monthlyPrice);
    setYearlyPrice(currentPlan.yearlyPrice);
    setStatus(currentPlan.status);
    setDescription(currentPlan.description || "");
    setQuotas(currentPlan.quotas);
    setFeatures(currentPlan.features);
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const pricingValidation = validatePlanPricing(monthlyPrice, yearlyPrice);
    const quotasValidation = validatePlanQuotas(quotas);

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Vui lòng nhập tên gói";
    if (!pricingValidation.isValid) {
      if (pricingValidation.error?.includes("tháng"))
        newErrors.monthlyPrice = pricingValidation.error;
      else
        newErrors.yearlyPrice = pricingValidation.error || "Giá không hợp lệ";
    }
    if (!quotasValidation.isValid) {
      if (quotasValidation.error?.includes("chi nhánh"))
        newErrors.maxBranches = quotasValidation.error;
      else if (quotasValidation.error?.includes("nhân viên"))
        newErrors.maxEmployees = quotasValidation.error;
      else
        newErrors.maxStorageGb = quotasValidation.error || "Quota không hợp lệ";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const idx = mockPlans.findIndex((p) => p.id === currentPlan.id);
    if (idx !== -1) {
      mockPlans[idx] = {
        ...currentPlan,
        name,
        monthlyPrice,
        yearlyPrice,
        status,
        description,
        quotas,
        features,
        updatedAt: new Date().toISOString(),
      };
    }

    setToastMessage(`Đã cập nhật thành công gói cước "${name}"!`);

    setTimeout(() => {
      setIsSubmitting(false);
      navigate(`/admin/subscriptions/${currentPlan.id}`);
    }, 800);
  };

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--bg-soft-blue, #f7faff)",
        padding: "16px 28px 48px",
        boxSizing: "border-box",
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#16a34a",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "9999px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Header Compact */}
      <div style={{ marginBottom: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/admin/subscriptions")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "9999px",
                color: "var(--blue-primary, #0066ff)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "5px 12px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Quay lại danh mục
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
              }}
            >
              Sửa Gói: {currentPlan.name}
            </h1>
            <span
              style={{
                background: "#f1f5f9",
                color: "#475569",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "11.5px",
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontWeight: 700,
              }}
            >
              {currentPlan.code}
            </span>
            <span
              style={{
                background:
                  currentPlan.activeTenantCount > 0 ? "#dbeafe" : "#f1f5f9",
                color:
                  currentPlan.activeTenantCount > 0
                    ? "var(--blue-primary, #0066ff)"
                    : "#64748b",
                padding: "2px 10px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {currentPlan.activeTenantCount} cửa hàng sử dụng
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: "7px 16px",
                borderRadius: "9999px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Khôi phục ban đầu
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: "7px 20px",
                borderRadius: "9999px",
                border: "none",
                background: "var(--blue-primary, #0066ff)",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(0, 102, 255, 0.2)",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              {isSubmitting ? "Đang lưu..." : "💾 Lưu Cập Nhật"}
            </button>
          </div>
        </div>
      </div>

      {/* Grandfathering Protection Compact Banner */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "10px",
          padding: "8px 14px",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "12px",
          color: "#1e40af",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            color: "var(--blue-primary, #0066ff)",
            flexShrink: 0,
          }}
        >
          🛡️ Grandfathering Protection:
        </span>
        <span style={{ lineHeight: 1.35 }}>
          Việc thay đổi giá niêm yết áp dụng cho khách hàng mới hoặc chu kỳ tái
          ký. Các cửa hàng đang trong chu kỳ hợp đồng được giữ nguyên giá ban
          đầu.
        </span>
      </div>

      {/* Main Grid: Left Form Controls (60%) vs Right Live Preview Card (40%) */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(520px, 1.4fr) minmax(360px, 0.95fr)",
            gap: "18px",
            alignItems: "start",
          }}
        >
          {/* CỘT TRÁI: Form Sections + Danger Zone */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <PlanBasicInfoForm
              isEdit={true}
              code={currentPlan.code}
              name={name}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              status={status}
              description={description}
              errors={errors}
              onChange={(fields) => {
                if (fields.name !== undefined) setName(fields.name);
                if (fields.monthlyPrice !== undefined)
                  setMonthlyPrice(fields.monthlyPrice);
                if (fields.yearlyPrice !== undefined)
                  setYearlyPrice(fields.yearlyPrice);
                if (fields.status !== undefined) setStatus(fields.status);
                if (fields.description !== undefined)
                  setDescription(fields.description);
              }}
            />

            <PlanQuotasForm
              quotas={quotas}
              errors={errors}
              onChange={(newQuotas) =>
                setQuotas((prev) => ({ ...prev, ...newQuotas }))
              }
            />

            <PlanFeaturesForm
              features={features}
              onChange={(newFeatures) => setFeatures(newFeatures)}
            />

            {/* Danger Zone: Rule GB-02 */}
            <PlanDangerZone
              plan={currentPlan}
              onDeleted={() => {
                navigate("/admin/subscriptions");
              }}
            />
          </div>

          {/* CỘT PHẢI: Live Preview Bảng Giá Khách Hàng */}
          <div>
            <PlanLivePreviewCard
              code={currentPlan.code}
              name={name}
              monthlyPrice={monthlyPrice}
              yearlyPrice={yearlyPrice}
              status={status}
              description={description}
              quotas={quotas}
              features={features}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionPlanEditPage;
