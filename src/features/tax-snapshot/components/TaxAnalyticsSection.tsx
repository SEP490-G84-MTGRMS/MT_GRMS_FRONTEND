import type { FC } from 'react';
import { BarChart3 } from 'lucide-react';
import type { TaxSnapshot } from '../types/taxSnapshot';

interface Props {
  snapshots: TaxSnapshot[];
  year: number;
}

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const TaxAnalyticsSection: FC<Props> = ({ snapshots, year }) => {
  const quarters = [1, 2, 3, 4];
  const maxRevenue = Math.max(
    ...snapshots.map((s) => s.taxableRevenue ?? s.taxableRevenueInPeriod ?? 0),
    600000000
  );

  return (
    <div className="tax-table-card" style={{ padding: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 16, borderBottom: '1px solid #F1F5F9', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={20} style={{ color: '#0F766E' }} />
            <span>Phân tích Doanh thu & Nghĩa vụ thuế 4 Quý Năm {year}</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Biểu đồ trực quan tiến độ kê khai và tỷ lệ tăng trưởng doanh thu
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.78rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0F766E', display: 'inline-block' }} />
            <span style={{ color: '#475569' }}>Doanh thu chịu thuế</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#D97706', display: 'inline-block' }} />
            <span style={{ color: '#475569' }}>Tổng thuế nộp</span>
          </div>
        </div>
      </div>

      <div className="tax-analytics-grid">
        {quarters.map((q) => {
          const snapshot = snapshots.find((s) => (s.quarter ?? s.periodNumber) === q);
          const revenue = snapshot?.taxableRevenue ?? snapshot?.taxableRevenueInPeriod ?? 0;
          const tax = snapshot?.totalTaxAmount || 0;
          const heightPercent = Math.min(100, Math.round((revenue / maxRevenue) * 100));

          return (
            <div key={q} className="tax-quarter-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>Quý {q}/{year}</span>
                {snapshot ? (
                  <span className="tax-badge tax-badge-finalized" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {snapshot.status || 'Đã chốt'}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', background: '#E2E8F0', padding: '2px 8px', borderRadius: 9999 }}>
                    Chưa chốt
                  </span>
                )}
              </div>

              {/* Chart Visual Bars */}
              <div style={{ height: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
                <div
                  style={{
                    width: 32,
                    height: `${heightPercent}%`,
                    background: '#0F766E',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s ease',
                  }}
                  title={`Doanh thu: ${formatVND(revenue)}`}
                />
                <div
                  style={{
                    width: 22,
                    height: `${Math.max(8, Math.round(heightPercent * 0.28))}%`,
                    background: '#D97706',
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s ease',
                  }}
                  title={`Thuế: ${formatVND(tax)}`}
                />
              </div>

              <div style={{ marginTop: 12, fontSize: '0.75rem', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Doanh thu:</span>
                  <strong style={{ color: '#0F172A' }}>{revenue > 0 ? formatVND(revenue) : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Thuế nộp:</span>
                  <strong style={{ color: '#B45309' }}>{tax > 0 ? formatVND(tax) : '—'}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
