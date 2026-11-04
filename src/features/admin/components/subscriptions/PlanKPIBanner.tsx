import type { FC } from 'react';
import type { SubscriptionPlan } from '../../types/plan.types';
import { Package, CheckCircle2, PauseCircle, Users } from 'lucide-react';

interface PlanKPIBannerProps {
  plans: SubscriptionPlan[];
}

export const PlanKPIBanner: FC<PlanKPIBannerProps> = ({ plans }) => {
  const totalPlans = plans.length;
  const activePlans = plans.filter((p) => p.status === 'Active').length;
  const inactivePlans = plans.filter((p) => p.status === 'Inactive').length;
  const totalTenants = plans.reduce((acc, curr) => acc + curr.activeTenantCount, 0);

  return (
    <div className="admin-kpi-grid" style={{ marginBottom: 20 }}>
      {/* KPI 1: Tổng số gói */}
      <div className="admin-kpi-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Tổng số gói dịch vụ
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'var(--bg-soft-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary)',
            }}
          >
            <Package size={18} />
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-main)',
            lineHeight: 1.2,
          }}
        >
          {totalPlans}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Gói cước SaaS cấu hình trên hệ thống
        </div>
      </div>

      {/* KPI 2: Đang mở bán */}
      <div className="admin-kpi-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Đang mở bán (Active)
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#059669',
            lineHeight: 1.2,
          }}
        >
          {activePlans}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Sẵn sàng tiếp nhận khách hàng đăng ký
        </div>
      </div>

      {/* KPI 3: Tạm ngừng bán */}
      <div className="admin-kpi-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Tạm ngừng bán
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#fff8eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <PauseCircle size={18} />
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#d97706',
            lineHeight: 1.2,
          }}
        >
          {inactivePlans}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Gói cũ ngưng mở bán cho khách mới
        </div>
      </div>

      {/* KPI 4: Tổng Tenant đang thuê */}
      <div className="admin-kpi-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Tổng Tenant đang thuê
          </span>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'var(--bg-soft-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-primary)',
            }}
          >
            <Users size={18} />
          </div>
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--blue-primary)',
            lineHeight: 1.2,
          }}
        >
          {totalTenants}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Khách hàng doanh nghiệp đang hoạt động
        </div>
      </div>
    </div>
  );
};
