import { useState, useMemo } from 'react';
import type { FC } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type ChartData,
  type ScriptableContext,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { MonthlyAnalyticsData } from '../../types/admin.types';

// Đăng ký các mô-đun Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Khắc phục triệt để hiện tượng vỡ nét / mờ trên màn hình Retina & High-DPI
if (typeof window !== 'undefined') {
  ChartJS.defaults.devicePixelRatio = Math.max(window.devicePixelRatio || 1, 2);
}

interface DashboardAnalyticsChartProps {
  data: MonthlyAnalyticsData[];
}

type AnalyticsViewMode = 'overview' | 'breakdown' | 'transactions';

export const DashboardAnalyticsChart: FC<DashboardAnalyticsChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('overview');

  const latest = data[data.length - 1] || data[0];
  const labels = useMemo(() => data.map((d) => d.shortMonth), [data]);

  /* ─────────────────────────────────────────────────────────────
     1. LINE CHART DATA: MRR Doanh thu định kỳ
  ───────────────────────────────────────────────────────────── */
  const mrrLineData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'Doanh thu MRR',
        data: data.map((d) => d.mrr),
        borderColor: '#0F766E',
        borderWidth: 2.8,
        tension: 0.38,
        fill: true,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(15, 118, 110, 0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(15, 118, 110, 0.22)');
          gradient.addColorStop(0.65, 'rgba(15, 118, 110, 0.04)');
          gradient.addColorStop(1, 'rgba(15, 118, 110, 0.00)');
          return gradient;
        },
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: '#0F766E',
        pointBorderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#115E59',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const mrrLineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 0,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: { top: 12, right: 16, bottom: 4, left: 8 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: { x: 12, y: 10 },
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: 'Be Vietnam Pro', size: 11.5, weight: 600 },
        bodyFont: { family: 'JetBrains Mono', size: 13, weight: 700 },
        callbacks: {
          title: (items) => data[items[0]?.dataIndex ?? 0]?.month || '',
          label: (context) => {
            const idx = context.dataIndex;
            const item = data[idx];
            const yVal = context.parsed.y ?? 0;
            return ` Doanh thu: ${yVal.toFixed(1)}M đ (${item?.growthRate || ''})`;
          },
          afterLabel: (context) => {
            const idx = context.dataIndex;
            const item = data[idx];
            return ` ARR quy năm: ${item?.arrFormatted || ''} • ARPU: ${item?.arpuFormatted || ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748B',
          font: { family: 'Be Vietnam Pro', size: 11.5, weight: 600 },
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.75)',
        },
        ticks: {
          color: '#94A3B8',
          stepSize: 15,
          font: { family: 'JetBrains Mono', size: 10.5, weight: 500 },
          padding: 10,
          callback: (value) => `${value}M đ`,
        },
        border: { display: false },
      },
    },
  };

  /* ─────────────────────────────────────────────────────────────
     2. BAR CHART DATA: Khách hàng mới & Đang hoạt động
  ───────────────────────────────────────────────────────────── */
  const tenantsBarData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Chuỗi cửa hàng mới',
        data: data.map((d) => d.newTenants),
        backgroundColor: '#0F766E',
        hoverBackgroundColor: '#115E59',
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 34,
      },
    ],
  };

  const tenantsBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 0,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: { top: 12, right: 16, bottom: 4, left: 8 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: { x: 12, y: 10 },
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: 'Be Vietnam Pro', size: 11.5, weight: 600 },
        bodyFont: { family: 'JetBrains Mono', size: 13, weight: 700 },
        callbacks: {
          title: (items) => data[items[0]?.dataIndex ?? 0]?.month || '',
          label: (context) => {
            const yVal = context.parsed.y ?? 0;
            return ` Cửa hàng mới: +${yVal} chuỗi`;
          },
          afterLabel: (context) => {
            const idx = context.dataIndex;
            const item = data[idx];
            return ` Lũy kế hoạt động: ${item?.activeTenants || 0} chuỗi (Rời bỏ: ${item?.churnRate || '0%'})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748B',
          font: { family: 'Be Vietnam Pro', size: 11.5, weight: 600 },
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.75)',
        },
        ticks: {
          color: '#94A3B8',
          stepSize: 5,
          font: { family: 'JetBrains Mono', size: 10.5, weight: 500 },
          padding: 10,
          callback: (value) => `+${value}`,
        },
        border: { display: false },
      },
    },
  };

  /* ─────────────────────────────────────────────────────────────
     3. STACKED BAR CHART: Cơ cấu Doanh thu theo Gói dịch vụ
  ───────────────────────────────────────────────────────────── */
  const breakdownBarData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Gói Cơ Bản (Basic)',
        data: data.map((d) => d.revenueBreakdown.basic),
        backgroundColor: '#14B8A6',
        hoverBackgroundColor: '#0D9488',
        borderRadius: 4,
        stack: 'breakdown',
      },
      {
        label: 'Gói Nâng Cao (Advanced)',
        data: data.map((d) => d.revenueBreakdown.advanced),
        backgroundColor: '#0F766E',
        hoverBackgroundColor: '#115E59',
        borderRadius: 4,
        stack: 'breakdown',
      },
      {
        label: 'Gói Doanh Nghiệp (Enterprise)',
        data: data.map((d) => d.revenueBreakdown.enterprise),
        backgroundColor: '#6366F1',
        hoverBackgroundColor: '#4F46E5',
        borderRadius: 6,
        stack: 'breakdown',
      },
    ],
  };

  const breakdownBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 0,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: { top: 12, right: 12, bottom: 4, left: 8 },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          color: '#475569',
          font: { family: 'Be Vietnam Pro', size: 11.5, weight: 600 },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: { x: 14, y: 12 },
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
        bodyFont: { family: 'JetBrains Mono', size: 12.5, weight: 600 },
        callbacks: {
          title: (items) => data[items[0]?.dataIndex ?? 0]?.month || '',
          footer: (items) => {
            const idx = items[0]?.dataIndex ?? 0;
            const item = data[idx];
            return `Tổng MRR: ${item?.mrrFormatted || ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        ticks: {
          color: '#64748B',
          font: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.75)',
        },
        ticks: {
          color: '#94A3B8',
          stepSize: 30,
          font: { family: 'JetBrains Mono', size: 11, weight: 500 },
          padding: 12,
          callback: (value) => `${value}M đ`,
        },
        border: { display: false },
      },
    },
  };

  /* ─────────────────────────────────────────────────────────────
     4. POS TRANSACTIONS & ARPU (Chỉ số vận hành hệ thống)
  ───────────────────────────────────────────────────────────── */
  const transactionsBarData: ChartData<'bar'> = {
    labels,
    datasets: [
      {
        label: 'Giao dịch hóa đơn POS',
        data: data.map((d) => d.totalOrders / 1000),
        backgroundColor: 'rgba(0, 200, 83, 0.85)',
        hoverBackgroundColor: '#00A844',
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 32,
      },
    ],
  };

  const transactionsBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 0,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: { top: 12, right: 12, bottom: 4, left: 8 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: { x: 14, y: 12 },
        boxPadding: 6,
        usePointStyle: true,
        titleFont: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
        bodyFont: { family: 'JetBrains Mono', size: 13, weight: 700 },
        callbacks: {
          title: (items) => data[items[0]?.dataIndex ?? 0]?.month || '',
          label: (context) => {
            const idx = context.dataIndex;
            const item = data[idx];
            return ` Hóa đơn POS xử lý: ${item?.totalOrders.toLocaleString('vi-VN')} đơn`;
          },
          afterLabel: (context) => {
            const idx = context.dataIndex;
            const item = data[idx];
            return ` ARPU trung bình: ${item?.arpuFormatted || ''} / khách hàng`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#64748B',
          font: { family: 'Be Vietnam Pro', size: 12, weight: 600 },
          padding: 8,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.75)',
        },
        ticks: {
          color: '#94A3B8',
          stepSize: 30,
          font: { family: 'JetBrains Mono', size: 11, weight: 500 },
          padding: 12,
          callback: (value) => `${value}K đơn`,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="ac-root">
      {/* ── HEADER & BỘ CHỌN CHẾ ĐỘ XEM TRỰC QUAN ── */}
      <div className="ac-header">
        <div>
          <div className="ac-title">Doanh thu và tăng trưởng</div>
          <div className="ac-sub">
            Số liệu theo tháng trên toàn hệ thống.
          </div>
        </div>

        {/* Nút Tab Chuyển Đổi Chế Độ Xem (Full Pill KiotViet Style) */}
        <div className="ac-tabs-bar">
          <button
            type="button"
            className={`ac-tab-btn ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setViewMode('overview')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>Tổng quan</span>
          </button>
          <button
            type="button"
            className={`ac-tab-btn ${viewMode === 'breakdown' ? 'active' : ''}`}
            onClick={() => setViewMode('breakdown')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1.5" />
              <rect x="14" y="9" width="7" height="12" rx="1.5" />
            </svg>
            <span>Theo gói</span>
          </button>
          <button
            type="button"
            className={`ac-tab-btn ${viewMode === 'transactions' ? 'active' : ''}`}
            onClick={() => setViewMode('transactions')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Giao dịch POS</span>
          </button>
        </div>
      </div>

      {/* ── KHU VỰC VẼ BIỂU ĐỒ THEO CHẾ ĐỘ VIEW (CHART VISUALIZATION CANVAS) ── */}
      <div className="ac-chart-stage">
        {viewMode === 'overview' && (
          <div className="ac-dual-grid">
            {/* Cột trái: MRR Line */}
            <div className="ac-panel">
              <div className="ac-panel-head">
                <div className="ac-panel-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                  <span>Xu hướng Doanh thu Định kỳ (MRR)</span>
                </div>
                <span className="ac-panel-badge">Đơn vị: Triệu VNĐ</span>
              </div>
              <div className="ac-canvas-box">
                <Line data={mrrLineData} options={mrrLineOptions} />
              </div>
            </div>

            {/* Cột phải: New Tenants Bar */}
            <div className="ac-panel">
              <div className="ac-panel-head">
                <div className="ac-panel-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="9" width="4" height="12" rx="1" />
                    <rect x="10" y="5" width="4" height="16" rx="1" />
                    <rect x="17" y="1" width="4" height="20" rx="1" />
                  </svg>
                  <span>Chuỗi Cửa Hàng Mới Gia Nhập</span>
                </div>
                <span className="ac-panel-badge">Lũy kế: {latest.activeTenants} chuỗi</span>
              </div>
              <div className="ac-canvas-box">
                <Bar data={tenantsBarData} options={tenantsBarOptions} />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'breakdown' && (
          <div className="ac-panel ac-single-panel">
            <div className="ac-panel-head">
              <div>
                <div className="ac-panel-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="18" rx="1.5" />
                    <rect x="14" y="9" width="7" height="12" rx="1.5" />
                  </svg>
                  <span>Cơ cấu Đóng góp Doanh thu Theo Gói Dịch Vụ (Subscription Breakdown)</span>
                </div>
                <div className="ac-panel-sub">
                  Phân bổ doanh thu chi tiết giữa Gói Cơ Bản, Gói Nâng Cao và Gói Doanh Nghiệp qua từng tháng.
                </div>
              </div>
              <span className="ac-panel-badge">Tổng tháng này: {latest.mrrFormatted}</span>
            </div>
            <div className="ac-canvas-box ac-canvas-large">
              <Bar data={breakdownBarData} options={breakdownBarOptions} />
            </div>
          </div>
        )}

        {viewMode === 'transactions' && (
          <div className="ac-panel ac-single-panel">
            <div className="ac-panel-head">
              <div>
                <div className="ac-panel-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Quy mô Giao dịch Hóa đơn POS & Doanh thu Bình quân/Khách (ARPU)</span>
                </div>
                <div className="ac-panel-sub">
                  Tổng lượng hóa đơn thanh toán thành công được xử lý trên nền tảng POS bán lẻ MT-GRMS.
                </div>
              </div>
              <span className="ac-panel-badge">Tháng 10: {latest.ordersFormatted}</span>
            </div>
            <div className="ac-canvas-box ac-canvas-large">
              <Bar data={transactionsBarData} options={transactionsBarOptions} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
