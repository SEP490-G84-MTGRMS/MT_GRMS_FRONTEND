import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { BarChart3, CheckCircle2, Info } from 'lucide-react';
import {
  TaxPeriodType,
  type HouseholdTaxSnapshotDto,
} from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';

interface Props {
  snapshots?: HouseholdTaxSnapshotDto[];
  year: number;
  periodType?: TaxPeriodType;
}

export const TaxAnalyticsSection: FC<Props> = ({ snapshots = [], year, periodType }) => {
  // Chế độ xem: mặc định theo periodType của trang cha hoặc cho phép chuyển đổi
  const [viewMode, setViewMode] = useState<'quarter' | 'month'>(
    periodType === TaxPeriodType.Month ? 'month' : 'quarter'
  );

  // Đồng bộ khi periodType từ màn hình cha đổi
  useEffect(() => {
    if (periodType === TaxPeriodType.Month) {
      setViewMode('month');
    } else if (periodType === TaxPeriodType.Quarter) {
      setViewMode('quarter');
    }
  }, [periodType]);

  // Danh sách dữ liệu 4 Quý
  const quarterData = useMemo(() => {
    return [1, 2, 3, 4].map((q) => {
      const snap = snapshots.find(
        (s) =>
          (s.periodType === TaxPeriodType.Quarter || (s as any).quarter === q || !s.periodType) &&
          (s.periodNumber === q || (s as any).quarter === q)
      );
      const rev = snap?.taxableRevenueInPeriod ?? (snap as any)?.taxableRevenue ?? 0;
      const tax = snap?.totalTaxAmount ?? 0;
      return {
        periodNumber: q,
        label: `Quý ${q}/${year}`,
        shortLabel: `Q${q}`,
        snapshot: snap,
        revenue: rev,
        tax,
        isFinalized: Boolean(snap),
      };
    });
  }, [snapshots, year]);

  // Danh sách dữ liệu 12 Tháng
  const monthData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      const snap = snapshots.find(
        (s) => s.periodType === TaxPeriodType.Month && s.periodNumber === m
      );
      const rev = snap?.taxableRevenueInPeriod ?? (snap as any)?.taxableRevenue ?? 0;
      const tax = snap?.totalTaxAmount ?? 0;
      return {
        periodNumber: m,
        label: `Tháng ${m}/${year}`,
        shortLabel: `T${m}`,
        snapshot: snap,
        revenue: rev,
        tax,
        isFinalized: Boolean(snap),
      };
    });
  }, [snapshots, year]);

  const currentData = viewMode === 'quarter' ? quarterData : monthData;

  // Tính mức trần doanh thu biểu đồ
  const maxRevenue = Math.max(
    ...currentData.map((d) => d.revenue),
    viewMode === 'quarter' ? 400_000_000 : 100_000_000
  );

  // Tổng hợp KPI cả năm
  const totalYearRevenue = useMemo(() => {
    return snapshots.reduce(
      (sum, s) => sum + (s.taxableRevenueInPeriod ?? (s as any).taxableRevenue ?? 0),
      0
    );
  }, [snapshots]);

  const totalYearTax = useMemo(() => {
    return snapshots.reduce((sum, s) => sum + (s.totalTaxAmount ?? 0), 0);
  }, [snapshots]);

  const finalizedCount = snapshots.length;

  return (
    <div className="tax-table-card" style={{ padding: '24px 28px' }}>
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingBottom: 18,
          borderBottom: '1px solid #F1F5F9',
          marginBottom: 20,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <BarChart3 size={22} style={{ color: '#0F766E' }} />
            <span>
              Phân tích Doanh thu & Nghĩa vụ thuế {viewMode === 'quarter' ? '4 Quý' : '12 Tháng'} Năm {year}
            </span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Biểu đồ trực quan tiến độ kê khai và tỷ lệ thực hiện nghĩa vụ thuế theo chu kỳ quản trị
          </p>
        </div>

        {/* View Mode Toggle & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Switcher buttons */}
          <div
            style={{
              display: 'inline-flex',
              background: '#F1F5F9',
              padding: 3,
              borderRadius: 8,
              border: '1px solid #CBD5E1',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('quarter')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'quarter' ? '#ffffff' : 'transparent',
                color: viewMode === 'quarter' ? '#0F766E' : '#64748B',
                fontWeight: viewMode === 'quarter' ? 700 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'quarter' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Theo 4 Quý
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === 'month' ? '#ffffff' : 'transparent',
                color: viewMode === 'month' ? '#0F766E' : '#64748B',
                fontWeight: viewMode === 'month' ? 700 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Theo 12 Tháng
            </button>
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.78rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#0F766E', display: 'inline-block' }} />
              <span style={{ color: '#475569' }}>Doanh thu phát sinh</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#D97706', display: 'inline-block' }} />
              <span style={{ color: '#475569' }}>Tổng thuế nộp</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Tổng doanh thu đã chốt năm {year}:</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F766E', marginTop: 2 }}>
            {formatMoney(totalYearRevenue)}
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Tổng nghĩa vụ thuế năm {year}:</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#D97706', marginTop: 2 }}>
            {formatMoney(totalYearTax)}
          </div>
        </div>

        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>Tiến độ chốt kỳ tính thuế:</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
            {finalizedCount} kỳ hoàn tất
          </div>
        </div>
      </div>

      {/* Grid of Period Cards (4 Quarters or 12 Months) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'quarter'
              ? 'repeat(auto-fit, minmax(220px, 1fr))'
              : 'repeat(auto-fill, minmax(135px, 1fr))',
          gap: viewMode === 'quarter' ? 16 : 10,
        }}
      >
        {currentData.map((d) => {
          const heightPercent = d.revenue > 0 ? Math.min(100, Math.max(12, Math.round((d.revenue / maxRevenue) * 100))) : 0;
          const taxHeightPercent = d.tax > 0 ? Math.min(100, Math.max(8, Math.round((d.tax / (maxRevenue * 0.05)) * 100))) : 0;

          return (
            <div
              key={d.periodNumber}
              style={{
                background: d.isFinalized ? '#F0FDFA' : '#F8FAFC',
                border: d.isFinalized ? '1px solid #99F6E4' : '1px solid #E2E8F0',
                borderRadius: 12,
                padding: viewMode === 'quarter' ? '16px' : '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: viewMode === 'quarter' ? '0.88rem' : '0.8rem',
                    color: '#0F172A',
                  }}
                >
                  {viewMode === 'quarter' ? d.label : d.shortLabel}
                </span>

                {d.isFinalized ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 6px',
                      borderRadius: 9999,
                      background: '#CCFBF1',
                      color: '#0F766E',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={10} />
                    <span>Đã chốt</span>
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#94A3B8',
                      background: '#E2E8F0',
                      padding: '2px 6px',
                      borderRadius: 9999,
                      fontWeight: 600,
                    }}
                  >
                    Chưa chốt
                  </span>
                )}
              </div>

              {/* Chart Visual Bars */}
              <div
                style={{
                  height: viewMode === 'quarter' ? 120 : 90,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: viewMode === 'quarter' ? 12 : 6,
                  paddingBottom: 6,
                  borderBottom: '1px solid #E2E8F0',
                  background: '#ffffff',
                  borderRadius: 6,
                  padding: 6,
                }}
              >
                {/* Revenue Bar */}
                <div
                  style={{
                    width: viewMode === 'quarter' ? 28 : 16,
                    height: heightPercent > 0 ? `${heightPercent}%` : '4px',
                    background: heightPercent > 0 ? '#0F766E' : '#E2E8F0',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`Doanh thu phát sinh: ${formatMoney(d.revenue)}`}
                />

                {/* Tax Bar */}
                <div
                  style={{
                    width: viewMode === 'quarter' ? 20 : 12,
                    height: taxHeightPercent > 0 ? `${taxHeightPercent}%` : (d.isFinalized ? '4px' : '4px'),
                    background: taxHeightPercent > 0 ? '#D97706' : '#E2E8F0',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.3s ease',
                  }}
                  title={`Nghĩa vụ thuế: ${formatMoney(d.tax)}`}
                />
              </div>

              {/* Card Footer Numbers */}
              <div style={{ marginTop: 10, fontSize: '0.72rem', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Doanh thu:</span>
                  <strong style={{ color: '#0F172A' }}>
                    {d.revenue > 0 ? formatMoney(d.revenue) : (d.isFinalized ? '0đ' : '—')}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                  <span style={{ color: '#64748B' }}>Thuế nộp:</span>
                  <strong style={{ color: d.tax > 0 ? '#B45309' : '#0F766E' }}>
                    {d.tax > 0 ? formatMoney(d.tax) : (d.isFinalized ? '0đ (Miễn)' : '—')}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legal Reference Note */}
      <div
        style={{
          marginTop: 20,
          padding: '10px 14px',
          background: '#F8FAFC',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.76rem',
          color: '#64748B',
        }}
      >
        <Info size={15} style={{ color: '#0F766E', flexShrink: 0 }} />
        <span>
          Căn cứ Nghị định 68/2026/NĐ-CP và Nghị định 141/2026/NĐ-CP: Hộ kinh doanh có doanh thu năm ≤ 50 tỷ đồng thuộc diện khai thuế theo Quý; doanh thu trên 50 tỷ đồng khai thuế theo Tháng. Hệ thống hỗ trợ theo dõi tiến độ cả 4 Quý và 12 Tháng phục vụ đối soát nội bộ liên tục.
        </span>
      </div>
    </div>
  );
};
