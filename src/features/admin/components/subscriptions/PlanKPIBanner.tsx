import { Package, CheckCircle2, PauseCircle, Users } from 'lucide-react';
import type { SubscriptionPlan } from '../../types/plan.types';

export const PlanKPIBanner = ({ plans }: { plans: SubscriptionPlan[] }) => {
  const metrics = [
    { label: 'Tổng gói dịch vụ', value: plans.length, Icon: Package },
    { label: 'Đang mở bán', value: plans.filter((plan) => plan.status === 'Active').length, Icon: CheckCircle2 },
    { label: 'Tạm ngừng bán', value: plans.filter((plan) => plan.status === 'Inactive').length, Icon: PauseCircle },
    { label: 'Khách hàng đang dùng', value: plans.reduce((total, plan) => total + plan.activeTenantCount, 0), Icon: Users },
  ];
  return (
    <div className="plans-kpis">
      {metrics.map(({ label, value, Icon }) => (
        <article className="plans-kpi" key={label}>
          <span className="plans-kpi-icon"><Icon size={19} /></span>
          <span>{label}</span><strong>{value.toLocaleString('vi-VN')}</strong>
        </article>
      ))}
    </div>
  );
};
