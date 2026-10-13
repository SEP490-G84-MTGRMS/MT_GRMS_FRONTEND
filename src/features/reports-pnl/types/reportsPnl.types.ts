/**
 * Type definitions for FE-10: Dashboard KPIs & Profit and Loss (P&L) Report.
 */

export type PresetPeriod =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_QUARTER'
  | 'CUSTOM';

export interface PnlFilterParams {
  tenantId?: string;
  branchId?: string | 'ALL';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  presetPeriod: PresetPeriod;
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  isMain?: boolean;
}

export interface KpiSummaryData {
  grossSales: number;
  discounts: number;
  returns: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  shrinkageLoss: number;
  netProfit: number;
  netMarginPct: number;
  totalOrders: number;
  averageOrderValue: number;
  // Growth indicators compared to previous period
  netRevenueGrowthPct: number;
  grossProfitGrowthPct: number;
  netProfitGrowthPct: number;
  expensesGrowthPct: number;
  ordersGrowthPct: number;
  aovGrowthPct: number;
}

export interface PnlLineItem {
  id: string;
  code: string;
  title: string;
  level: 1 | 2 | 3;
  amount: number;
  percentageOfNetRevenue: number;
  isHeader?: boolean;
  isTotal?: boolean;
  isNegative?: boolean;
  children?: PnlLineItem[];
}

export interface ExpenseCategoryBreakdown {
  categoryCode: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface PnlTrendPoint {
  dateLabel: string;
  netRevenue: number;
  cogs: number;
  expenses: number;
  netProfit: number;
}

export interface TopProductPerformance {
  productId: string;
  productCode: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  marginPct: number;
}

export interface PnlReportResponse {
  filter: PnlFilterParams;
  kpiSummary: KpiSummaryData;
  pnlTree: PnlLineItem[];
  trendData: PnlTrendPoint[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
  topProducts: TopProductPerformance[];
}
