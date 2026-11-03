import React from 'react';

export interface WaterfallItem {
  id: string;
  label: string;
  amount: number;
  type: 'positive' | 'negative' | 'subtotal' | 'total';
  subLabel?: string;
  isIndent?: boolean;
}

export interface WaterfallChartProps {
  items: WaterfallItem[];
  title?: string;
  periodLabel?: string;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  items,
  title = 'Bậc thang Lợi nhuận (P&L)',
  periodLabel = 'Tháng này',
}) => {
  return (
    <div
      className="waterfall-chart-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{title}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Phép tính cộng trừ trực quan, ăn khớp 100% bằng mắt ({periodLabel})
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => {
          const isTotal = item.type === 'total';
          const isSubtotal = item.type === 'subtotal';
          const isNegative = item.type === 'negative';

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isTotal ? '16px 20px' : isSubtotal ? '12px 16px' : '10px 16px',
                borderRadius: '8px',
                backgroundColor: isTotal ? '#ECFDF5' : isSubtotal ? '#F3F4F6' : '#FFFFFF',
                border: isTotal ? '2px solid #10B981' : isSubtotal ? '1px solid #D1D5DB' : '1px solid #F3F4F6',
                marginLeft: item.isIndent ? '24px' : '0px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: isTotal ? '#10B981' : isNegative ? '#FEE2E2' : '#DCFCE7',
                    color: isTotal ? '#FFFFFF' : isNegative ? '#DC2626' : '#15803D',
                    fontSize: '14px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isTotal ? '=' : isSubtotal ? '=' : isNegative ? '−' : '+'}
                </span>

                <div>
                  <div
                    style={{
                      fontSize: isTotal ? '16px' : '14px',
                      fontWeight: isTotal || isSubtotal ? 700 : 500,
                      color: isTotal ? '#065F46' : '#1F2937',
                    }}
                  >
                    {item.label}
                  </div>
                  {item.subLabel && (
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{item.subLabel}</div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: isTotal ? '20px' : '16px',
                    fontWeight: isTotal || isSubtotal ? 800 : 600,
                    color: isTotal
                      ? '#047857'
                      : isNegative
                      ? '#DC2626'
                      : isSubtotal
                      ? '#111827'
                      : '#0F766E',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {isNegative && '-'}
                  {Math.abs(item.amount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
