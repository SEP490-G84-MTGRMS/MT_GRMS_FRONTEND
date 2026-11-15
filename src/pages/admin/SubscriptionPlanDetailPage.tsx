import './adminPlans.css';
import './planProfile.css';
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  PlanStatus,
  PlanQuotaConfig,
  PlanFeatureConfig,
  SubscriptionPlan,
} from "../../features/admin/types/plan.types";
import {
  PlanDangerZone,
} from "../../features/admin/components/subscriptions/forms";
import {
  validatePlanPricing,
  validatePlanQuotas,
} from "../../features/admin/utils/planValidation";
import { planApi, mapBackendPlanToFrontend } from "../../features/admin/api";
import { Loader2, ArrowLeft, Layers, Save, RotateCcw, Building2, SlidersHorizontal, Settings2 } from "lucide-react";
import { PlanTenantsCard } from "../../features/admin/components/subscriptions/details/PlanTenantsCard";

export const SubscriptionPlanDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
    if (!id) {
      setLoadError("Thiếu mã gói dịch vụ.");
      setIsLoading(false);
      return;
    }

    const loadPlan = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setCurrentPlan(null);
        const res = await planApi.getById(id);
        if (res.success && res.data) {
          if (!res.data.quotas || !res.data.features) {
            throw new Error("API chưa trả đủ hạn ngạch và tính năng của gói.");
          }
          const plan = mapBackendPlanToFrontend(res.data);
          setCurrentPlan(plan);
          setName(plan.name);
          setMonthlyPrice(plan.monthlyPrice);
          setYearlyPrice(plan.yearlyPrice);
          setStatus(plan.status);
          setDescription(plan.description || "");
          setQuotas(plan.quotas);
          setFeatures(plan.features);
        } else {
          setLoadError(res.message || "Không tìm thấy gói dịch vụ.");
        }
      } catch (err: unknown) {
        const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setLoadError(errorMsg || (err instanceof Error ? err.message : "Không thể tải thông tin gói cước"));
      } finally {
        setIsLoading(false);
      }
    };

    loadPlan();
  }, [id]);

  if (isLoading) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          background: "var(--bg-soft-blue, #f7faff)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          color: "var(--text-muted)",
        }}
      >
        <Loader2 className="animate-spin" size={32} color="var(--blue-primary, #0066ff)" />
        <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang tải thông tin gói cước...</span>
      </div>
    );
  }

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
            {loadError || `Mã định danh ${id} không tồn tại trên hệ thống.`}
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const pricingValidation = validatePlanPricing(monthlyPrice, yearlyPrice);
    const quotasValidation = validatePlanQuotas(quotas);

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Vui lòng nhập tên thương mại";
    if (!pricingValidation.isValid) {
      if (pricingValidation.error?.includes("tháng"))
        newErrors.monthlyPrice = pricingValidation.error;
      else newErrors.yearlyPrice = pricingValidation.error || "Giá không hợp lệ";
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

    try {
      const res = await planApi.update(currentPlan.id, {
        name: name.trim(),
        monthlyPrice,
        yearlyPrice,
        description,
        quotas,
        features,
      });

      if (res.success && res.data) {
        let savedPlan = mapBackendPlanToFrontend(res.data);
        setCurrentPlan(savedPlan);
        if (savedPlan.status !== status) {
          const statusResponse = await planApi.toggleStatus(savedPlan.id);
          if (!statusResponse.success || statusResponse.data !== true) {
            setStatus(savedPlan.status);
            throw new Error(statusResponse.message || "Thông tin gói đã lưu nhưng chưa đổi được trạng thái mở bán. Vui lòng thử lại.");
          }
          savedPlan = { ...savedPlan, status };
          setCurrentPlan(savedPlan);
        }
        setName(savedPlan.name);
        setMonthlyPrice(savedPlan.monthlyPrice);
        setYearlyPrice(savedPlan.yearlyPrice);
        setDescription(savedPlan.description || "");
        setQuotas(savedPlan.quotas);
        setFeatures(savedPlan.features);
        setToastMessage(`Đã lưu thay đổi gói "${savedPlan.name}".`);
      } else {
        setIsSubmitting(false);
        setToastMessage(res.message || "Không thể cập nhật gói cước");
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToastMessage(errorMsg || (err instanceof Error ? err.message : "Lỗi khi kết nối với máy chủ Backend"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    try {
      const res = await planApi.delete(currentPlan.id);
      if (res.success) {
        setToastMessage("Xóa gói dịch vụ thành công!");
        setTimeout(() => {
          navigate("/admin/subscriptions");
        }, 600);
      } else {
        setToastMessage(res.message || "Không thể xóa gói cước");
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToastMessage(errorMsg || "Lỗi khi xóa gói cước");
    }
  };

  const featureLabels: Record<keyof PlanFeatureConfig, string> = {
    barcodeScanning: "Quét mã vạch bán hàng",
    fefoExpiryAlert: "Cảnh báo hạn sử dụng FEFO",
    multiUnitConversion: "Quy đổi đơn vị tính",
    vietQrDynamic: "Thanh toán VietQR",
    debtZaloBook: "Sổ nợ và nhắc nợ Zalo",
    financialReporting: "Báo cáo tài chính",
  };

  return (
    <div className="admin-plans plan-profile">
      <button type="button" className="plan-profile-back" onClick={() => navigate("/admin/subscriptions")}><ArrowLeft size={16} />Danh sách gói dịch vụ</button>
      <header className="plan-profile-header">
        <div className="plan-profile-heading">
          <span className="plan-profile-icon"><Layers size={25} /></span>
          <div><div className="plan-profile-title"><h1>{currentPlan.name}</h1><span className={`plans-status ${currentPlan.status === "Active" ? "is-active" : ""}`}>{currentPlan.status === "Active" ? "Đang mở bán" : "Tạm ngừng bán"}</span></div><p>{currentPlan.code} · Gói dịch vụ</p></div>
        </div>
        <div className="plan-profile-actions"><button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={isSubmitting}><RotateCcw size={15} />Hoàn tác</button><button type="submit" form="plan-detail-form" className="admin-btn admin-btn-primary" disabled={isSubmitting}><Save size={15} />{isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
      </header>

      {toastMessage && <div className="plan-profile-feedback" role="status">{toastMessage}</div>}

      <div className="plan-profile-metrics">
        <div><span>Giá theo tháng</span><strong>{currentPlan.monthlyPrice.toLocaleString("vi-VN")} <small>đ / tháng</small></strong></div>
        <div><span>Giá theo năm</span><strong>{currentPlan.yearlyPrice.toLocaleString("vi-VN")} <small>đ / năm</small></strong></div>
        <div><span>Khách hàng đang sử dụng</span><strong>{currentPlan.activeTenantCount} <small>cửa hàng</small></strong></div>
        <div><span>Cập nhật gần nhất</span><strong className="plan-profile-date">{currentPlan.updatedAt ? new Date(currentPlan.updatedAt).toLocaleDateString("vi-VN") : "—"}</strong></div>
      </div>

      <form id="plan-detail-form" onSubmit={handleSubmit}>
        <fieldset className="plan-profile-fieldset" disabled={isSubmitting}>
          {Object.keys(errors).length > 0 && <div className="plan-profile-errors" role="alert">{Object.entries(errors).map(([key, message]) => <p key={key}>{message}</p>)}</div>}
          <div className="plan-profile-columns">
            <section className="plan-profile-card">
              <h2><Building2 size={18} />Thông tin & biểu phí</h2>
              <div className="plan-profile-fields">
                <label>Mã gói<input value={currentPlan.code} readOnly /></label>
                <label>Trạng thái mở bán<select value={status} onChange={(event) => setStatus(event.target.value as PlanStatus)}><option value="Active">Đang mở bán</option><option value="Inactive">Tạm ngừng bán</option></select></label>
                <label className="is-full">Tên gói dịch vụ<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} aria-invalid={Boolean(errors.name)} /></label>
                <label>Giá theo tháng (đ)<input type="number" min={0} step="any" value={monthlyPrice} onChange={(event) => setMonthlyPrice(Number(event.target.value))} required aria-invalid={Boolean(errors.monthlyPrice)} /></label>
                <label>Giá theo năm (đ)<input type="number" min={0} step="any" value={yearlyPrice} onChange={(event) => setYearlyPrice(Number(event.target.value))} required aria-invalid={Boolean(errors.yearlyPrice)} /></label>
                <label className="is-full">Mô tả gói<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
              </div>
            </section>
            <section className="plan-profile-card">
              <h2><SlidersHorizontal size={18} />Hạn mức tài nguyên</h2>
              <div className="plan-profile-fields">
                <label>Số chi nhánh<input type="number" min={-1} step={1} required value={quotas.maxBranches} onChange={(event) => setQuotas({ ...quotas, maxBranches: Number(event.target.value) })} aria-invalid={Boolean(errors.maxBranches)} /></label>
                <label>Tài khoản nhân viên<input type="number" min={-1} step={1} required value={quotas.maxEmployees} onChange={(event) => setQuotas({ ...quotas, maxEmployees: Number(event.target.value) })} aria-invalid={Boolean(errors.maxEmployees)} /></label>
                <p className="plan-profile-hint is-full">Nhập -1 cho hạn mức không giới hạn chi nhánh hoặc nhân viên.</p>
                <label>Dung lượng lưu trữ (GB)<input type="number" min={0} step="any" required value={quotas.maxStorageGb} onChange={(event) => setQuotas({ ...quotas, maxStorageGb: Number(event.target.value) })} aria-invalid={Boolean(errors.maxStorageGb)} /></label>
                <label>Chu kỳ sao lưu<select value={quotas.backupFrequency} onChange={(event) => setQuotas({ ...quotas, backupFrequency: event.target.value as PlanQuotaConfig["backupFrequency"] })}><option value="Hourly">Hàng giờ</option><option value="Daily">Hàng ngày</option><option value="Weekly">Hàng tuần</option></select></label>
              </div>
              <dl className="plan-profile-record"><div><dt>Ngày khởi tạo</dt><dd>{new Date(currentPlan.createdAt).toLocaleDateString("vi-VN")}</dd></div><div><dt>Mã định danh</dt><dd>{currentPlan.id}</dd></div></dl>
            </section>
          </div>
          <section className="plan-profile-card plan-profile-features">
            <h2><Settings2 size={18} />Tính năng của gói</h2>
            <div className="plan-profile-feature-grid">
              {(Object.keys(featureLabels) as (keyof PlanFeatureConfig)[]).map((key) => (
                <label className="plan-profile-feature" key={key}><span>{featureLabels[key]}</span><input type="checkbox" role="switch" checked={features[key]} onChange={(event) => setFeatures({ ...features, [key]: event.target.checked })} /><span className="plan-profile-switch" aria-hidden="true" /></label>
              ))}
            </div>
          </section>
        </fieldset>
      </form>
      <div className="plan-profile-tenants"><PlanTenantsCard plan={currentPlan} /></div>
      <div className="plan-profile-management">
        <PlanDangerZone plan={currentPlan} onDeleted={handleDeletePlan} onSwitchToInactive={async () => {
          if (isSubmitting) return;
          setIsSubmitting(true);
          try {
            const response = await planApi.toggleStatus(currentPlan.id);
            if (!response.success) throw new Error(response.message || "Không thể đổi trạng thái gói.");
            const nextStatus = currentPlan.status === "Active" ? "Inactive" : "Active";
            setCurrentPlan({ ...currentPlan, status: nextStatus });
            setStatus(nextStatus);
            setToastMessage("Đã cập nhật trạng thái mở bán.");
          } catch (error) {
            setToastMessage(error instanceof Error ? error.message : "Không thể đổi trạng thái gói.");
          } finally { setIsSubmitting(false); }
        }} />
      </div>
      <footer className="plan-profile-footer"><button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={isSubmitting}>Hoàn tác thay đổi</button><button type="submit" form="plan-detail-form" className="admin-btn admin-btn-primary" disabled={isSubmitting}><Save size={15} />{isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}</button></footer>
    </div>
  );
};

export default SubscriptionPlanDetailPage;
