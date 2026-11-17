import type { FC } from 'react';
import type { CustomerDto, CustomerKpiSummary } from '../types/customer.types';
import { formatMoney } from '../../finance/utils/formatters';

interface CustomerKpiCardsProps {
  summary?: CustomerKpiSummary;
  customers?: CustomerDto[];
  debtorsCount?: number;
  isLoading?: boolean;
  onFilterDebt?: () => void;
}

export const CustomerKpiCards: FC<CustomerKpiCardsProps> = ({
  summary,
  customers,
  debtorsCount,
  isLoading,
  onFilterDebt,
}) => {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', height: '110px', opacity: 0.6 }} />
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', height: '110px', opacity: 0.6 }} />
      </div>
    );
  }

  const totalDebt = summary?.totalDebtAR || 0;
  const countDebt =
    debtorsCount !== undefined
      ? debtorsCount
      : customers
        ? customers.filter((c) => (Number(c.currentDebtAR) || 0) > 0).length
        : summary?.totalCustomers
          ? Math.min(summary.totalCustomers, 5)
          : 0;

  return (
    <div
      className="kpi-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      {/* KPI 1: Khách nợ mình */}
      <div
        className="kpi-card"
        onClick={onFilterDebt}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          cursor: onFilterDebt ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
            Khách nợ mình (Tổng công nợ)
          </span>
          <span style={{ fontSize: '1.25rem' }}>💳</span>
        </div>
        <div
          style={{
            fontSize: 'clamp(1.5rem, 2vw, 1.85rem)',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatMoney(totalDebt)}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#0F766E', marginTop: '6px', fontWeight: 500 }}>
          Số liệu thật đồng bộ Hóa đơn & Sổ quỹ
        </div>
      </div>

      {/* KPI 2: Số khách đang nợ */}
      <div
        className="kpi-card"
        onClick={onFilterDebt}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          cursor: onFilterDebt ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
            Số khách đang nợ
          </span>
          <span style={{ fontSize: '1.25rem' }}>👥</span>
        </div>
        <div
          style={{
            fontSize: 'clamp(1.5rem, 2vw, 1.85rem)',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
          }}
        >
          {countDebt} khách
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
          Theo chi nhánh & toàn hệ thống
        </div>
      </div>

    </div>
  );
};

