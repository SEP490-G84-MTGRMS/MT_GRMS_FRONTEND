import React from 'react';
import {
  Calculator,
  Scale,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Sparkles,
  Eye,
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
  onPreviewDeclaration?: () => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
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
  onPreviewDeclaration,
  isLoading,
  isRefreshing,
}) => {
  if (isLoading) {
    return (
      <div className="tax-declaration-card" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ color: '#0F766E', fontWeight: 600 }}>Đang tổng hợp số liệu tờ khai...</p>
      </div>
    );
  }
  if (!summary) {
    return <div className="tax-declaration-card" style={{ padding: 48, textAlign: 'center' }}>Chưa tải được dữ liệu tờ khai.</div>;
  }

  const isDeclaration = calculationMethod === TaxCalculationMethod.DeclarationBased;
  const isVatReductionExpired =
    summary.isVatReductionPolicyActive === false ||
    (summary.isVatReductionPolicyActive == null && summary.year >= 2027);
  const effectiveApplyVatReduction = applyVatReduction && !isVatReductionExpired;

  const reductionPct: number =
    summary.vatReductionPercentage != null && summary.vatReductionPercentage > 0
      ? summary.vatReductionPercentage
      : (vatReductionPercentage ?? 20);
  const baseVatRate: number =
    summary.originalVatRate != null && summary.originalVatRate > 0
      ? summary.originalVatRate
      : (customVatRate ?? 1.0);
  const effectiveVatRate: number = effectiveApplyVatReduction
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
  const vatDiscount =
    !summary.isTaxExempt && effectiveApplyVatReduction
      ? Math.max(0, baseVatAmount - summary.vatAmount)
      : 0;

  const previewBtnLabel = summary.isTaxExempt ? 'Xem Mẫu 01/TKN-CNKD' : 'Xem Mẫu 01/CNKD';
  const riskyGrns = summary.riskyGoodsReceipts ?? [];
  const hasComplianceAlert =
    riskyGrns.length > 0 ||
    (summary.excludedCashExpensesCount ?? 0) > 0 ||
    (summary.excludedOwnerSalaryCount ?? 0) > 0 ||
    Boolean(summary.isCogsEstimated);

  return (
    <div className="tax-declaration-card">
      {/* Bảng tổng hợp nhanh; biểu mẫu pháp lý đầy đủ mở trong preview riêng. */}
      <div className="tax-declaration-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={22} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Bảng tổng hợp nghĩa vụ thuế
            </h2>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
            Kỳ tính thuế: <strong>{periodLabel}</strong> • Hộ kinh doanh: <strong>{summary.branchName || 'Điểm kinh doanh chính'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-export-white" onClick={onPreviewDeclaration}>
            <Eye size={15} /> {previewBtnLabel}
          </button>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: isVatReductionExpired ? 'not-allowed' : 'pointer',
              opacity: isVatReductionExpired ? 0.65 : 1,
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '6px 14px',
              borderRadius: 9999,
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <Sparkles size={16} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
              {isVatReductionExpired
                ? 'Giảm 20% VAT (Hết hiệu lực từ 01/01/2027)'
                : `Nghị quyết giảm thuế VAT (Giảm ${reductionPct}% VAT)`}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={effectiveApplyVatReduction}
              aria-label="Giảm VAT 20%"
              disabled={isVatReductionExpired}
              className={`switch-toggle-btn ${effectiveApplyVatReduction ? 'on' : ''}`}
              onClick={() => !isVatReductionExpired && onToggleVatReduction(!applyVatReduction)}
              title={isVatReductionExpired ? 'Ngoài thời hạn VatReductionDeadlineUtc trong TaxSettings:Policy (NQ 204/2025 hết hạn 31/12/2026; cập nhật JSON nếu gia hạn)' : 'Bật/tắt giảm thuế GTGT theo NQ 204/2025/QH15'}
            />
          </label>
        </div>
      </div>

      <div className="tax-declaration-body">
        {/* Cảnh báo Mẫu số 03 (NĐ 398/2026) khi doanh thu năm vượt 10 tỷ */}
        {summary.requiresPitReductionAdjustmentForm03 && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              marginBottom: 16,
              fontSize: '0.83rem',
              lineHeight: 1.5,
            }}
          >
            <strong>⚠️ Vượt ngưỡng 10 tỷ đồng — Cần nộp Mẫu số 03 (NĐ 398/2026/NĐ-CP):</strong> Doanh thu lũy kế năm đã vượt 10 tỷ đồng nên không còn thuộc diện giảm 30% thuế TNCN. Hệ thống đã tự động cộng lại phần thuế TNCN chênh lệch cần nộp bổ sung vào kỳ này (không tính tiền chậm nộp đến hết hạn nộp tờ khai kỳ vượt).
          </div>
        )}

        {/* Prototype 4 KPI Cards Grid */}
        <div
          className="tax-declaration-kpi-grid"
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
              Thuế GTGT ({effectiveVatRate}%{effectiveApplyVatReduction ? ` - giảm ${reductionPct}%` : ''})
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F766E', marginTop: 4 }}>
              {formatMoney(summary.vatAmount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#0F766E', marginTop: 3 }}>
              {summary.isTaxExempt
                ? 'Miễn thuế (Doanh thu năm ≤ 1 tỷ)'
                : effectiveApplyVatReduction
                ? `Đã giảm -${formatMoney(vatDiscount)} theo NQ 204/2025`
                : isVatReductionExpired
                  ? 'Hết hạn giảm VAT theo cấu hình chính sách (mức chuẩn 1.0%)'
                  : 'Chưa bật giảm VAT'}
            </div>
          </div>

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 600 }}>
              {summary.isProvisionalPitPeriod
                ? `Thuế TNCN tạm nộp (${summary.pitRate}%)`
                : `Thuế TNCN (${summary.pitRate}%)`}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
              {formatMoney(summary.pitAmount)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 3 }}>
              {summary.isPitReduced && (summary.pitReductionAmount ?? 0) > 0
                ? `Đã giảm ${summary.pitReductionPercentage ?? 30}% (-${formatMoney(summary.pitReductionAmount ?? 0)}) theo NĐ 398/2026`
                : summary.isProvisionalPitPeriod
                  ? `Tạm nộp quý (K2 Đ10 NĐ 68) · Dự kiến quyết toán năm: ${formatMoney(summary.estimatedAnnualSettlementPit ?? 0)}`
                  : 'Thuế thu nhập cá nhân hộ kinh doanh'}
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
              {summary.pitReductionFormCode
                ? `Kèm ${summary.pitReductionFormCode}`
                : 'Đã gồm chính sách ưu đãi hiện hành'}
            </div>
          </div>
        </div>

        {/* Bảng đối chiếu nhanh theo ngành nghề; không thay thế biểu mẫu 01/CNKD. */}
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <table className="tax-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Nhóm ngành nghề đối chiếu</th>
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
          className="tax-method-panel"
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
              <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                Phương pháp tính thuế áp dụng
                {isRefreshing && <span className="tax-inline-refresh" role="status">Đang tính lại…</span>}
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
              <span>Theo tỷ lệ % doanh thu (NĐ 68/2026)</span>
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
            <span>⚠️ Số liệu hệ thống chỉ mang tính chất tính toán tham khảo. Chủ hộ cần tự đối soát chứng từ thực tế và chịu trách nhiệm pháp lý khi kê khai với cơ quan thuế.</span>
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
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {summary.isProvisionalPitPeriod
                        ? `5. Thuế TNCN tạm nộp kỳ này (${summary.pitRate}% doanh thu vượt 1 tỷ — K2 Đ10 NĐ 68${summary.isPitReduced ? `, đã giảm ${summary.pitReductionPercentage ?? 30}% NĐ 398` : ''}):`
                        : `5. Thuế TNCN quyết toán (${summary.pitRate}% thu nhập tính thuế${summary.isPitReduced ? `, đã giảm ${summary.pitReductionPercentage ?? 30}% NĐ 398` : ''}):`}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#7C3AED' }}>
                      {formatMoney(summary.pitAmount)}
                    </td>
                  </tr>
                  {summary.isProvisionalPitPeriod && (
                    <tr style={{ borderBottom: '1px solid #F1F5F9', background: '#F5F3FF' }}>
                      <td style={{ padding: '10px 16px 10px 28px', color: '#5B21B6', fontSize: '0.8rem', fontWeight: 600 }}>
                        • Dự kiến thuế TNCN quyết toán năm ({summary.annualSettlementPitRate ?? 15}% lợi nhuận lũy kế{summary.isPitReduced ? ' - giảm 30% NĐ 398' : ''}, hạn 31/03 năm sau):
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#5B21B6', fontSize: '0.82rem' }}>
                        {formatMoney(summary.estimatedAnnualSettlementPit ?? 0)}
                      </td>
                    </tr>
                  )}
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

        {/* Điều 6 NĐ 68/2026 Compliance Warning Panel */}
        {hasComplianceAlert && (
          <div
            style={{
              border: '1px solid #FCA5A5',
              background: '#FEF2F2',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#991B1B', fontWeight: 800, fontSize: '0.9rem', marginBottom: 8 }}>
              <AlertCircle size={18} />
              <span>Kiểm soát chi phí hợp lệ theo Điều 6 NĐ 68/2026/NĐ-CP</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#7F1D1D', lineHeight: 1.6 }}>
              {(summary.excludedCashExpensesCount ?? 0) > 0 && (
                <li>
                  Đã tự động loại <strong>{summary.excludedCashExpensesCount}</strong> khoản chi phí vận hành trả tiền mặt ≥ 5.000.000 đ (tổng <strong>{formatMoney(summary.excludedCashExpensesAmount ?? 0)}</strong>) vì thiếu chứng từ thanh toán không dùng tiền mặt.
                </li>
              )}
              {(summary.excludedOwnerSalaryCount ?? 0) > 0 && (
                <li>
                  Đã tự động loại <strong>{summary.excludedOwnerSalaryCount}</strong> khoản tiền lương/thù lao của chủ hộ (tổng <strong>{formatMoney(summary.excludedOwnerSalaryAmount ?? 0)}</strong>) khỏi chi phí được trừ.
                </li>
              )}
              {summary.isCogsEstimated && (
                <li>
                  Một số mặt hàng bán ra chưa có giá vốn nhập kho (giá trị ước tính tham khảo nội bộ: <strong>{formatMoney(summary.estimatedCogsWarningAmount ?? 0)}</strong>). Hệ thống <strong>KHÔNG</strong> tự cộng 70% ước tính vào chi phí thuế — vui lòng bổ sung giá vốn / hóa đơn đầu vào.
                </li>
              )}
            </ul>

            {riskyGrns.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>
                  Phiếu nhập kho có rủi ro bị loại khỏi chi phí thuế ({riskyGrns.length} phiếu):
                </div>
                <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: 8, border: '1px solid #FECACA' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#FEE2E2', color: '#991B1B', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>Mã phiếu</th>
                        <th style={{ padding: '6px 10px' }}>Nhà cung cấp</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Giá trị</th>
                        <th style={{ padding: '6px 10px' }}>Thanh toán</th>
                        <th style={{ padding: '6px 10px' }}>Số hóa đơn</th>
                        <th style={{ padding: '6px 10px' }}>Lý do cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskyGrns.map((grn) => (
                        <tr key={grn.id} style={{ borderTop: '1px solid #FEE2E2' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700 }}>{grn.code}</td>
                          <td style={{ padding: '6px 10px' }}>{grn.supplierName}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(grn.grandTotal)}</td>
                          <td style={{ padding: '6px 10px' }}>{grn.paymentMethod}</td>
                          <td style={{ padding: '6px 10px' }}>{grn.invoiceNo || 'Chưa có'}</td>
                          <td style={{ padding: '6px 10px', color: '#B91C1C' }}>{grn.riskReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
