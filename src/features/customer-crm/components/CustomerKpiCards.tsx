import type { FC } from 'react';
import { Users, DollarSign, AlertTriangle, Award } from 'lucide-react';
import type { CustomerKpiSummary } from '../types/customer.types';

interface CustomerKpiCardsProps {
  summary?: CustomerKpiSummary;
  isLoading?: boolean;
}

const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const CustomerKpiCards: FC<CustomerKpiCardsProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="customer-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="customer-kpi-card" style={{ minHeight: '110px', opacity: 0.6 }}>
            <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '8px', width: '50%', marginBottom: '12px' }} />
            <div style={{ height: '24px', background: '#cbd5e1', borderRadius: '8px', width: '75%' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="customer-kpi-grid">
      {/* 1. Tổng khách hàng */}
      <div className="customer-kpi-card">
        <div className="customer-kpi-header">
          <span className="customer-kpi-title">Tổng khách hàng</span>
          <div className="customer-kpi-icon kpi-icon-teal">
            <Users size={20} />
          </div>
        </div>
        <div>
          <div className="customer-kpi-value">
            {summary?.totalCustomers.toLocaleString('vi-VN') || 0}
          </div>
          <div className="customer-kpi-subtext" style={{ color: '#059669' }}>
            Hồ sơ đang hoạt động
          </div>
        </div>
      </div>

      {/* 2. Tổng công nợ phải thu */}
      <div className="customer-kpi-card">
        <div className="customer-kpi-header">
          <span className="customer-kpi-title">Công nợ phải thu (AR)</span>
          <div className="customer-kpi-icon kpi-icon-amber">
            <DollarSign size={20} />
          </div>
        </div>
        <div>
          <div className="customer-kpi-value" style={{ color: '#D97706' }}>
            {formatCurrency(summary?.totalDebtAR)}
          </div>
          <div className="customer-kpi-subtext">
            Cần theo dõi & thu hồi
          </div>
        </div>
      </div>

      {/* 3. Vượt hạn mức nợ */}
      <div className="customer-kpi-card">
        <div className="customer-kpi-header">
          <span className="customer-kpi-title">Vượt hạn mức nợ</span>
          <div className="customer-kpi-icon kpi-icon-red">
            <AlertTriangle size={20} />
          </div>
        </div>
        <div>
          <div className="customer-kpi-value" style={{ color: '#DC2626' }}>
            {summary?.overLimitCount || 0}
          </div>
          <div className="customer-kpi-subtext" style={{ color: '#DC2626' }}>
            Chặn bán nợ thêm
          </div>
        </div>
      </div>

      {/* 4. Tổng điểm tích lũy */}
      <div className="customer-kpi-card">
        <div className="customer-kpi-header">
          <span className="customer-kpi-title">Tổng điểm thưởng</span>
          <div className="customer-kpi-icon kpi-icon-green">
            <Award size={20} />
          </div>
        </div>
        <div>
          <div className="customer-kpi-value" style={{ color: '#059669' }}>
            {summary?.totalLoyaltyPoints.toLocaleString('vi-VN') || 0}
          </div>
          <div className="customer-kpi-subtext">
            Chương trình Loyalty
          </div>
        </div>
      </div>
    </div>
  );
};