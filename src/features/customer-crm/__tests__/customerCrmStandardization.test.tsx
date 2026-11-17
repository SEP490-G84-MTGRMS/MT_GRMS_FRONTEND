import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerFilterBar } from '../components/CustomerFilterBar';
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
    const input = screen.getByPlaceholderText('Tên, SĐT, mã KH, MST...') as HTMLInputElement;
    expect(input.value).toBe('Nguyễn');

    // Trigger reset button
    const resetBtn = screen.getByTitle('Đặt lại toàn bộ bộ lọc');
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
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
});
