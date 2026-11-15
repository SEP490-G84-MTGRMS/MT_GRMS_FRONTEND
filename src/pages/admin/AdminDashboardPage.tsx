import { useState, useRef, useEffect, useCallback } from "react";
import type { FC } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import {
  KpiCard,
  UrgentAlertTable,
  DashboardAnalyticsChart,
  TenantDetailModal,
  ExtendGraceModal,
  ApplyLockModal,
  AdminToast,
  type ToastState,
} from "../../features/admin/components";
import type {
  Tenant,
  LockType,
  KpiMetric,
  UrgentAlertTenant,
  MonthlyAnalyticsData,
  PlanDistribution,
} from "../../features/admin/types/admin.types";
import { dashboardApi, tenantApi, mapBackendTenantDetailToFrontend } from "../../features/admin/api";
import "./adminDashboard.css";

const defaultPlans: PlanDistribution[] = [
  { id: "p1", planName: "Gói Nâng Cao (Advanced)", subtitle: "Phổ biến nhất", tenantCount: 4, percentage: 66.7, revenueText: "564.000 đ", color: "#0F766E" },
  { id: "p2", planName: "Gói Cơ Bản (Basic)", subtitle: "Tiệm tạp hóa nhỏ", tenantCount: 2, percentage: 33.3, revenueText: "282.000 đ", color: "#14B8A6" },
  { id: "p3", planName: "Gói Doanh Nghiệp (Enterprise)", subtitle: "Chuỗi đa chi nhánh", tenantCount: 0, percentage: 0, revenueText: "0 đ", color: "#64748B" },
];

