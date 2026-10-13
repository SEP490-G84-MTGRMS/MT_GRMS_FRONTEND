import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Receipt,
  ShoppingCart,
  Coins,
} from 'lucide-react';
import { PnlKpiCard } from './PnlKpiCard';
import type { KpiSummaryData } from '../types/reportsPnl.types';

interface PnlKpiCardsSectionProps {
  kpi?: KpiSummaryData;
  isLoading: boolean;
}

/**
 * Formats standard VND currency without decimal.
 */
function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Section rendering 6 key financial and operational KPI cards.
 */
export const PnlKpiCardsSection: React.FC<PnlKpiCardsSectionProps> = ({
  kpi,
  isLoading,
}) => {
  if (isLoading || !kpi) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <PnlKpiCard
            key={i}
            title=""
            value=""
            growthPct={0}
            icon={<div />}
            isLoading
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {/* 1. Doanh thu thuần */}
      <PnlKpiCard
        title="Doanh thu thuần"
        value={formatVnd(kpi.netRevenue)}
        subValue={`Gộp: ${formatVnd(kpi.grossSales)}`}
        growthPct={kpi.netRevenueGrowthPct}
        icon={<DollarSign size={20} />}
        iconBgColor="bg-teal-50 text-teal-800"
        borderColor="border-teal-200"
      />

      {/* 2. Lợi nhuận gộp */}
      <PnlKpiCard
        title="Lợi nhuận gộp"
        value={formatVnd(kpi.grossProfit)}
        subValue={`Biên lãi gộp: ${kpi.grossMarginPct}%`}
        growthPct={kpi.grossProfitGrowthPct}
        icon={<TrendingUp size={20} />}
        iconBgColor="bg-sky-50 text-sky-700"
        borderColor="border-sky-200"
      />

      {/* 3. Lợi nhuận ròng */}
      <PnlKpiCard
        title="Lợi nhuận ròng"
        value={formatVnd(kpi.netProfit)}
        subValue={`Biên lãi ròng: ${kpi.netMarginPct}%`}
        growthPct={kpi.netProfitGrowthPct}
        icon={<Coins size={20} />}
        iconBgColor="bg-teal-50 text-teal-800"
        borderColor="border-teal-300"
      />

      {/* 4. Chi phí vận hành */}
      <PnlKpiCard
        title="Chi phí dịch vụ (FE-07)"
        value={formatVnd(kpi.operatingExpenses)}
        subValue={`Hao hụt kho: ${formatVnd(kpi.shrinkageLoss)}`}
        growthPct={kpi.expensesGrowthPct}
        icon={<Receipt size={20} />}
        iconBgColor="bg-amber-50 text-amber-700"
        borderColor="border-amber-200"
      />

      {/* 5. Tổng đơn hàng */}
      <PnlKpiCard
        title="Tổng đơn hàng"
        value={kpi.totalOrders.toLocaleString('vi-VN')}
        subValue="Đơn bán lẻ POS"
        growthPct={kpi.ordersGrowthPct}
        icon={<ShoppingCart size={20} />}
        iconBgColor="bg-indigo-50 text-indigo-700"
        borderColor="border-indigo-200"
      />

      {/* 6. Giá trị trung bình đơn (AOV) */}
      <PnlKpiCard
        title="AOV (TB / Đơn)"
        value={formatVnd(kpi.averageOrderValue)}
        subValue="Giá trị trung bình đơn"
        growthPct={kpi.aovGrowthPct}
        icon={<Percent size={20} />}
        iconBgColor="bg-slate-100 text-slate-700"
        borderColor="border-slate-200"
      />
    </div>
  );
};
