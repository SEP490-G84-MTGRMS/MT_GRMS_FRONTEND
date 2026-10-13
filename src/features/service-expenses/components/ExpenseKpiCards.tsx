import type { FC } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
} from 'lucide-react';
import type { ExpenseSummaryDto } from '../types/expense.types';

interface ExpenseKpiCardsProps {
  summary?: ExpenseSummaryDto;
  isLoading?: boolean;
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

export const ExpenseKpiCards: FC<ExpenseKpiCardsProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm animate-pulse flex flex-col justify-between"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-7 bg-gray-200 rounded w-3/4 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Tổng chi phí tháng này',
      value: formatCurrency(summary?.totalExpenseThisMonth),
      subtext: 'Bao gồm mọi khoản chi',
      icon: TrendingDown,
      iconBg: 'bg-blue-50 text-[#0066ff]',
      borderColor: 'hover:border-blue-200',
    },
    {
      title: 'Chờ thanh toán',
      value: formatCurrency(summary?.totalPendingAmount),
      subtext: 'Cần giải ngân kịp hạn',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
      borderColor: 'hover:border-amber-200',
    },
    {
      title: 'Đã hoàn tất thanh toán',
      value: formatCurrency(summary?.totalPaidAmount),
      subtext: 'Đã hạch toán sổ quỹ',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderColor: 'hover:border-emerald-200',
    },
    {
      title: 'Khoản chi quá hạn',
      value: `${summary?.overdueCount ?? 0} khoản`,
      subtext: 'Cần xử lý khẩn cấp',
      icon: AlertTriangle,
      iconBg: 'bg-red-50 text-red-600',
      borderColor: 'hover:border-red-200',
      isWarning: (summary?.overdueCount ?? 0) > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm transition-all duration-200 ${card.borderColor} flex items-start justify-between`}
          >
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {card.title}
              </p>
              <h3
                className={`text-2xl font-bold mt-2 tracking-tight ${
                  card.isWarning ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {card.value}
              </h3>
              <p className="text-xs text-gray-400 mt-1">{card.subtext}</p>
            </div>
            <div className={`p-3 rounded-full ${card.iconBg}`}>
              <IconComponent className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
