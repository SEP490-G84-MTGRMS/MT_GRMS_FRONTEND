import React, { useState } from 'react';
import {
  Calculator,
  Scale,
  Building2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
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
  isLoading?: boolean;
}

export const TaxDeclarationFormView: React.FC<TaxDeclarationFormViewProps> = ({
  summary,
  calculationMethod,
  onSelectCalculationMethod,
  applyVatReduction,
  onToggleVatReduction,
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
  const isExempt = summary.isTaxExempt;

  const periodLabel =
    summary.periodType === 1
      ? `Tháng ${summary.periodNumber}/${summary.year}`
      : summary.periodType === 2
      ? `Quý ${summary.periodNumber}/${summary.year}`
      : `Cả năm ${summary.year}`;

  return (
    <div className="tax-declaration-card">
      {/* Top Banner: Form Title */}
      <div className="tax-declaration-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={22} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Tờ Khai Thuế Hộ Kinh Doanh (Mẫu 01/CNKD)
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
            Kỳ tính thuế: <strong>{periodLabel}</strong> • Hộ kinh doanh: <strong>Tiệm Tạp Hóa Cô Ba</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.2)',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            Chế độ tự động tính theo quy định
          </span>
        </div>
      </div>

      <div className="tax-declaration-body">
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
                Quy định theo nhóm doanh thu: <strong>Nhóm 2: Doanh thu 1 - 3 tỷ/năm (Chịu thuế phần vượt 1 tỷ)</strong>
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
            <span>Đang xem thử, chưa lưu. Phương pháp được ghi chính thức khi chốt kỳ.</span>
          </div>
        </div>

        {/* Main Conclusion Banner */}
        <div
          style={{
            background: isExempt
              ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
              : 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            border: isExempt ? '1px solid #A7F3D0' : '1px solid #99F6E4',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isExempt ? (
                  <CheckCircle size={22} style={{ color: '#059669' }} />
                ) : (
                  <Scale size={22} style={{ color: '#0F766E' }} />
                )}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  {isExempt
                    ? 'Kỳ tính thuế thuộc diện Miễn Thuế 100%'
                    : `Tổng nghĩa vụ thuế ${periodLabel} phải nộp: ${formatMoney(summary.totalTaxAmount)}`}
                </h3>
              </div>

              <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.6 }}>
                {isExempt ? (
                  <>
                    Doanh thu lũy kế cả năm của hộ kinh doanh tính đến hết kỳ này là{' '}
                    <strong>{formatMoney(summary.annualAccumulatedRevenue)}</strong> (chưa vượt hạn mức miễn thuế{' '}
                    <strong>1.000.000.000 VND</strong> theo quy định). Hộ kinh doanh không phải nộp thuế GTGT và TNCN.
                  </>
                ) : (
                  <>
                    Doanh thu phát sinh kỳ này: <strong>{formatMoney(summary.taxableRevenueInPeriod)}</strong>.
                    Lũy kế năm {summary.year} đạt <strong>{formatMoney(summary.annualAccumulatedRevenue)}</strong> (đã vượt hạn mức 1 tỷ).{' '}
                    Số thuế Quý 3 bao gồm thuế GTGT ({formatMoney(summary.vatAmount)}) và thuế TNCN tính trên phần vượt ({formatMoney(summary.pitAmount)}).
                  </>
                )}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>Tổng số thuế phải nộp ({periodLabel})</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: isExempt ? '#059669' : '#0F766E' }}>
                {formatMoney(summary.totalTaxAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        {isDeclaration ? (
          /* DECLARATION METHOD (REVENUE - EXPENSES) */
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
              Bảng Kê Khai Xác Định Thu Nhập Chịu Thuế (Phương Pháp Kê Khai)
            </h4>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Doanh thu phát sinh kỳ ({periodLabel}):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                      {formatMoney(summary.taxableRevenueInPeriod)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Chi phí hợp lý được trừ (S2c):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F766E' }}>
                      - {formatMoney(summary.deductibleExpensesInPeriod)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                    <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 700 }}>Thu nhập tính thuế TNCN (Lợi nhuận):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#B45309' }}>
                      {formatMoney(summary.taxableIncomeDeclaration)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>Thuế GTGT ({summary.vatRate}% doanh thu):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                      {formatMoney(summary.vatAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>Thuế TNCN ({summary.pitRate}% thu nhập tính thuế):</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                      {formatMoney(summary.pitAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* REVENUE PERCENTAGE METHOD */
          <div style={{ marginBottom: 24, border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Doanh thu phát sinh kỳ ({periodLabel}):</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>
                    {formatMoney(summary.taxableRevenueInPeriod)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>Thuế GTGT ({summary.vatRate}% trên doanh thu):</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                    {formatMoney(summary.vatAmount)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>
                    Thuế TNCN ({summary.pitRate}% trên phần doanh thu lũy kế vượt 1 tỷ):
                  </td>
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
        )}

        {/* Accountant & Policy Options Section (Collapsible Footer) */}
        <div
          style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: 16,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setShowAccountantDetails(!showAccountantDetails)}
            style={{
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#0F766E',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              marginBottom: showAccountantDetails ? 16 : 0,
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Building2 size={16} />
            <span>Dành cho kế toán & Tùy chọn chính sách</span>
            {showAccountantDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAccountantDetails && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 12,
                background: '#F8FAFC',
                border: '1px solid #CBD5E1',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {/* VAT Reduction Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#0F172A' }}>Chính sách giảm 20% mức thuế suất GTGT (Nghị quyết 204/2025/QH15)</strong>
                  <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0 0' }}>
                    Áp dụng giảm 20% mức tỷ lệ tính thuế GTGT (1% → 0.8%) cho nhóm hàng hóa thuộc diện hỗ trợ. Kế toán cần thẩm định danh mục mặt hàng trước khi nộp tờ khai.
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyVatReduction}
                    onChange={(e) => onToggleVatReduction(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#0F766E', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    {applyVatReduction ? 'Đang bật (Giảm 20%)' : 'Đang tắt'}
                  </span>
                </label>
              </div>

              {/* Retroactive VAT Analysis for Accountants */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginBottom: 12 }}>
                <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>Đối soát nghĩa vụ thuế lũy kế cả năm:</strong>
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
                  <div>• <strong>Kịch bản chuẩn (Thực tế áp dụng):</strong> Quý 3 phát sinh <strong>{formatMoney(summary.totalTaxAmount)}</strong>. Hai quý đầu (Q1+Q2 doanh thu 950tr ≤ 1 tỷ) được miễn thuế 0đ. Tổng thuế phát sinh lũy kế hết Quý 3 là <strong>{formatMoney(summary.totalTaxAmount)}</strong>.</div>
                  <div>• <strong>Kịch bản dự phòng (Truy thu hồi tố GTGT):</strong> Nếu cơ quan thuế yêu cầu nộp bù 1% GTGT của 950tr hai quý đầu (9.500.000đ), tổng thuế cả năm sẽ là <strong>16.262.500đ</strong>. Đang chờ ý kiến thẩm định từ Kế toán trưởng.</div>
                </div>
              </div>

              {/* COGS Notice for Declaration Method */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 10, fontSize: '0.76rem', color: '#64748B', lineHeight: 1.5 }}>
                <strong>Lưu ý về Giá vốn hàng bán (COGS):</strong> Theo quy định, phương pháp Kê khai tính thuế trên Lợi nhuận = Doanh thu - Giá vốn hàng bán - Chi phí hợp lý. Cần máy chủ Backend hỗ trợ tính trừ Giá vốn hàng bán vào chi phí được trừ khi đồng bộ hóa dữ liệu kho.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
