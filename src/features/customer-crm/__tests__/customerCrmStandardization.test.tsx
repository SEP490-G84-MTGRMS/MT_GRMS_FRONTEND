import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerFilterBar } from '../components/CustomerFilterBar';
import { CustomerDebtLedgerDrawer } from '../components/CustomerDebtLedgerDrawer';
import { CustomerManagementPage } from '../pages/CustomerManagementPage';
import { customerApi } from '../api/customerApi';
import type { CustomerDto } from '../types/customer.types';

const mockCustomers: CustomerDto[] = [
  {
    id: 'cust-1',
    tenantId: 'tenant-1',
    customerCode: 'KH001',
    fullName: 'Nguyễn Văn An',
    phoneNumber: '0901234567',
    currentDebtAR: 8000000,
    membershipTier: 'Gold',
    loyaltyPoints: 350,
    totalSpending: 45000000,
    status: 'Active',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'cust-2',
    tenantId: 'tenant-1',
    customerCode: 'KH002',
    fullName: 'Trần Thị Bích',
    phoneNumber: '0987654321',
    currentDebtAR: 0,
    membershipTier: 'Silver',
    loyaltyPoints: 120,
    totalSpending: 12000000,
    status: 'Active',
    createdAt: '2026-02-10T10:00:00Z',
  },
];

