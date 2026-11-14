import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

export interface PillarsSummaryData {
  totalCustomerDebt: number;
  overLimitCustomersCount: number;
  totalDebtorsCount: number;
  overduePayablesAmount: number;
  overduePayablesCount: number;
  netProfitMonth: number;
  netMarginPct: number;
  activePeriodLabel: string;
  taxDueYear: number;
  currentYear: number;
}

interface SummaryPillarsProps {
  pillars: PillarsSummaryData;
  isPnlPending: boolean;
  onNavigate: (path: string) => void;
  onScrollToPnl: () => void;
}

interface SummaryPillarCardProps {
  title: string;
  badgeText?: string;
  valueText: string;
  valueColor?: string;
  subNote?: string;
  footerLeftText: string;
  footerLeftColor: string;
  footerLeftBold?: boolean;
  ctaLabel: string;
  isPending?: boolean;
  onClick: () => void;
}

const SummaryPillarCard: React.FC<SummaryPillarCardProps> = ({
  title,
  badgeText,
  valueText,
  valueColor,
  subNote,
  footerLeftText,
  footerLeftColor,
  footerLeftBold = false,
  ctaLabel,
  isPending = false,
  onClick,
}) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={title}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    className="finance-summary-card"
    style={isPending ? { opacity: 0.7 } : undefined}
  >
    <div>
      <div className="finance-summary-header-row">
        <span className="finance-summary-title">{title}</span>
        {badgeText && <span className="finance-summary-period-badge">{badgeText}</span>}
      </div>
      <div className="finance-summary-val" style={valueColor ? { color: valueColor } : undefined}>
        {valueText}
      </div>
      {subNote && (
        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: -8, marginBottom: 8 }}>
          {subNote}
        </div>
      )}
    </div>
    <div className="finance-summary-footer">
      <span style={{ color: footerLeftColor, fontWeight: footerLeftBold ? 700 : 600 }}>
        {footerLeftText}
      </span>
      <span style={{ color: '#0F766E', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        {ctaLabel} <ChevronRight size={14} />
      </span>
    </div>
  </div>
);

/**
 * Renders the 4 Financial Pillar Summary cards (Receivables, Payables, Net Profit P&L, Tax Due).
 */
export const SummaryPillars: React.FC<SummaryPillarsProps> = ({
  pillars,
  isPnlPending,
  onNavigate,
  onScrollToPnl,
}) => {
  const hasDebtors = pillars.totalDebtorsCount > 0;
  const hasOverdue = pillars.overduePayablesCount > 0;

  return (
    <section aria-label="Tóm tắt 4 trụ cột tài chính" className="finance-summary-grid">
      {/* 1. Customer Receivables */}
      <SummaryPillarCard
        title="Khách đang nợ mình"
        valueText={formatMoney(pillars.totalCustomerDebt)}
        footerLeftText={hasDebtors ? `${pillars.totalDebtorsCount} khách hàng ghi nợ` : 'Không có nợ xấu'}
        footerLeftColor="#B45309"
        ctaLabel="Xem sổ nợ"
        onClick={() => onNavigate('/store-owner/customers')}
      />

      {/* 2. Service Payables */}
      <SummaryPillarCard
        title="Phải trả dịch vụ"
        valueText={formatMoney(pillars.overduePayablesAmount)}
        footerLeftText={hasOverdue ? `${pillars.overduePayablesCount} khoản quá hạn` : 'Đã thanh toán đủ'}
        footerLeftColor={hasOverdue ? '#DC2626' : '#15803D'}
        footerLeftBold={true}
        ctaLabel="Xem chi tiết"
        onClick={() => onNavigate('/store-owner/expenses')}
      />

      {/* 3. Net Profit PnL */}
      <SummaryPillarCard
        title="Lợi nhuận ròng PnL"
        badgeText={pillars.activePeriodLabel}
        valueText={formatMoney(pillars.netProfitMonth)}
        valueColor={pillars.netProfitMonth >= 0 ? '#15803D' : '#DC2626'}
        footerLeftText={`Tỷ suất lợi nhuận: ${pillars.netMarginPct}%`}
        footerLeftColor="#475569"
        ctaLabel="Xem phân tích bên dưới"
        isPending={isPnlPending}
        onClick={onScrollToPnl}
      />

      {/* 4. Household Tax Snapshot */}
      <SummaryPillarCard
        title={`Thuế năm nay (Lũy kế ${pillars.currentYear})`}
        valueText={formatMoney(pillars.taxDueYear)}
        valueColor="#B45309"
        subNote="Theo Thông tư 152/2025/TT-BTC"
        footerLeftText="Kỳ thuế hiện tại"
        footerLeftColor="#B45309"
        ctaLabel="Kê khai thuế"
        onClick={() => onNavigate('/store-owner/tax-snapshots')}
      />
    </section>
  );
};
