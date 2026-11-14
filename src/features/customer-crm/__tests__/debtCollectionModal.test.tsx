import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DebtCollectionModal } from '../components/DebtCollectionModal';
import { cashbookService } from '../../cashbook/services/cashbookService';
import type { CustomerDto } from '../types/customer.types';
import type { CashAccount } from '../../cashbook/types/cashbook.types';

const mockCustomer: CustomerDto = {
  id: 'cust-123',
  tenantId: 'tenant-1',
  fullName: 'Nguyễn Văn Test',
  phoneNumber: '0987654321',
  currentDebtAR: 5000000,
  debtLimit: 10000000,
  membershipTier: 'Silver',
  loyaltyPoints: 100,
  totalSpending: 20000000,
  status: 'Active',
  createdAt: '2026-01-01',
};

const mockAccounts: CashAccount[] = [
  {
    id: 'acc-cash-1',
    branchId: 'b-1',
    branchName: 'Chi nhánh 1',
    accountName: 'Két tiền quầy thu ngân',
    accountType: 'CASH',
    currentBalance: 5000000,
    initialBalance: 0,
    isActive: true,
    currency: 'VND',
  },
  {
    id: 'acc-cash-2',
    branchId: 'b-1',
    branchName: 'Chi nhánh 1',
    accountName: 'Két sắt chủ tiệm',
    accountType: 'CASH',
    currentBalance: 20000000,
    initialBalance: 0,
    isActive: true,
    currency: 'VND',
  },
  {
    id: 'acc-bank-1',
    branchId: 'b-1',
    branchName: 'Chi nhánh 1',
    accountName: 'Vietcombank Doanh Nghiệp',
    accountNumber: '0071001234567',
    bankName: 'Vietcombank',
    accountType: 'BANK',
    currentBalance: 80000000,
    initialBalance: 0,
    isActive: true,
    currency: 'VND',
    isDefault: true,
  },
  {
    id: 'acc-bank-2',
    branchId: 'b-1',
    branchName: 'Chi nhánh 1',
    accountName: 'MBBank Số Đẹp',
    accountNumber: '999988887777',
    bankName: 'MBBank',
    accountType: 'BANK',
    currentBalance: 30000000,
    initialBalance: 0,
    isActive: true,
    currency: 'VND',
  },
];

describe('DebtCollectionModal - LG-07 Account Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cashbookService, 'getCashAccounts').mockResolvedValue(mockAccounts);
  });

  it('loads cash accounts and renders bank accounts for VietQR mode by default', async () => {
    render(
      <DebtCollectionModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
        onConfirm={vi.fn()}
        isSubmitting={false}
      />
    );

    await waitFor(() => {
      expect(cashbookService.getCashAccounts).toHaveBeenCalled();
    });

    const select = screen.getByLabelText(/Tài khoản ngân hàng nhận tiền/i) as HTMLSelectElement;
    expect(select).toBeDefined();

    // Default VietQR: options should only contain BANK accounts
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Vietcombank Doanh Nghiệp');
    expect(options[1].textContent).toContain('MBBank Số Đẹp');
    expect(select.value).toBe('acc-bank-1'); // isDefault
  });

  it('switches to cash accounts dropdown when user chooses Tiền mặt tại quầy', async () => {
    render(
      <DebtCollectionModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
        onConfirm={vi.fn()}
        isSubmitting={false}
      />
    );

    await waitFor(() => {
      expect(cashbookService.getCashAccounts).toHaveBeenCalled();
    });

    const cashButton = screen.getByRole('button', { name: /Tiền mặt tại quầy/i });
    fireEvent.click(cashButton);

    const select = screen.getByLabelText(/Két quầy nhận tiền/i) as HTMLSelectElement;
    expect(select).toBeDefined();

    const options = Array.from(select.querySelectorAll('option'));
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain('Két tiền quầy thu ngân');
    expect(options[1].textContent).toContain('Két sắt chủ tiệm');
    expect(select.value).toBe('acc-cash-1');
  });

  it('submits selected account when confirming debt collection', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <DebtCollectionModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
        onConfirm={handleConfirm}
        isSubmitting={false}
      />
    );

    await waitFor(() => {
      expect(cashbookService.getCashAccounts).toHaveBeenCalled();
    });

    // Switch to cash
    fireEvent.click(screen.getByRole('button', { name: /Tiền mặt tại quầy/i }));

    // Select second cash account (Két sắt chủ tiệm)
    const select = screen.getByLabelText(/Két quầy nhận tiền/i);
    fireEvent.change(select, { target: { value: 'acc-cash-2' } });

    // Quick select full debt amount
    fireEvent.click(screen.getByRole('button', { name: /Thu hết/i }));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Thu 5.000.000/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-123',
          amount: 5000000,
          method: 'Cash',
          targetAccountId: 'acc-cash-2',
        })
      );
    });
  });
});
