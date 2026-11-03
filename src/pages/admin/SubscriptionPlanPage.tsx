import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type {
  SubscriptionPlan,
  PlanStatus,
} from "../../features/admin/types/plan.types";
import {
  planApi,
  mapBackendPlanToFrontend,
  type CreatePlanPayload,
  type UpdatePlanPayload,
} from "../../features/admin/api";
import {
  PlanKPIBanner,
  PlanFilterToolbar,
  PlanDataTable,
  CreatePlanModal,
  UpdatePlanModal,
} from "../../features/admin/components/subscriptions";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const SubscriptionPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<SubscriptionPlan | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "info";
    message: string;
  } | null>(null);

  const showToast = (
    message: string,
    type: "success" | "warning" | "info" = "success",
  ) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch plans from API
  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await planApi.getPlans();
      if (res.success && res.data) {
        setPlans(res.data.map(mapBackendPlanToFrontend));
      } else {
        showToast(res.message || "Không thể tải danh sách gói cước", "warning");
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || "Lỗi khi kết nối với máy chủ Backend", "warning");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (statusFilter !== "all" && plan.status !== statusFilter) {
        return false;
      }
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchName = plan.name.toLowerCase().includes(kw);
        const matchCode = plan.code.toLowerCase().includes(kw);
        const matchDesc = plan.description.toLowerCase().includes(kw);
        if (!matchName && !matchCode && !matchDesc) {
          return false;
        }
      }
      return true;
    });
  }, [plans, statusFilter, keyword]);

  // Handlers
  const handleToggleStatus = async (targetPlan: SubscriptionPlan) => {
    try {
      const res = await planApi.toggleStatus(targetPlan.id);
      if (res.success) {
        const nextStatus: PlanStatus = targetPlan.status === "Active" ? "Inactive" : "Active";
        setPlans((prev) =>
          prev.map((p) =>
            p.id === targetPlan.id
              ? {
                  ...p,
                  status: nextStatus,
                  updatedAt: new Date().toISOString().split("T")[0],
                }
              : p
          )
        );
        showToast(
          `Đã chuyển trạng thái gói "${targetPlan.name}" sang: ${
            nextStatus === "Active" ? "Đang hoạt động" : "Tạm dừng"
          }`
        );
      } else {
        showToast(res.message || "Không thể đổi trạng thái gói cước", "warning");
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || "Lỗi khi cập nhật trạng thái gói cước", "warning");
    }
  };

  const handleCreatePlan = async (
    newPlanData: Omit<
      SubscriptionPlan,
      "id" | "createdAt" | "updatedAt" | "activeTenantCount"
    >,
  ) => {
    try {
      const payload: CreatePlanPayload = {
        code: newPlanData.code,
        name: newPlanData.name,
        description: newPlanData.description,
        monthlyPrice: newPlanData.monthlyPrice,
        yearlyPrice: newPlanData.yearlyPrice,
        quotas: newPlanData.quotas,
        features: newPlanData.features,
      };

      const res = await planApi.create(payload);
      if (res.success && res.data) {
        const created = mapBackendPlanToFrontend(res.data);
        setPlans((prev) => [created, ...prev]);
        setIsCreateOpen(false);
        showToast(`Đã khởi tạo gói dịch vụ mới: "${created.name}" (${created.code}) thành công!`);
      } else {
        showToast(res.message || "Không thể tạo gói cước", "warning");
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || "Lỗi khi tạo mới gói cước", "warning");
    }
  };

  const handleUpdatePlan = async (updatedPlan: SubscriptionPlan) => {
    try {
      const payload: UpdatePlanPayload = {
        name: updatedPlan.name,
        description: updatedPlan.description,
        monthlyPrice: updatedPlan.monthlyPrice,
        yearlyPrice: updatedPlan.yearlyPrice,
        quotas: updatedPlan.quotas,
        features: updatedPlan.features,
      };

      const res = await planApi.update(updatedPlan.id, payload);
      if (res.success && res.data) {
        const mapped = mapBackendPlanToFrontend(res.data);
        setPlans((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)));
        setUpdateTarget(null);
        showToast(`Đã cập nhật cấu hình gói dịch vụ "${mapped.name}" thành công!`);
      } else {
        showToast(res.message || "Không thể cập nhật gói cước", "warning");
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errorMsg || "Lỗi khi cập nhật gói cước", "warning");
    }
  };

  const handleExportExcel = () => {
    const headers = [
      "Mã Gói",
      "Tên Gói",
      "Trạng Thái",
      "Giá Tháng (VNĐ)",
      "Giá Năm (VNĐ)",
      "Số KH Đang Dùng",
      "Max Chi Nhánh",
      "Max Nhân Viên",
      "Dung Lượng (GB)",
    ];
    const rows = filteredPlans.map((p) => [
      p.code,
      `"${p.name}"`,
      p.status,
      p.monthlyPrice,
      p.yearlyPrice,
      p.activeTenantCount,
      p.quotas.maxBranches === -1 ? "Unlimited" : p.quotas.maxBranches,
      p.quotas.maxEmployees === -1 ? "Unlimited" : p.quotas.maxEmployees,
      p.quotas.maxStorageGb,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `MT_GRMS_Subscription_Plans_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      `Đã xuất báo cáo ${filteredPlans.length} gói dịch vụ ra tệp CSV/Excel thành công!`,
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            backgroundColor:
              toast.type === "success"
                ? "#065f46"
                : toast.type === "warning"
                  ? "#92400e"
                  : "#1e3a8a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 8,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            fontWeight: 500,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HEADER & BREADCRUMB */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--text-muted)",
            marginBottom: 4,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <span>Quản trị hệ thống</span>
          <span>/</span>
          <span style={{ color: "var(--blue-primary)", fontWeight: 600 }}>
            Gói dịch vụ & Biểu phí SaaS
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Quản Lý Gói Dịch Vụ SaaS
            </h1>
            <p
              style={{
                fontSize: 13.5,
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Thiết lập biểu phí, định ngạch tài nguyên (Quotas) và các tính
              năng mở khóa theo từng phân khúc khách hàng
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <PlanKPIBanner plans={plans} />

      {/* FILTER TOOLBAR */}
      <PlanFilterToolbar
        keyword={keyword}
        onKeywordChange={setKeyword}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenCreate={() => navigate("/admin/subscriptions/create")}
        onExportExcel={handleExportExcel}
        visibleCount={filteredPlans.length}
        totalCount={plans.length}
      />

      {/* DATA TABLE / LOADING */}
      {isLoading ? (
        <div
          style={{
            background: "#ffffff",
            padding: "40px",
            borderRadius: "12px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            color: "var(--text-muted)",
            border: "1px solid var(--border-color, #e2e8f0)",
          }}
        >
          <Loader2 className="animate-spin" size={32} color="var(--blue-primary, #0066ff)" />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Đang nạp dữ liệu gói cước từ máy chủ...</span>
        </div>
      ) : (
        <PlanDataTable
          plans={filteredPlans}
          onDetail={(plan) => navigate(`/admin/subscriptions/${plan.id}`)}
          onEdit={(plan) => navigate(`/admin/subscriptions/${plan.id}/edit`)}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* MODALS */}
      <CreatePlanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreatePlan}
        existingCodes={plans.map((p) => p.code)}
      />

      <UpdatePlanModal
        plan={updateTarget}
        isOpen={Boolean(updateTarget)}
        onClose={() => setUpdateTarget(null)}
        onSave={handleUpdatePlan}
      />
    </div>
  );
};
