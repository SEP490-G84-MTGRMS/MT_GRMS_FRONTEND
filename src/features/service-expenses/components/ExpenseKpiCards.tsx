import type { FC } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '../../admin/components';
import { CreditCard } from 'lucide-react';
import type { ExpenseSummaryDto } from '../types/expense.types';
import { formatMoney } from '../../finance/utils/formatters';

interface ExpenseKpiCardsProps {
  summary?: ExpenseSummaryDto;
  isLoading?: boolean;
  periodLabel?: string;
  overdueCount?: number;
}

export const ExpenseKpiCards: FC<ExpenseKpiCardsProps> = ({
  summary,
  isLoading,
  periodLabel,
  overdueCount = 0,
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
  const suspiciousCount = summary?.suspiciousCount || 0;
  const suspiciousAmount = summary?.suspiciousAmount || 0;

  const cards = [
    {
      title: 'Tổng chi phí vận hành',
      value: formatMoney(summary?.totalExpenseThisMonth || 0),
      subtext: `Kỳ: ${currentPeriod}`,
      icon: CreditCard,
      iconClass: 'kpi-icon-blue',
      iconColor: '#0F766E',
      valueColor: 'var(--text-main, #0F172A)',
    },
    {
      title: 'Chưa thanh toán',
      value: formatMoney(summary?.totalPendingAmount || 0),
      subtext: overdueCount > 0 ? `${overdueCount} khoản quá hạn cần chi` : 'Không có khoản nợ quá hạn',
      icon: ClockIcon,
      iconClass: overdueCount > 0 ? 'kpi-icon-red' : 'kpi-icon-amber',
      iconColor: overdueCount > 0 ? '#dc2626' : '#d97706',
      valueColor: overdueCount > 0 ? '#dc2626' : '#d97706',
    },
    {
      title: 'Đã thanh toán',
      value: formatMoney(summary?.totalPaidAmount || 0),
      subtext: 'Đã hạch toán vào Sổ quỹ',
      icon: CheckCircleIcon,
      iconClass: 'kpi-icon-green',
      iconColor: '#059669',
      valueColor: '#059669',
    },
    {
      title: 'Chi phí bất thường / Cần duyệt',
      value: formatMoney(suspiciousAmount),
      subtext:
        suspiciousCount > 0
          ? `${suspiciousCount} phiếu nghi vấn (Anti-Splitting)`
          : '0 khoản bất thường',
      icon: AlertTriangleIcon,
      iconClass: suspiciousCount > 0 ? 'kpi-icon-red' : 'kpi-icon-amber',
      iconColor: suspiciousCount > 0 ? '#dc2626' : '#64748b',
      valueColor: suspiciousCount > 0 ? '#dc2626' : 'var(--text-main, #0F172A)',
    },
  ];

  return (
    <div className="expense-kpi-grid">
      {cards.map((card, idx) => {
        const IconComp = card.icon;
        return (
          <div key={idx} className="expense-kpi-card">
            <div className="expense-kpi-header">
              <span className="expense-kpi-title">{card.title}</span>
              <div className={`expense-kpi-icon ${card.iconClass}`}>
                <IconComp size={18} color={card.iconColor} />
              </div>
            </div>
            <div className="expense-kpi-value" style={{ color: card.valueColor }}>
              {card.value}
            </div>
            <span className="expense-kpi-subtext">{card.subtext}</span>
          </div>
        );
      })}
    </div>
  );
};
