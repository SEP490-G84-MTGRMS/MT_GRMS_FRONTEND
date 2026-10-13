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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse h-80" />
    );
  }

  const chartData = {
    labels: trendData.map((d) => d.dateLabel),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Doanh thu thuần',
        data: trendData.map((d) => d.netRevenue),
        backgroundColor: 'rgba(15, 118, 110, 0.75)', // Teal 700
        borderRadius: 4,
        order: 2,
      },
      {
        type: 'bar' as const,
        label: 'Tổng chi phí & Giá vốn',
        data: trendData.map((d) => d.cogs + d.expenses),
        backgroundColor: 'rgba(245, 158, 11, 0.65)', // Amber 500
        borderRadius: 4,
        order: 3,
      },
      {
        type: 'line' as const,
        label: 'Lợi nhuận ròng',
        data: trendData.map((d) => d.netProfit),
        borderColor: '#10B981', // Emerald 500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
          font: { size: 11 },
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
          font: { size: 10 },
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Xu Hướng Doanh Thu & Lợi Nhuận
            </h3>
            <p className="text-xs text-gray-400">
              So sánh Doanh thu thuần, Chi phí và Lợi nhuận ròng
            </p>
          </div>
        </div>
      </div>
      <div className="h-72 w-full">
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
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs animate-pulse h-80" />
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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
          <PieChartIcon size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Cơ Cấu Chi Phí Vận Hành
          </h3>
          <p className="text-xs text-gray-400">Tỷ trọng các nhóm chi phí & hao hụt</p>
        </div>
      </div>

      <div className="relative h-44 my-1">
        <Doughnut data={data} options={options} />
      </div>

      <div className="space-y-1.5 pt-2 border-t border-gray-100 max-h-32 overflow-y-auto">
        {breakdown.map((item) => (
          <div
            key={item.categoryCode}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 truncate">{item.categoryName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-medium text-gray-900">
                {formatVnd(item.amount)}
              </span>
              <span className="text-gray-400 text-[11px] w-9 text-right font-medium">
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
      <div className="bg-white rounded-[20px] border border-teal-100 p-5 shadow-xs animate-pulse h-80" />
    );
  }

  const startIndex = (currentPage - 1) * pageSize;
  const displayedProducts = products.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white rounded-[20px] border border-teal-100 p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-teal-50 text-teal-800 rounded-xl">
          <Award size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Top Sản Phẩm Đóng Góp Doanh Số
          </h3>
          <p className="text-xs text-gray-500">
            Mặt hàng bán chạy và biên lãi gộp đóng góp cho cửa hàng
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 overflow-y-auto mb-3">
        {displayedProducts.map((item, index) => {
          const rank = startIndex + index + 1;
          return (
            <div
              key={item.productId}
              className="py-2.5 flex items-center justify-between text-xs hover:bg-teal-50/40 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-900 font-bold text-[11px] flex items-center justify-center shrink-0">
                  {rank}
                </span>
                <div className="truncate">
                  <p className="font-semibold text-gray-800 truncate">
                    {item.productName}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Mã: {item.productCode} • SL: {item.quantitySold.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{formatVnd(item.revenue)}</p>
                <p className="text-[11px] text-teal-700 font-medium">
                  Lãi: {formatVnd(item.profit)} ({item.marginPct}%)
                </p>
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
      {/* Trend Chart (7 columns) */}
      <div className="lg:col-span-7">
        <TrendChartCard trendData={trendData} isLoading={isLoading} />
      </div>

      {/* Expense Donut Chart (5 columns) */}
      <div className="lg:col-span-5">
        <ExpenseDonutCard breakdown={expenseBreakdown} isLoading={isLoading} />
      </div>

      {/* Top Products Highlights (Full Width Banner) */}
      <div className="lg:col-span-12">
        <TopProductsCard products={topProducts} isLoading={isLoading} />
      </div>
    </div>
  );
};
