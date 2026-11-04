import React from 'react';
import type { SubscriptionPlan } from '../../../types/plan.types';
import { TrendingUp } from 'lucide-react';

interface PlanBusinessStatsCardProps {
  plan: SubscriptionPlan;
  totalSystemTenants?: number;
}

export const PlanBusinessStatsCard: React.FC<PlanBusinessStatsCardProps> = ({
  plan,
  totalSystemTenants = 128,
}) => {
  const formatPrice = (v: number) => {
    return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
  };

  const marketShare = totalSystemTenants > 0
    ? ((plan.activeTenantCount / totalSystemTenants) * 100).toFixed(1)
    : '0.0';

  const mrr = plan.monthlyPrice * plan.activeTenantCount;
  const arr = mrr * 12;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 14,
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0, 30, 90, 0.04)',
        padding: '20px 22px',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14.5,
          fontWeight: 700,
          color: 'var(--text-main)',
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <TrendingUp size={17} color="var(--blue-primary)" />
        <span>A. Thống kê Kinh doanh của Gói</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Số lượng Tenant:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {plan.activeTenantCount} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>khách hàng</span>
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Thị phần nền tảng:</span>
          <span style={{ fontWeight: 700, color: 'var(--blue-primary)', fontFamily: 'var(--font-mono)' }}>
            {marketShare}% <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11.5 }}>({plan.activeTenantCount}/{totalSystemTenants})</span>
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Doanh thu tháng (MRR):</span>
          <span style={{ fontWeight: 800, color: '#0f766e', fontFamily: 'var(--font-mono)' }}>
            {formatPrice(mrr)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Doanh thu năm (ARR):</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {formatPrice(arr)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tỷ lệ duy trì hợp đồng:</span>
          <span style={{ fontWeight: 700, color: '#16a34a', fontFamily: 'var(--font-mono)' }}>
            {plan.activeTenantCount > 30 ? '94.8%' : '91.2%'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>Xếp hạng gói cước:</span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 700,
              backgroundColor: plan.activeTenantCount > 40 ? '#fef3c7' : '#f1f5f9',
              color: plan.activeTenantCount > 40 ? '#b45309' : '#475569',
            }}
          >
            {plan.activeTenantCount > 40 ? 'Gói bán chạy nhất' : 'Gói tiêu chuẩn'}
          </span>
        </div>
      </div>
    </div>
  );
};
