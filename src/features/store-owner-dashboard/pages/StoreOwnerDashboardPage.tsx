import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, CalendarDays, ChartNoAxesCombined, ClipboardList, RefreshCw, ShoppingCart, Store, Users } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { getStoreOwnerDashboard, type DashboardBranch, type DashboardPeriod, type StoreOwnerDashboardData } from '../api/dashboardApi';
import './storeOwnerDashboard.css';

const periods: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Hôm nay' }, { value: 'yesterday', label: 'Hôm qua' },
  { value: 'last7days', label: '7 ngày qua' }, { value: 'thisMonth', label: 'Tháng này' },
];
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat('vi-VN').format(value);
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).format(new Date(value));
const hourLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));

function SectionTitle({ title, to, action = 'Xem chi tiết' }: { title: string; to: string; action?: string }) {
  return <div className="owner-dash-section-heading"><h2>{title}</h2><Link to={to}>{action}<ArrowRight size={15} /></Link></div>;
}

export const StoreOwnerDashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<DashboardBranch[]>([]);
  const [data, setData] = useState<StoreOwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  const startLoad = () => { setLoading(true); setError(''); setData(null); };

  useEffect(() => {
    const controller = new AbortController();
    getStoreOwnerDashboard(period, branchId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setData(result); setBranches(result.branches); } })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setError(status === 403 ? 'Bạn không có quyền xem dữ liệu tổng quan này.'
          : status === 404 ? 'API tổng quan chưa có trên backend đang chạy. Vui lòng khởi động lại backend.'
          : 'Không tải được dữ liệu tổng quan. Vui lòng thử lại.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, branchId, reload]);

  const periodLabel = periods.find((option) => option.value === period)?.label ?? 'Hôm nay';
  const pnlLink = branchId
    ? `/store-owner/finance?tab=pnl&branchId=${encodeURIComponent(branchId)}`
    : '/store-owner/finance?tab=pnl';
  const hourlyTrend = period === 'today' || period === 'yesterday';
  const revenues = data?.sales.trend.map((point) => point.revenue) ?? [];
  const positiveExtent = Math.max(0, ...revenues);
  const negativeExtent = Math.abs(Math.min(0, ...revenues));

  return <main className="owner-dash">
    <header className="owner-dash-header">
      <div><p className="owner-dash-eyebrow">TỔNG QUAN CỬA HÀNG</p><h1>Tình hình kinh doanh</h1><p className="owner-dash-subtitle">{user?.tenantName || branches[0]?.name?.replace(/\s*-\s*Chi nhánh\s*\d+$/i, '') || 'Hệ thống cửa hàng'} · {data?.scope.branchName || 'Toàn bộ chi nhánh'}</p></div>
      <div className="owner-dash-controls">
        <label><span>Thời gian</span><select value={period} onChange={(event) => { startLoad(); setPeriod(event.target.value as DashboardPeriod); }}>{periods.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Chi nhánh</span><select value={branchId ?? ''} onChange={(event) => { startLoad(); setBranchId(event.target.value || null); }}><option value="">Toàn bộ chi nhánh</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <button type="button" className="owner-dash-refresh" onClick={() => { startLoad(); setReload((value) => value + 1); }} aria-label="Làm mới dữ liệu"><RefreshCw size={17} /></button>
        <Link to="/pos" className="owner-dash-pos-btn" title="Vào màn hình bán hàng POS">
          <Store size={17} />
          <span>Vào màn bán hàng</span>
        </Link>
      </div>
    </header>

    {data && <div className="owner-dash-meta"><CalendarDays size={15} /> Dữ liệu {periodLabel.toLowerCase()} · Cập nhật lúc {dateTime(data.scope.asOfUtc)} · Kho, PO đang chờ và nhân viên là số liệu hiện tại</div>}
    {loading && <div className="owner-dash-loading" role="status">Đang tải dữ liệu tổng quan…</div>}
    {!loading && error && <div className="owner-dash-error" role="alert"><span>{error}</span><button type="button" onClick={() => { startLoad(); setReload((value) => value + 1); }}>Thử lại</button></div>}

    {data && !loading && <>
      {data.tasks && data.tasks.length > 0 && (
        <section className="owner-dash-card">
          <div className="owner-dash-section-heading"><h2>Việc cần xử lý</h2></div>
          <div className="owner-dash-issue-list">
            {data.tasks.map((task) => (
              <div key={task.actionUrl}>
                <Link className="owner-dash-secondary-link" to={task.actionUrl}>{task.title}<ArrowRight size={15} /></Link>
                <b>{task.code}</b>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="owner-dash-kpis">
        <article className="owner-dash-kpi"><div className="owner-dash-kpi-icon"><ChartNoAxesCombined size={19} /></div><p>Doanh thu thuần</p><strong>{money(data.sales.netRevenue)}</strong><small>{data.sales.revenueGrowthPercent === null ? 'Chưa đủ dữ liệu so sánh' : `${data.sales.revenueGrowthPercent > 0 ? '+' : ''}${number(data.sales.revenueGrowthPercent)}% so với kỳ trước`}</small></article>
        <article className="owner-dash-kpi"><div className="owner-dash-kpi-icon"><ShoppingCart size={19} /></div><p>Hóa đơn trong kỳ</p><strong>{number(data.sales.totalOrders)}</strong><small>Trung bình {money(data.sales.averageOrderValue)} / đơn</small></article>
        <article className="owner-dash-kpi"><div className="owner-dash-kpi-icon"><ChartNoAxesCombined size={19} /></div><p>Lợi nhuận ròng</p><strong>{money(data.finance.netProfit)}</strong><small>Theo báo cáo kết quả kinh doanh</small></article>
        <article className="owner-dash-kpi"><div className="owner-dash-kpi-icon"><ClipboardList size={19} /></div><p>PO cần duyệt · Hiện tại</p><strong>{number(data.procurement.pendingApprovalCount)}</strong><small>{number(data.procurement.awaitingReceiptCount)} PO đang chờ nhận hàng</small></article>
      </div>

      <div className="owner-dash-primary-grid">
        <section className="owner-dash-card owner-dash-chart-card"><SectionTitle title={hourlyTrend ? 'Doanh thu theo giờ' : 'Doanh thu theo ngày'} to={pnlLink} action="Báo cáo P&L" />
          {data.sales.trend.length === 0 || data.sales.trend.every((point) => point.revenue === 0)
            ? <div className="owner-dash-empty">Chưa có doanh thu trong kỳ này.</div>
            : <div className="owner-dash-chart" aria-label={hourlyTrend ? 'Biểu đồ doanh thu theo giờ' : 'Biểu đồ doanh thu theo ngày'}>
                {data.sales.trend.map((point, index) => {
                  const isNegative = point.revenue < 0;
                  const extent = isNegative ? negativeExtent : positiveExtent;
                  return <div className="owner-dash-bar-column" key={`${point.date}-${index}`} title={`${hourlyTrend ? hourLabel(point.date) : shortDate(point.date)}: ${money(point.revenue)}`}>
                    <div className="owner-dash-plot" style={{ gridTemplateRows: `minmax(0, ${positiveExtent}fr) minmax(0, ${negativeExtent}fr)` }}>
                      {point.revenue !== 0 && <span className={`owner-dash-bar${isNegative ? ' owner-dash-bar--negative' : ''}`} style={{ height: `${Math.abs(point.revenue) / extent * 100}%` }} />}
                    </div>
                    <small>{hourlyTrend ? (index % 3 === 0 ? hourLabel(point.date) : '') : shortDate(point.date)}</small>
                  </div>;
                })}
              </div>}</section>
        <section className="owner-dash-card"><SectionTitle title="Tài chính" to={pnlLink} />
          <div className="owner-dash-metric"><span>Lợi nhuận gộp</span><strong>{money(data.finance.grossProfit)}</strong></div>
          <div className="owner-dash-metric"><span>Chi phí vận hành</span><strong>{money(data.finance.operatingExpenses)}</strong></div>
          <div className="owner-dash-metric owner-dash-metric-total"><span>Lợi nhuận ròng</span><strong>{money(data.finance.netProfit)}</strong></div>
          {data.finance.cogsWarningNotice && <p className="owner-dash-note">{data.finance.cogsWarningNotice}</p>}</section>
      </div>

      <div className="owner-dash-operations-grid">
        <section className="owner-dash-card"><SectionTitle title="Nhập hàng" to="/store-owner/purchase-orders/list" /><p className="owner-dash-card-caption">PO đang chờ · Hiện tại</p>
          <div className="owner-dash-stat-pair"><div><strong>{number(data.procurement.pendingApprovalCount)}</strong><span>Chờ duyệt</span></div><div><strong>{number(data.procurement.awaitingReceiptCount)}</strong><span>Chờ nhận</span></div></div>
          <div className="owner-dash-metric owner-dash-metric-last"><span>Giá trị phiếu nhập đã hoàn tất · {periodLabel}</span><strong>{money(data.procurement.receivedAmountInPeriod)}</strong></div>
          <Link className="owner-dash-secondary-link" to="/store-owner/goods-receipts">Xem phiếu nhập <ArrowRight size={15} /></Link></section>
        <section className="owner-dash-card"><SectionTitle title="Tồn kho và hạn dùng" to="/store-owner/inventory" /><p className="owner-dash-card-caption">Số liệu hiện tại</p>
          <div className="owner-dash-stat-trio"><div><strong>{number(data.inventory.lowStockCount)}</strong><span>Tồn thấp</span></div><div><strong>{number(data.inventory.outOfStockCount)}</strong><span>Hết hàng</span></div><div><strong>{number(data.inventory.expiryWarningCount)}</strong><span>Cận hạn</span></div></div>
          <div className="owner-dash-list-title"><Boxes size={15} /> Cần chú ý</div>
          {data.inventory.lowStockItems.length === 0 && data.inventory.expiringBatches.length === 0 ? <div className="owner-dash-empty">Chưa có cảnh báo tồn kho.</div>
            : <div className="owner-dash-issue-list">{data.inventory.lowStockItems.slice(0, 3).map((item) => <div key={`${item.branchId}-${item.productId}`}><span>{item.productName}<small>{item.branchName}</small></span><b>{number(item.availableQty)} / {number(item.minStock)} {item.unit}</b></div>)}{data.inventory.expiringBatches.slice(0, 2).map((item, index) => <div key={`${item.branchId}-${item.productId}-${item.batchCode}-${index}`}><span>{item.productName}<small>Lô {item.batchCode || '—'} · {item.branchName}</small></span><b>HSD {shortDate(item.expiryDate)}</b></div>)}</div>}</section>
        <section className="owner-dash-card"><SectionTitle title="Nhân viên" to="/store-owner/employees" /><p className="owner-dash-card-caption">Hồ sơ nhân viên · Hiện tại</p>
          <div className="owner-dash-people"><div className="owner-dash-people-icon"><Users size={25} /></div><strong>{number(data.employees.activeCount)} <span>/ {number(data.employees.totalCount)}</span></strong><p>nhân viên đang hoạt động</p></div>
          <div className="owner-dash-metric owner-dash-metric-last"><span>Ngừng hoạt động</span><strong>{number(data.employees.totalCount - data.employees.activeCount)}</strong></div>
          <Link className="owner-dash-secondary-link" to="/store-owner/employees/schedule">Xem lịch phân ca <ArrowRight size={15} /></Link></section>
      </div>

      <section className="owner-dash-card owner-dash-products"><SectionTitle title="Sản phẩm bán chạy" to={pnlLink} action="Xem báo cáo" />
        {data.sales.topProducts.length === 0 ? <div className="owner-dash-empty">Chưa có sản phẩm bán ra trong kỳ này.</div>
          : <div className="owner-dash-product-list">{data.sales.topProducts.map((item, index) => <div key={item.productId}><span className="owner-dash-rank">{index + 1}</span><span className="owner-dash-product-name">{item.productName}</span><span>{number(item.quantitySold)} đã bán</span><strong>{money(item.revenue)}</strong></div>)}</div>}</section>
    </>}
  </main>;
};

export default StoreOwnerDashboardPage;