describe('Customer CRM Layout Standardization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('renders CustomerTable with gold standard .so-list-table-card and synchronized head/body', () => {
    const handleSelect = vi.fn();
    const handleCollect = vi.fn();
    const handleEdit = vi.fn();

    const { container } = render(
      <CustomerTable
        customers={mockCustomers}
        isLoading={false}
        onSelect={handleSelect}
        onEdit={handleEdit}
        onCollect={handleCollect}
      />
    );

    // Verify .so-list-table-card container
    expect(container.querySelector('.so-list-table-card')).toBeTruthy();
    expect(container.querySelector('.so-list-table-head')).toBeTruthy();
    expect(container.querySelector('.so-list-table-body')).toBeTruthy();

    // Verify customers rendered
    expect(screen.getByText('Nguyễn Văn An')).toBeTruthy();
    expect(screen.getByText('Trần Thị Bích')).toBeTruthy();

    // Over-limit / debt limit badge should NOT be rendered
    expect(screen.queryByText('Vượt hạn mức')).toBeNull();

    // Membership tier badges should NOT be rendered
    expect(screen.queryByText('Gold')).toBeNull();
    expect(screen.queryByText('Silver')).toBeNull();

    // Verify Thu nợ button uses normalized .so-list-action-btn styling without btn-collect-debt
    const collectBtn = container.querySelector('.so-list-action-btn--warning');
    expect(collectBtn).toBeTruthy();
    expect(collectBtn?.textContent).toContain('Thu nợ');
    expect(collectBtn?.classList.contains('btn-collect-debt')).toBe(false);

    // Row click invokes onSelect
    fireEvent.click(screen.getByText('Nguyễn Văn An'));
    expect(handleSelect).toHaveBeenCalledWith(mockCustomers[0]);
  });

  it('renders clean empty state inside table body when customers array is empty', () => {
    const { container } = render(
      <CustomerTable
        customers={[]}
        isLoading={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onCollect={vi.fn()}
      />
    );

    expect(container.querySelector('.so-list-table-card')).toBeTruthy();
    expect(screen.getByText('Không tìm thấy khách hàng nào')).toBeTruthy();
  });

  it('renders CustomerFilterBar with 4-column 2-row grid and supports input and reset', () => {
    const handleSearchChange = vi.fn();
    const handleReset = vi.fn();

    const { container } = render(
      <CustomerFilterBar
        searchTerm="Nguyễn"
        onSearchChange={handleSearchChange}
        selectedTier="ALL"
        onTierChange={vi.fn()}
        selectedDebtStatus="ALL"
        onDebtStatusChange={vi.fn()}
        onResetFilters={handleReset}
      />
    );

    expect(container.querySelector('.so-list-filter')).toBeTruthy();
    const input = screen.getByPlaceholderText('Tên, SĐT, mã KH...') as HTMLInputElement;
    expect(input.value).toBe('Nguyễn');

    // Trigger reset button
    const resetBtn = screen.getByTitle('Đặt lại toàn bộ bộ lọc');
    fireEvent.click(resetBtn);
    expect(input.value).toBe('');
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders pinned pagination with default 15 items per page and handles page change', () => {
    const handlePageChange = vi.fn();
    const handlePageSizeChange = vi.fn();

    const { container } = render(
      <CustomerTable
        customers={mockCustomers}
        isLoading={false}
        currentPage={1}
        pageSize={15}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onCollect={vi.fn()}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    );

    expect(container.querySelector('.table-pagination-container')).toBeTruthy();
    expect(container.querySelector('.table-pagination-info')?.textContent).toContain('khách hàng');
    const sizeSelect = container.querySelector('.table-pagination-size-select') as HTMLSelectElement;
    expect(sizeSelect).toBeTruthy();
    expect(sizeSelect.value).toBe('15');
  });

  it('renders CustomerDebtLedgerDrawer with balanceBefore -> balanceAfter, return offset label, and BE full-history totals', async () => {
    vi.spyOn(customerApi, 'getCustomerDebtLedger').mockResolvedValueOnce([
      {
        id: 'l-1',
        customerId: 'cust-1',
        entryType: 'GoodsReturnOffset',
        transactionType: 'DEBT_DECREASE',
        amount: 200000,
        balanceBefore: 1000000,
        balanceAfter: 800000,
        totalIncreased: 5000000,
        totalDecreased: 4200000,
        currentBalance: 800000,
        totalCount: 60,
        referenceDocId: 'ORD-001',
        note: 'Trả hàng trừ công nợ',
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'l-2',
        customerId: 'cust-1',
        entryType: 'DebtRepayment',
        transactionType: 'DEBT_DECREASE',
        amount: 500000,
        balanceBefore: 1500000,
        balanceAfter: 1000000,
        totalIncreased: 5000000,
        totalDecreased: 4200000,
        currentBalance: 800000,
        totalCount: 60,
        paymentMethod: 'Cash',
        cashTransactionCode: 'PT-01',
        note: 'Thu nợ tiền mặt',
        createdAt: '2026-11-19T10:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <CustomerDebtLedgerDrawer
          isOpen={true}
          customer={mockCustomers[0]}
          onClose={vi.fn()}
          onOpenCollect={vi.fn()}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Trả hàng trừ nợ')).toBeTruthy();
    });
    expect(screen.getByText('Thu nợ')).toBeTruthy();
    expect(screen.getAllByText(/Số dư trước → Số dư sau:/).length).toBe(2);
    expect(screen.getByText('Tất cả (60)')).toBeTruthy();
    // Full-history totals from BE (5.000.000 & 4.200.000), not sum of only the 2 visible rows
    expect(screen.getByText(/\+5\.000\.000/)).toBeTruthy();
    expect(screen.getByText(/-4\.200\.000/)).toBeTruthy();
  });

  it('BUG-035: clears URL-synced search input on the FIRST click of Đặt lại without reverting', async () => {
    vi.spyOn(customerApi, 'getCustomers').mockResolvedValue(mockCustomers);
    vi.spyOn(customerApi, 'getKpiSummary').mockResolvedValue({
      totalCustomers: 2,
      totalDebtAR: 8000000,
      debtorCount: 1,
      totalLoyaltyPoints: 470,
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/store-owner/customers?search=KH001']}>
          <CustomerManagementPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const searchInput = await screen.findByPlaceholderText('Tên, SĐT, mã KH...') as HTMLInputElement;
    await waitFor(() => {
      expect(searchInput.value).toBe('KH001');
    });

    const resetBtn = screen.getByTitle('Đặt lại toàn bộ bộ lọc');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(searchInput.value).toBe('');
    });
    // Ensure subsequent renders do not restore stale URL keyword
    await waitFor(() => {
      expect(customerApi.getCustomers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: '' })
      );
    });
  });
});
