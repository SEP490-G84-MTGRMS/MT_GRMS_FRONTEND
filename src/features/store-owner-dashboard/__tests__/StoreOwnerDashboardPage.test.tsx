import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StoreOwnerDashboardPage } from '../pages/StoreOwnerDashboardPage';

vi.mock('../api/dashboardApi', () => ({
  getStoreOwnerDashboard: vi.fn().mockResolvedValue({
    scope: { tenantName: 'Cửa hàng Test', branchName: 'Chi nhánh 1', asOfUtc: new Date().toISOString() },
    branches: [{ id: 'b1', name: 'Chi nhánh 1' }],
    sales: { netRevenue: 1000000, revenueGrowthPercent: 10, totalOrders: 50, averageOrderValue: 20000, trend: [], topProducts: [] },
    finance: { grossProfit: 400000, operatingExpenses: 100000, netProfit: 300000, cogsWarningNotice: null },
    procurement: { pendingApprovalCount: 2, awaitingReceiptCount: 1, receivedAmountInPeriod: 500000 },
    inventory: { lowStockCount: 0, outOfStockCount: 0, expiryWarningCount: 0, lowStockItems: [], expiringBatches: [] },
    employees: { activeCount: 5, totalCount: 5 },
  }),
}));

vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      user: {
        id: 'user-1',
        fullName: 'Chủ cửa hàng Test',
        role: 'STORE_OWNER',
        tenantName: 'Cửa hàng Test',
      },
    })
  ),
}));

describe('StoreOwnerDashboardPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders "Vào màn bán hàng" button navigating to /pos', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <StoreOwnerDashboardPage />
        </MemoryRouter>
      );
    });

    const posBtn = screen.getByRole('link', { name: /Vào màn bán hàng/i });
    expect(posBtn).toBeTruthy();
    expect(posBtn.getAttribute('href')).toBe('/pos');
    expect(posBtn.getAttribute('title')).toBe('Vào màn hình bán hàng POS');
  });
});
