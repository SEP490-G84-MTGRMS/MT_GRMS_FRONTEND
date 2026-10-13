import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart, Doughnut } from 'react-chartjs-2';
import { TrendingUp, PieChart as PieChartIcon, Award } from 'lucide-react';
import { TablePagination } from '../../../components/common/TablePagination';
import type {
  ExpenseCategoryBreakdown,
  PnlTrendPoint,
  TopProductPerformance,
} from '../types/reportsPnl.types';

// Register Chart.js components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PnlChartsSectionProps {
  trendData: PnlTrendPoint[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
  topProducts: TopProductPerformance[];
  isLoading: boolean;
}

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Trend Chart Sub-Component: Revenue vs Expense vs Net Profit over time.
 */
const TrendChartCard: React.FC<{
  trendData: PnlTrendPoint[];
  isLoading: boolean;
}> = ({ trendData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="pnl-chart-card" style={{ minHeight: '360px', opacity: 0.6 }}>
        <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '8px', width: '40%', marginBottom: '16px' }} />
        <div style={{ height: '280px', background: '#f8fafc', borderRadius: '16px' }} />
      </div>
    );
  }

  const chartData = {
    labels: trendData.map((d) => d.dateLabel),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Doanh thu thuần',
        data: trendData.map((d) => d.netRevenue),
        backgroundColor: 'rgba(15, 118, 110, 0.78)', // Deep Teal
        borderRadius: 6,
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Tổng chi phí & Giá vốn',
        data: trendData.map((d) => d.cogs + d.expenses),
        backgroundColor: 'rgba(245, 158, 11, 0.72)', // Amber
        borderRadius: 6,
        order: 3,
      },
      {
        type: 'line' as const,
        label: 'Lợi nhuận ròng',
        data: trendData.map((d) => d.netProfit),
        borderColor: '#10B981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        order: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: { size: 11, family: 'var(--font-sans)' },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const val = context.raw || 0;
            return ` ${label}: ${formatVnd(val)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => `${value / 1000000} tr`,
          font: { size: 10, family: 'var(--font-sans)' },
        },
        grid: { color: 'rgba(0, 0, 0, 0.04)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, family: 'var(--font-sans)' } },
      },
    },
  };

  return (
    <div className="pnl-chart-card">
      <div className="pnl-card-title-group">
        <div className="pnl-card-icon-badge" style={{ background: 'var(--blue-subtle, #CCFBF1)', color: 'var(--blue-primary, #0F766E)' }}>
          <TrendingUp size={20} />
        </div>
        <div>
          <h3>Xu Hướng Doanh Thu & Lợi Nhuận</h3>
          <p>So sánh biến động Doanh thu thuần, Chi phí và Lợi nhuận ròng qua các kỳ</p>
        </div>
      </div>
      <div className="pnl-chart-container">
        <Chart type="bar" data={chartData as any} options={chartOptions as any} />
      </div>
    </div>
  );
};

/**
 * Expense Donut Sub-Component: Structure of operating expenses & shrinkage.
 */
const ExpenseDonutCard: React.FC<{
  breakdown: ExpenseCategoryBreakdown[];
  isLoading: boolean;
}> = ({ breakdown, isLoading }) => {
  if (isLoading) {
    return (
      <div className="pnl-chart-card" style={{ minHeight: '360px', opacity: 0.6 }}>
        <div style={{ height: '20px', background: '#e2e8f0', borderRadius: '8px', width: '40%', marginBottom: '16px' }} />
        <div style={{ height: '280px', background: '#f8fafc', borderRadius: '16px' }} />
      </div>
    );
  }

  const data = {
    labels: breakdown.map((b) => b.categoryName),
    datasets: [
      {
        data: breakdown.map((b) => b.amount),
        backgroundColor: breakdown.map((b) => b.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const val = context.raw || 0;
            return ` ${label}: ${formatVnd(val)}`;
          },
        },
      },
    },
    cutout: '70%',
  };

  return (
    <div className="pnl-chart-card">
      <div className="pnl-card-title-group">
        <div className="pnl-card-icon-badge" style={{ background: '#FEF3C7', color: '#D97706' }}>
          <PieChartIcon size={20} />
        </div>
        <div>
          <h3>Cơ Cấu Chi Phí Vận Hành</h3>
          <p>Tỷ trọng các nhóm chi phí dịch vụ và hao hụt kho</p>
        </div>
      </div>

      <div className="pnl-donut-container">
        <Doughnut data={data} options={options} />
      </div>

      <div className="pnl-donut-legend">
        {breakdown.map((item) => (
          <div key={item.categoryCode} className="pnl-legend-row">
            <div className="pnl-legend-item-left">
              <span className="pnl-legend-color-dot" style={{ backgroundColor: item.color }} />
              <span style={{ color: 'var(--text-muted, #4b5563)' }}>{item.categoryName}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main, #111827)' }}>
                {formatVnd(item.amount)}
              </span>
              <span style={{ color: 'var(--text-faint, #9ca3af)', fontSize: '0.72rem', minWidth: '38px', textAlign: 'right' }}>
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Top Products Sub-Component: Top selling items and profitability with TablePagination.
 */
const TopProductsCard: React.FC<{
  products: TopProductPerformance[];
  isLoading: boolean;
}> = ({ products, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  if (isLoading) {
    return (
      <div className="pnl-top-products-wrapper" style={{ opacity: 0.6 }}>
        <div style={{ height: '24px', background: '#e2e8f0', borderRadius: '8px', width: '30%', marginBottom: '16px' }} />
        <div style={{ height: '200px', background: '#f8fafc', borderRadius: '16px' }} />
      </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize;
  const displayedProducts = products.slice(startIndex, startIndex + pageSize);

  return (
    <div className="pnl-top-products-wrapper">
      <div className="pnl-card-title-group">
        <div className="pnl-card-icon-badge" style={{ background: '#E0F2FE', color: '#0284C7' }}>
          <Award size={20} />
        </div>
        <div>
          <h3>Top Sản Phẩm Đóng Góp Doanh Số</h3>
          <p>Mặt hàng bán chạy và tỷ lệ biên lãi gộp đóng góp cho chuỗi</p>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {displayedProducts.map((item, index) => {
          const rank = startIndex + index + 1;
          return (
            <div key={item.productId} className="pnl-product-row">
              <div className="pnl-product-left">
                <span className="pnl-rank-badge">{rank}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="pnl-product-name">{item.productName}</div>
                  <div className="pnl-product-meta">
                    Mã: {item.productCode} • SL bán: {item.quantitySold.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="pnl-product-right">
                <div className="pnl-product-revenue">{formatVnd(item.revenue)}</div>
                <div className="pnl-product-profit">
                  Lãi: {formatVnd(item.profit)} ({item.marginPct}%)
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shared TablePagination component */}
      <TablePagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={products.length}
        pageSizeOptions={[5, 10, 20]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        itemLabel="sản phẩm"
      />
    </div>
  );
};

/**
 * Main Charts & Highlights Section.
 */
export const PnlChartsSection: React.FC<PnlChartsSectionProps> = ({
  trendData,
  expenseBreakdown,
  topProducts,
  isLoading,
}) => {
  return (
    <>
      {/* 2-Column Trend & Donut Charts Grid */}
      <div className="pnl-charts-grid">
        <TrendChartCard trendData={trendData} isLoading={isLoading} />
        <ExpenseDonutCard breakdown={expenseBreakdown} isLoading={isLoading} />
      </div>

      {/* Full Width Top Products Highlight Banner */}
      <TopProductsCard products={topProducts} isLoading={isLoading} />
    </>
  );
};
