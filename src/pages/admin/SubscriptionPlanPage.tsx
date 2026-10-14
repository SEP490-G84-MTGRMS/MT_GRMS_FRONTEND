import React, { useState, useMemo } from "react";
import type {
  SubscriptionPlan,
  PlanStatus,
} from "../../features/admin/types/plan.types";
import { mockSubscriptionPlans } from "../../features/admin/data/mockPlanData";
import {
  PlanKPIBanner,
  PlanFilterToolbar,
  PlanDataTable,
  CreatePlanModal,
  UpdatePlanModal,
  PlanDetailModal,
} from "../../features/admin/components/subscriptions";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const SubscriptionPlanPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(mockSubscriptionPlans);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PlanStatus>("all");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<SubscriptionPlan | null>(
    null,
  );
  const [detailTarget, setDetailTarget] = useState<SubscriptionPlan | null>(
    null,
  );

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
  const handleToggleStatus = (targetPlan: SubscriptionPlan) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === targetPlan.id) {
          const nextStatus = p.status === "Active" ? "Inactive" : "Active";
          showToast(
            `Đã chuyển trạng thái gói "${p.name}" sang: ${nextStatus === "Active" ? "Đang hoạt động" : "Tạm dừng"}`,
          );
          return {
            ...p,
            status: nextStatus,
            updatedAt: new Date().toISOString().split("T")[0],
          };
        }
        return p;
      }),
    );
  };

  const handleCreatePlan = (
    newPlanData: Omit<
      SubscriptionPlan,
      "id" | "createdAt" | "updatedAt" | "activeTenantCount"
    >,
  ) => {
    const newPlan: SubscriptionPlan = {
      ...newPlanData,
      id: `plan-${Date.now()}`,
      activeTenantCount: 0,
      tenants: [],
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    setPlans((prev) => [newPlan, ...prev]);
    showToast(
      `Đã khởi tạo gói dịch vụ mới: "${newPlan.name}" (${newPlan.code}) thành công!`,
    );
  };

  const handleUpdatePlan = (updatedPlan: SubscriptionPlan) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)),
    );
    if (detailTarget?.id === updatedPlan.id) {
      setDetailTarget(updatedPlan);
    }
    showToast(
      `Đã cập nhật cấu hình gói dịch vụ "${updatedPlan.name}" thành công!`,
    );
  };

  const handleExportExcel = () => {
    // Generate CSV content
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
        onOpenCreate={() => setIsCreateOpen(true)}
        onExportExcel={handleExportExcel}
        visibleCount={filteredPlans.length}
        totalCount={plans.length}
      />

      {/* DATA TABLE */}
      <PlanDataTable
        plans={filteredPlans}
        onDetail={(plan) => setDetailTarget(plan)}
        onEdit={(plan) => setUpdateTarget(plan)}
        onToggleStatus={handleToggleStatus}
      />

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

      <PlanDetailModal
        plan={detailTarget}
        isOpen={Boolean(detailTarget)}
        onClose={() => setDetailTarget(null)}
        onEditPlan={(plan) => setUpdateTarget(plan)}
      />
    </div>
  );
};
