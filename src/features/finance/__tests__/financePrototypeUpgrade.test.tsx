import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { FinanceOverviewPage } from '../pages/FinanceOverviewPage';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { posShiftApi } from '../../pos/api/posShiftApi';
import { reportsPnlService } from '../../reports-pnl';
import type { BranchOption, PnlReportResponse } from '../../reports-pnl';
import type { CashAccount } from '../../cashbook/types/cashbook.types';

// Mock react-chartjs-2 to avoid jsdom canvas context errors
vi.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="mock-pnl-trend-chart" />,
  Doughnut: () => <div data-testid="mock-pnl-expense-doughnut" />,
}));

const MOCK_CASH_ACCOUNTS: CashAccount[] = [
  {
    id: 'acc-cash-1',
    branchId: 'branch-1',
    branchName: 'Chi nhánh Quận 1',
    accountName: 'Két tiền mặt quầy Q1',
    accountType: 'CASH',
    currentBalance: 12500000,
    initialBalance: 10000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  },
  {
    id: 'acc-safe-1',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Két sắt chủ shop',
    accountType: 'CASH',
    currentBalance: 150000000,
    initialBalance: 120000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: true,
  },
  {
    id: 'acc-bank-1',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Vietcombank Kinh doanh',
    accountType: 'BANK',
    currentBalance: 186450000,
    initialBalance: 150000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  },
];

const MOCK_BRANCHES: BranchOption[] = [
  { id: 'ALL', code: 'ALL', name: 'Toàn hệ thống (Tất cả chi nhánh)', isMain: true },
];

const MOCK_PNL_REPORT: PnlReportResponse = {
  filter: {
    branchId: 'ALL',
    presetPeriod: 'THIS_MONTH',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
  },
  kpiSummary: ({
    grossSales: 350000000,
    discounts: 10000000,
    returns: 5000000,
    netRevenue: 335000000,
    cogs: 161133400,
    grossProfit: 173866600,
    grossMarginPct: 51.9,
    operatingExpenses: 81324700,
    shrinkageLoss: 6730320,
    netProfit: 85811580,
    netMarginPct: 25.6,
    estimatedTaxAmount: 5025000,
    netProfitAfterTax: 80786580,
    netProfitAfterTaxMarginPct: 24.1,
    totalOrders: 1240,
    averageOrderValue: 270161,
  } as any),
  pnlTree: [
    {
      id: 'sec-1',
      code: 'I',
      title: 'I. DOANH THU BÁN HÀNG & CUNG CẤP DỊCH VỤ',
      level: 1,
      amount: 335000000,
      percentageOfNetRevenue: 100,
      isHeader: true,
    },
    {
      id: 'item-net',
      code: 'VI',
      title: 'VI. LỢI NHUẬN RÒNG TRƯỚC THUẾ',
      level: 1,
      amount: 85811580,
      percentageOfNetRevenue: 25.6,
      isTotal: true,
    },
  ],
  trendData: [],
  expenseBreakdown: [],
  topProducts: [],
};

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

