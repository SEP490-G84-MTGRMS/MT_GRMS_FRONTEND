import React from 'react';
import { formatMoney } from '../utils/formatters';

export interface PnlWaterfallSvgProps {
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  opExpenses: number;
  estTax: number;
  netProfit: number;
  periodLabel?: string;
  accountingBasis?: 'CASH' | 'ACCRUAL';
}

interface WaterfallBarDescriptor {
  label1: string;
  label2: string;
  value: number;
  delta: number;
  color: string;
  isNeg: boolean;
  operator?: '−' | '=';
  type: 'rev' | 'cogs' | 'gross' | 'opex' | 'tax' | 'net';
}

/**
 * Visual SVG 6-step Waterfall Chart for P&L breakdown
 * (Net Revenue -> COGS -> Gross Profit -> OpEx -> HKD Tax -> Net Profit).
 * All bars are grounded on the horizontal baseline (bottom = 0) with heights
 * directly proportional to their absolute values for clear visual comparison.
 */
export const PnlWaterfallSvg: React.FC<PnlWaterfallSvgProps> = ({
  netRevenue,
  cogs,
  grossProfit,
  opExpenses,
  estTax,
  netProfit,
  periodLabel = 'Tháng này',
  accountingBasis = 'CASH',
}) => {
  const formatCompactVnd = (amount: number): string => {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1).replace('.', ',')}tr`;
    if (abs >= 1_000) return `${Math.round(abs / 1_000)}k`;
    return `${Math.round(abs)}đ`;
  };

  const rev = Math.max(netRevenue, 0);
  const absCogs = Math.abs(cogs);
  const absOpex = Math.abs(opExpenses);
  const absTax = Math.abs(estTax);

  const bars: WaterfallBarDescriptor[] = [
    {
      type: 'rev',
      label1: 'Doanh thu',
      label2: 'thuần',
      value: rev,
      delta: rev,
      color: '#0F766E', // Teal
      isNeg: false,
    },
    {
      type: 'cogs',
      label1: '- Giá vốn',
      label2: 'hàng bán',
      value: -absCogs,
      delta: absCogs,
      color: '#EA580C', // Orange
      isNeg: true,
      operator: '−',
    },
    {
      type: 'gross',
      label1: 'Lợi nhuận',
      label2: 'gộp',
      value: grossProfit,
      delta: grossProfit,
      color: grossProfit < 0 ? '#DC2626' : '#0F766E',
      isNeg: grossProfit < 0,
      operator: '=',
    },
    {
      type: 'opex',
      label1: '- Chi phí',
      label2: 'vận hành',
      value: -absOpex,
      delta: absOpex,
      color: '#EA580C', // Orange
      isNeg: true,
      operator: '−',
    },
    ...(absTax > 0
      ? [
          {
            type: 'tax' as const,
            label1: '- Thuế',
            label2: 'ước tính',
            value: -absTax,
            delta: absTax,
            color: '#D97706', // Amber
            isNeg: true,
            operator: '−' as const,
          },
        ]
      : []),
    {
      type: 'net',
      label1: netProfit < 0 ? 'Lỗ ròng' : 'Lãi ròng',
      label2: netProfit < 0 ? 'trong kỳ' : 'giữ lại',
      value: netProfit,
      delta: netProfit,
      color: netProfit < 0 ? '#DC2626' : '#16A34A',
      isNeg: netProfit < 0,
      operator: '=',
    },
  ];

  const maxPos = Math.max(...bars.map((b) => (b.value > 0 ? b.value : 0)), 0);
  const maxNeg = Math.max(...bars.map((b) => (b.value < 0 ? Math.abs(b.value) : 0)), 0);
  const totalSpan = Math.max(maxPos + maxNeg, 1);
  const chartTop = 34;
  const chartH = 186;
  const zeroY = maxNeg === 0
    ? chartTop + chartH
    : maxPos === 0
    ? chartTop + 12
    : chartTop + (maxPos / totalSpan) * chartH;
  const stepX = bars.length === 5 ? 136 : 114;
  const barWidth = bars.length === 5 ? 84 : 74;

  return (
    <div className="pnl-waterfall-svg-wrapper">
      <div className="pnl-waterfall-header-row">
        <div>
          <h4 className="pnl-waterfall-title">
            Bậc thang Lợi nhuận P&amp;L ({accountingBasis === 'CASH' ? 'Thực thu thực chi' : 'Kế toán dồn tích'})
          </h4>
          <p className="pnl-waterfall-subtitle">
            Dòng chảy Lợi nhuận (P&amp;L Waterfall) · Cơ sở: {accountingBasis === 'CASH' ? 'Thực thu thực chi' : 'Sổ kế toán dồn tích'} · {periodLabel}
          </p>
        </div>
        <div className="pnl-waterfall-legend">
          <span className="legend-badge teal">Doanh thu / Lãi gộp</span>
          <span className="legend-badge orange">Chi phí &amp; Giá vốn</span>
          <span className={`legend-badge ${netProfit < 0 ? 'red' : 'green'}`}>
            {netProfit < 0 ? 'Lỗ ròng trong kỳ' : 'Lãi ròng về két'}
          </span>
        </div>
      </div>

      <div className="pnl-waterfall-svg-container" style={{ overflowX: 'auto', width: '100%' }}>
        <svg
          viewBox="0 0 800 288"
          width="100%"
          style={{ minWidth: '580px', maxHeight: '300px', display: 'block' }}
          role="img"
          aria-label={`Biểu đồ thác nước lãi lỗ ${bars.length} bước`}
        >
          {/* Background Reference Grid Lines */}
          <line x1="28" y1={zeroY.toFixed(1)} x2="722" y2={zeroY.toFixed(1)} stroke="#94a3b8" strokeWidth="1.5" />
          {maxPos > 0 && (
            <line x1="28" y1={chartTop} x2="722" y2={chartTop} stroke="#e2e8f0" strokeDasharray="4 4" />
          )}
          {maxNeg > 0 && (
            <line x1="28" y1={(chartTop + chartH).toFixed(1)} x2="722" y2={(chartTop + chartH).toFixed(1)} stroke="#fecaca" strokeDasharray="4 4" />
          )}

          {/* Value Labels for reference lines */}
          <text x="728" y={(zeroY + 4).toFixed(1)} fontSize="10" fill="#64748b" fontWeight="700" textAnchor="start">0</text>
          {maxPos > 0 && (
            <text x="728" y={(chartTop + 4).toFixed(1)} fontSize="10" fill="#0F766E" textAnchor="start">
              +{formatCompactVnd(maxPos)}
            </text>
          )}
          {maxNeg > 0 && (
            <text x="728" y={(chartTop + chartH + 4).toFixed(1)} fontSize="10" fill="#DC2626" textAnchor="start">
              -{formatCompactVnd(maxNeg)}
            </text>
          )}

          {/* Signed Waterfall Bars (positive bars point up from zeroY, negative bars point down from zeroY) */}
          {bars.map((bar, idx) => {
            const x = 42 + idx * stepX;
            const rawHeight = (Math.abs(bar.value) / totalSpan) * chartH;
            const h = bar.value === 0 ? 3 : Math.max(8, rawHeight);
            const isDown = bar.value < 0;
            const y = isDown ? zeroY : zeroY - h;
            const absDelta = Math.abs(bar.delta);
            const compactVal = formatCompactVnd(absDelta);
            const labelVal = (bar.isNeg && absDelta > 0 ? '-' : '') + compactVal;
            const valY = isDown ? Math.min(240, zeroY + h + 14) : Math.max(18, y - 7);

            return (
              <g key={bar.type} className="waterfall-bar-group">
                <title>{`${bar.label1} ${bar.label2}: ${bar.isNeg && absDelta > 0 ? '-' : ''}${formatMoney(absDelta)}`}</title>
                {/* Math operator badge between bars */}
                {idx > 0 && bar.operator && (
                  <g transform={`translate(${x - (stepX - barWidth) / 2}, 260)`}>
                    <circle r="9" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="800"
                      fill="#475569"
                    >
                      {bar.operator}
                    </text>
                  </g>
                )}
                {/* Main bar anchored at zeroY */}
                <rect
                  x={x}
                  y={y.toFixed(1)}
                  width={barWidth}
                  height={h.toFixed(1)}
                  rx="6"
                  fill={bar.color}
                  className="waterfall-bar-rect"
                />
                {/* Value label above positive bar / below negative bar */}
                <text
                  x={x + barWidth / 2}
                  y={valY.toFixed(1)}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={bar.color}
                >
                  {labelVal}
                </text>
                {/* Labels below chart */}
                <text
                  x={x + barWidth / 2}
                  y="260"
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#334155"
                >
                  {bar.label1}
                </text>
                <text
                  x={x + barWidth / 2}
                  y="276"
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                >
                  {bar.label2}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
