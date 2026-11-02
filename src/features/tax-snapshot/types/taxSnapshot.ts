/**
 * Tax Period Object & Type compatible with erasableSyntaxOnly
 */
export const TaxPeriodType = {
  Month: 1,
  Quarter: 2,
  Year: 3,
} as const;
export type TaxPeriodType = (typeof TaxPeriodType)[keyof typeof TaxPeriodType];

/**
 * Tax Calculation Method Object & Type
 */
export const TaxCalculationMethod = {
  Exempt: 0,
  RevenuePercentage: 1,
  DeclarationBased: 2,
} as const;
export type TaxCalculationMethod = (typeof TaxCalculationMethod)[keyof typeof TaxCalculationMethod];

/**
 * Household Tax Group Object & Type
 */
export const HouseholdTaxGroup = {
  Group1_Under1B: 1,
  Group2_1BTo3B: 2,
  Group3_3BTo50B: 3,
  Group4_Over50B: 4,
} as const;
export type HouseholdTaxGroup = (typeof HouseholdTaxGroup)[keyof typeof HouseholdTaxGroup];

/**
 * Accounting Book Type Object & Type
 */
export const AccountingBookType = {
  S1a_RevenueGroup1: 1,
  S2a_RevenueGroup2: 2,
  S2b_RevenueDeclaration: 3,
  S2c_RevenueAndExpense: 4,
  S2d_MaterialsAndGoods: 5,
  S2e_CashAndBank: 6,
  S3a_TaxObligation: 7,
} as const;
export type AccountingBookType = (typeof AccountingBookType)[keyof typeof AccountingBookType];

/**
 * Status lifecycle supporting both casing formats
 */
export type TaxSnapshotStatus =
  | 'draft'
  | 'finalized'
  | 'submitted'
  | 'paid'
  | 'locked'
  | 'cancelled'
  | 'Draft'
  | 'Finalized'
  | 'Submitted'
  | 'Paid';

/**
 * Chi tiết phân rã thuế GTGT theo từng nhóm thuế suất
 */
export interface VatBreakdown {
  revenueStandardRate10: number;
  taxAmountStandardRate10: number;
  revenueReducedRate08: number;
  taxAmountReducedRate08: number;
  effectiveVatRate: number;
}

/**
 * Filter Parameters for Tax Summary Calculation
 */
export interface HouseholdTaxFilterDto {
  year: number;
  periodType: TaxPeriodType;
  periodNumber: number;
  branchId?: string;
  calculationMethod: TaxCalculationMethod;
  appliedPitMethod?: TaxCalculationMethod | null;
  tier2Method?: 'REVENUE_EXCESS' | 'PROFIT_15';
  applyVatReduction2026?: boolean;
  vatReductionPercentage?: number | null;
  reducedVatRevenueInPeriod?: number;
  standardVatRevenueInPeriod?: number;
  customVatRate?: number | null;
  customPitRate?: number | null;
  priorDeclaredPitTaxOverride?: number;
  vatOption?: 'PRUDENT_YTD' | 'QUARTER_ONLY';
}

/**
 * Summary of Books matching Backend TaxBooksSummaryDto
 */
export interface TaxBooksSummaryDto {
  primaryBookCode: string;
  totalRecordedRevenue: number;
  totalRecordedExpenses: number;
  totalCashAndBankReceipts: number;
  totalCashAndBankDisbursements: number;
  totalTaxObligationsAccrued: number;
  totalTaxPaidToState: number;
}

/**
 * Comprehensive Household Tax Summary DTO from Server
 */
export interface HouseholdTaxSummaryDto {
  year: number;
  periodType: TaxPeriodType;
  periodNumber: number;
  branchId?: string;
  branchName: string;

  annualAccumulatedRevenue: number;
  priorPeriodsAccumulatedRevenue: number;
  householdGroup: HouseholdTaxGroup;
  householdGroupName: string;
  calculationMethod: TaxCalculationMethod;
  tier2Method?: 'REVENUE_EXCESS' | 'PROFIT_15';
  isTaxExempt: boolean;
  taxExemptionThreshold: number; // 1.000.000.000 VND

  // Cảnh báo vượt ngưỡng miễn thuế 1 tỷ VNĐ giữa năm
  // Cảnh báo Gross vs Net & Ước tính nếu áp dụng Gross
  annualAccumulatedGrossRevenue?: number;
  isGrossOver1BNetUnder1B?: boolean;
  isGrossOver3BNetUnder3B?: boolean;
  netVsGrossThresholdWarning?: string;
  grossBasedEstimatedTaxAmount?: number | null;

  // Tùy chọn VAT khi vượt 1 tỷ giữa năm
  quarterlyVatAmount?: number;
  retrospectiveVatAmount?: number;
  vatCalculationOption?: string;
  periodNetRevenue?: number;

  isThresholdCrossedMidYear?: boolean;
  thresholdExceededNote?: string;

  // Cảnh báo tiến trình ngưỡng 3 tỷ VNĐ (Điểm d Khoản 5 Điều 4 Nghị định 68/2026/NĐ-CP)
  isApproaching3BThreshold?: boolean;
  isExceeding3BThreshold?: boolean;
  is3BCrossedMidYear?: boolean;
  declarationMethodStartYear?: number | null;

