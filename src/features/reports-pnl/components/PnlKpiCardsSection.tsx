import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Coins,
  Package,
  Tag,
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
 * Displays: Doanh thu gộp, Giảm giá & Trả hàng, Doanh thu thuần, Giá vốn (COGS),
 * Lợi nhuận gộp, Chi phí vận hành, Lợi nhuận ròng.
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

  const cogsPct = kpi.netRevenue > 0 ? Math.round((kpi.cogs / kpi.netRevenue) * 1000) / 10 : 0;
  const totalDeductions = kpi.discounts + kpi.returns;

  return (
    <div className="pnl-kpi-grid">
      {/* 1. Doanh thu gộp & Giảm trừ */}
      <PnlKpiCard
        title="Doanh thu gộp"
        value={formatVnd(kpi.grossSales)}
        subValue={`Giảm giá/Trả: -${formatVnd(totalDeductions)}`}
        growthPct={kpi.netRevenueGrowthPct}
        icon={<Tag size={20} />}
        iconClass="pnl-icon-indigo"
      />

      {/* 2. Doanh thu thuần */}
      <PnlKpiCard
        title="Doanh thu thuần"
        value={formatVnd(kpi.netRevenue)}
        subValue={`${kpi.totalOrders.toLocaleString('vi-VN')} đơn • AOV: ${formatVnd(kpi.averageOrderValue)}`}
        growthPct={kpi.netRevenueGrowthPct}
        icon={<DollarSign size={20} />}
        iconClass="pnl-icon-teal"
      />

      {/* 3. Giá vốn hàng bán (COGS) */}
      <PnlKpiCard
        title="Giá vốn (COGS)"
        value={formatVnd(kpi.cogs)}
        subValue={`Tỷ trọng: ${cogsPct}% doanh thu`}
        growthPct={0}
        icon={<Package size={20} />}
        iconClass="pnl-icon-slate"
      />

      {/* 4. Lợi nhuận gộp */}
      <PnlKpiCard
        title="Lợi nhuận gộp"
        value={formatVnd(kpi.grossProfit)}
        subValue={`Biên lãi gộp: ${kpi.grossMarginPct}%`}
        growthPct={kpi.grossProfitGrowthPct}
        icon={<TrendingUp size={20} />}
        iconClass="pnl-icon-sky"
      />

      {/* 5. Chi phí vận hành */}
      <PnlKpiCard
        title="Chi phí vận hành"
        value={formatVnd(kpi.operatingExpenses)}
        subValue={`Nợ xấu/Hao hụt: ${formatVnd(kpi.shrinkageLoss)}`}
        growthPct={kpi.expensesGrowthPct}
        icon={<Receipt size={20} />}
        iconClass="pnl-icon-amber"
      />

      {/* 6. Lợi nhuận ròng */}
      <PnlKpiCard
        title="Lợi nhuận ròng"
        value={formatVnd(kpi.netProfit)}
        subValue={`Biên lãi ròng: ${kpi.netMarginPct}%`}
        growthPct={kpi.netProfitGrowthPct}
        icon={<Coins size={20} />}
        iconClass="pnl-icon-emerald"
      />
    </div>
  );
};
