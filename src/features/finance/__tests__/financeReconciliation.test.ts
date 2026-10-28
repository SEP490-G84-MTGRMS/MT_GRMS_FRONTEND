import { describe, it, expect, beforeEach } from 'vitest';
import {
  MOCK_FUNDS,
  MOCK_CASH_TRANSIT,
  MOCK_PAYABLES,
  MOCK_CUSTOMERS,
  MOCK_PNL_MONTH,
  MOCK_LEDGER_EQUATION,
} from '../data/mockFinanceData';
import { calculateHouseholdTax, defaultTaxConfig } from '../config/taxConfig';
import {
  setFinancialNow,
  calculateDaysOverdue,
} from '../services/financeClock';

describe('Phase 0: Finance Mathematical & Reconciliation Tests (Gate 0)', () => {
  beforeEach(() => {
    // Ensure standard demo date: 2026-10-27
    setFinancialNow('2026-10-27T08:00:00Z');
  });

  it('Equation 1: Sum of 5 fund balances equals exactly 348,950,000 VND', () => {
    const totalFunds = MOCK_FUNDS.reduce((sum, f) => sum + f.balance, 0);
    expect(totalFunds).toBe(348_950_000);
  });

  it('Equation 2: Sổ quỹ equation (Opening + Inflow - Outflow = Closing) matches 359,300,000 VND', () => {
    const calculatedClosing =
      MOCK_LEDGER_EQUATION.openingBalance +
      MOCK_LEDGER_EQUATION.receiptsTotal -
      MOCK_LEDGER_EQUATION.paymentsTotal;

    expect(calculatedClosing).toBe(359_300_000);
    expect(calculatedClosing).toBe(MOCK_LEDGER_EQUATION.closingBalance);
  });

  it('Equation 3: Total Assets (5 Funds + In-Transit) matches exactly 359,300,000 VND', () => {
    const totalFunds = MOCK_FUNDS.reduce((sum, f) => sum + f.balance, 0);
    const transitPending = MOCK_CASH_TRANSIT.filter((t) => t.status === 'PENDING').reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const totalAssets = totalFunds + transitPending;
    expect(totalAssets).toBe(359_300_000);
    expect(totalAssets).toBe(MOCK_LEDGER_EQUATION.totalAssetsWithTransit);
  });

  it('Equation 4: Monthly net growth matches 14,250,000 VND', () => {
    const growth =
      MOCK_LEDGER_EQUATION.closingBalance - MOCK_LEDGER_EQUATION.openingBalance;
    expect(growth).toBe(14_250_000);
    expect(growth).toBe(MOCK_LEDGER_EQUATION.monthlyGrowthAmount);
  });

  it('Equation 5: Overdue payables at 2026-10-27 count exactly 3 items and total 23,300,000 VND', () => {
    const unpaidPayables = MOCK_PAYABLES.filter((p) => !p.isPaid);
    const overduePayables = unpaidPayables.filter(
      (p) => calculateDaysOverdue(p.dueDate) > 0
    );

    expect(overduePayables.length).toBe(3);
    const totalOverdueAmount = overduePayables.reduce((sum, p) => sum + p.amount, 0);
    expect(totalOverdueAmount).toBe(23_300_000);

    // Verify individual overdue days
    const evn = overduePayables.find((p) => p.vendorName === 'EVN HCMC')!;
    expect(calculateDaysOverdue(evn.dueDate)).toBe(12); // Oct 15 -> Oct 27 = 12 days

    const rent = overduePayables.find((p) => p.vendorName === 'Ông Trần Văn Đức')!;
    expect(calculateDaysOverdue(rent.dueDate)).toBe(19); // Oct 08 -> Oct 27 = 19 days

    const repair = overduePayables.find((p) => p.vendorName === 'Cơ điện lạnh Hoàng Long')!;
    expect(calculateDaysOverdue(repair.dueDate)).toBe(7); // Oct 20 -> Oct 27 = 7 days
  });

  it('Equation 6: Customer debt matches 82,700,000 VND and exactly 2 customers over credit limit', () => {
    const totalDebt = MOCK_CUSTOMERS.reduce((sum, c) => sum + c.currentDebt, 0);
    expect(totalDebt).toBe(82_700_000);

    const overLimitCustomers = MOCK_CUSTOMERS.filter((c) => c.currentDebt > c.creditLimit);
    expect(overLimitCustomers.length).toBe(2);

    const ids = overLimitCustomers.map((c) => c.id).sort();
    expect(ids).toEqual(['cust-03', 'cust-05']);
  });

  it('Equation 7: P&L monthly waterfall reconciles to exactly 85,811,580 VND', () => {
    const pnl = MOCK_PNL_MONTH;
    const grossProfit = pnl.netSales - pnl.cogs;
    expect(grossProfit).toBe(173_866_600);
    expect(grossProfit).toBe(pnl.grossProfit);

    const netProfit = grossProfit - pnl.operatingExpenses - pnl.shrinkageWarehouse;
    expect(netProfit).toBe(85_811_580);
    expect(netProfit).toBe(pnl.netProfit);

    // OPEX Breakdown reconciliation
    const opexSum =
      pnl.opexBreakdown.servicePayables +
      pnl.opexBreakdown.staffSalaries +
      pnl.opexBreakdown.utilitiesAndMisc;
    expect(opexSum).toBe(81_324_700);
    expect(opexSum).toBe(pnl.operatingExpenses);
  });

  it('Equation 8: Household Tax calculation on 1,417,500,000 VND YTD matches 6,262,500 VND', () => {
    const ytdRevenue = 1_417_500_000;
    const taxResult = calculateHouseholdTax(ytdRevenue, defaultTaxConfig);

    expect(taxResult.isOverThreshold).toBe(true);
    expect(taxResult.excessRevenue).toBe(417_500_000);
    expect(taxResult.vatAmount).toBe(4_175_000); // 1% of 417.5M
    expect(taxResult.pitAmount).toBe(2_087_500); // 0.5% of 417.5M
    expect(taxResult.totalTaxAmount).toBe(6_262_500);
  });
});
