import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMarginPct,
  toVietnamUtcIso,
  buildPnlStatementTree,
  reportsPnlService,
  MOCK_BRANCHES,
} from '../services/reportsPnlService';
import { financeHttpClient } from '../../../api/financeHttpClient';

describe('Reports P&L Financial Calculations Unit & Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. calculateMarginPct safe division tests', () => {
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
      expect(calculateMarginPct(-10190000, 7950000)).toBe(-128.2);
    });

    it('should handle decimal rounding precision accurately to 1 decimal place', () => {
      expect(calculateMarginPct(1450000, 10000000)).toBe(14.5);
      expect(calculateMarginPct(2, 3)).toBe(66.7);
    });
  });

  describe('2. Happy Path Tests (Kịch bản thành công chuẩn)', () => {
    it('should return branch options with "ALL" as the consolidated main choice', async () => {
      const branches = await reportsPnlService.getBranches();
      expect(branches.length).toBeGreaterThanOrEqual(1);
      expect(branches[0].id).toBe('ALL');
      expect(branches[0].isMain).toBe(true);
    });

    it('should parse live branches correctly when /branches succeeds', async () => {
      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce({
        data: {
          data: {
            items: [
              { id: 'b-01', code: 'BR-Q1', name: 'Chi nhánh Quận 1' },
              { id: 'b-02', code: 'BR-BT', name: 'Chi nhánh Bình Thạnh' },
            ],
          },
        },
      } as any);

      const branches = await reportsPnlService.getBranches();
      expect(branches).toHaveLength(3); // 'ALL' + 2 branches
      expect(branches[0].id).toBe('ALL');
      expect(branches[1].code).toBe('BR-Q1');
      expect(branches[2].name).toBe('Chi nhánh Bình Thạnh');
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

      // 5. Net Profit After Tax = Net Profit - Estimated Tax
      expect(kpiSummary.netProfitAfterTax).toBe(
        kpiSummary.netProfit - kpiSummary.estimatedTaxAmount
      );

      // 6. PnL Tree must contain top-level structural rows
      expect(pnlTree.length).toBeGreaterThanOrEqual(6);

      // 7. Expense breakdown must have categories
      expect(expenseBreakdown.length).toBeGreaterThanOrEqual(1);

      // 8. Trend data must have points
      expect(trendData.length).toBeGreaterThan(0);
    });

    it('should correctly aggregate live top products from orders API', async () => {
      const mockOrders = [
        {
          id: 'ord-1',
          branchId: 'b-01',
          status: 'Completed',
          items: [
            {
              productId: 'p-beer',
              productName: 'Bia Tiger thùng 24 lon',
              barcode: '893482221004',
              quantity: 2,
              actualPrice: 385000,
              costPriceAtSale: 340000,
              totalLineAmount: 770000,
            },
            {
              productId: 'p-snack',
              productName: 'Bánh Chocopie 360g',
              barcode: '893603601001',
              quantity: 5,
              actualPrice: 65000,
              costPriceAtSale: 48000,
              totalLineAmount: 325000,
            },
          ],
        },
        {
          id: 'ord-2',
          branchId: 'b-01',
          status: 'Completed',
          items: [
            {
              productId: 'p-beer',
              productName: 'Bia Tiger thùng 24 lon',
              barcode: '893482221004',
              quantity: 1,
              actualPrice: 385000,
              costPriceAtSale: 340000,
              totalLineAmount: 385000,
            },
          ],
        },
      ];

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce({
        data: { items: mockOrders },
      } as any);

      const topProducts = await reportsPnlService.getLiveTopProducts('b-01');
      expect(topProducts).toHaveLength(2);

      // Tiger beer: qty = 3, rev = 1.155.000, cost = 1.020.000, profit = 135.000
      const tiger = topProducts.find((p) => p.productId === 'p-beer');
      expect(tiger).toBeDefined();
      expect(tiger?.quantitySold).toBe(3);
      expect(tiger?.revenue).toBe(1155000);
      expect(tiger?.profit).toBe(135000);

      // Sorted descending by profit: tiger (135k) > chocopie (85k)
      expect(topProducts[0].productId).toBe('p-beer');
    });
  });

  describe('3. Bad Test Cases (Kịch bản dữ liệu dị thường & Lỗi hệ thống)', () => {
    it('should safely handle when /branches rejects with network error and fallback to default', async () => {
      vi.spyOn(financeHttpClient, 'get').mockRejectedValueOnce(
        new Error('Network error 500')
      );

      const branches = await reportsPnlService.getBranches();
      expect(branches).toEqual(MOCK_BRANCHES);
    });

    it('should return empty top products without throwing when /orders returns 500', async () => {
      vi.spyOn(financeHttpClient, 'get').mockRejectedValueOnce(
        new Error('Database timeout')
      );

      const topProducts = await reportsPnlService.getLiveTopProducts();
      expect(topProducts).toEqual([]);
    });

    it('should safely calculate margins when net revenue is zero', () => {
      const grossMargin = calculateMarginPct(0, 0);
      const netMargin = calculateMarginPct(-500000, 0);
      expect(grossMargin).toBe(0);
      expect(netMargin).toBe(0);
    });

    it('should ignore cancelled orders when aggregating live top products', async () => {
      const mockOrders = [
        {
          id: 'ord-cancelled',
          branchId: 'b-01',
          status: 'Cancelled',
          items: [
            {
              productId: 'p-void',
              productName: 'Hàng hủy bỏ',
              quantity: 10,
              actualPrice: 100000,
              costPriceAtSale: 80000,
              totalLineAmount: 1000000,
            },
          ],
        },
      ];

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce({
        data: { items: mockOrders },
      } as any);

      const topProducts = await reportsPnlService.getLiveTopProducts();
      expect(topProducts).toHaveLength(0);
    });
  });

  describe('4. Edge Cases (Kịch bản biên & Nghiệp vụ đặc biệt)', () => {
    it('should filter orders strictly by branchId when specified', async () => {
      const mockOrders = [
        {
          id: 'ord-b1',
          branchId: 'branch-q1',
          status: 'Completed',
          items: [
            {
              productId: 'p-1',
              productName: 'SP Chi nhánh 1',
              quantity: 1,
              actualPrice: 100000,
              costPriceAtSale: 80000,
            },
          ],
        },
        {
          id: 'ord-b2',
          branchId: 'branch-q2',
          status: 'Completed',
          items: [
            {
              productId: 'p-2',
              productName: 'SP Chi nhánh 2',
              quantity: 1,
              actualPrice: 200000,
              costPriceAtSale: 150000,
            },
          ],
        },
      ];

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce({
        data: { items: mockOrders },
      } as any);

      const topProductsB1 = await reportsPnlService.getLiveTopProducts(
        'branch-q1'
      );
      expect(topProductsB1).toHaveLength(1);
      expect(topProductsB1[0].productId).toBe('p-1');
    });

    it('should scale down grossSales when a specific branch is selected in mock calculation mode', async () => {
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

    it('should correctly adapt different preset periods (TODAY vs THIS_MONTH vs THIS_QUARTER)', async () => {
      const todayData = await reportsPnlService.getPnlReportData({
        branchId: 'ALL',
        presetPeriod: 'TODAY',
        startDate: '2026-11-04',
        endDate: '2026-11-04',
      });

      const monthData = await reportsPnlService.getPnlReportData({
        branchId: 'ALL',
        presetPeriod: 'THIS_MONTH',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      });

      expect(todayData.kpiSummary.grossSales).toBeLessThan(
        monthData.kpiSummary.grossSales
      );
    });

    it('should convert Vietnam local dates (+07:00) to exact UTC ISO boundaries matching S2c-HKD', () => {
      const fromUtc = toVietnamUtcIso('2026-10-01', false);
      const toUtc = toVietnamUtcIso('2026-10-31', true);

      // 01/10/2026 00:00:00+07:00 == 2026-09-30T17:00:00.000Z
      expect(fromUtc).toBe('2026-09-30T17:00:00.000Z');
      // 31/10/2026 23:59:59+07:00 == 2026-10-31T16:59:59.000Z
      expect(toUtc).toBe('2026-10-31T16:59:59.000Z');
    });

    it('should dynamically build P&L statement tree from real backend expense categories without hardcoded ratios', () => {
      const kpi = {
        grossSales: 100000000,
        discounts: 5000000,
        returns: 2000000,
        netRevenue: 93000000,
        cogs: 60000000,
        grossProfit: 33000000,
        grossMarginPct: 35.5,
        operatingExpenses: 10000000,
        shrinkageLoss: 1000000,
        netProfit: 22000000,
        netMarginPct: 23.7,
        estimatedTaxAmount: 1395000,
        netProfitAfterTax: 20605000,
        netProfitAfterTaxMarginPct: 22.2,
        totalOrders: 320,
        averageOrderValue: 290625,
        netRevenueGrowthPct: 0,
        grossProfitGrowthPct: 0,
        netProfitGrowthPct: 0,
        expensesGrowthPct: 0,
        ordersGrowthPct: 0,
        aovGrowthPct: 0,
      };

      const tree = buildPnlStatementTree(kpi, [
        { category: 'Tiền thuê kho lạnh', amount: 7000000 },
        { category: 'Tiền điện 3 pha', amount: 3000000 },
      ]);

      const sec3 = tree.find((x) => x.id === 'sec-3');
      const opexNode = sec3?.children?.find((x) => x.id === 'item-3-2');
      expect(opexNode?.children).toHaveLength(2);
      expect(opexNode?.children?.[0].title).toBe('Tiền thuê kho lạnh');
      expect(opexNode?.children?.[0].amount).toBe(7000000);
      expect(opexNode?.children?.[1].title).toBe('Tiền điện 3 pha');
      expect(opexNode?.children?.[1].amount).toBe(3000000);
    });
  });
});
