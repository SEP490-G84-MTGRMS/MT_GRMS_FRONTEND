import type { FC } from 'react';
import {
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../admin/components';
import type { ExpenseSummaryDto } from '../types/expense.types';

interface ExpenseKpiCardsProps {
  summary?: ExpenseSummaryDto;
  isLoading?: boolean;
  periodLabel?: string;
}

/**
 * Format currency number to Vietnamese Dong format
 */
const formatCurrency = (val?: number): string => {
  if (typeof val !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

export const ExpenseKpiCards: FC<ExpenseKpiCardsProps> = ({
  summary,
  isLoading,
  periodLabel,
}) => {
  if (isLoading) {
    return (
      <div className="expense-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="expense-kpi-card" style={{ minHeight: '120px' }}>
            <div className="skeleton-line" style={{ width: '45%', marginBottom: '16px' }} />
            <div className="skeleton-line" style={{ width: '70%', height: '24px' }} />
          </div>
        ))}
      </div>
    );
  }

  const currentPeriod = periodLabel || 'tháng này';

  const cards = [
    {
      title: `Tổng chi phí (${currentPeriod})`,
      value: formatCurrency(summary?.totalExpenseThisMonth),
      subtext: 'Bao gồm mọi khoản chi vận hành',
      icon: TrendingUpIcon,
      iconClass: 'kpi-icon-blue',
      iconColor: '#0F766E',
    },
    {
      title: 'Chờ thanh toán',
      value: formatCurrency(summary?.totalPendingAmount),
      subtext: 'Cần giải ngân kịp hạn',
      icon: ClockIcon,
      iconClass: 'kpi-icon-amber',
      iconColor: '#d97706',
    },
    {
      title: `Đã thanh toán (${currentPeriod})`,
      value: formatCurrency(summary?.totalPaidAmount),
      subtext: 'Đã hạch toán sổ quỹ',
      icon: CheckCircleIcon,
      iconClass: 'kpi-icon-green',
      iconColor: '#059669',
    },
    {
      title: 'Khoản chi quá hạn',
      value: summary?.overdueCount ? `${summary.overdueCount} khoản` : '0 khoản',
      subtext: summary?.overdueCount ? 'Cần xử lý khẩn cấp' : 'Không có khoản nợ trễ',
      icon: AlertTriangleIcon,
      iconClass: 'kpi-icon-red',
      iconColor: '#dc2626',
    },
  ];

  return (
    <div className="expense-kpi-grid">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div key={idx} className="expense-kpi-card">
            <div className="expense-kpi-header">
              <span className="expense-kpi-title">{card.title}</span>
              <div className={`expense-kpi-icon ${card.iconClass}`}>
                <IconComponent size={18} color={card.iconColor} />
              </div>
            </div>
            <div>
              <div className="expense-kpi-value">{card.value}</div>
              <div className="expense-kpi-subtext">{card.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
