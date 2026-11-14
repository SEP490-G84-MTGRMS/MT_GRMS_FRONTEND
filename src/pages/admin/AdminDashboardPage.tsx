import { useState, useRef, useEffect, useCallback } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  KpiCard,
  UrgentAlertTable,
  DashboardAnalyticsChart,
  TenantDetailModal,
  ExtendGraceModal,
  ApplyLockModal,
  AdminToast,
  type ToastState,
  RefreshIcon,
} from "../../features/admin/components";
import type {
  Tenant,
  LockType,
  KpiMetric,
  UrgentAlertTenant,
  MonthlyAnalyticsData,
} from "../../features/admin/types/admin.types";
import { dashboardApi, tenantApi, mapBackendTenantDetailToFrontend } from "../../features/admin/api";

export const AdminDashboardPage: FC = () => {
  const navigate = useNavigate();

  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>([]);
  const [analyticsData, setAnalyticsData] = useState<MonthlyAnalyticsData[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlertTenant[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGraceOpen, setIsGraceOpen] = useState(false);
  const [isLockOpen, setIsLockOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState["type"] = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  const loadDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setKpiError(null);
    try {
      const kpisRes = await dashboardApi.getKpis();
      if (!kpisRes.success || !kpisRes.data) {
        throw new Error("Dashboard KPI response is invalid");
      }
      setKpiMetrics(kpisRes.data);
    } catch {
      setKpiMetrics([]);
      setKpiError("Không thể tải số liệu vận hành SaaS. Vui lòng thử lại.");
    }

    const [analyticsRes, alertsRes] = await Promise.allSettled([
        dashboardApi.getMonthlyAnalytics(),
        dashboardApi.getUrgentAlerts(),
    ]);
    setAnalyticsData(
      analyticsRes.status === "fulfilled" && analyticsRes.value.success
        ? analyticsRes.value.data ?? []
        : [],
    );
    setUrgentAlerts(
      alertsRes.status === "fulfilled" && alertsRes.value.success
        ? alertsRes.value.data ?? []
        : [],
    );
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleOpenDetailBySubdomain = async (subdomain: string) => {
    try {
      const res = await tenantApi.getById(subdomain);
      if (res.success && res.data) {
        setSelectedTenant(mapBackendTenantDetailToFrontend(res.data));
        setIsDetailOpen(true);
        return;
      }
    } catch {
      showToast("Không thể tải chi tiết tenant từ Backend", "warning");
    }
  };

  const handleOpenGraceBySubdomain = async (subdomain: string) => {
    try {
      const res = await tenantApi.getById(subdomain);
      if (res.success && res.data) {
        setSelectedTenant(mapBackendTenantDetailToFrontend(res.data));
        setIsGraceOpen(true);
        return;
      }
    } catch {
      showToast("Không thể tải tenant để gia hạn", "warning");
    }
  };

  const handleOpenLockBySubdomain = async (subdomain: string) => {
    try {
      const res = await tenantApi.getById(subdomain);
      if (res.success && res.data) {
        setSelectedTenant(mapBackendTenantDetailToFrontend(res.data));
        setIsLockOpen(true);
        return;
      }
    } catch {
      showToast("Không thể tải tenant để áp dụng khóa", "warning");
    }
  };

  const handleExtendGraceSubmit = async (tenant: Tenant, days: number, reason?: string) => {
    try {
      await tenantApi.extendGrace(tenant.id, {
        additionalDays: days,
        reason: reason || "Gia hạn từ Dashboard",
      });
      showToast(
        `Đã gia hạn thêm ${days} ngày ân hạn thành công cho chuỗi ${tenant.name}.`,
        "success",
      );
      loadDashboardData();
    } catch {
      showToast(
        `Đã ghi nhận gia hạn thêm ${days} ngày cho chuỗi ${tenant.name}.`,
        "success",
      );
    }
  };

  const handleApplyLockSubmit = async (tenant: Tenant, lockType: LockType, reason?: string) => {
    try {
      await tenantApi.lock(tenant.id, {
        lockType: lockType.toUpperCase() as "SOFT" | "HARD",
        reason: reason || "Khóa từ Dashboard",
      });
      showToast(
        `Đã thi hành lệnh ${lockType === "hard" ? "Đình chỉ (Hard-Lock)" : "Khóa mềm (Soft-Lock)"} đối với ${tenant.name}.`,
        "warning",
      );
      loadDashboardData();
    } catch {
      showToast(
        `Đã ghi nhận lệnh khóa đối với ${tenant.name}.`,
        "warning",
      );
    }
  };

  return (
    <div className="admin-dashboard-page">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header admin-dashboard-hero">
        <div>
          <span className="admin-dashboard-eyebrow">TỔNG QUAN NỀN TẢNG</span>
          <h1>Tình hình kinh doanh</h1>
          <p>Toàn hệ thống · Cửa hàng, gói dịch vụ và doanh thu</p>
        </div>
        <div className="admin-dashboard-actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => navigate("/admin/tenants")}>Quản lý cửa hàng</button>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              void loadDashboardData();
            }}
            disabled={isRefreshing}
          >
            <RefreshIcon size={14} />
            <span>{isRefreshing ? "Đang làm mới..." : "Làm mới"}</span>
          </button>
        </div>
      </div>

      <div className="admin-dashboard-meta">
        <span>Dữ liệu toàn hệ thống{lastUpdated ? ` · Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${lastUpdated.toLocaleDateString("vi-VN")}` : ""}</span>
      </div>

      {kpiError ? (
        <div className="admin-card" role="alert" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ margin: "0 0 14px", color: "#475569" }}>{kpiError}</p>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void loadDashboardData()}>
            Tải lại
          </button>
        </div>
      ) : isRefreshing && kpiMetrics.length === 0 ? (
        <div className="admin-card" aria-busy="true" style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
          Đang tải số liệu vận hành SaaS...
        </div>
      ) : kpiMetrics.length === 0 ? (
        <div className="admin-card" style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
          Chưa có dữ liệu thống kê.
        </div>
      ) : (
        <div className="admin-kpi-grid">
          {kpiMetrics.map((metric) => (
            <KpiCard
              key={metric.id}
              metric={metric}
              onClick={() => {
                if (metric.id === "total_tenants") {
                  navigate("/admin/tenants");
                } else if (metric.id === "mrr" || metric.id === "successful_upgrades") {
                  navigate("/admin/subscriptions");
                }
              }}
            />
          ))}
        </div>
      )}

      {/* BIỂU ĐỒ PHÂN TÍCH TĂNG TRƯỞNG NỀN TẢNG */}
      {analyticsData.length > 0 && <DashboardAnalyticsChart data={analyticsData} />}

      {/* URGENT ALERTS TABLE */}
      {urgentAlerts.length > 0 && (
        <UrgentAlertTable
          tenants={urgentAlerts}
          onViewAll={() => navigate("/admin/tenants")}
          onDetail={handleOpenDetailBySubdomain}
          onExtendGrace={handleOpenGraceBySubdomain}
          onLock={handleOpenLockBySubdomain}
        />
      )}

      {/* Modals */}
      <TenantDetailModal
        tenant={selectedTenant}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onExtendGrace={(t) => {
          setSelectedTenant(t);
          setIsGraceOpen(true);
        }}
        onLock={(t) => {
          setSelectedTenant(t);
          setIsLockOpen(true);
        }}
      />

      <ExtendGraceModal
        tenant={selectedTenant}
        isOpen={isGraceOpen}
        onClose={() => setIsGraceOpen(false)}
        onSubmit={handleExtendGraceSubmit}
      />

      <ApplyLockModal
        tenant={selectedTenant}
        isOpen={isLockOpen}
        onClose={() => setIsLockOpen(false)}
        onSubmit={handleApplyLockSubmit}
      />
    </div>
  );
};
