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
   * - 'EXCESS': VAT is calculated strictly on the revenue exceeding the threshold.
   * - 'TOTAL': VAT is calculated on entire revenue once threshold is exceeded.
   */
  vatBase: 'EXCESS' | 'TOTAL';
  /** Base for PIT calculation: strictly on excess revenue */
  pitBase: 'EXCESS';
  /** Legal reference label */
  legalBasis: string;
}

export const defaultTaxConfig: TaxConfig = {
  threshold: 1_000_000_000,
  vatRate: 0.01,
  pitRate: 0.005,
  vatBase: 'EXCESS',
  pitBase: 'EXCESS',
  legalBasis: 'Quy định quản lý thuế hộ kinh doanh cá thể hiện hành',
};

export const TAX_CONFIG_HKD_2026 = {
  thresholdRevenue: defaultTaxConfig.threshold,
  warningThresholdRevenue: 850_000_000,
  vatRate: defaultTaxConfig.vatRate,
  pitRate: defaultTaxConfig.pitRate,
  legalBasis: defaultTaxConfig.legalBasis,
};

export interface TaxCalculationResult {
  ytdRevenue: number;
  threshold: number;
  isOverThreshold: boolean;
  excessRevenue: number;
  vatAmount: number;
  pitAmount: number;
  totalTaxAmount: number;
  vatBaseDescription: string;
  pitBaseDescription: string;
}

/**
 * Calculates VAT, PIT, and total taxes dynamically according to the TaxConfig.
 */
export function calculateHouseholdTax(
  ytdRevenue: number,
  config: TaxConfig = defaultTaxConfig
): TaxCalculationResult {
  const isOverThreshold = ytdRevenue > config.threshold;
  const excessRevenue = isOverThreshold ? ytdRevenue - config.threshold : 0;

  // Calculate VAT
  const vatTaxableAmount = config.vatBase === 'TOTAL' && isOverThreshold ? ytdRevenue : excessRevenue;
  const vatAmount = Math.round(vatTaxableAmount * config.vatRate);

  // Calculate PIT (always on excess revenue)
  const pitAmount = Math.round(excessRevenue * config.pitRate);

  const totalTaxAmount = vatAmount + pitAmount;

  return {
    ytdRevenue,
    threshold: config.threshold,
    isOverThreshold,
    excessRevenue,
    vatAmount,
    pitAmount,
    totalTaxAmount,
    vatBaseDescription:
      config.vatBase === 'TOTAL'
        ? `${(config.vatRate * 100).toFixed(1)}% trên toàn bộ doanh thu`
        : `${(config.vatRate * 100).toFixed(1)}% trên phần vượt 1 tỷ`,
    pitBaseDescription: `${(config.pitRate * 100).toFixed(1)}% trên phần vượt 1 tỷ`,
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
 * Returns legally accurate filing and payment deadlines based on period type.
 * Under Vietnamese Tax Administration Law, if the statutory deadline falls on a weekend
 * (Saturday or Sunday), it rolls over to the next business day (Monday).
 * - Quarter filing deadline: Last day of the month following the quarter (e.g. Q3 -> Oct 31, if Sat -> Nov 02)
 * - Month filing deadline: 20th of the following month
 * - Year filing deadline: Last day of the 3rd month following the calendar year (March 31)
 */
export function getTaxFilingDeadline(
  periodType: number,
  periodNumber: number,
  year: number = 2026
): TaxDeadlineInfo {
  const currentDate = new Date('2026-10-27T00:00:00Z');
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
    // Year: March 31 of next year
    statutoryDeadline = new Date(year + 1, 2, 31);
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
