import type { FC } from 'react';
import type { KpiMetric } from '../../types/admin.types';
import {
  StoreIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
} from '../common/AdminIcons';

interface KpiCardProps {
  metric: KpiMetric;
  onClick?: () => void;
}

export const KpiCard: FC<KpiCardProps> = ({ metric, onClick }) => {
  const renderIcon = () => {
    switch (metric.icon) {
      case 'check-circle':
      case 'active':
        return <CheckCircleIcon size={18} />;
      case 'alert-triangle':
      case 'warning':
      case 'locked':
        return <AlertTriangleIcon size={18} />;
      case 'trending-up':
      case 'revenue':
        return <TrendingUpIcon size={18} />;
      case 'store':
      case 'tenants':
      default:
        return <StoreIcon size={18} />;
    }
  };

  return (
    <div className="admin-kpi-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="admin-kpi-header">
        <span className="admin-kpi-title">{metric.title}</span>
        <span
          className="admin-kpi-icon"
          style={{
            backgroundColor: metric.iconBg || 'var(--bg-soft-blue)',
            color: metric.iconColor || 'var(--text-muted)',
            border: '1px solid var(--border-light)',
          }}
        >
          {renderIcon()}
        </span>
      </div>

      <div
        className="admin-kpi-val"
        style={{ color: metric.valueColor || 'var(--text-main)' }}
      >
        {metric.value}
        {metric.unit && (
          <small style={{ fontSize: 14, fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: 4 }}>
            {metric.unit}
          </small>
        )}
      </div>

      <div className="admin-kpi-sub">
        {metric.trendText && (
          <span className="admin-badge admin-badge-active">
            {metric.trendText}
          </span>
        )}
        <span>{metric.subText}</span>
      </div>
    </div>
  );
};