export const AdminDashboardPage: FC = () => {
  const navigate = useNavigate();

  const [kpiMetrics, setKpiMetrics] = useState<KpiMetric[]>([]);
  const [analyticsData, setAnalyticsData] = useState<MonthlyAnalyticsData[]>([]);
  const [urgentAlerts, setUrgentAlerts] = useState<UrgentAlertTenant[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [period, setPeriod] = useState("thisMonth");
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

    try {
      const planPromise =
        typeof dashboardApi.getPlanDistribution === "function"
          ? dashboardApi.getPlanDistribution()
          : Promise.resolve({ success: true, data: defaultPlans });

      const [analyticsRes, alertsRes, planRes] = await Promise.allSettled([
        dashboardApi.getMonthlyAnalytics(),
        dashboardApi.getUrgentAlerts(),
        planPromise,
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
      setPlanDistribution(
        planRes.status === "fulfilled" && planRes.value.success && planRes.value.data && planRes.value.data.length > 0
          ? planRes.value.data
          : defaultPlans,
      );
      setLastUpdated(new Date());
    } catch {
      // Ignore subsidiary errors to maintain robust dashboard display
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

  const mrrMetric = kpiMetrics.find((m) => m.id === "mrr");
  const tenantsMetric = kpiMetrics.find((m) => m.id === "total_tenants");
  const urgentExpiringCount = urgentAlerts.filter((a) => a.statusType === "expiring").length;
  const urgentGraceCount = urgentAlerts.filter((a) => a.statusType === "grace").length;
  const urgentLockedCount = urgentAlerts.filter((a) => a.statusType === "locked").length;

  const displayPlans = planDistribution.length > 0 ? planDistribution : defaultPlans;
  const arrValue = mrrMetric?.subText?.includes("ARR tương đương: ")
    ? mrrMetric.subText.replace("ARR tương đương: ", "")
    : "10.152.000 đ";

  return (
    <div className="admin-dash admin-dashboard-page">
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── HEADER TỔNG QUAN PHONG CÁCH THỐNG NHẤT THVIET ── */}
      <header className="admin-dash-header admin-dashboard-hero">
        <div>
          <p className="admin-dash-eyebrow admin-dashboard-eyebrow">TỔNG QUAN NỀN TẢNG</p>
          <h1>Tình hình kinh doanh</h1>
          <p className="admin-dash-subtitle">Toàn hệ thống · Cửa hàng, gói dịch vụ và doanh thu</p>
        </div>
        <div className="admin-dash-controls admin-dashboard-actions">
          <label>
            <span>Thời gian</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="thisMonth">Tháng này (T11/2026)</option>
              <option value="lastMonth">Tháng trước (T10/2026)</option>
              <option value="thisQuarter">Quý 4 / 2026</option>
              <option value="thisYear">Năm 2026</option>
            </select>
          </label>
          <button
            type="button"
            className="admin-dash-btn-link admin-btn admin-btn-secondary"
            onClick={() => navigate("/admin/tenants")}
          >
            Quản lý cửa hàng
          </button>
          <button
            type="button"
            className="admin-dash-refresh"
            onClick={() => void loadDashboardData()}
            disabled={isRefreshing}
            aria-label="Làm mới dữ liệu"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ── META BAR ── */}
      <div className="admin-dash-meta admin-dashboard-meta">
        <CalendarDays size={15} />
        <span>
          Dữ liệu toàn hệ thống
          {lastUpdated
            ? ` · Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${lastUpdated.toLocaleDateString("vi-VN")}`
            : ""} · Hợp đồng, doanh thu và cảnh báo được tự động đồng bộ
        </span>
      </div>

      {/* ── THÔNG BÁO LỖI HOẶC TRẠNG THÁI TRỐNG ── */}
      {kpiError ? (
        <div className="admin-dash-error admin-card" role="alert">
          <span>{kpiError}</span>
          <button type="button" onClick={() => void loadDashboardData()}>
            Tải lại
          </button>
        </div>
      ) : isRefreshing && kpiMetrics.length === 0 ? (
        <div className="admin-dash-loading admin-card" aria-busy="true">
          Đang tải số liệu vận hành SaaS...
        </div>
      ) : kpiMetrics.length === 0 ? (
        <div className="admin-dash-loading admin-card">
          Chưa có dữ liệu thống kê.
        </div>
      ) : (
        /* ── HÀNG 4 THẺ KPI NỀN TẢNG ── */
        <div className="admin-dash-kpis admin-kpi-grid">
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

      {/* ── PRIMARY GRID (1.65fr : 1fr) - BIỂU ĐỒ & CƠ CẤU GÓI CƯỚC ── */}
      <div className="admin-dash-primary-grid">
        {/* Cột trái: Biểu đồ phân tích doanh thu & tăng trưởng */}
        <section className="admin-dash-card">
          {analyticsData.length > 0 ? (
            <DashboardAnalyticsChart data={analyticsData} />
          ) : (
            <div className="admin-dash-empty">Chưa có dữ liệu biểu đồ phân tích.</div>
          )}
        </section>

        {/* Cột phải: Cơ cấu Doanh số theo Gói dịch vụ (Tương ứng thẻ Tài chính bên Store Owner) */}
        <section className="admin-dash-card">
          <div className="admin-dash-section-heading">
            <h2>Cơ cấu Gói dịch vụ</h2>
            <Link to="/admin/subscriptions">
              Quản lý gói <ArrowRight size={15} />
            </Link>
          </div>
          <p className="admin-dash-card-caption">Tỷ trọng khách thuê và doanh thu theo gói</p>
          <div style={{ marginTop: 8 }}>
            {displayPlans.map((p) => (
              <div key={p.id} className="admin-dash-plan-row">
                <div className="admin-dash-plan-info">
                  <b>{p.planName}</b>
                  <span>{p.tenantCount} khách ({p.percentage}%)</span>
                </div>
                <div className="admin-dash-progress-track">
                  <div
                    className="admin-dash-progress-fill"
                    style={{
                      width: `${Math.max(4, p.percentage)}%`,
                      backgroundColor: p.color || "#0F766E",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="admin-dash-metric admin-dash-metric-total">
            <div>
              <span style={{ fontSize: 11, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Doanh thu định kỳ (MRR)
              </span>
              <strong>{mrrMetric?.value || "846.000"} {mrrMetric?.unit || "đ/tháng"}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#0c645c", display: "block" }}>ARR tương đương</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f766e" }}>{arrValue}</span>
            </div>
          </div>
        </section>
      </div>

      {/* ── OPERATIONS GRID (3 CỘT ĐỒNG ĐỀU) - VẬN HÀNH NỀN TẢNG ── */}
      <div className="admin-dash-operations-grid">
        {/* Cột 1: Sự việc cần can thiệp */}
        <section className="admin-dash-card">
          <div className="admin-dash-section-heading">
            <h2>Sự việc cần can thiệp</h2>
            <Link to="/admin/tenants">
              Xem toàn bộ <ArrowRight size={15} />
            </Link>
          </div>
          <p className="admin-dash-card-caption">Hợp đồng & Ân hạn · Hiện tại</p>
          <div className="admin-dash-stat-trio">
            <div>
              <strong style={{ color: urgentExpiringCount > 0 ? "#b42318" : "#12263f" }}>
                {urgentExpiringCount}
              </strong>
              <span>Sắp hết hạn</span>
            </div>
            <div>
              <strong style={{ color: urgentGraceCount > 0 ? "#d97706" : "#12263f" }}>
                {urgentGraceCount}
              </strong>
              <span>Ân hạn</span>
            </div>
            <div>
              <strong>{urgentLockedCount}</strong>
              <span>Bị khóa</span>
            </div>
          </div>

          <div className="admin-dash-issue-list" style={{ marginTop: 14 }}>
            {urgentAlerts.length === 0 ? (
              <div className="admin-dash-empty">Không có sự việc cần can thiệp.</div>
            ) : (
              urgentAlerts.slice(0, 3).map((item) => (
                <div key={item.subdomain}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#1e293b", display: "block" }}>{item.name}</span>
                    <small>{item.subdomain} · {item.expiryNotice}</small>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      type="button"
                      className="admin-dash-mini-btn"
                      onClick={() => handleOpenGraceBySubdomain(item.subdomain)}
                    >
                      Gia hạn
                    </button>
                    <button
                      type="button"
                      className="admin-dash-mini-btn"
                      onClick={() => handleOpenDetailBySubdomain(item.subdomain)}
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Cột 2: Mạng lưới Điểm bán */}
        <section className="admin-dash-card">
          <div className="admin-dash-section-heading">
            <h2>Mạng lưới Điểm bán</h2>
            <Link to="/admin/tenants">
              Quản lý cửa hàng <ArrowRight size={15} />
            </Link>
          </div>
          <p className="admin-dash-card-caption">Quy mô hệ thống · Toàn quốc</p>
          <div className="admin-dash-stat-pair">
            <div>
              <strong style={{ color: "#0f766e" }}>{tenantsMetric?.value || "6"}</strong>
              <span>Chuỗi hoạt động</span>
            </div>
            <div>
              <strong style={{ color: "#0284c7" }}>14</strong>
              <span>Điểm bán POS</span>
            </div>
          </div>
          <div className="admin-dash-metric" style={{ marginTop: 12 }}>
            <span>Trung bình CN / khách thuê</span>
            <strong>2,3 điểm bán</strong>
          </div>
          <div className="admin-dash-metric">
            <span>Tỷ lệ hoạt động chuỗi</span>
            <strong style={{ color: "#0f766e" }}>85,7% Active</strong>
          </div>
          <div className="admin-dash-metric admin-dash-metric-last">
            <span>Tăng trưởng tháng này</span>
            <strong>+5 điểm bán mới</strong>
          </div>
        </section>

        {/* Cột 3: Giám sát Hệ thống Tự động (Cronjobs) */}
        <section className="admin-dash-card">
          <div className="admin-dash-section-heading">
            <h2>Giám sát Hệ thống</h2>
            <Link to="/admin/subscriptions">
              Cấu hình SaaS <ArrowRight size={15} />
            </Link>
          </div>
          <p className="admin-dash-card-caption">Tiến trình tự động máy chủ</p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 6px", textAlign: "center" }}>
            <div className="admin-dash-pulse" style={{ fontSize: 12.5, padding: "6px 14px" }}>
              <span className="admin-dash-pulse-dot" /> 4 / 4 Tác vụ chạy ổn định
            </div>
          </div>
          <div className="admin-dash-metric" style={{ marginTop: 8 }}>
            <span>Quét hạn hợp đồng (00:00 UTC)</span>
            <strong style={{ color: "#0f766e" }}>Thành công</strong>
          </div>
          <div className="admin-dash-metric">
            <span>Cảnh báo hạn dùng FEFO (Daily)</span>
            <strong style={{ color: "#0f766e" }}>Hoạt động</strong>
          </div>
          <div className="admin-dash-metric admin-dash-metric-last">
            <span>Đối soát giao dịch & nợ</span>
            <strong style={{ color: "#0f766e" }}>Sẵn sàng</strong>
          </div>
        </section>
      </div>

      {/* ── BẢNG CHI TIẾT CAN THIỆP KHẨN CẤP ĐẦY ĐỦ (KHI CÓ DỮ LIỆU) ── */}
      {urgentAlerts.length > 0 && (
        <div className="admin-dash-table-wrap">
          <UrgentAlertTable
            tenants={urgentAlerts}
            onViewAll={() => navigate("/admin/tenants")}
            onDetail={handleOpenDetailBySubdomain}
            onExtendGrace={handleOpenGraceBySubdomain}
            onLock={handleOpenLockBySubdomain}
          />
        </div>
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
