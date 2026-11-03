import type { FC } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import type { CustomerKpiSummary } from '../types/customer.types';
import { formatMoney } from '../../finance/utils/formatters';

interface CustomerKpiCardsProps {
  summary?: CustomerKpiSummary;
  isLoading?: boolean;
  onFilterOverLimit?: () => void;
}

export const CustomerKpiCards: FC<CustomerKpiCardsProps> = ({
  summary,
  isLoading,
  onFilterOverLimit,
}) => {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', height: '96px', opacity: 0.6 }} />
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', height: '96px', opacity: 0.6 }} />
      </div>
    );
  }

  const totalDebt = summary?.totalDebtAR || 82_700_000;
  const overdueCount = summary?.overLimitCount || 2;

  return (
    <div
      className="customer-kpi-summary-strip"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      {/* Khối Trái (Tỷ lệ 7): Tổng nợ khách hàng */}
      <div
        style={{
          flex: '7 1 360px',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Khách đang nợ mình
          </span>
          <div
            style={{
              fontSize: 'clamp(1.75rem, 2.5vw, 2.25rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '6px 0 4px 0',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMoney(totalDebt)}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} color="#0D9488" />
            Tổng cộng <strong>5 khách</strong> đang có nợ mua chịu
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: '#F0FDFA',
              color: '#0F766E',
              border: '1px solid #99F6E4',
              whiteSpace: 'nowrap',
            }}
          >
            Hạn mức tín dụng
          </span>
        </div>
      </div>

      {/* Khối Phải (Tỷ lệ 5): Cảnh báo khách vượt hạn mức */}
      <div
        style={{
          flex: '5 1 300px',
          background: '#FEF2F2',
          borderRadius: '16px',
          padding: '20px 24px',
          border: '1px solid #FECACA',
          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#DC2626',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', display: 'block' }}>
              {overdueCount} khách vượt hạn mức nợ
            </span>
            <span style={{ fontSize: '0.82rem', color: '#B91C1C', marginTop: '4px', display: 'block', lineHeight: 1.4 }}>
              Đang chặn bán nợ thêm cho tới khi thanh toán
            </span>
          </div>
        </div>

        {onFilterOverLimit && (
          <button
            type="button"
            onClick={onFilterOverLimit}
            style={{
              padding: '8px 16px',
              background: '#DC2626',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
            }}
          >
            Lọc danh sách
          </button>
        )}
      </div>
    </div>
  );
};
