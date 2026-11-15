import { Wallet, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import type { BillingKpiSummary } from '../../types/billing.types';

export const BillingKpiBanner = ({ kpis }: { kpis: BillingKpiSummary }) => {
  const currency = (value: number) => value.toLocaleString('vi-VN') + ' đ';
  const metrics = [
    { id: 'total-revenue', label: 'Tổng giá trị giao dịch', value: currency(kpis.totalRevenue), note: 'Giao dịch thành công, đã trừ hoàn tiền', icon: Wallet },
    { id: 'month-revenue', label: 'Giá trị giao dịch tháng này', value: currency(kpis.revenueThisMonth), note: 'Theo tháng hiện tại', icon: TrendingUp },
    { id: 'success-rate', label: 'Tỷ lệ giao dịch thành công', value: kpis.successRate + '%', note: kpis.totalTransactions + ' giao dịch ghi nhận', icon: CheckCircle2 },
    { id: 'pending-reconcile', label: 'Chờ đối soát', value: kpis.pendingCount + ' giao dịch', note: currency(kpis.pendingAmount) + ' đang chờ', icon: Clock },
  ];
  return (
    <div className="plans-kpis billing-kpis">
      {metrics.map(({ id, label, value, note, icon: Icon }) => (
        <article className="plans-kpi" key={id} data-testid={'kpi-' + id}>
          <span>{label}</span><strong>{value}</strong><small>{note}</small>
          <span className="plans-kpi-icon"><Icon size={19} /></span>
        </article>
      ))}
    </div>
  );
};
