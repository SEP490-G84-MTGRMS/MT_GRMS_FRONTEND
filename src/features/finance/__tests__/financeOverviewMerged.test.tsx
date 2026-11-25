import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { reportsPnlService } from '../../reports-pnl';
import type { FinanceOverviewResponse } from '../types/financeOverview.types';
import { FinanceOverviewPage } from '../pages/FinanceOverviewPage';

vi.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="mock-pnl-trend-chart" />,
  Doughnut: () => <div data-testid="mock-pnl-expense-doughnut" />,
}));

const OVERVIEW: FinanceOverviewResponse = {
  scope: { branchId: null, branchName: 'Toàn bộ chi nhánh', branchCount: 2 },
  period: { fromUtc: '2026-10-31T17:00:00.000Z', toUtc: '2026-11-15T16:59:59.000Z', timeZone: 'Asia/Ho_Chi_Minh' },
  positionAsOfUtc: '2026-11-15T16:59:59.000Z',
  generatedAtUtc: '2026-11-15T12:00:00.000Z',
  totals: {
    openingBalance: 300_000_000, cashIn: 50_000_000, cashOut: 20_000_000,
    netCashFlow: 30_000_000, internalTransferNet: 0, closingBalance: 330_000_000,
    availableCash: 330_000_000, cashAtRegisters: 30_000_000, safeDeposit: 100_000_000,
    bankBalance: 200_000_000, unallocatedBankBalance: 200_000_000, cashInTransit: 5_000_000,
  },
  attention: {
    receivableAmount: 19_600_000, debtorCount: 3, pendingPayableAmount: 8_000_000,
    pendingPayableCount: 2, cashInTransit: 5_000_000, pendingCashMovementCount: 1,
    isCurrentSnapshot: true,
  },
  branches: [
    {
      branchId: '11111111-1111-1111-1111-111111111111', branchCode: 'CN-01', branchName: 'Chi nhánh trung tâm',
      openingBalance: 80_000_000, cashIn: 30_000_000, cashOut: 10_000_000, netCashFlow: 20_000_000,
      internalTransferNet: 0, closingBalance: 100_000_000, cashAtRegisters: 20_000_000,
      safeDeposit: 80_000_000, cashInTransit: 5_000_000, receivableAmount: 19_600_000,
      pendingPayableAmount: 8_000_000, pendingPayableCount: 2, status: 'ATTENTION',
    },
    {
      branchId: '22222222-2222-2222-2222-222222222222', branchCode: 'CN-02', branchName: 'Chi nhánh Thủ Đức',
      openingBalance: 20_000_000, cashIn: 20_000_000, cashOut: 10_000_000, netCashFlow: 10_000_000,
      internalTransferNet: 0, closingBalance: 30_000_000, cashAtRegisters: 10_000_000,
      safeDeposit: 20_000_000, cashInTransit: 0, receivableAmount: 0,
      pendingPayableAmount: 0, pendingPayableCount: 0, status: 'HEALTHY',
    },
  ],
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
};

