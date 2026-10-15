import type { FC, ReactNode } from 'react';

interface Props {
  title: string;
  value: string;
  subtitle: string;
  colorType?: 'primary' | 'success' | 'warning' | 'info';
  icon?: ReactNode;
}

export const ShiftKpiCard: FC<Props> = ({
  title,
  value,
  subtitle,
  colorType = 'primary',
  icon,
}) => {
  return (
    <div className={`shift-kpi-card color-${colorType}`}>
      <div className="shift-kpi-header">
        <span className="shift-kpi-title">{title}</span>
        {icon && <span className="shift-kpi-icon text-slate-400">{icon}</span>}
      </div>
      <div className="shift-kpi-value font-mono tabular-nums">{value}</div>
      <div className="shift-kpi-subtitle">{subtitle}</div>
    </div>
  );
};
