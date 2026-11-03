import { describe, it, expect } from 'vitest';
import {
  MOCK_FUNDS,
  MOCK_CUSTOMERS,
  MOCK_PNL_MONTH,
} from '../data/mockFinanceData';
import {
  calculateDaysOverdue,
  getFinancialNow,
} from '../services/financeClock';
import {
  calculateHouseholdTax,
  TAX_CONFIG_HKD_2026,
} from '../config/taxConfig';
import {
  formatMoney,
  numberToWordsVietnamese,
} from '../utils/formatters';

describe('Phase 8: Blacklist & Business Logic Audit (Gate 4)', () => {
  describe('8.1. Blacklist UI Strings Scanning', () => {
    // Standard Vite glob loader with eager loading for client-side TS compatibility
    const financeModules = import.meta.glob(
      [
        '../../finance/**/*.{ts,tsx}',
        '../../cashbook/**/*.{ts,tsx}',
        '../../customer-crm/**/*.{ts,tsx}',
        '../../service-expenses/**/*.{ts,tsx}',
        '../../reports-pnl/**/*.{ts,tsx}',
        '../../tax-snapshot/**/*.{ts,tsx}',
        '../../pos/pages/CashierShiftDashboardPage.tsx',
      ],
      { query: '?raw', import: 'default', eager: true }
    );

    const bannedKeywords = [
      'Quản Lý Chi Phí Dịch Vụ & Vận Hành (FE-07)',
      '(Customer CRM & Accounts Receivable)',
      '(FE-10)',
      '(FE-17)',
      '(FE-19)',
      'Ghi nhận chi phí vận hành (Poka-yoke)',
    ];

    it('should not contain banned legacy FE codes in page titles or user-facing labels', () => {
      Object.entries(financeModules).forEach(([filePath, content]) => {
        // Skip test files themselves
        if (filePath.includes('.test.')) return;
        const text = typeof content === 'string' ? content : '';
        bannedKeywords.forEach((banned) => {
          expect(text).not.toContain(banned);
        });
      });
    });
  });

  describe('8.2. Poka-yoke Business Logic Verification', () => {
    it('should correctly format money with non-breaking space and trailing đ', () => {
      expect(formatMoney(1250000)).toBe('1.250.000đ');
      expect(formatMoney(0)).toBe('0đ');
      expect(formatMoney(-50000)).toBe('−50.000đ');
    });

    it('should convert numbers to Vietnamese words correctly for financial receipts', () => {
      expect(numberToWordsVietnamese(1250000)).toBe('Một triệu hai trăm năm mươi nghìn đồng');
      expect(numberToWordsVietnamese(500000)).toBe('Năm trăm nghìn đồng');
    });

    it('should enforce fixed demo clock 2026-10-27 and calculate overdue days dynamically', () => {
      const now = getFinancialNow();
      expect(now.toISOString().split('T')[0]).toBe('2026-10-27');

      // Payables overdue check (2026-10-12 is 15 days overdue from 2026-10-27)
      expect(calculateDaysOverdue('2026-10-12')).toBe(15);
      // Future due date is not overdue
      expect(calculateDaysOverdue('2026-11-05')).toBe(0);
    });

    it('should calculate Household Tax according to Decree 141/2026 with 1B threshold', () => {
      expect(TAX_CONFIG_HKD_2026.thresholdRevenue).toBe(1_000_000_000);

      // Below 1 billion: 0 tax
      const resBelow = calculateHouseholdTax(800_000_000);
      expect(resBelow.isOverThreshold).toBe(false);
      expect(resBelow.totalTaxAmount).toBe(0);

      // Above 1 billion: tax on excess
      const resAbove = calculateHouseholdTax(1_200_000_000);
      expect(resAbove.isOverThreshold).toBe(true);
      expect(resAbove.excessRevenue).toBe(200_000_000);
      // VAT 1% = 2,000,000; PIT 0.5% = 1,000,000 => Total = 3,000,000
      expect(resAbove.totalTaxAmount).toBe(3_000_000);
    });

    it('should verify customer credit limits and over-limit detection', () => {
      const overLimitCustomers = MOCK_CUSTOMERS.filter((c) => c.currentDebt > c.creditLimit);
      expect(overLimitCustomers.length).toBe(2);
      expect(overLimitCustomers.map((c) => c.id)).toEqual(['cust-03', 'cust-05']);
    });

    it('should verify P&L month net profit matches exact Gate 0 reconciliation', () => {
      // 173.866.600 - 81.324.700 - 6.730.320 = 85.811.580
      const calcProfit =
        MOCK_PNL_MONTH.grossProfit -
        MOCK_PNL_MONTH.operatingExpenses -
        MOCK_PNL_MONTH.shrinkageWarehouse;
      expect(calcProfit).toBe(85_811_580);
      expect(MOCK_PNL_MONTH.netProfit).toBe(85_811_580);
    });

    it('should ensure funds include cash drawer register account for blind reconciliation', () => {
      const cashierDrawer = MOCK_FUNDS.find((a) => a.id === 'cash_q1');
      expect(cashierDrawer).toBeDefined();
      expect(cashierDrawer?.group).toBe('cash');
      expect(cashierDrawer?.name).toBe('Két quầy Q1');

      // Safe box is restricted to owner
      const safeBox = MOCK_FUNDS.find((a) => a.id === 'safe');
      expect(safeBox?.restrictedTo).toContain('owner');
    });
  });
});
