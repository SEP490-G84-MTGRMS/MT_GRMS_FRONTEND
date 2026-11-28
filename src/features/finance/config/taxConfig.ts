/**
 * Dynamic Tax Configuration for Retail Household Businesses (HKD)
 * Configurable tax thresholds and filing deadlines
 */

export interface TaxConfig {
  /** Exemption threshold in VND (Default: 1,000,000,000 VND per year) */
  threshold: number;
  /** VAT rate for retail goods (Default: 1% = 0.01) */
  vatRate: number;
  /** PIT rate for retail goods (Default: 0.5% = 0.005) */
  pitRate: number;
  /**
   * Base for VAT calculation:
   * - 'TOTAL': VAT is calculated on entire revenue once threshold is exceeded (Decree 68/2026 & Decree 141/2026).
   * - 'EXCESS': Legacy override (not compliant with 2026 law).
   */
  vatBase: 'EXCESS' | 'TOTAL';
  /** Base for PIT calculation: strictly on excess revenue */
  pitBase: 'EXCESS';
  /** Apply 30% PIT reduction (Res. 43/2026/QH16 & Decree 398/2026/ND-CP) for revenue <= 10B in 2026-2027 */
  applyPitReduction?: boolean;
  /** PIT reduction ratio (Default: 0.3 = 30%) */
  pitReductionRate?: number;
  /** Maximum annual revenue eligible for 30% PIT reduction (Default: 10,000,000,000 VND) */
  pitReductionMaxRevenue?: number;
  /** Legal reference label */
  legalBasis: string;
}

export const defaultTaxConfig: TaxConfig = {
  threshold: 1_000_000_000,
  vatRate: 0.01,
  pitRate: 0.005,
  vatBase: 'TOTAL',
  pitBase: 'EXCESS',
  applyPitReduction: true,
  pitReductionRate: 0.3,
  pitReductionMaxRevenue: 10_000_000_000,
  legalBasis: 'NĐ 68/2026/NĐ-CP, NĐ 141/2026/NĐ-CP & NĐ 398/2026/NĐ-CP',
};

export const TAX_CONFIG_HKD_2026 = {
  thresholdRevenue: defaultTaxConfig.threshold,
  warningThresholdRevenue: 850_000_000,
  vatRate: defaultTaxConfig.vatRate,
  pitRate: defaultTaxConfig.pitRate,
  pitReductionRate: defaultTaxConfig.pitReductionRate ?? 0.3,
  pitReductionMaxRevenue: defaultTaxConfig.pitReductionMaxRevenue ?? 10_000_000_000,
  legalBasis: defaultTaxConfig.legalBasis,
};

export interface TaxCalculationResult {
  ytdRevenue: number;
  threshold: number;
  isOverThreshold: boolean;
  excessRevenue: number;
  vatAmount: number;
  pitBeforeReduction: number;
  pitReductionAmount: number;
  isPitReduced: boolean;
  pitAmount: number;
  totalTaxAmount: number;
  vatBaseDescription: string;
  pitBaseDescription: string;
}

/**
 * Calculates VAT, PIT (including 30% reduction per Res. 43/2026 & Decree 398/2026),
 * and total taxes dynamically according to the TaxConfig.
 */
export function calculateHouseholdTax(
  ytdRevenue: number,
  config: TaxConfig = defaultTaxConfig
): TaxCalculationResult {
  const isOverThreshold = ytdRevenue > config.threshold;
  const excessRevenue = isOverThreshold ? ytdRevenue - config.threshold : 0;

  // Calculate VAT (TOTAL revenue once > 1B per Decree 68/2026)
  const vatTaxableAmount = config.vatBase === 'TOTAL' && isOverThreshold ? ytdRevenue : excessRevenue;
  const vatAmount = Math.round(vatTaxableAmount * config.vatRate);

  // Calculate PIT (excess over 1B + 30% reduction when <= 10B)
  const pitBeforeReduction = Math.round(excessRevenue * config.pitRate);
  const maxReductionRev = config.pitReductionMaxRevenue ?? 10_000_000_000;
  const reductionRate = config.pitReductionRate ?? 0.3;
  const isPitReduced = Boolean(config.applyPitReduction) && isOverThreshold && ytdRevenue <= maxReductionRev && reductionRate > 0;
  const pitReductionAmount = isPitReduced ? Math.round(pitBeforeReduction * reductionRate) : 0;
  const pitAmount = Math.max(0, pitBeforeReduction - pitReductionAmount);

  const totalTaxAmount = vatAmount + pitAmount;

  return {
    ytdRevenue,
    threshold: config.threshold,
    isOverThreshold,
    excessRevenue,
    vatAmount,
    pitBeforeReduction,
    pitReductionAmount,
    isPitReduced,
    pitAmount,
    totalTaxAmount,
    vatBaseDescription:
      config.vatBase === 'TOTAL'
        ? `${(config.vatRate * 100).toFixed(1)}% trên toàn bộ doanh thu`
        : `${(config.vatRate * 100).toFixed(1)}% trên phần vượt 1 tỷ`,
    pitBaseDescription: isPitReduced
      ? `${(config.pitRate * 100).toFixed(1)}% trên phần vượt 1 tỷ (đã giảm ${Math.round(reductionRate * 100)}% theo NĐ 398/2026)`
      : `${(config.pitRate * 100).toFixed(1)}% trên phần vượt 1 tỷ`,
  };
}

