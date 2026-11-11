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
  start: number;
  end: number;
  delta: number;
  color: string;
  isNeg: boolean;
  type: 'rev' | 'cogs' | 'gross' | 'opex' | 'tax' | 'net';
}

/**
 * Visual SVG 6-step Waterfall Chart for P&L breakdown
 * (Net Revenue -> COGS -> Gross Profit -> OpEx -> HKD Tax -> Net Profit).
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
  const rev = Math.max(netRevenue, 1);
  const afterCogs = Math.max(0, rev - cogs);
  const afterOp = Math.max(0, afterCogs - opExpenses);
  const net = Math.max(0, afterOp - estTax);

  const bars: WaterfallBarDescriptor[] = [
    {
      type: 'rev',
      label1: 'Doanh thu',
      label2: 'thuần',
      start: 0,
      end: rev,
      delta: rev,
      color: '#0F766E', // Teal
      isNeg: false,
    },
    {
      type: 'cogs',
      label1: '- Giá vốn',
      label2: 'hàng bán',
      start: afterCogs,
      end: rev,
      delta: cogs,
      color: '#EA580C', // Orange
      isNeg: true,
    },
    {
      type: 'gross',
      label1: 'Lợi nhuận',
      label2: 'gộp',
      start: 0,
      end: afterCogs,
      delta: grossProfit,
      color: '#0F766E', // Teal
      isNeg: false,
    },
    {
      type: 'opex',
      label1: '- Chi phí',
      label2: 'vận hành',
      start: afterOp,
      end: afterCogs,
      delta: opExpenses,
      color: '#EA580C', // Orange
      isNeg: true,
    },
    {
      type: 'tax',
      label1: '- Thuế',
      label2: 'ước tính',
      start: net,
      end: afterOp,
      delta: estTax,
      color: '#D97706', // Amber
      isNeg: true,
    },
    {
      type: 'net',
      label1: 'Lãi ròng',
      label2: 'giữ lại',
      start: 0,
      end: net,
      delta: netProfit,
      color: '#16A34A', // Emerald
      isNeg: false,
    },
  ];

  const maxVal = Math.max(rev, 1);
  const chartTop = 36;
  const chartH = 175;

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

          {/* 6 Step Waterfall Bars */}
          {bars.map((bar, idx) => {
            const x = 44 + idx * 116;
            const topY = chartTop + chartH - (bar.end / maxVal) * chartH;
            const botY = chartTop + chartH - (bar.start / maxVal) * chartH;
            const y = Math.min(topY, botY);
            const h = Math.max(6, Math.abs(botY - topY));
            const deltaMillions = (bar.delta / 1000000).toFixed(1).replace('.', ',') + 'tr';
            const labelVal = (bar.isNeg ? '-' : '') + deltaMillions;
            const valY = Math.max(18, y - 8);

            return (
              <g key={bar.type} className="waterfall-bar-group">
                <title>{`${bar.label1} ${bar.label2}: ${bar.isNeg ? '-' : ''}${formatMoney(bar.delta)}`}</title>
                {/* Connecting dashed line to previous bar */}
                {idx > 0 && (
                  <line
                    x1={x - 40}
                    y1={y}
                    x2={x}
                    y2={y}
                    stroke="#94a3b8"
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                )}
                {/* Main bar */}
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
