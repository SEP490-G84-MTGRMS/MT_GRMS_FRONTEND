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

function formatVnd(val: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Section rendering 6 key financial and operational KPI cards in a 6-column grid.
 */
export const PnlKpiCardsSection: React.FC<PnlKpiCardsSectionProps> = ({
  kpi,
  isLoading,
}) => {
  if (isLoading || !kpi) {
    return (
      <div className="pnl-kpi-grid">
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
    <div className="pnl-kpi-grid">
      {/* 1. Doanh thu thuần */}
      <PnlKpiCard
        title="Doanh thu thuần"
        value={formatVnd(kpi.netRevenue)}
        subValue={`Gộp: ${formatVnd(kpi.grossSales)}`}
        growthPct={kpi.netRevenueGrowthPct}
        icon={<DollarSign size={20} />}
        iconClass="pnl-icon-teal"
      />

      {/* 2. Lợi nhuận gộp */}
      <PnlKpiCard
        title="Lợi nhuận gộp"
        value={formatVnd(kpi.grossProfit)}
        subValue={`Biên lãi gộp: ${kpi.grossMarginPct}%`}
        growthPct={kpi.grossProfitGrowthPct}
        icon={<TrendingUp size={20} />}
        iconClass="pnl-icon-sky"
      />

      {/* 3. Lợi nhuận ròng */}
      <PnlKpiCard
        title="Lợi nhuận ròng"
        value={formatVnd(kpi.netProfit)}
        subValue={`Biên lãi ròng: ${kpi.netMarginPct}%`}
        growthPct={kpi.netProfitGrowthPct}
        icon={<Coins size={20} />}
        iconClass="pnl-icon-emerald"
      />

      {/* 4. Chi phí dịch vụ ngoài */}
      <PnlKpiCard
        title="Chi phí dịch vụ"
        value={formatVnd(kpi.operatingExpenses)}
        subValue={`Hao hụt kho: ${formatVnd(kpi.shrinkageLoss)}`}
        growthPct={kpi.expensesGrowthPct}
        icon={<Receipt size={20} />}
        iconClass="pnl-icon-amber"
      />

      {/* 5. Tổng đơn hàng */}
      <PnlKpiCard
        title="Tổng đơn hàng"
        value={kpi.totalOrders.toLocaleString('vi-VN')}
        subValue="Đơn bán lẻ POS"
        growthPct={kpi.ordersGrowthPct}
        icon={<ShoppingCart size={20} />}
        iconClass="pnl-icon-indigo"
      />

      {/* 6. AOV */}
      <PnlKpiCard
        title="AOV (TB / Đơn)"
        value={formatVnd(kpi.averageOrderValue)}
        subValue="Giá trị trung bình đơn"
        growthPct={kpi.aovGrowthPct}
        icon={<Percent size={20} />}
        iconClass="pnl-icon-slate"
      />
    </div>
  );
};
