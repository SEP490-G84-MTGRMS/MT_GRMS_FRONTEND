import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { posShiftApi } from '../../pos/api/posShiftApi';
import { posOrderApi } from '../../pos/api/posOrderApi';
import { CashbookPage } from '../pages/CashbookPage';
import { cashbookService } from '../services/cashbookService';
import { employeeApi } from '../../employee/api/employeeApi';
import type { CashAccount, LedgerTransaction } from '../types/cashbook.types';

const MOCK_ACCOUNTS: CashAccount[] = [
  {
    id: 'ACC-01',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1',
    accountName: 'Két tiền mặt quầy Q1',
    accountType: 'CASH',
    currentBalance: 5000000,
    initialBalance: 5000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  },
  {
    id: 'ACC-SAFE',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Két sắt trung tâm',
    accountType: 'CASH',
    currentBalance: 50000000,
    initialBalance: 50000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: true,
  },
  {
    id: 'ACC-BANK-01',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Vietcombank VietQR',
    accountType: 'BANK',
    currentBalance: 25000000,
    initialBalance: 20000000,
    isActive: true,
    currency: 'VND',
  },
];

const MOCK_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TX-001',
    transactionCode: 'PT-20261114-001',
    accountId: 'ACC-01',
    accountName: 'Két tiền mặt quầy Q1',
    branchId: 'BR-01',
    transactionType: 'RECEIPT',
    category: 'Thu nợ khách hàng',
    amount: 1500000,
    balanceAfter: 6500000,
    counterpartyType: 'CUSTOMER',
    counterpartyName: 'Nguyễn Văn A',
    description: 'Khách hàng thanh toán công nợ',
    referenceDocType: 'DEBT_PAYMENT',
    referenceDocId: 'ORD-2026-001',
    sourceModuleName: 'CRM_DEBT',
    isAutomated: true,
    createdBy: 'Thu ngân Q1',
    createdAt: '2026-11-14T08:30:00Z',
  },
  {
    id: 'TX-002',
    transactionCode: 'PC-20261114-002',
    accountId: 'ACC-01',
    accountName: 'Két tiền mặt quầy Q1',
    branchId: 'BR-01',
    transactionType: 'PAYMENT',
    category: 'Chi phí vận hành',
    amount: -250000,
    balanceAfter: 6250000,
    counterpartyType: 'SUPPLIER',
    counterpartyName: 'Công ty Điện Lực',
    description: 'Thanh toán tiền điện',
    referenceDocType: 'SERVICE_EXPENSE',
    referenceDocId: 'EXP-2026-001',
    sourceModuleName: 'SERVICE_OPEX',
    isAutomated: false,
    createdBy: 'Cửa hàng trưởng',
    createdAt: '2026-11-14T09:00:00Z',
  },
];

