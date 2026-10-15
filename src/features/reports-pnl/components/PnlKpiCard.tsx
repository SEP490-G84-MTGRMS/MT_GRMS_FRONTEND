import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface PnlKpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  growthPct: number;
  icon: React.ReactNode;
  iconClass?: string;
  isLoading?: boolean;
}

/**
 * Individual KPI Summary Card component matching MT-GRMS Design System.
 */
export const PnlKpiCard: React.FC<PnlKpiCardProps> = ({
  title,
  value,
  subValue,
  growthPct,
  icon,
  iconClass = 'pnl-icon-teal',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="pnl-kpi-card" style={{ opacity: 0.6 }}>
        <div style={{ height: '14px', background: '#e2e8f0', borderRadius: '8px', width: '50%', marginBottom: '12px' }} />
        <div style={{ height: '26px', background: '#cbd5e1', borderRadius: '8px', width: '75%', marginBottom: '8px' }} />
        <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', width: '40%' }} />
      </div>
    );
  }

  const isPositive = growthPct > 0;
  const isZero = growthPct === 0;

  return (
    <div className="pnl-kpi-card">
      <div className="pnl-kpi-header">
        <span className="pnl-kpi-title" title={title}>
          {title}
        </span>
        <div className={`pnl-kpi-icon ${iconClass}`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="pnl-kpi-value">{value}</div>
        {subValue && <div className="pnl-kpi-subtext">{subValue}</div>}
      </div>

      <div className="pnl-kpi-footer">
        {isZero ? (
          <span className="pnl-growth-badge pnl-growth-neutral">
            <Minus size={11} /> 0%
          </span>
        ) : isPositive ? (
          <span className="pnl-growth-badge pnl-growth-positive">
            <TrendingUp size={11} /> +{growthPct}%
          </span>
        ) : (
          <span className="pnl-growth-badge pnl-growth-negative">
            <TrendingDown size={11} /> {growthPct}%
          </span>
        )}
        <span style={{ color: 'var(--text-faint, #9ca3af)', fontSize: '0.7rem' }}>
          so với kỳ trước
        </span>
      </div>
    </div>
  );
};
