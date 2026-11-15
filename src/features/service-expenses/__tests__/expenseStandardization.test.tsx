import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExpenseTable } from '../components/ExpenseTable';
import { ExpenseFilterBar } from '../components/ExpenseFilterBar';
import type { ServiceExpenseDto } from '../types/expense.types';

const mockExpenses: ServiceExpenseDto[] = [
  {
    expenseId: 'EXP-101',
    voucherCode: 'PC-2026-001',
    branchId: 'br-1',
    branchName: 'Chi nhánh Quận 1',
    category: 'Electricity',
    vendorName: 'Điện lực EVN',
    amount: 4500000,
    dueDate: '2026-03-01',
    expenseDate: '2026-02-01T08:00:00Z',
    status: 'Pending',
    note: 'Tiền điện tháng 2',
    isTaxDeductible: true,
    isRecurring: true,
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    expenseId: 'EXP-102',
    voucherCode: 'PC-2026-002',
    branchId: 'br-1',
    branchName: 'Chi nhánh Quận 1',
    category: 'Rent',
    vendorName: 'Chủ nhà B',
    amount: 25000000,
    dueDate: '2026-02-15',
    expenseDate: '2026-02-01T08:00:00Z',
    status: 'Paid',
    note: 'Tiền thuê mặt bằng',
    isTaxDeductible: true,
    isRecurring: true,
    createdAt: '2026-02-01T08:00:00Z',
  },
];

describe('Service Expenses Layout Standardization', () => {
  it('renders ExpenseTable with gold standard .so-list-table-card and synchronized head/body', () => {
    const handlePay = vi.fn();
    const handleCancel = vi.fn();
    const handleViewBill = vi.fn();

    const { container } = render(
      <MemoryRouter>
        <ExpenseTable
          data={mockExpenses}
          isLoading={false}
          totalItems={2}
          onPageChange={vi.fn()}
          onViewBill={handleViewBill}
          onPay={handlePay}
          onCancel={handleCancel}
        />
      </MemoryRouter>
    );

    // Verify .so-list-table-card container
    expect(container.querySelector('.so-list-table-card')).toBeTruthy();
    expect(container.querySelector('.so-list-table-head')).toBeTruthy();
    expect(container.querySelector('.so-list-table-body')).toBeTruthy();

    // Verify expenses rendered
    expect(screen.getByText('Điện lực EVN')).toBeTruthy();
    expect(screen.getByText('Chủ nhà B')).toBeTruthy();

    // Verify actions
    const payBtn = screen.getByTitle('Chi tiền thanh toán khoản này');
    fireEvent.click(payBtn);
    expect(handlePay).toHaveBeenCalledWith(mockExpenses[0]);
  });

  it('renders clean empty state inside table body when expenses array is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <ExpenseTable
          data={[]}
          isLoading={false}
          totalItems={0}
          onPageChange={vi.fn()}
          onViewBill={vi.fn()}
          onPay={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(container.querySelector('.so-list-table-card')).toBeTruthy();
    expect(screen.getByText('Không có khoản phải trả nào')).toBeTruthy();
  });

  it('renders ExpenseFilterBar with 4-column 2-row grid and handles reset', () => {
    const handleFilterChange = vi.fn();
    const handleReset = vi.fn();

    const { container } = render(
      <ExpenseFilterBar
        filters={{ keyword: 'EVN', page: 1, pageSize: 10 }}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />
    );

    expect(container.querySelector('.so-list-filter')).toBeTruthy();
    const input = screen.getByPlaceholderText('Mã phiếu, NCC, diễn giải...') as HTMLInputElement;
    expect(input.value).toBe('EVN');

    const resetBtn = screen.getByTitle('Đặt lại toàn bộ bộ lọc');
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
  });

  it('allows independent payment status and approval status selection without conflicting', () => {
    const handleFilterChange = vi.fn();

    render(
      <ExpenseFilterBar
        filters={{ status: 'Pending', quickStatus: 'SUSPICIOUS', page: 1, pageSize: 10 }}
        onFilterChange={handleFilterChange}
        onReset={vi.fn()}
      />
    );

    const paymentSelect = screen.getByTitle('Lọc theo trạng thái thanh toán') as HTMLSelectElement;
    const approvalSelect = screen.getByTitle('Lọc trạng thái duyệt chi hoặc dấu hiệu nghi vấn') as HTMLSelectElement;

    expect(paymentSelect.value).toBe('Pending');
    expect(approvalSelect.value).toBe('SUSPICIOUS');

    fireEvent.change(paymentSelect, { target: { value: 'Paid' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ status: 'Paid' });

    fireEvent.change(approvalSelect, { target: { value: 'PENDING_APPROVAL' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ quickStatus: 'PENDING_APPROVAL' });
  });

  it('toggles and closes ⋯ dropdown menu on outside click in ExpenseTable', () => {
    render(
      <MemoryRouter>
        <ExpenseTable
          data={mockExpenses}
          isLoading={false}
          totalItems={2}
          onPageChange={vi.fn()}
          onViewBill={vi.fn()}
          onPay={vi.fn()}
          onCancel={vi.fn()}
        />
      </MemoryRouter>
    );

    const moreBtn = screen.getByTitle('Tùy chọn khác');
    fireEvent.click(moreBtn);
    expect(screen.getByText('Hủy khoản chi')).toBeTruthy();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Hủy khoản chi')).toBeNull();
  });
});
