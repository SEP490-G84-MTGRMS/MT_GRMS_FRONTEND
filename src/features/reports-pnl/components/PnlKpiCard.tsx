import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface PnlKpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  growthPct: number;
  icon: React.ReactNode;
  iconBgColor?: string;
  borderColor?: string;
  isLoading?: boolean;
}

/**
 * Individual KPI Summary Card component with growth badge and subtle accents.
 */
export const PnlKpiCard: React.FC<PnlKpiCardProps> = ({
  title,
  value,
  subValue,
  growthPct,
  icon,
  iconBgColor = 'bg-emerald-50 text-emerald-700',
  borderColor = 'border-gray-200',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 w-8 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-7 bg-gray-300 rounded w-36 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>
    );
  }

  const isPositive = growthPct > 0;
  const isZero = growthPct === 0;

  return (
    <div
      className={`bg-white rounded-[20px] border ${borderColor} p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="text-xl font-extrabold text-gray-900 tracking-tight mb-1">
          {value}
        </div>
        {subValue && (
          <div className="text-xs text-gray-500 font-medium mb-2 truncate">
            {subValue}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-xs font-semibold">
        {isZero ? (
          <span className="inline-flex items-center gap-0.5 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-[11px]">
            <Minus size={12} />
            0%
          </span>
        ) : isPositive ? (
          <span className="inline-flex items-center gap-0.5 text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <TrendingUp size={12} />
            +{growthPct}%
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <TrendingDown size={12} />
            {growthPct}%
          </span>
        )}
        <span className="text-gray-400 font-normal text-[11px]">so với kỳ trước</span>
      </div>
    </div>
  );
};
