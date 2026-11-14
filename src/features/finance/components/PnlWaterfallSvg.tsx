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
  const rev = Math.max(netRevenue, 0);
  const absCogs = Math.abs(cogs);
  const absGross = Math.max(0, grossProfit);
  const absOpex = Math.abs(opExpenses);
  const absTax = Math.abs(estTax);
  const absNet = Math.max(0, netProfit);

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
      value: absCogs,
      delta: absCogs,
      color: '#EA580C', // Orange
      isNeg: true,
      operator: '−',
    },
    {
      type: 'gross',
      label1: 'Lợi nhuận',
      label2: 'gộp',
      value: absGross,
      delta: grossProfit,
      color: '#0F766E', // Teal
      isNeg: grossProfit < 0,
      operator: '=',
    },
    {
      type: 'opex',
      label1: '- Chi phí',
      label2: 'vận hành',
      value: absOpex,
      delta: absOpex,
      color: '#EA580C', // Orange
      isNeg: true,
      operator: '−',
    },
    {
      type: 'tax',
      label1: '- Thuế',
      label2: 'ước tính',
      value: absTax,
      delta: absTax,
      color: '#D97706', // Amber
      isNeg: true,
      operator: '−',
    },
    {
      type: 'net',
      label1: 'Lãi ròng',
      label2: 'giữ lại',
      value: absNet,
      delta: netProfit,
      color: '#16A34A', // Emerald
      isNeg: netProfit < 0,
      operator: '=',
    },
  ];

  const maxVal = Math.max(rev, absCogs, absGross, absOpex, absTax, absNet, 1);
  const chartTop = 36;
  const chartH = 175;
  const baselineY = chartTop + chartH; // 211 — horizontal axis (0)

  return (
    <div className="pnl-waterfall-svg-wrapper">
      <div className="pnl-waterfall-header-row">
        <div>
          <h4 className="pnl-waterfall-title">
            Dòng chảy Lợi nhuận (P&L Waterfall) - 6 bước trực quan
          </h4>
          <p className="pnl-waterfall-subtitle">
            Cơ sở: {accountingBasis === 'CASH' ? 'Thực thu thực chi' : 'Sổ kế toán dồn tích'} ({periodLabel})
          </p>
        </div>
        <div className="pnl-waterfall-legend">
          <span className="legend-badge teal">Doanh thu / Lãi</span>
          <span className="legend-badge orange">Chi phí &amp; Giá vốn</span>
          <span className="legend-badge green">Lãi ròng về két</span>
        </div>
      </div>

      <div className="pnl-waterfall-svg-container" style={{ overflowX: 'auto', width: '100%' }}>
        <svg
          viewBox="0 0 760 264"
          width="100%"
          style={{ minWidth: '600px', maxHeight: '280px', display: 'block' }}
          role="img"
          aria-label="Biểu đồ thác nước lãi lỗ 6 bước"
        >
          {/* Background Reference Grid Lines */}
          <line x1="28" y1="211" x2="732" y2="211" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="28" y1="123" x2="732" y2="123" stroke="#e2e8f0" strokeDasharray="4 4" />
          <line x1="28" y1="36" x2="732" y2="36" stroke="#e2e8f0" strokeDasharray="4 4" />

          {/* Value Labels for reference lines */}
          <text x="736" y="215" fontSize="10" fill="#94a3b8" textAnchor="start">0</text>
          <text x="736" y="127" fontSize="10" fill="#94a3b8" textAnchor="start">
            {(maxVal / 2000000).toFixed(0)}tr
          </text>
          <text x="736" y="40" fontSize="10" fill="#94a3b8" textAnchor="start">
            {(maxVal / 1000000).toFixed(0)}tr
          </text>

          {/* 6 Step Grounded Waterfall Bars (all anchored at baselineY = 211) */}
          {bars.map((bar, idx) => {
            const x = 44 + idx * 116;
            const rawHeight = (Math.abs(bar.value) / maxVal) * chartH;
            const h = bar.value === 0 ? 3 : Math.max(6, rawHeight);
            const y = baselineY - h;
            const absDelta = Math.abs(bar.delta);
            const deltaMillions = (absDelta / 1000000).toFixed(1).replace('.', ',') + 'tr';
            const labelVal = (bar.isNeg && absDelta > 0 ? '-' : '') + deltaMillions;
            const valY = Math.max(18, y - 8);

            const prevBar = idx > 0 ? bars[idx - 1] : null;
            const prevRawH = prevBar ? (Math.abs(prevBar.value) / maxVal) * chartH : 0;
            const prevH = prevBar ? (prevBar.value === 0 ? 3 : Math.max(6, prevRawH)) : 0;
            const prevY = baselineY - prevH;

            return (
              <g key={bar.type} className="waterfall-bar-group">
                <title>{`${bar.label1} ${bar.label2}: ${bar.isNeg && absDelta > 0 ? '-' : ''}${formatMoney(absDelta)}`}</title>
                {/* Connecting dashed line & math operator badge from previous bar */}
                {idx > 0 && (
                  <>
                    <line
                      x1={x - 40}
                      y1={prevY.toFixed(1)}
                      x2={x}
                      y2={y.toFixed(1)}
                      stroke="#cbd5e1"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    {bar.operator && (
                      <g transform={`translate(${x - 20}, 235)`}>
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
                  </>
                )}
                {/* Main bar grounded at horizontal axis (baselineY = 211) */}
                <rect
                  x={x}
                  y={y.toFixed(1)}
                  width="76"
                  height={h.toFixed(1)}
                  rx="6"
                  fill={bar.color}
                  className="waterfall-bar-rect"
                />
                {/* Value on top of bar */}
                <text
                  x={x + 38}
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
                  x={x + 38}
                  y="232"
                  textAnchor="middle"
                  fontSize="11.5"
                  fontWeight="600"
                  fill="#334155"
                >
                  {bar.label1}
                </text>
                <text
                  x={x + 38}
                  y="248"
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
