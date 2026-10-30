import React from 'react';
import {
  TrendingUp,
  Percent,
  Receipt,
  Scale,
  Layers,
  Clock,
} from 'lucide-react';
import type { HouseholdTaxSummaryDto } from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';
import { getTaxFilingDeadline } from '../../finance/config/taxConfig';

interface TaxKPICardsProps {
  summary?: HouseholdTaxSummaryDto;
  isLoading?: boolean;
}

export const TaxKPICards: React.FC<TaxKPICardsProps> = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="tax-kpi-grid">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="tax-kpi-card" style={{ opacity: 0.6 }}>
            <div className="tax-kpi-title">Đang tải dữ liệu...</div>
            <div className="tax-kpi-value">---</div>
          </div>
        ))}
      </div>
    );
  }

  const periodLabel =
    summary.periodType === 1
      ? `Tháng ${summary.periodNumber}/${summary.year}`
      : summary.periodType === 2
      ? `Quý ${summary.periodNumber}/${summary.year}`
      : `Cả năm ${summary.year}`;

  const deadline = getTaxFilingDeadline(summary.periodType, summary.periodNumber, summary.year);

  return (
    <>
      {summary.isThresholdCrossedMidYear && (
        <div style={{ background: '#FFFBEB', border: '1px solid #F59E0B', color: '#92400E', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔔</span>
          <span><strong>Lưu ý vượt ngưỡng miễn thuế giữa năm:</strong> {summary.thresholdExceededNote || 'Doanh thu năm lũy kế đã vượt ngưỡng 1 tỷ VNĐ trong kỳ này. Hệ thống bắt đầu tính nghĩa vụ thuế GTGT và TNCN theo thuế suất ngành nghề đăng ký trên phần doanh thu vượt ngưỡng. Khuyến nghị chủ hộ tham vấn cơ quan thuế địa bàn về quy định kê khai và chính sách áp dụng cho trường hợp vượt ngưỡng giữa năm.'}</span>
        </div>
      )}
      {summary.isApproachingGroup4Threshold && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠️</span>
          <span><strong>Cảnh báo doanh thu tiến sát ngưỡng:</strong> Doanh thu năm đạt {formatMoney(summary.annualAccumulatedRevenue)} (tiến sát ngưỡng 50 tỷ). Chủ hộ cần chuẩn bị chuyển sang kỳ kê khai theo Tháng hoặc chuyển đổi mô hình Doanh nghiệp từ năm sau.</span>
        </div>
      )}
      {summary.isExceedingGroup4Threshold && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🚨</span>
          <span><strong>Doanh thu vượt ngưỡng 50 tỷ:</strong> Theo quy định pháp luật, hộ kinh doanh đạt quy mô trên 50 tỷ/năm phải áp dụng chế độ kế toán doanh nghiệp đầy đủ hoặc chuyển đổi sang Công ty.</span>
        </div>
      )}
      <div className="tax-kpi-grid">
      {/* KPI 1: Doanh thu phát sinh trong kỳ */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Doanh thu phát sinh</span>
          <div className="tax-kpi-icon tax-icon-teal">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#0F172A' }}>
          {formatMoney(summary.taxableRevenueInPeriod)}
        </div>
        <div className="tax-kpi-subtext">
          {periodLabel} (Lũy kế: <strong>{formatMoney(summary.annualAccumulatedRevenue)}</strong>)
        </div>
      </div>

      {/* KPI 2: Thuế GTGT của kỳ */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Thuế GTGT ({summary.vatRate}%)</span>
          <div className="tax-kpi-icon tax-icon-teal">
            <Percent size={18} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#0F766E' }}>
          {formatMoney(summary.vatAmount)}
        </div>
        <div className="tax-kpi-subtext" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Doanh thu {periodLabel}</span>
          {summary.isVatReduced && (
            <span
              style={{
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: 4,
                background: '#DCFCE7',
                color: '#15803D',
                fontWeight: 700,
              }}
            >
              Giảm 20%
            </span>
          )}
        </div>
      </div>

      {/* KPI 3: Thuế TNCN của kỳ */}
      <div className="tax-kpi-card">
        <div className="tax-kpi-header">
          <span className="tax-kpi-title">Thuế TNCN ({summary.pitRate}%)</span>
          <div className="tax-kpi-icon tax-icon-purple">
            <Receipt size={18} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#7C3AED' }}>
          {formatMoney(summary.pitAmount)}
        </div>
        <div className="tax-kpi-subtext">
          {summary.isTaxExempt ? (
            <span style={{ color: '#059669', fontWeight: 600 }}>Miễn thuế (≤ 1 tỷ)</span>
          ) : (
            <span>Tính trên phần vượt trần</span>
          )}
        </div>
      </div>

      {/* KPI 4: Thuế riêng của Kỳ này (Quý 3) */}
      <div className="tax-kpi-card" style={{ background: '#F0FDFA', borderColor: '#99F6E4' }}>
        <div className="tax-kpi-header">
          <span className="tax-kpi-title" style={{ color: '#0F766E', fontWeight: 800 }}>
            Thuế {periodLabel}
          </span>
          <div className="tax-kpi-icon" style={{ background: '#CCFBF1', color: '#0F766E' }}>
            <Scale size={18} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#0F766E', fontWeight: 900 }}>
          {formatMoney(summary.totalTaxAmount)}
        </div>
        <div className="tax-kpi-subtext" style={{ display: 'flex', alignItems: 'center', gap: 4, color: deadline.isUrgent ? '#DC2626' : '#0F766E', flexWrap: 'wrap' }}>
          <Clock size={12} />
          <span>
            Hạn nộp: <strong>{deadline.displayDeadline}</strong>
          </span>
          {deadline.isRolledOver && (
            <span style={{ fontSize: '0.68rem', color: '#0F766E', background: '#E6FFFA', padding: '1px 4px', borderRadius: 3 }}>
              (Dời từ 31/10)
            </span>
          )}
        </div>
      </div>

      {/* KPI 5: Thuế đã phát sinh (Quý 1 – Quý 3) */}
      <div className="tax-kpi-card" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
        <div className="tax-kpi-header">
          <span className="tax-kpi-title" style={{ color: '#B45309', fontWeight: 800 }}>
            Thuế đã phát sinh
          </span>
          <div className="tax-kpi-icon tax-icon-amber">
            <Layers size={18} />
          </div>
        </div>
        <div className="tax-kpi-value" style={{ color: '#B45309', fontWeight: 900 }}>
          {formatMoney(summary.totalTaxAmount)}
        </div>
        <div className="tax-kpi-subtext" style={{ color: '#92400E' }}>
          Q1+Q2 (0đ) + Q3 ({formatMoney(summary.totalTaxAmount)})
        </div>
      </div>
    </div>
    </>
  );
};
