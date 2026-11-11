import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { FinanceOverviewPage } from '../pages/FinanceOverviewPage';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { reportsPnlService } from '../../reports-pnl';
import type { BranchOption, PnlReportResponse } from '../../reports-pnl';
import type { CashAccount } from '../../cashbook/types/cashbook.types';

// Mock react-chartjs-2 to avoid jsdom canvas context errors while keeping chart containers testable
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
  { id: 'branch-1', code: 'CN-01', name: 'Chi nhánh Quận 1' },
];

const MOCK_PNL_REPORT: PnlReportResponse = {
  filter: {
    branchId: 'ALL',
    presetPeriod: 'THIS_MONTH',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
  },
  kpiSummary: {
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
    netRevenueGrowthPct: 12.5,
    grossProfitGrowthPct: 10.2,
    netProfitGrowthPct: 14.8,
    expensesGrowthPct: -3.2,
    ordersGrowthPct: 8.4,
    aovGrowthPct: 3.8,
  },
  pnlTree: [
    {
      id: 'sec-1',
      code: 'I',
      title: 'I. DOANH THU BÁN HÀNG & CUNG CẤP DỊCH VỤ',
      level: 1,
      amount: 350000000,
      percentageOfNetRevenue: 104.5,
      isHeader: true,
      children: [
        {
          id: 'item-1-1',
          code: '1.1',
          title: 'Doanh thu bán lẻ gộp',
          level: 2,
          amount: 350000000,
          percentageOfNetRevenue: 104.5,
        },
      ],
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
  trendData: [
    {
      dateLabel: '01/11',
      netRevenue: 33500000,
      cogs: 16000000,
      expenses: 8000000,
      netProfit: 9500000,
    },
  ],
  expenseBreakdown: [
    {
      categoryCode: 'RENT',
      categoryName: 'Thuê mặt bằng',
      amount: 45000000,
      percentage: 51.1,
      color: '#0F766E',
    },
  ],
  topProducts: [
    {
      productId: 'p-1',
      productCode: 'SP001',
      productName: 'Sữa tươi Vinamilk 1L',
      quantitySold: 250,
      revenue: 12500000,
      profit: 3750000,
      marginPct: 30,
    },
  ],
};

/**
 * Helper component exposing current router location inside MemoryRouter for navigation assertions.
 */
const LocationProbe = () => {
  const location = useLocation();
  return (
    <div data-testid="router-location">
      {`${location.pathname}${location.search}${location.hash}`}
    </div>
  );
};

/**
 * Creates a clean QueryClient instance configured for deterministic unit testing.
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

describe('FinanceOverviewPage — Unified Zone A + Zone B (P&L) Integration Suite', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  let activeQueryClient: QueryClient;
  let scrolledElements: Element[];
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;
  let httpGetSpy: ReturnType<typeof vi.spyOn>;
  let cashAccountsSpy: ReturnType<typeof vi.spyOn>;
  let branchesSpy: ReturnType<typeof vi.spyOn>;
  let pnlReportSpy: ReturnType<typeof vi.spyOn>;

  const countHttpGetCalls = (endpoint: string): number =>
    httpGetSpy.mock.calls.filter(([url]: [string, ...unknown[]]) => url === endpoint).length;

  /**
   * Configures default API/service spies for Zone A and Zone B endpoints.
   */
  const setupDefaultMocks = (options?: { rejectCashbook?: boolean }) => {
    const rejectCashbook = options?.rejectCashbook ?? false;

    if (rejectCashbook) {
      cashAccountsSpy = vi
        .spyOn(cashbookService, 'getCashAccounts')
        .mockRejectedValue(new Error('Cashbook accounts service unavailable'));
    } else {
      cashAccountsSpy = vi
        .spyOn(cashbookService, 'getCashAccounts')
        .mockResolvedValue(MOCK_CASH_ACCOUNTS);
    }

    httpGetSpy = vi.spyOn(financeHttpClient, 'get').mockImplementation(async (url: string) => {
      if (url === '/cashbook/summary') {
        if (rejectCashbook) {
          throw new Error('Cashbook summary service unavailable');
        }
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
            data: {
              totalDebtAR: 82700000,
              overLimitCount: 0,
              totalCustomers: 12,
            },
          },
        } as never;
      }

      if (url === '/expenses/summary') {
        return {
          data: {
            data: {
              overdueAmount: 0,
              overdueCount: 0,
            },
          },
        } as never;
      }

      if (url === '/tax/household/summary') {
        return {
          data: {
            success: true,
            data: {
              taxDueYtd: 18500000,
              totalTaxAmount: 18500000,
            },
          },
        } as never;
      }

      throw new Error(`Unexpected financeHttpClient.get call: ${url}`);
    });

    branchesSpy = vi
      .spyOn(reportsPnlService, 'getBranches')
      .mockResolvedValue(MOCK_BRANCHES);

    pnlReportSpy = vi
      .spyOn(reportsPnlService, 'getPnlReportData')
      .mockResolvedValue(MOCK_PNL_REPORT);
  };

  /**
   * Renders FinanceOverviewPage wrapped in QueryClientProvider and MemoryRouter.
   */
  const renderPage = (initialEntry = '/store-owner/finance') => {
    activeQueryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={activeQueryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <LocationProbe />
          <FinanceOverviewPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    scrolledElements = [];
    scrollIntoViewMock = vi.fn(function (this: Element) {
      scrolledElements.push(this);
    });
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof HTMLElement.prototype.scrollIntoView;
    setupDefaultMocks();
  });

  afterEach(() => {
    cleanup();
    activeQueryClient?.clear();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    vi.restoreAllMocks();
  });

  it('1. renders Zone A (Hero Cash Card, compact To-Do when 0 urgent tasks, 4 Summary cards) and Zone B (#pnl-section) on the same page', async () => {
    const { container } = renderPage();

    // Wait for both Zone A and Zone B data to settle
    await waitFor(() => {
      expect(screen.getByText('348.950.000đ')).toBeDefined();
      expect(screen.getByText('85.811.580đ')).toBeDefined();
    });

    // Zone A: Hero Cash Card
    expect(screen.getByText(/Tiền hiện có hôm nay/i)).toBeDefined();

    // Zone A: Compact To-Do state when 0 urgent tasks
    expect(screen.getByText('0 việc khẩn')).toBeDefined();
    expect(screen.getByText(/Không có khoản nợ quá hạn/i)).toBeDefined();

    // Zone A: 4 Summary pillar cards
    const summaryCards = container.querySelectorAll('.finance-summary-card');
    expect(summaryCards).toHaveLength(4);
    expect(screen.getByText('Khách đang nợ mình')).toBeDefined();
    expect(screen.getByText('Phải trả dịch vụ')).toBeDefined();
    expect(screen.getByText('Lợi nhuận ròng PnL')).toBeDefined();
    expect(screen.getByText(/Thuế năm nay/i)).toBeDefined();

    // Zone B: Embedded P&L section on the same page
    const pnlSection = container.querySelector('#pnl-section');
    expect(pnlSection).not.toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Báo cáo Lãi lỗ (P&L)' })
    ).toBeDefined();
  });

  it('2. deduplicates P&L API calls and shares reportData.kpiSummary with Card #3', async () => {
    renderPage();

    await waitFor(() => {
      expect(pnlReportSpy).toHaveBeenCalledTimes(1);
      expect(branchesSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText('85.811.580đ')).toBeDefined();
    });

    // FinanceOverviewPage must not directly query /finance/reports/pnl/summary
    const directGetUrls = httpGetSpy.mock.calls.map(([url]: [string, ...unknown[]]) => String(url));
    expect(directGetUrls).not.toContain('/finance/reports/pnl/summary');
    expect(directGetUrls.some((url: string) => url.includes('/finance/reports/pnl'))).toBe(false);

    // Card #3 displays exact netProfit and netMarginPct from unified reportData.kpiSummary
    const card3Title = screen.getByText('Lợi nhuận ròng PnL');
    const card3Element = card3Title.closest('.finance-summary-card') as HTMLElement;
    expect(card3Element).not.toBeNull();
    expect(card3Element.textContent).toContain('85.811.580đ');
    expect(card3Element.textContent).toContain('Tỷ suất lợi nhuận: 25.6%');
  });

  it('3. clicking Card #3 scrolls smoothly to #pnl-section instead of navigating away', async () => {
    const { container } = renderPage('/store-owner/finance');

    await waitFor(() => {
      expect(screen.getByText('85.811.580đ')).toBeDefined();
    });

    const card3Element = screen
      .getByText('Lợi nhuận ròng PnL')
      .closest('.finance-summary-card') as HTMLElement;
    fireEvent.click(card3Element);

    const pnlSection = container.querySelector('#pnl-section');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(scrolledElements[0]).toBe(pnlSection);
    expect(screen.getByTestId('router-location').textContent).toBe('/store-owner/finance');
  });

  it('4a. deep-linking with ?tab=pnl triggers smooth scroll to #pnl-section on mount', async () => {
    const { container } = renderPage('/store-owner/finance?tab=pnl');
    const pnlSection = container.querySelector('#pnl-section');

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    expect(scrolledElements[0]).toBe(pnlSection);
  });

  it('4b. deep-linking with #pnl hash triggers smooth scroll to #pnl-section on mount', async () => {
    const { container } = renderPage('/store-owner/finance#pnl');
    const pnlSection = container.querySelector('#pnl-section');

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    expect(scrolledElements[0]).toBe(pnlSection);
  });

  it('5. supports progressive disclosure, view mode tabs, and accounting basis toggle updating Waterfall title', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Bậc thang Lợi nhuận P&L (Thực thu thực chi)')).toBeDefined();
      expect(screen.getByText('Xu Hướng Doanh Thu & Lợi Nhuận')).toBeDefined();
    });

    // Default ALL mode: detailed accounting statement is collapsed
    expect(screen.queryByText(/Bảng phân tích Lãi lỗ chi tiết/i)).toBeNull();

    // Progressive disclosure: clicking "Dành cho kế toán" expands statement table
    fireEvent.click(screen.getByRole('button', { name: /Dành cho kế toán/i }));
    expect(screen.getByText(/Bảng phân tích Lãi lỗ chi tiết/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Thu gọn bút toán kế toán/i })).toBeDefined();

    // Switch to "Biểu đồ" tab: charts/waterfall shown, statement hidden
    const chartTab = screen.getByRole('tab', { name: /Biểu đồ/i });
    fireEvent.click(chartTab);
    expect(chartTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Xu Hướng Doanh Thu & Lợi Nhuận')).toBeDefined();
    expect(screen.queryByText(/Bảng phân tích Lãi lỗ chi tiết/i)).toBeNull();

    // Switch to "Bảng Lãi lỗ" tab: statement shown, charts/waterfall hidden
    const statementTab = screen.getByRole('tab', { name: /Bảng Lãi lỗ/i });
    fireEvent.click(statementTab);
    expect(statementTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Bảng phân tích Lãi lỗ chi tiết/i)).toBeDefined();
    expect(screen.queryByText(/Bậc thang Lợi nhuận P&L/i)).toBeNull();
    expect(screen.queryByText('Xu Hướng Doanh Thu & Lợi Nhuận')).toBeNull();

    // Switch back to "Toàn cảnh" tab: both charts and expanded statement are visible
    const overviewTab = screen.getByRole('tab', { name: /Toàn cảnh/i });
    fireEvent.click(overviewTab);
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Bậc thang Lợi nhuận P&L (Thực thu thực chi)')).toBeDefined();
    expect(screen.getByText(/Bảng phân tích Lãi lỗ chi tiết/i)).toBeDefined();

    // Toggle accounting basis to "Sổ kế toán dồn tích": updates Waterfall title & statement label
    fireEvent.click(screen.getByRole('button', { name: /Sổ kế toán dồn tích/i }));
    expect(screen.getByText('Bậc thang Lợi nhuận P&L (Kế toán dồn tích)')).toBeDefined();
    expect(screen.getByText('Cơ sở hạch toán: Dồn tích')).toBeDefined();
  });

  it('6. unified header refresh refetches both Zone A and Zone B endpoints with toast, and header export opens P&L export modal', async () => {
    renderPage();

    await waitFor(() => {
      expect(cashAccountsSpy).toHaveBeenCalledTimes(1);
      expect(pnlReportSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText('348.950.000đ')).toBeDefined();
      expect(screen.getByText('85.811.580đ')).toBeDefined();
    });

    expect(countHttpGetCalls('/cashbook/summary')).toBe(1);

    // Click unified header "Cập nhật" button
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật/i }));

    await waitFor(() => {
      expect(cashAccountsSpy).toHaveBeenCalledTimes(2);
      expect(pnlReportSpy).toHaveBeenCalledTimes(2);
      expect(countHttpGetCalls('/cashbook/summary')).toBe(2);
      expect(screen.getByText('Đã cập nhật số liệu tài chính mới nhất!')).toBeDefined();
    });

    // Click header export button to open P&L Export modal
    const headerExportBtn = screen.getByTitle('In và xuất báo cáo Lãi lỗ');
    fireEvent.click(headerExportBtn);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('In & Xuất Báo Cáo Tài Chính P&L')).toBeDefined();
  });

  it('7. renders error banner cleanly without crashing when cashbook queries reject', async () => {
    vi.restoreAllMocks();
    setupDefaultMocks({ rejectCashbook: true });

    const { container } = renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Không thể kết nối đến máy chủ kế toán để tải số dư quỹ/i)
      ).toBeDefined();
    });

    // Retry button and page layout remain intact without crashing
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeDefined();
    expect(screen.getByText(/Tiền hiện có hôm nay/i)).toBeDefined();
    expect(container.querySelector('#pnl-section')).not.toBeNull();
    expect(screen.getByText('85.811.580đ')).toBeDefined();
  });
});
