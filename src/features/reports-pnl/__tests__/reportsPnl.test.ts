import { describe, it, expect } from 'vitest';
import {
  calculateMarginPct,
  reportsPnlService,
} from '../services/reportsPnlService';

describe('Reports P&L Financial Calculations Unit Tests', () => {
  describe('calculateMarginPct safe division tests', () => {
    it('should accurately calculate normal percentage', () => {
      expect(calculateMarginPct(25, 100)).toBe(25.0);
      expect(calculateMarginPct(1, 3)).toBe(33.3);
      expect(calculateMarginPct(5000000, 20000000)).toBe(25.0);
    });

    it('should return 0 when total revenue is zero (avoid division by zero)', () => {
      expect(calculateMarginPct(100, 0)).toBe(0);
      expect(calculateMarginPct(0, 0)).toBe(0);
    });

    it('should handle negative profit or losses gracefully', () => {
      expect(calculateMarginPct(-50, 200)).toBe(-25.0);
    });
  });

  describe('reportsPnlService financial consistency tests', () => {
    it('should return all 4 default branch options including ALL', async () => {
      const branches = await reportsPnlService.getBranches();
      expect(branches).toHaveLength(4);
      expect(branches[0].id).toBe('ALL');
    });

    it('should strictly satisfy retail P&L accounting equation', async () => {
      const data = await reportsPnlService.getPnlReportData({
        branchId: 'ALL',
        presetPeriod: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      const { kpiSummary, pnlTree, expenseBreakdown, trendData } = data;

      // 1. Net Revenue = Gross Sales - Discounts - Returns
      const expectedNetRevenue =
        kpiSummary.grossSales - kpiSummary.discounts - kpiSummary.returns;
      expect(kpiSummary.netRevenue).toBe(expectedNetRevenue);

      // 2. Gross Profit = Net Revenue - COGS
      const expectedGrossProfit = kpiSummary.netRevenue - kpiSummary.cogs;
      expect(kpiSummary.grossProfit).toBe(expectedGrossProfit);

      // 3. Net Profit = Gross Profit - Operating Expenses - Shrinkage Loss
      const expectedNetProfit =
        kpiSummary.grossProfit -
        kpiSummary.operatingExpenses -
        kpiSummary.shrinkageLoss;
      expect(kpiSummary.netProfit).toBe(expectedNetProfit);

      // 4. Margins should match calculated percentages
      expect(kpiSummary.grossMarginPct).toBe(
        calculateMarginPct(kpiSummary.grossProfit, kpiSummary.netRevenue)
      );
      expect(kpiSummary.netMarginPct).toBe(
        calculateMarginPct(kpiSummary.netProfit, kpiSummary.netRevenue)
      );

      // 5. PnL Tree must contain 6 top-level rows (I, REV-NET, II, GP, III, NP)
      expect(pnlTree.length).toBeGreaterThanOrEqual(6);

      // 6. Expense breakdown must have at least 5 categories
      expect(expenseBreakdown.length).toBeGreaterThanOrEqual(5);

      // 7. Trend data must have points
      expect(trendData.length).toBeGreaterThan(0);
    });

    it('should scale down amounts when specific branch is selected', async () => {
      const allData = await reportsPnlService.getPnlReportData({
        branchId: 'ALL',
        presetPeriod: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      const branchData = await reportsPnlService.getPnlReportData({
        branchId: 'b1-cauthuong',
        presetPeriod: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      expect(branchData.kpiSummary.grossSales).toBeLessThan(
        allData.kpiSummary.grossSales
      );
    });
  });
});
