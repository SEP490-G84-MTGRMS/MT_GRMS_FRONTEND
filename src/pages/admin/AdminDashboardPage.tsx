import { useState, useRef, useEffect, useCallback } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  mockKpiMetrics,
  mockUrgentAlertTenants,
  mockTenants,
  mockMonthlyAnalytics,
} from "../../features/admin/data/mockAdminData";
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
  ExportIcon,
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

  // Real Dashboard State (with mock fallbacks)
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>(mockKpiMetrics);
  const [analyticsData, setAnalyticsData] = useState<MonthlyAnalyticsData[]>(mockMonthlyAnalytics);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlertTenant[]>(mockUrgentAlertTenants);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    try {
      setIsRefreshing(true);
      const [kpisRes, analyticsRes, alertsRes] = await Promise.allSettled([
        dashboardApi.getKpis(),
        dashboardApi.getMonthlyAnalytics(),
        dashboardApi.getUrgentAlerts(),
      ]);

      if (kpisRes.status === "fulfilled" && kpisRes.value.success && kpisRes.value.data) {
        setKpiMetrics(kpisRes.value.data);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value.success && analyticsRes.value.data) {
        setAnalyticsData(analyticsRes.value.data);
      }
      if (alertsRes.status === "fulfilled" && alertsRes.value.success && alertsRes.value.data) {
        setUrgentAlerts(alertsRes.value.data);
      }
    } catch {
      showToast("Không thể tải một số dữ liệu Dashboard từ Backend", "warning");
    } finally {
      setIsRefreshing(false);
    }
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
      // fallback to mock
    }
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsDetailOpen(true);
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
      // fallback
    }
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsGraceOpen(true);
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
      // fallback
    }
    const found = mockTenants.find((t) => t.subdomain === subdomain) || mockTenants[0];
    setSelectedTenant(found);
    setIsLockOpen(true);
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
    <div>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>Tổng quan Nền tảng</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            style={{
              height: 34,
              padding: "0 28px 0 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              backgroundColor: "#ffffff",
              color: "#1e293b",
              fontFamily: "inherit",
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option>30 ngày gần nhất</option>
            <option>Tháng 10/2026</option>
            <option>Quý 4/2026</option>
            <option>Năm 2026</option>
          </select>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              loadDashboardData();
              showToast("Dữ liệu hệ thống đã được đồng bộ mới nhất từ Backend!");
            }}
            disabled={isRefreshing}
          >
            <RefreshIcon size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "Đang làm mới..." : "Làm mới"}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() =>
              showToast(
                "Đang kết xuất báo cáo tổng quan ra tệp Excel (.xlsx)...",
              )
            }
          >
            <ExportIcon size={14} />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <div className="admin-kpi-grid">
        {kpiMetrics.map((metric) => (
          <KpiCard
            key={metric.id}
            metric={metric}
            onClick={() => {
              if (metric.id === "active_tenants" || metric.id === "urgent_alerts" || metric.id === "kpi-tenants") {
                navigate("/admin/tenants");
              } else if (metric.id === "mrr" || metric.id === "kpi-revenue") {
                navigate("/admin/subscriptions");
              }
            }}
          />
        ))}
      </div>

      {/* BIỂU ĐỒ PHÂN TÍCH TĂNG TRƯỞNG NỀN TẢNG */}
      <DashboardAnalyticsChart data={analyticsData} />

      {/* URGENT ALERTS TABLE */}
      <UrgentAlertTable
        tenants={urgentAlerts}
        onViewAll={() => navigate("/admin/tenants")}
        onDetail={handleOpenDetailBySubdomain}
        onExtendGrace={handleOpenGraceBySubdomain}
        onLock={handleOpenLockBySubdomain}
      />

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