function renderPage(entry = '/store-owner/finance') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}><LocationProbe /><FinanceOverviewPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Finance overview unified contract', () => {
  let getSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(reportsPnlService, 'getBranches').mockResolvedValue([
      { id: 'ALL', code: 'ALL', name: 'Toàn bộ chi nhánh' },
      { id: OVERVIEW.branches[0].branchId, code: 'CN-01', name: 'Chi nhánh trung tâm' },
      { id: OVERVIEW.branches[1].branchId, code: 'CN-02', name: 'Chi nhánh Thủ Đức' },
    ]);
    getSpy = vi.spyOn(financeHttpClient, 'get').mockResolvedValue({ data: { data: OVERVIEW } });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('defaults to cash health and loads one consolidated overview endpoint', async () => {
    renderPage();
    await screen.findByText('Sức khỏe tiền mặt theo chi nhánh');
    expect(screen.getByTestId('location').textContent).toBe('/store-owner/finance?tab=overview');
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy.mock.calls[0][0]).toBe('/finance/overview');
    expect(screen.getAllByText('Chi nhánh trung tâm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chi nhánh Thủ Đức').length).toBeGreaterThan(0);
  });

  it('does not include cash in transit in available cash', async () => {
    renderPage();
    await screen.findByText('Tiền có thể sử dụng tại cuối kỳ');
    expect(screen.getAllByText('330.000.000đ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5.000.000đ').length).toBeGreaterThan(0);
    expect(screen.queryByText('335.000.000đ')).toBeNull();
  });

  it('selecting a branch refetches the same endpoint with branchId', async () => {
    renderPage();
    await screen.findByText('Sức khỏe tiền mặt theo chi nhánh');
    fireEvent.change(screen.getByLabelText('Phạm vi chi nhánh'), { target: { value: OVERVIEW.branches[0].branchId } });
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2));
    const config = getSpy.mock.calls[1][1] as { params: Record<string, string> };
    expect(config.params.branchId).toBe(OVERVIEW.branches[0].branchId);
  });

  it('changing the period sends UTC boundaries without reloading the page', async () => {
    renderPage();
    await screen.findByText('Sức khỏe tiền mặt theo chi nhánh');
    fireEvent.click(screen.getByRole('button', { name: '7 ngày qua' }));
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2));
    const params = (getSpy.mock.calls[1][1] as { params: Record<string, string> }).params;
    expect(params.fromDate.endsWith('Z')).toBe(true);
    expect(params.toDate.endsWith('Z')).toBe(true);
    expect(screen.getByTestId('location').textContent).toBe('/store-owner/finance?tab=overview');
  });

  it('marks historical non-ledger values as unavailable in the branch table', async () => {
    getSpy.mockResolvedValueOnce({ data: { data: { ...OVERVIEW, attention: { ...OVERVIEW.attention, isCurrentSnapshot: false } } } });
    renderPage();
    await screen.findByText('Sức khỏe tiền mặt theo chi nhánh');
    expect(screen.getAllByText('Không có lịch sử').length).toBeGreaterThan(0);
  });

  it('renders the redesigned P&L child view instead of the legacy report dashboard', async () => {
    const pnlSpy = vi.spyOn(reportsPnlService, 'getPnlReportData');
    renderPage('/store-owner/finance?tab=pnl');

    await screen.findByText('Bậc thang Lợi nhuận P&L (Kế toán dồn tích)');
    expect(screen.getByText('Xu hướng Doanh thu & Lợi nhuận')).toBeDefined();
    expect(screen.getByText('Cơ cấu chi phí vận hành')).toBeDefined();
    expect(screen.queryByText('Bảng phân tích Lãi lỗ chi tiết')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Năm nay' }));
    await waitFor(() => expect(pnlSpy).toHaveBeenCalledTimes(2));
    expect(pnlSpy.mock.calls[1][0].presetPeriod).toBe('THIS_YEAR');
    expect(screen.getByTestId('location').textContent).toBe('/store-owner/finance?tab=pnl');
  });

  it('opens the complete reporting week from a KPI notification across all branches', async () => {
    const pnlSpy = vi.spyOn(reportsPnlService, 'getPnlReportData');
    renderPage('/store-owner/finance?tab=pnl&startDate=2026-10-12&endDate=2026-10-18');

    await waitFor(() => expect(pnlSpy).toHaveBeenCalledWith({
      branchId: 'ALL', presetPeriod: 'CUSTOM', startDate: '2026-10-12', endDate: '2026-10-18',
    }));
  });

  it('opens PnlExportModal when clicking Xuất báo cáo button on P&L tab', async () => {
    renderPage('/store-owner/finance?tab=pnl');
    await screen.findByText('Bậc thang Lợi nhuận P&L (Kế toán dồn tích)');

    const exportBtn = screen.getByRole('button', { name: /Xuất báo cáo/i });
    fireEvent.click(exportBtn);

    expect(await screen.findByText('In & Xuất Báo Cáo Tài Chính P&L')).toBeDefined();
  });
});