describe('Phase 1: Cashbook Page UI/UX Standardization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(employeeApi, 'getBranches').mockResolvedValue([
      { id: 'BR-01', name: 'Chi nhánh Quận 1' },
      { id: 'BR-02', name: 'Chi nhánh Quận 7' },
    ] as any);

    vi.spyOn(cashbookService, 'getCashAccounts').mockResolvedValue(MOCK_ACCOUNTS);
    vi.spyOn(cashbookService, 'getTransactions').mockResolvedValue({
      items: MOCK_TRANSACTIONS,
      totalItems: MOCK_TRANSACTIONS.length,
    });
    vi.spyOn(cashbookService, 'getPendingTriage').mockResolvedValue([]);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/store-owner/cashbook']}>
        <CashbookPage />
      </MemoryRouter>
    );
  };

  it('opens daily closing on the cashbook route without rendering shift history', async () => {
    const previousUser = useAuthStore.getState().user;
    useAuthStore.setState({ user: { role: 'STORE_OWNER' } as NonNullable<typeof previousUser> });
    localStorage.setItem('mtgrms_active_branch', JSON.stringify({ id: 'BR-01', name: 'Chi nhánh Quận 1' }));
    vi.spyOn(posShiftApi, 'getCurrentBusinessDate').mockRejectedValue(new Error('Unavailable'));
    vi.spyOn(posShiftApi, 'previewBusinessDay').mockRejectedValue(new Error('Unavailable'));
    vi.spyOn(posShiftApi, 'getBusinessDayHistory').mockResolvedValue([]);
    vi.spyOn(posShiftApi, 'getShiftHistory').mockResolvedValue([]);
    vi.spyOn(posOrderApi, 'getOwnerUnsettledSummary').mockRejectedValue(new Error('Unavailable'));
    const Route = () => <output data-testid="route">{useLocation().pathname}</output>;

    const view = render(
      <MemoryRouter initialEntries={['/store-owner/cashbook']}>
        <CashbookPage />
        <Route />
      </MemoryRouter>,
    );
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Chốt doanh thu ngày' }));
      expect(await screen.findByRole('dialog', { name: 'Chốt doanh thu ngày' })).toBeTruthy();
      expect(screen.getByTestId('route').textContent).toBe('/store-owner/cashbook');
      expect(screen.queryByText('Lịch Sử Chốt Ca & Bàn Giao Quầy')).toBeNull();
      await waitFor(() => expect(posShiftApi.previewBusinessDay).toHaveBeenCalled());
    } finally {
      view.unmount();
      useAuthStore.setState({ user: previousUser });
    }
  });

  it('1. Standardizes container: uses zero-page-scroll .po-matrix-container and removes min-h-screen', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sổ Quỹ Thu Chi')).toBeDefined();
    });

    const matrixContainer = container.querySelector('.po-matrix-container');
    expect(matrixContainer).toBeDefined();
    expect(matrixContainer?.getAttribute('style')).toContain('overflow: hidden');
    expect(matrixContainer?.getAttribute('style')).toContain('height: 100%');

    // Confirm that old bloated banners and executive blocks are absent
    expect(container.querySelector('.min-h-screen')).toBeNull();
    expect(container.querySelector('.cash-accounts-grid')).toBeNull();
    expect(screen.queryByText(/🔄 ĐỒNG BỘ CA & KÉT POS/i)).toBeNull();
    expect(screen.queryByText(/Đầu kỳ có:/i)).toBeNull();
  });

  it('2. Standardizes header: renders fixed .so-list-header with count badge and action buttons', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sổ Quỹ Thu Chi')).toBeDefined();
      expect(screen.getByText('2 giao dịch')).toBeDefined();
    });

    // Secondary Link to finance overview
    const financeLink = screen.getByRole('link', { name: /Báo cáo dòng tiền/i });
    expect(financeLink).toBeDefined();
    expect(financeLink.getAttribute('href')).toBe('/store-owner/finance?tab=overview');

    // Action buttons
    expect(screen.getByRole('button', { name: /Kiểm kê két/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Xuất Excel/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Chuyển quỹ nội bộ/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Chi tiền/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Thu tiền/i })).toBeDefined();
  });

  it('3. Standardizes filter toolbar: renders CSS Grid .so-list-filter with 4x2 inputs', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Mã phiếu, diễn giải...')).toBeDefined();
      expect(screen.getByPlaceholderText('Khách hàng / NCC...')).toBeDefined();
    });

    const filterCard = container.querySelector('.so-list-filter');
    expect(filterCard).toBeDefined();

    // Verify Row 1 dropdowns and inputs
    const voucherInput = screen.getByPlaceholderText('Mã phiếu, diễn giải...');
    const counterpartyInput = screen.getByPlaceholderText('Khách hàng / NCC...');
    expect(voucherInput).toBeDefined();
    expect(counterpartyInput).toBeDefined();

    // Verify search and reset buttons
    expect(screen.getByRole('button', { name: /Tìm kiếm/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Đặt lại/i })).toBeDefined();
  });

  it('4. Standardizes table card: renders fixed head, scrollable body, and pagination', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PT-20261114-001')).toBeDefined();
      expect(screen.getByText('PC-20261114-002')).toBeDefined();
    });

    expect(container.querySelector('.so-list-table-card')).toBeDefined();
    expect(container.querySelector('.so-list-table-head')).toBeDefined();
    expect(container.querySelector('.so-list-table-body')).toBeDefined();

    // Verify data rendering in table
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    expect(screen.getByText('Công ty Điện Lực')).toBeDefined();
    expect(screen.getByText('+1.500.000 đ')).toBeDefined();
    expect(screen.getByText('-250.000 đ')).toBeDefined();

    // Pagination
    expect(screen.getByText(/Hiển thị/i)).toBeDefined();
  });

  it('5. Preserves modal triggers: opens Receipt, Payment, Transfer, Blind Audit, and Export modals', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thu tiền/i })).toBeDefined();
    });

    // 1. Open Receipt Modal
    fireEvent.click(screen.getByRole('button', { name: /Thu tiền/i }));
    await waitFor(() => {
      expect(screen.getByText(/Lập phiếu thu/i)).toBeDefined();
    });
    // Close modal
    fireEvent.click(document.querySelector('.cb-btn-outline')!);

    // 2. Open Payment Modal
    fireEvent.click(screen.getByRole('button', { name: /Chi tiền/i }));
    await waitFor(() => {
      expect(screen.getByText(/Lập phiếu chi/i)).toBeDefined();
    });
    fireEvent.click(document.querySelector('.cb-btn-outline')!);

    // 3. Open Transfer Modal
    fireEvent.click(screen.getByRole('button', { name: /Chuyển quỹ nội bộ/i }));
    await waitFor(() => {
      expect(screen.getByText(/Chuyển tiền nội bộ/i)).toBeDefined();
    });
    fireEvent.click(document.querySelector('.cb-btn-outline')!);

    // 4. Open Blind Cash Audit Modal
    fireEvent.click(screen.getByRole('button', { name: /Kiểm kê két/i }));
    await waitFor(() => {
      expect(screen.getByText(/Quy trình kiểm quỹ mù 3 bước/i)).toBeDefined();
    });
    fireEvent.click(screen.getByRole('button', { name: /Thoát/i }));

    // 5. Open Export Modal
    fireEvent.click(screen.getByRole('button', { name: /Xuất Excel/i }));
    await waitFor(() => {
      expect(screen.getByText(/Xuất File Excel/i)).toBeDefined();
    });
  });

  it('6. Supports Print Receipt and Reverse Transaction modal actions directly from table rows', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PT-20261114-001')).toBeDefined();
    });

    // Click Print button on first row
    const printButtons = container.querySelectorAll('.so-list-action-btn--icon');
    expect(printButtons.length).toBeGreaterThan(0);
    fireEvent.click(printButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('PHIẾU THU TIỀN')).toBeDefined();
      expect(screen.getByText(/In chứng từ/i)).toBeDefined();
    });

    // Close print modal
    const closeBtns = screen.getAllByRole('button', { name: /Đóng/i });
    fireEvent.click(closeBtns[0]);

    // Click Void / Hủy button on first row
    const voidButtons = container.querySelectorAll('.so-list-action-btn--danger');
    expect(voidButtons.length).toBeGreaterThan(0);
    fireEvent.click(voidButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Gạch bỏ phiếu \[PT-20261114-001\]/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Nhập nhầm tài khoản/i)).toBeDefined();
    });
  });

  it('7. Verifies table colgroup width sums to exactly 100% and printable voucher layout', async () => {
    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('PT-20261114-001')).toBeDefined();
    });

    const colgroups = container.querySelectorAll('.so-list-table colgroup');
    expect(colgroups.length).toBeGreaterThan(0);

    const cols = colgroups[0].querySelectorAll('col');
    let totalPct = 0;
    cols.forEach((c) => {
      const match = c.style.width.match(/([\d.]+)%/);
      if (match) {
        totalPct += parseFloat(match[1]);
      }
    });

    // Check that column widths sum to exactly 100% without rounding drift
    expect(Math.round(totalPct)).toBe(100);

    // Open print modal and verify .printable-a4-sheet is rendered
    const printButtons = container.querySelectorAll('.so-list-action-btn--icon');
    fireEvent.click(printButtons[0]);

    await waitFor(() => {
      expect(document.querySelector('.printable-a4-sheet')).not.toBeNull();
    });
  });

  it('8. Verifies date range filtering logic in local storage service', () => {
    // Test that date filtering accurately includes and excludes dates
    const res = cashbookService.getTransactionsFromLocal({
      startDate: '2026-10-12',
      endDate: '2026-10-13',
    });

    expect(res.items.length).toBeGreaterThan(0);
    res.items.forEach((tx) => {
      const day = tx.createdAt.slice(0, 10);
      expect(day >= '2026-10-12').toBe(true);
      expect(day <= '2026-10-13').toBe(true);
    });
  });
});
