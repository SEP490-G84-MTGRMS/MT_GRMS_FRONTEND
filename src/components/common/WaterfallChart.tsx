import React from 'react';
import { PnlWaterfallSvg } from '../../features/finance/components/PnlWaterfallSvg';

/**
 * Single step item displayed inside the P&L waterfall chart.
 */
export interface WaterfallItem {
  id: string;
  label: string;
  amount: number;
  type: 'positive' | 'negative' | 'subtotal' | 'total';
  subLabel?: string;
  isIndent?: boolean;
}

/**
 * Props for the WaterfallChart component.
 */
export interface WaterfallChartProps {
  items: WaterfallItem[];
  title?: string;
  periodLabel?: string;
}

interface WaterfallRowVisuals {
  padding: string;
  backgroundColor: string;
  border: string;
  iconBg: string;
  iconColor: string;
  iconSymbol: string;
  labelColor: string;
  amountColor: string;
  showMinus: boolean;
  isTotal: boolean;
  isSubtotal: boolean;
}

/**
 * Computes visual tokens for a waterfall row, treating negative totals and subtotals as losses.
 */
function getWaterfallRowVisuals(item: WaterfallItem): WaterfallRowVisuals {
  const isTotal = item.type === 'total';
  const isSubtotal = item.type === 'subtotal';
  const isLoss = item.amount < 0;
  const isNegative = item.type === 'negative' || isLoss;
  const showMinus = isLoss || (item.type === 'negative' && item.amount !== 0);

  const padding = isTotal ? '16px 20px' : isSubtotal ? '12px 16px' : '10px 16px';
  const backgroundColor = isLoss && (isTotal || isSubtotal)
    ? '#FEF2F2'
    : isTotal ? '#ECFDF5' : isSubtotal ? '#F3F4F6' : '#FFFFFF';
  const border = isTotal
    ? (isLoss ? '2px solid #EF4444' : '2px solid #10B981')
    : isSubtotal
    ? (isLoss ? '1px solid #FCA5A5' : '1px solid #D1D5DB')
    : '1px solid #F3F4F6';
  const iconBg = isTotal ? (isLoss ? '#DC2626' : '#10B981') : isNegative ? '#FEE2E2' : '#DCFCE7';
  const iconColor = isTotal ? '#FFFFFF' : isNegative ? '#DC2626' : '#15803D';
  const iconSymbol = isNegative ? '−' : isTotal || isSubtotal ? '=' : '+';
  const labelColor = isLoss && (isTotal || isSubtotal) ? '#B91C1C' : isTotal ? '#065F46' : '#1F2937';
  const amountColor = isTotal
    ? (isLoss ? '#B91C1C' : '#047857')
    : isNegative ? '#DC2626' : isSubtotal ? '#111827' : '#0F766E';

  return {
    padding, backgroundColor, border, iconBg, iconColor, iconSymbol,
    labelColor, amountColor, showMinus, isTotal, isSubtotal,
  };
}

/**
 * Renders an individual waterfall step row with sign icon, label, and formatted amount.
 */
const WaterfallRow: React.FC<{ item: WaterfallItem }> = ({ item }) => {
  const v = getWaterfallRowVisuals(item);
  const bold = v.isTotal || v.isSubtotal;
  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '12px', padding: v.padding, borderRadius: '8px',
    backgroundColor: v.backgroundColor, border: v.border,
    marginLeft: item.isIndent ? '24px' : '0px',
  };
  const badgeStyle: React.CSSProperties = {
    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
    backgroundColor: v.iconBg, color: v.iconColor, fontSize: '14px', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 200px' }}>
        <span style={badgeStyle}>{v.iconSymbol}</span>
        <div>
          <div style={{ fontSize: v.isTotal ? '16px' : '14px', fontWeight: bold ? 700 : 500, color: v.labelColor }}>
            {item.label}
          </div>
          {item.subLabel && (
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{item.subLabel}</div>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'auto' }}>
        <span style={{ fontSize: v.isTotal ? '20px' : '16px', fontWeight: bold ? 800 : 600, color: v.amountColor, fontVariantNumeric: 'tabular-nums' }}>
          {v.showMinus && '-'}
          {Math.abs(item.amount).toLocaleString('vi-VN')} đ
        </span>
      </div>
    </div>
  );
};

/**
 * Displays a step-by-step P&L profit waterfall with both visual SVG 6-step column bars
 * and granular reconciliation rows from net revenue to net profit.
 */
export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  items,
  title = 'Bậc thang Lợi nhuận (P&L)',
  periodLabel = 'Tháng này',
}) => {
  const revItem = items.find((i) => i.id === 'rev');
  const cogsItem = items.find((i) => i.id === 'cogs');
  const grossItem = items.find((i) => i.id === 'gross');
  const opexItem = items.find((i) => i.id === 'opex');
  const taxItem = items.find((i) => i.id === 'tax');
  const netItem = items.find((i) => i.id === 'net');

  const netRevenue = revItem ? Math.abs(revItem.amount) : 0;
  const cogs = cogsItem ? Math.abs(cogsItem.amount) : 0;
  const grossProfit = grossItem ? grossItem.amount : (netRevenue - cogs);
  const opExpenses = opexItem ? Math.abs(opexItem.amount) : 0;
  const estTax = taxItem ? Math.abs(taxItem.amount) : 0;
  const netProfit = netItem ? netItem.amount : (grossProfit - opExpenses - estTax);

  const isAccrual = title.includes('Kế toán dồn tích');

  return (
    <div
      className="waterfall-chart-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '24px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Phép tính cộng trừ trực quan, ăn khớp 100% bằng mắt ({periodLabel})
          </p>
        </div>
      </div>

      {/* Visual SVG Waterfall Chart 6 Steps */}
      {netRevenue > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <PnlWaterfallSvg
            netRevenue={netRevenue}
            cogs={cogs}
            grossProfit={grossProfit}
            opExpenses={opExpenses}
            estTax={estTax}
            netProfit={netProfit}
            periodLabel={periodLabel}
            accountingBasis={isAccrual ? 'ACCRUAL' : 'CASH'}
          />
        </div>
      )}

      {/* Detailed rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <WaterfallRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