describe('FinanceOverviewPage — Prototype FE-10 Upgrades Suite', () => {
  let activeQueryClient: QueryClient;

  const setupMocks = (options?: { hasPendingPos?: boolean }) => {
    vi.spyOn(cashbookService, 'getCashAccounts').mockResolvedValue(MOCK_CASH_ACCOUNTS);

    vi.spyOn(financeHttpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/cashbook/summary') {
        return {
          data: {
            data: {
              totalOpeningBalance: 334700000,
              totalReceipts: 42500000,
              totalPayments: 28250000,
              totalClosingBalance: 348950000,
              totalCashInDrawers: 12500000,
              totalBankDeposits: 186450000,
              totalSafeDepositBalance: 150000000,
            },
          },
        } as never;
      }
      if (url === '/customers/debts/summary') {
        return {
          data: {
            data: { totalDebtAR: 82700000, overLimitCount: 1, totalCustomers: 12 },
          },
        } as never;
      }
      if (url === '/expenses/summary') {
        return {
          data: {
            data: { overdueAmount: 4500000, overdueCount: 2, totalPendingAmount: 4500000 },
          },
        } as never;
      }
      if (url === '/tax/household/summary') {
        return {
          data: {
            success: true,
            data: { taxDueYtd: 18500000, totalTaxAmount: 18500000 },
          },
        } as never;
      }
      throw new Error(`Unexpected financeHttpClient.get: ${url}`);
    });

    vi.spyOn(reportsPnlService, 'getBranches').mockResolvedValue(MOCK_BRANCHES);
    vi.spyOn(reportsPnlService, 'getPnlReportData').mockResolvedValue(MOCK_PNL_REPORT);

    if (options?.hasPendingPos) {
      vi.spyOn(posShiftApi, 'getPendingMovements').mockResolvedValue({
        pendingApprovalsCount: 2,
        unconfirmedDropsCount: 1,
        movements: [
          {
            id: 'mov-drop-1',
            shiftId: 'shift-1',
            movementType: 'OUT',
            category: 'CASH_DRAW',
            amount: 5000000,
            reason: 'Rút két nộp két sắt',
            occurredAtUtc: new Date().toISOString(),
            status: 'Recorded',
            isConfirmedByOwner: false,
          },
        ],
      });
    } else {
      vi.spyOn(posShiftApi, 'getPendingMovements').mockResolvedValue({
        pendingApprovalsCount: 0,
        unconfirmedDropsCount: 0,
        movements: [],
      });
    }
  };

  const renderPage = (initialEntry = '/store-owner/finance') => {
    activeQueryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={activeQueryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <FinanceOverviewPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    activeQueryClient?.clear();
    vi.restoreAllMocks();
  });

  it('1. Header features interactive Accounting Mode switch toggle and Sub-tabs', async () => {
    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Tổng quan tài chính & lãi lỗ')).toBeDefined();
    });

    // 1. Check Accounting Mode toggle
    const switchToggle = screen.getByRole('switch');
    expect(switchToggle).toBeDefined();
    expect(switchToggle.getAttribute('aria-checked')).toBe('false');

    // Click toggle switch
    fireEvent.click(switchToggle);
    expect(switchToggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Đã bật Chế độ Kế toán (hiện đối chiếu dồn tích & thực thu chi).')).toBeDefined();

    // 2. Check Sub-tabs navigation
    expect(screen.getByRole('tab', { name: 'Tổng hợp (Tiền mặt & P&L)' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Sức khỏe tiền mặt' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Lãi lỗ (P&L)' })).toBeDefined();
  });

  it('2. Hero Cash Cards displays individual accounts: registers, safe deposit, bank, and cash-in-transit card', async () => {
    setupMocks({ hasPendingPos: true });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Két quầy thu ngân')).toBeDefined();
      expect(screen.getByText('Két sắt chủ shop')).toBeDefined();
      expect(screen.getByText('Tài khoản ngân hàng VietQR')).toBeDefined();
      expect(screen.getByText(/Tiền đang chuyển về két sắt/i)).toBeDefined();
      expect(screen.getByText('5.000.000đ')).toBeDefined();
    });

    expect(screen.getByText(/Đồng bộ từ Ca & Két POS/i)).toBeDefined();
  });

  it('3. Action Inbox integrates pending POS drops, counter disbursements, overdue expenses, and credit limit breaches', async () => {
    setupMocks({ hasPendingPos: true });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Cần bạn duyệt & xử lý ngay/i)).toBeDefined();
    });

    // POS shift movements
    expect(screen.getByText(/Yêu cầu Ca & Két POS chờ duyệt/i)).toBeDefined();
    expect(screen.getByText(/1 phiếu rút két \(5\.000\.000đ\)/i)).toBeDefined();

    // Overdue expenses
    expect(screen.getByText(/2 khoản phải trả đã quá hạn \(4\.500\.000đ\)/i)).toBeDefined();

    // Credit limits
    expect(screen.getByText(/1 khách hàng vượt hạn mức nợ/i)).toBeDefined();
  });

  it('4. Zone B includes 6-step visual P&L Waterfall chart and dual accrual vs cash basis columns when Accounting Mode is active', async () => {
    setupMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Bậc thang Lợi nhuận P&L (Thực thu thực chi)')).toBeDefined();
      expect(screen.getByText(/Dòng chảy Lợi nhuận/i)).toBeDefined();
    });

    // 6-step SVG Waterfall Chart
    expect(screen.getByText(/6 bước trực quan/i)).toBeDefined();
    expect(screen.getByText('Doanh thu')).toBeDefined();
    expect(screen.getByText('Lợi nhuận')).toBeDefined();
    expect(screen.getByText('Lãi ròng')).toBeDefined();

    // Turn on Accounting Mode
    const switchToggle = screen.getByRole('switch');
    fireEvent.click(switchToggle);

    // Progressive disclosure: click "Dành cho kế toán"
    fireEvent.click(screen.getByRole('button', { name: /Dành cho kế toán/i }));

    // Statement table displays Accounting Mode banner and comparison headers
    expect(screen.getByText(/Chế độ Kế toán đang BẬT/i)).toBeDefined();
    expect(screen.getByText('Kế toán dồn tích (đ)')).toBeDefined();
    expect(screen.getByText('Thực thu chi (đ)')).toBeDefined();
  });
});
