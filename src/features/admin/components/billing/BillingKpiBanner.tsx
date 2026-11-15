import type { FC } from 'react';
import type { BillingKpiSummary } from '../../types/billing.types';
import { DollarSign, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface BillingKpiBannerProps {
  kpis: BillingKpiSummary;
}

export const BillingKpiBanner: FC<BillingKpiBannerProps> = ({ kpis }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(val) + ' đ';
  };

  return (
    <div className="plans-kpis" style={{ marginBottom: 18 }}>
      {/* 1. Tổng doanh thu tích lũy */}
      <div className="plans-kpi" data-testid="kpi-total-revenue">
        <span>TỔNG DOANH THU SAAS</span>
        <strong>{formatCurrency(kpis.totalRevenue)}</strong>
        <small style={{ color: '#0F766E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <TrendingUp size={13} /> Lũy kế toàn bộ gói & tiện ích
        </small>
        <span className="plans-kpi-icon" style={{ background: '#EAF6F4', color: '#0F766E' }}>
          <DollarSign size={20} />
        </span>
      </div>

      {/* 2. Doanh thu tháng này */}
      <div className="plans-kpi" data-testid="kpi-month-revenue">
        <span>DOANH THU THÁNG NÀY</span>
        <strong style={{ color: '#0F766E' }}>{formatCurrency(kpis.revenueThisMonth)}</strong>
        <small style={{ color: '#64748B' }}>
          Doanh số tháng 11/2026
        </small>
        <span className="plans-kpi-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
          <TrendingUp size={20} />
        </span>
      </div>

      {/* 3. Tỷ lệ khớp tiền thành công */}
      <div className="plans-kpi" data-testid="kpi-success-rate">
        <span>TỶ LỆ KHỚP TIỀN TỰ ĐỘNG</span>
        <strong>{kpis.successRate}%</strong>
        <small style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle2 size={13} /> {kpis.totalTransactions} giao dịch được ghi nhận
        </small>
        <span className="plans-kpi-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
          <CheckCircle2 size={20} />
        </span>
      </div>

      {/* 4. Cần đối soát thủ công */}
      <div className="plans-kpi" data-testid="kpi-pending-reconcile">
        <span>CẦN ĐỐI SOÁT / CHỜ DUYỆT</span>
        <strong style={{ color: kpis.pendingCount > 0 ? '#D97706' : '#64748B' }}>
          {kpis.pendingCount} giao dịch
        </strong>
        <small style={{ color: kpis.pendingCount > 0 ? '#D97706' : '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
          {kpis.pendingCount > 0 ? (
            <>
              <AlertCircle size={13} /> {formatCurrency(kpis.pendingAmount)} đang chờ
            </>
          ) : (
            <>
              <Clock size={13} /> Đã khớp hết giao dịch
            </>
          )}
        </small>
        <span
          className="plans-kpi-icon"
          style={{
            background: kpis.pendingCount > 0 ? '#FEF3C7' : '#F1F5F9',
            color: kpis.pendingCount > 0 ? '#D97706' : '#64748B',
          }}
        >
          <Clock size={20} />
        </span>
      </div>
    </div>
  );
};