export interface TaxDeadlineInfo {
  deadlineDate: string;
  daysRemaining: number;
  isUrgent: boolean;
  displayDeadline: string;
  originalDeadline?: string;
  isRolledOver?: boolean;
  note?: string;
}

/**
 * Helper to adjust a deadline date to the next business day if it falls on Saturday or Sunday,
 * conforming to Vietnamese Tax Administration Law.
 */
export function adjustToNextBusinessDay(date: Date): { adjustedDate: Date; isRolledOver: boolean } {
  const adjusted = new Date(date.getTime());
  const dayOfWeek = adjusted.getDay(); // 0 is Sunday, 6 is Saturday
  let isRolledOver = false;

  if (dayOfWeek === 6) {
    // Saturday -> roll to Monday (+2 days)
    adjusted.setDate(adjusted.getDate() + 2);
    isRolledOver = true;
  } else if (dayOfWeek === 0) {
    // Sunday -> roll to Monday (+1 day)
    adjusted.setDate(adjusted.getDate() + 1);
    isRolledOver = true;
  }

  return { adjustedDate: adjusted, isRolledOver };
}

/**
 * Returns legally accurate filing and payment deadlines based on period type (Art. 8 Decree 68/2026).
 * Under Vietnamese Tax Administration Law, if the statutory deadline falls on a weekend
 * (Saturday or Sunday), it rolls over to the next business day (Monday).
 * - Quarter filing deadline: Q1 Apr 30, Q2 Jul 31, Q3 Oct 31 (2026 -> Mon Nov 02), Q4 Jan 31 next year
 * - Month filing deadline: 20th of the following month
 * - Year filing deadline: Jan 31 next year (Group 1 revenue notice 01/TKN-CNKD),
 *   or Mar 31 next year when isAnnualPitSettlement = true (DeclarationBased annual PIT settlement).
 */
export function getTaxFilingDeadline(
  periodType: number,
  periodNumber: number,
  year: number = 2026,
  isAnnualPitSettlement: boolean = false,
  currentDate: Date = new Date()
): TaxDeadlineInfo {
  let statutoryDeadline = new Date(year, 9, 31); // Default Q3 Oct 31

  if (periodType === 2) {
    // Quarter
    if (periodNumber === 1) statutoryDeadline = new Date(year, 3, 30); // April 30
    else if (periodNumber === 2) statutoryDeadline = new Date(year, 6, 31); // July 31
    else if (periodNumber === 3) statutoryDeadline = new Date(year, 9, 31); // October 31
    else if (periodNumber === 4) statutoryDeadline = new Date(year + 1, 0, 31); // January 31 next year
  } else if (periodType === 1) {
    // Month: 20th of next month
    statutoryDeadline = new Date(year, periodNumber, 20);
  } else if (periodType === 3) {
    // Year: Jan 31 (Group 1 01/TKN-CNKD) or Mar 31 (DeclarationBased annual PIT settlement)
    statutoryDeadline = isAnnualPitSettlement
      ? new Date(year + 1, 2, 31)
      : new Date(year + 1, 0, 31);
  }

  const origDay = String(statutoryDeadline.getDate()).padStart(2, '0');
  const origMonth = String(statutoryDeadline.getMonth() + 1).padStart(2, '0');
  const origYear = statutoryDeadline.getFullYear();
  const originalDeadlineStr = `${origDay}/${origMonth}/${origYear}`;

  // Apply weekend rollover rule
  const { adjustedDate, isRolledOver } = adjustToNextBusinessDay(statutoryDeadline);

  const diffTime = adjustedDate.getTime() - currentDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;

  const dayStr = String(adjustedDate.getDate()).padStart(2, '0');
  const monthStr = String(adjustedDate.getMonth() + 1).padStart(2, '0');
  const yearStr = adjustedDate.getFullYear();
  const displayDeadline = `${dayStr}/${monthStr}/${yearStr}`;

  return {
    deadlineDate: adjustedDate.toISOString(),
    daysRemaining: Math.max(0, daysRemaining),
    isUrgent,
    displayDeadline,
    originalDeadline: originalDeadlineStr,
    isRolledOver,
    note: isRolledOver
      ? `Hạn nộp gốc ${originalDeadlineStr} trùng ngày nghỉ cuối tuần, dời sang thứ Hai ${displayDeadline} theo Luật Quản lý thuế.`
      : undefined,
  };
}
