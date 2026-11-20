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
    const id = (metric.id || '').toLowerCase();
    const icon = (metric.icon || '').toLowerCase();

    if (id.includes('mrr') || id.includes('revenue') || icon.includes('dollar') || icon.includes('trending')) {
      return <TrendingUpIcon size={19} />;
    }
    if (id.includes('alert') || id.includes('urgent') || id.includes('lock') || icon.includes('alert') || icon.includes('warning')) {
      return <AlertTriangleIcon size={19} />;
    }
    if (id.includes('upgrade') || id.includes('branch') || icon.includes('apartment') || icon.includes('check')) {
      return <CheckCircleIcon size={19} />;
    }
    return <StoreIcon size={19} />;
  };

  return (
    <div
      className="admin-kpi-card admin-dash-kpi"
      onClick={onClick}
      role="button"
      tabIndex={0}
      data-testid={`kpi-${metric.id}`}
    >
      <div className="admin-kpi-header admin-dash-kpi-header">
        <span className="admin-kpi-title admin-dash-kpi-title">{metric.title}</span>
        <span
          className="admin-kpi-icon admin-dash-kpi-icon"
          style={{
            backgroundColor: metric.iconBg || '#e8f5f3',
            color: metric.iconColor || '#0f766e',
          }}
        >
          {renderIcon()}
        </span>
      </div>

      <div
        className="admin-kpi-val admin-dash-kpi-val"
        style={{ color: metric.valueColor || '#12263f' }}
      >
        {metric.value}
        {metric.unit && (
          <small style={{ fontSize: 13, fontWeight: 'normal', color: '#64748b', marginLeft: 4 }}>
            {metric.unit}
          </small>
        )}
      </div>

      <div className="admin-kpi-sub admin-dash-kpi-sub">
        {metric.trendText && (
          <span className={`admin-badge ${metric.trendType === 'down' ? 'admin-badge-warning admin-dash-badge-warning' : 'admin-badge-active admin-dash-badge-active'}`}>
            {metric.trendText}
          </span>
        )}
        <span>{metric.subText}</span>
      </div>
    </div>
  );
};

