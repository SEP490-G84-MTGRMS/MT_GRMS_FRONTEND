import React, { useState } from 'react';
import {
  Calculator,
  Scale,
  Building2,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  TaxCalculationMethod,
  HouseholdTaxGroup,
  type HouseholdTaxSummaryDto,
} from '../types/taxSnapshot';
import { formatMoney } from '../../finance/utils/formatters';

interface TaxDeclarationFormViewProps {
  summary?: HouseholdTaxSummaryDto;
  calculationMethod: TaxCalculationMethod;
  onSelectCalculationMethod: (method: TaxCalculationMethod) => void;
  applyVatReduction: boolean;
  onToggleVatReduction: (applied: boolean) => void;
  customVatRate?: number | null;
  customPitRate?: number | null;
  vatReductionPercentage?: number | null;
  onOpenRateConfig?: () => void;
  isLoading?: boolean;
}

export const TaxDeclarationFormView: React.FC<TaxDeclarationFormViewProps> = ({
  summary,
  calculationMethod,
  onSelectCalculationMethod,
  applyVatReduction,
  onToggleVatReduction,
  customVatRate,
  customPitRate: _customPitRate,
  vatReductionPercentage,
  onOpenRateConfig,
  isLoading,
}) => {
  const [showAccountantDetails, setShowAccountantDetails] = useState<boolean>(false);

  if (isLoading || !summary) {
    return (
      <div className="tax-declaration-card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#0F766E', fontWeight: 600 }}>Đang tổng hợp số liệu tờ khai...</p>
      </div>
    );
  }

  const isDeclaration = calculationMethod === TaxCalculationMethod.DeclarationBased;

  const reductionPct: number =
    summary.vatReductionPercentage != null && summary.vatReductionPercentage > 0
      ? summary.vatReductionPercentage
      : (vatReductionPercentage ?? 20);
  const baseVatRate: number =
    summary.originalVatRate != null && summary.originalVatRate > 0
      ? summary.originalVatRate
      : (customVatRate ?? 1.0);
  const effectiveVatRate: number = applyVatReduction
    ? summary.vatRate > 0
      ? summary.vatRate
      : Math.round(baseVatRate * (1 - reductionPct / 100) * 10000) / 10000
    : baseVatRate;

  const periodLabel =
    summary.periodType === 1
      ? `Tháng ${summary.periodNumber}/${summary.year}`
      : summary.periodType === 2
      ? `Quý ${summary.periodNumber}/${summary.year}`
      : `Cả năm ${summary.year}`;

  const baseVatAmount = Math.round(summary.taxableRevenueInPeriod * (baseVatRate / 100));
  const vatDiscount = applyVatReduction ? Math.round(baseVatAmount * (reductionPct / 100)) : 0;

  return (
    <div className="tax-declaration-card">
      {/* Top Banner: Form Title + Interactive 20% VAT Reduction Toggle (Prototype Parity) */}
      <div className="tax-declaration-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={22} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              📄 Tờ khai thuế Hộ kinh doanh (Mẫu 01/CNKD)
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
            Kỳ tính thuế: <strong>{periodLabel}</strong> • Hộ kinh doanh: <strong>{summary.branchName || 'Điểm kinh doanh chính'}</strong>
          </p>
        </div>

        {/* 20% VAT Reduction Resolution Toggle matching Prototype */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '6px 14px',
              borderRadius: 9999,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Sparkles size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
              Nghị quyết giảm thuế VAT (Giảm {reductionPct}% VAT)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={applyVatReduction}
              className={`switch-toggle-btn ${applyVatReduction ? 'on' : ''}`}
              onClick={() => onToggleVatReduction(!applyVatReduction)}
              title="Bật/tắt giảm thuế GTGT theo Nghị quyết"
            />
          </label>
        </div>
      </div>

      <div className="tax-declaration-body">
        {/* Prototype 4 KPI Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Doanh thu tính thuế ({periodLabel})</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
              {formatMoney(summary.taxableRevenueInPeriod)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 3 }}>
              Lũy kế năm {summary.year}: {formatMoney(summary.annualAccumulatedRevenue)}
            </div>
          </div>

          <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#0F766E', fontWeight: 600 }}>
              Thuế GTGT ({effectiveVatRate}%{applyVatReduction ? ` - giảm ${reductionPct}%` : ''})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F766E', marginTop: 4 }}>
              {formatMoney(summary.vatAmount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0F766E', marginTop: 3 }}>
              {applyVatReduction ? `Đã giảm -${formatMoney(vatDiscount)} theo Nghị quyết` : 'Chưa bật giảm VAT'}
            </div>
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 600 }}>
              Thuế TNCN ({summary.pitRate}%)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
              {formatMoney(summary.pitAmount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 3 }}>
              Thuế thu nhập cá nhân hộ kinh doanh
            </div>
          </div>

          <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#C2410C', fontWeight: 600 }}>
              Tổng thuế dự kiến phải nộp
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#EA580C', marginTop: 4 }}>
              {formatMoney(summary.totalTaxAmount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9A3412', marginTop: 3 }}>
              Đã gồm điều chỉnh VAT theo công tắc
            </div>
          </div>
        </div>

        {/* Prototype Form 01/CNKD Item Table ([28] Phân phối, cung cấp hàng hóa) */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <table className="tax-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Chỉ tiêu tờ khai 01/CNKD</th>
                <th style={{ textAlign: 'right' }}>Doanh thu tính thuế</th>
                <th style={{ textAlign: 'right' }}>Thuế suất GTGT</th>
                <th style={{ textAlign: 'right' }}>Tiền GTGT (đ)</th>
                <th style={{ textAlign: 'right' }}>Tiền TNCN {summary.pitRate}% (đ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>
                  [28] Phân phối, cung cấp hàng hóa bán lẻ & tạp hóa
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {formatMoney(summary.taxableRevenueInPeriod)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F766E' }}>
                  {applyVatReduction ? `${effectiveVatRate}% (Giảm ${reductionPct}%)` : `${baseVatRate}%`}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                  {formatMoney(summary.vatAmount)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#D97706' }}>
                  {formatMoney(summary.pitAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Method Switcher Banner */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'block' }}>
                Phương pháp tính thuế áp dụng
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Quy định theo nhóm doanh thu: <strong>{summary.householdGroupName || 'Nhóm 2: Doanh thu 1 - 3 tỷ/năm'}</strong>
              </span>
            </div>

            {summary.householdGroup >= HouseholdTaxGroup.Group3_3BTo50B && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  fontSize: '0.78rem',
                  color: '#92400E',
                  fontWeight: 700,
                }}
              >
                <AlertCircle size={14} />
                <span>Hộ quy mô lớn: Khuyến nghị kê khai theo doanh thu - chi phí thực tế</span>
              </div>
            )}
          </div>

          {/* Method Segmented Selector */}
          <div
            className="tax-method-segmented"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '4px',
              borderRadius: '12px',
              gap: '6px',
              border: '1px solid #E2E8F0',
              boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              type="button"
              className={`tax-method-pill ${!isDeclaration ? 'active' : ''}`}
              onClick={() => onSelectCalculationMethod(TaxCalculationMethod.RevenuePercentage)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                fontSize: '0.84rem',
                fontWeight: !isDeclaration ? 700 : 600,
                cursor: 'pointer',
                border: !isDeclaration ? '1px solid #0F766E' : '1px solid transparent',
                background: !isDeclaration ? '#0F766E' : 'transparent',
                color: !isDeclaration ? '#ffffff' : '#475569',
                boxShadow: !isDeclaration ? '0 2px 8px rgba(15, 118, 110, 0.28)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
            >
              <Calculator size={16} />
              <span>Theo tỷ lệ % doanh thu (Thuế khoán / Trực tiếp)</span>
            </button>
            <button
              type="button"
              className={`tax-method-pill ${isDeclaration ? 'active' : ''}`}
              onClick={() => onSelectCalculationMethod(TaxCalculationMethod.DeclarationBased)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9px',
                fontSize: '0.84rem',
                fontWeight: isDeclaration ? 700 : 600,
                cursor: 'pointer',
                border: isDeclaration ? '1px solid #0F766E' : '1px solid transparent',
                background: isDeclaration ? '#0F766E' : 'transparent',
                color: isDeclaration ? '#ffffff' : '#475569',
                boxShadow: isDeclaration ? '0 2px 8px rgba(15, 118, 110, 0.28)' : 'none',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
              }}
            >
              <Scale size={16} />
              <span>Theo Kê khai (Doanh thu - Chi phí hợp lý)</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: '0.76rem', color: '#64748B' }}>
            <Clock size={12} />
            <span>⚠️ Số liệu ước tính đối soát. Phương pháp được niêm phong chính thức khi chốt kỳ.</span>
          </div>
        </div>

        {/* Declaration Method Breakdown */}
        {isDeclaration && (
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
              Bảng Kê Khai Xác Định Thu Nhập Chịu Thuế (Phương Pháp Kê Khai)
            </h4>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>
                      1. Doanh thu thuần phát sinh kỳ ({periodLabel} - Sổ S2b/S2c):
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                      {formatMoney(summary.taxableRevenueInPeriod)}
                    </td>
                  </tr>
                  {summary.cogsAmount != null && summary.cogsAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                      <td style={{ padding: '10px 16px 10px 28px', color: '#64748B', fontSize: '0.8rem' }}>
                        • Chi phí nguyên vật liệu, giá vốn hàng bán (Mục 2.a Sổ S2c-HKD){summary.isCogsEstimated ? ' [Ước tính]' : ''}:
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>
                        - {formatMoney(summary.cogsAmount)}
                      </td>
                    </tr>
                  )}
                  {summary.opexAmount != null && summary.opexAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                      <td style={{ padding: '10px 16px 10px 28px', color: '#64748B', fontSize: '0.8rem' }}>
                        • Chi phí nhân công, điện nước, thuê mặt bằng, quản lý (Mục 2.b - 2.e Sổ S2c-HKD):
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.8rem' }}>
                        - {formatMoney(summary.opexAmount)}
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>2. Tổng chi phí hợp lý được trừ (S2c):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                      - {formatMoney(summary.deductibleExpensesInPeriod)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 700 }}>3. Thu nhập tính thuế TNCN (Chênh lệch Thu - Chi mục 3 S2c):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#B45309' }}>
                      {formatMoney(summary.taxableIncomeDeclaration)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>4. Thuế GTGT phải nộp ({effectiveVatRate}% doanh thu):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                      {formatMoney(summary.vatAmount)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>5. Thuế TNCN phải nộp ({summary.pitRate}% thu nhập tính thuế):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                      {formatMoney(summary.pitAmount)}
                    </td>
                  </tr>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0F172A' }}>Tổng số thuế phải nộp ({periodLabel}):</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, color: '#0F766E', fontSize: '1.15rem' }}>
                      {formatMoney(summary.totalTaxAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Collapsible Options for Accountant */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowAccountantDetails(!showAccountantDetails)}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#0F766E',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
            }}
          >
            <Building2 size={15} />
            <span>Tùy chọn chính sách thuế & Thông số nâng cao</span>
            {showAccountantDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {showAccountantDetails && onOpenRateConfig && (
            <div style={{ marginTop: 12, padding: 14, background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>Mức thuế suất áp dụng:</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2 }}>
                    GTGT: {summary.vatRate}% | TNCN: {summary.pitRate}% | Giảm VAT: {applyVatReduction ? `${reductionPct}%` : 'Tắt'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenRateConfig}
                  className="btn-secondary-pill"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  Điều chỉnh mức thuế suất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