  // Cảnh báo ngưỡng Nhóm 4 (toàn chuỗi Tenant)
  isApproachingGroup4Threshold?: boolean;
  isExceedingGroup4Threshold?: boolean;

  // In-period Gross and Net Revenue
  grossRevenueInPeriod: number;
  discountAmountInPeriod: number;
  returnAmountInPeriod: number;
  taxableRevenueInPeriod: number;

  // VAT & Effective Rate
  vatRate: number; // Effective VAT rate
  originalVatRate?: number | null;
  vatReductionPercentage?: number | null;
  isVatReduced: boolean;
  vatTaxableRevenue: number;
  vatAmount: number;
  customVatRate?: number | null;
  customPitRate?: number | null;
  vatBreakdown?: VatBreakdown;

  // PIT
  pitRate: number;
  pitTaxableRevenue: number;
  pitAmount: number;

  // Declaration-based YTD Fields
  isCogsEstimated?: boolean;
  cogsAmount?: number;
  opexAmount?: number;
  deductibleExpensesInPeriod: number;
  ytdRevenue: number;
  ytdExpenses: number;
  taxableIncomeYtd: number;
  taxDueYtd: number;
  priorDeclaredPitTax: number;
  overpaidTaxCarry: number;
  taxableIncomeDeclaration: number;
  declarationPitAmount: number;

  totalTaxAmount: number;

  // Accounting Books Summary
  booksSummary: TaxBooksSummaryDto;

  isFinalized: boolean;
  snapshotId?: string;
  finalizedAtUtc?: string;
  finalizedBy?: string;
}

/**
 * Single Entry in Accounting Books
 */
export interface AccountingBookEntryDto {
  voucherNumber: string;
  voucherDate: string;
  description: string;
  amount: number;
  category: string;
  bookType: AccountingBookType;
  bookCode: string;
  beneficiaryName?: string;
  invoiceNumber?: string;
}

/**
 * Request to Finalize and Snapshot Tax Period
 * Requires secure PIN and explicitly passes calculationMethod and applyVatReduction2026
 */
export interface CreateTaxSnapshotRequest {
  year: number;
  periodType: TaxPeriodType;
  periodNumber: number;
  branchId?: string;
  calculationMethod: TaxCalculationMethod;
  tier2Method?: 'REVENUE_EXCESS' | 'PROFIT_15';
  applyVatReduction2026: boolean;
  vatReductionPercentage?: number | null;
  customVatRate?: number | null;
  customPitRate?: number | null;
  confirmEstimatedCogsResponsible?: boolean;
  estimatedCogsConfirmationStatement?: string;
  pin: string;
  notes?: string;
}

/**
 * Finalized Immutable Tax Snapshot
 */
export interface HouseholdTaxSnapshotDto {
  id: string;
  branchId?: string;
  periodType: TaxPeriodType;
  year: number;
  periodNumber: number;
  annualAccumulatedRevenue: number;
  householdGroup: HouseholdTaxGroup;
  calculationMethod: TaxCalculationMethod;
  tier2Method?: 'REVENUE_EXCESS' | 'PROFIT_15';
  applyVatReduction2026?: boolean;
  isTaxExempt: boolean;
  taxableRevenueInPeriod: number;
  vatRate: number;
  originalVatRate?: number | null;
  vatReductionPercentage?: number | null;
  vatAmount: number;
  customVatRate?: number | null;
  customPitRate?: number | null;
  vatBreakdown?: VatBreakdown;
  pitRate: number;
  pitAmount: number;
  totalTaxAmount: number;
  isCogsEstimated?: boolean;
  auditSignatureHash?: string;
  isIntegrityValid?: boolean;
  finalizedBy: string;
  finalizedAtUtc: string;
  notes?: string;
  pinHashAudit?: string;

  // Compatibility aliases
  status?: TaxSnapshotStatus;
  quarter?: number;
  taxableRevenue?: number;
  ordersCount?: number;
  generatedAt?: string;
  vatTaxableRevenue?: number;
  pitTaxableRevenue?: number;
  ytdRevenue?: number;
  taxExemptionThreshold?: number;
  taxableRevenueInExcess?: number;
  submittedAt?: string;
  paidAt?: string;
  note?: string;
}

// Backward Compatibility Aliases for legacy components
export type TaxSnapshot = HouseholdTaxSnapshotDto;

export interface TaxSnapshotFilterParams {
  year?: number;
  quarter?: number;
  periodType?: number;
  status?: TaxSnapshotStatus | 'ALL' | 'all';
  keyword?: string;
  search?: string;
}

/**
 * Format standard Vietnamese label for tax period (Month, Quarter, Year)
 */

/**
 * Format standard Vietnamese label for tax period (Month, Quarter, Year)
 */
export function formatTaxPeriodLabel(periodType?: number, periodNumber?: number, year?: number): string {
  const yStr = year ? `/${year}` : '';
  if (periodType === TaxPeriodType.Month || periodType === 1) {
    return `Tháng ${periodNumber || 1}${yStr}`;
  }
  if (periodType === TaxPeriodType.Year || periodType === 3) {
    return `Cả năm ${year || ''}`.trim();
  }
  return `Quý ${periodNumber || 1}${yStr}`;
}
