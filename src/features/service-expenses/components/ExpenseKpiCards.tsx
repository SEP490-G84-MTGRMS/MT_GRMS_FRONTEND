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
}

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
      value: formatMoney(summary?.totalExpenseThisMonth || 0),
      subtext: 'Bao gồm mọi khoản chi vận hành',
      icon: CreditCard,
      iconClass: 'kpi-icon-blue',
      iconColor: '#0F766E',
    },
    {
      title: 'Chờ thanh toán',
      value: formatMoney(summary?.totalPendingAmount || 0),
      subtext: 'Cần giải ngân kịp hạn',
      icon: ClockIcon,
      iconClass: 'kpi-icon-amber',
      iconColor: '#d97706',
    },
    {
      title: `Đã thanh toán (${currentPeriod})`,
      value: formatMoney(summary?.totalPaidAmount || 0),
      subtext: 'Đã hạch toán vào Sổ quỹ',
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
        const IconComp = card.icon;
        return (
          <div key={idx} className="expense-kpi-card">
            <div className="expense-kpi-header">
              <span className="expense-kpi-title">{card.title}</span>
              <div className={`expense-kpi-icon ${card.iconClass}`}>
                <IconComp size={18} color={card.iconColor} />
              </div>
            </div>
            <div className="expense-kpi-value">{card.value}</div>
            <span className="expense-kpi-subtext">{card.subtext}</span>
          </div>
        );
      })}
    </div>
  );
};
