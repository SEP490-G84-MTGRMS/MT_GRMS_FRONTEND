import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, RefreshCw, ArrowRight } from "lucide-react";
import { KpiCard } from "../../features/admin/components";
import { dashboardApi } from "../../features/admin/api";
import { httpClient } from "../../api/httpClient";
import type { KpiMetric, PlanDistribution, UrgentAlertTenant } from "../../features/admin/types/admin.types";
import "./adminDashboard.css";

interface Overview {
  activeTenants: number; totalBranches: number; newBranches: number;
  averageBranches: number; activePercentage: number; purchaseAmount: number; purchaseCount: number;
  points: { date: string; amount: number }[];
}
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";

export const AdminDashboardPage = () => {
  const [period, setPeriod] = useState("thisMonth");
  const [kpis, setKpis] = useState<KpiMetric[]>([]);
  const [plans, setPlans] = useState<PlanDistribution[]>([]);
  const [alerts, setAlerts] = useState<UrgentAlertTenant[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [updated, setUpdated] = useState<Date | null>(null);
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setErrors([]);
    const results = await Promise.allSettled([
      dashboardApi.getKpis(), dashboardApi.getPlanDistribution(), dashboardApi.getUrgentAlerts(),
      httpClient.get<{ success: boolean; data: Overview }>("/admin/dashboard/overview", { params: { period } }).then(r => r.data),
    ]);
    if (request !== requestRef.current) return;
    const [k, p, a, o] = results;
    setKpis(k.status === "fulfilled" && k.value.success ? k.value.data ?? [] : []);
    setPlans(p.status === "fulfilled" && p.value.success ? p.value.data ?? [] : []);
    setAlerts(a.status === "fulfilled" && a.value.success ? a.value.data ?? [] : []);
    setOverview(o.status === "fulfilled" && o.value.success ? o.value.data : null);
    const names = ["KPI", "cơ cấu gói", "cảnh báo", "mua gói và điểm bán"];
    const failed = results.flatMap((r, i) => r.status === "rejected" || !r.value.success ? [names[i]] : []);
    setErrors(failed);
    setUpdated(failed.length ? null : new Date());
    setLoading(false);
  }, [period]);
  useEffect(() => { void load(); return () => { ++requestRef.current; }; }, [load]);
  const mrr = kpis.find(k => k.id === "mrr");
  const peak = Math.max(1, ...overview?.points.map(p => p.amount) ?? []);
  const alertsFailed = errors.includes("cảnh báo");
  return <div className="admin-dash admin-dashboard-page">
    <header className="admin-dash-header admin-dashboard-hero">
      <div><p className="admin-dash-eyebrow">TỔNG QUAN NỀN TẢNG</p><h1>Tình hình kinh doanh</h1><p className="admin-dash-subtitle">Cửa hàng, gói dịch vụ và doanh thu SaaS</p></div>
      <div className="admin-dash-controls"><label><span>Thời gian</span><select value={period} onChange={e => setPeriod(e.target.value)}><option value="thisMonth">Tháng này</option><option value="lastMonth">Tháng trước</option><option value="thisQuarter">Quý này</option><option value="thisYear">Năm nay</option></select></label>
        <Link className="admin-dash-btn-link" to="/admin/tenants">Quản lý cửa hàng</Link>
        <button className="admin-dash-refresh" onClick={() => void load()} disabled={loading} aria-label="Làm mới dữ liệu"><RefreshCw size={17}/></button>
      </div>
    </header>
    <div className="admin-dash-meta"><CalendarDays size={15}/><span>{updated ? "Cập nhật " + updated.toLocaleString("vi-VN") + " · " : ""}MRR, cơ cấu gói và cảnh báo là hiện tại. Mua gói và điểm bán mới theo kỳ đã chọn.</span></div>
    {errors.length > 0 && <div className="admin-dash-error" role="alert">Không tải được {errors.join(", ")}. Hãy bấm làm mới để thử lại.</div>}
    {loading && <p role="status">Đang tải dữ liệu...</p>}
    {!loading && errors.length === 0 && kpis.length === 0 && <p>Chưa có dữ liệu thống kê.</p>}
    <div className="admin-dash-kpis admin-kpi-grid">{kpis.map(k => <KpiCard key={k.id} metric={k}/>)}</div>
    <div className="admin-dash-primary-grid">
      <section className="admin-dash-card">
        <div className="admin-dash-section-heading"><h2>Lịch sử mua gói SaaS</h2></div>
        <p className="admin-dash-card-caption">Mua gói thành công theo ngày Việt Nam. Không gồm nạp ví hoặc mua thêm.</p>
        {overview ? <>
          <div className="admin-dash-metric"><span>Tổng thanh toán trong kỳ</span><strong>{money(overview.purchaseAmount)} · {overview.purchaseCount} giao dịch</strong></div>
          <div className="admin-purchase-chart" role="group" aria-label="Thanh toán mua gói theo ngày">
            {overview.points.map(p => <div className="admin-purchase-column" key={p.date} title={p.date + ": " + money(p.amount)} aria-label={p.date + ": " + money(p.amount)}><div className="admin-purchase-bar" style={{height: p.amount ? Math.max(2, p.amount / peak * 175) : 0}}/><small>{p.date.slice(8)}/{p.date.slice(5,7)}</small></div>)}
          </div>
          {overview.purchaseCount === 0 && <p className="admin-dash-card-caption">Chưa có giao dịch mua gói thành công trong kỳ.</p>}
        </> : <div className="admin-dash-empty">{loading ? "Đang tải..." : "Không có dữ liệu xác nhận."}</div>}
      </section>
      <section className="admin-dash-card">
        <div className="admin-dash-section-heading"><h2>Cơ cấu gói dịch vụ</h2><Link to="/admin/subscriptions">Quản lý gói <ArrowRight size={15}/></Link></div>
        {plans.map(p => <div className="admin-dash-plan-row" key={p.id}><div className="admin-dash-plan-info"><b>{p.planName}</b><span>{p.tenantCount} khách ({p.percentage}%)</span></div><div className="admin-dash-progress-track"><div className="admin-dash-progress-fill" style={{width: Math.min(100, Math.max(0,p.percentage)) + "%", backgroundColor: "#0f766e"}}/></div></div>)}
        {plans.length === 0 && <p className="admin-dash-card-caption">Chưa có dữ liệu cơ cấu gói.</p>}
        <div className="admin-dash-metric admin-dash-metric-total"><span>MRR ước tính hiện tại</span><strong>{mrr ? mrr.value + " " + mrr.unit : "—"}</strong></div>
        <p className="admin-dash-card-caption">Tính từ giá tháng của gói còn hiệu lực, không phải tiền thực thu. {mrr?.subText}</p>
      </section>
    </div>
    <div className="admin-dash-operations-grid">
      <section className="admin-dash-card"><div className="admin-dash-section-heading"><h2>Sự việc cần can thiệp</h2><Link to="/admin/tenants">Xem toàn bộ <ArrowRight size={15}/></Link></div>
        <p className="admin-dash-card-caption">Danh sách tối đa 10 khách hàng cần chú ý</p>
        <div className="admin-dash-stat-trio">{([ ["expiring", "Sắp hết hạn"], ["grace", "Ân hạn"], ["locked", "Bị khóa"] ] as const).map(([type,label]) => <div key={type}><strong>{alertsFailed ? "—" : alerts.filter(a => a.statusType === type).length}</strong><span>{label} trong danh sách</span></div>)}</div>
        {!alertsFailed && !loading && alerts.length === 0 && <p className="admin-dash-card-caption">Không có sự việc cần can thiệp.</p>}
      </section>
      <section className="admin-dash-card"><div className="admin-dash-section-heading"><h2>Mạng lưới điểm bán</h2></div>
        {[["Chuỗi hoạt động", overview?.activeTenants], ["Điểm bán đang hoạt động", overview?.totalBranches], ["Trung bình điểm bán / khách thuê", overview?.averageBranches], ["Tỷ lệ chuỗi hoạt động (%)", overview?.activePercentage], ["Điểm bán mới trong kỳ", overview?.newBranches]].map(([label,value]) => <div className="admin-dash-metric" key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}
      </section>
      <section className="admin-dash-card"><div className="admin-dash-section-heading"><h2>Giám sát hệ thống</h2></div><p className="admin-dash-card-caption">Chưa có dữ liệu giám sát tác vụ từ máy chủ.</p></section>
    </div>
    <section className="admin-dash-card"><div className="admin-dash-section-heading"><h2>Khách hàng cần chú ý</h2></div>
      <div style={{overflowX:"auto"}}><table className="admin-alert-table"><thead><tr><th>Cửa hàng</th><th>Gói dịch vụ</th><th>Tình trạng</th><th>Thời hạn</th></tr></thead><tbody>{alerts.map(a => <tr key={a.id || a.subdomain}><td><Link to={"/admin/tenants/" + encodeURIComponent(a.id || a.subdomain)}>{a.name}</Link></td><td>{a.planText}</td><td>{a.statusText}</td><td>{a.expiryNotice}</td></tr>)}</tbody></table></div>
      {alerts.length === 0 && <p className="admin-dash-card-caption">{alertsFailed ? "Không tải được cảnh báo." : "Không có khách hàng cần chú ý."}</p>}
    </section>
  </div>;
};
