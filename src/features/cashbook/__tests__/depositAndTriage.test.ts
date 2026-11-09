import { describe, it, expect, beforeEach } from 'vitest';
import { cashbookService } from '../services/cashbookService';

describe('Deposit & Triage Workflow Frontend Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('DEP-01: should create a new deposit successfully', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH') || accounts[0];
    const initialBal = cashAccount.currentBalance;

    const result = await cashbookService.createDeposit({
      customerName: 'Bác A (Cọc 5 bình Lavie)',
      amount: 250000,
      accountId: cashAccount.id,
      note: '5 bình nước Lavie 19L',
    });

    expect(result.id).toBeDefined();
    expect(result.voucherCode).toBeDefined();
    expect(result.customerName).toBe('Bác A (Cọc 5 bình Lavie)');
    expect(result.amount).toBe(250000);
    expect(result.remainingDeposit).toBe(250000);

    // Verify account balance increased
    const updatedAccount = await cashbookService.getCashAccountById(cashAccount.id);
    expect(updatedAccount?.currentBalance).toBe(initialBal + 250000);
  });

  it('DEP-02: should search deposits by customer name or voucher code', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH') || accounts[0];

    await cashbookService.createDeposit({
      customerName: 'Bác Tư cọc vỏ bia Tiger',
      amount: 150000,
      accountId: cashAccount.id,
      note: '3 két vỏ bia',
    });

    const searchResults = await cashbookService.searchDeposits('Bác Tư');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((d) => d.customerName.includes('Bác Tư'))).toBe(true);
  });

  it('DEP-03: should refund deposit partially with reference and prevent over-refund', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH') || accounts[0];

    const deposit = await cashbookService.createDeposit({
      customerName: 'Chú Ba cọc 2 bình',
      amount: 100000,
      accountId: cashAccount.id,
      note: 'Cọc 2 bình',
    });

    // Refund phase 1: 50,000
    const refund1 = await cashbookService.refundDeposit(deposit.id, {
      refundAmount: 50000,
      accountId: cashAccount.id,
      note: 'Trả 1 bình trước',
    });
    expect(refund1.amount).toBe(50000);

    // Over-refund attempt: trying to refund 60,000 when remaining is only 50,000
    await expect(
      cashbookService.refundDeposit(deposit.id, {
        refundAmount: 60000,
        accountId: cashAccount.id,
        note: 'Cố tình hoàn vượt',
      })
    ).rejects.toThrow(/vượt quá số tiền cọc còn lại/);

    // Refund phase 2: remaining 50,000
    const refund2 = await cashbookService.refundDeposit(deposit.id, {
      refundAmount: 50000,
      accountId: cashAccount.id,
      note: 'Trả nốt 1 bình',
    });
    expect(refund2.amount).toBe(50000);
  });

  it('TRIAGE-01: should retrieve pending triage and resolve an item by Owner', async () => {
    const pendingItems = await cashbookService.getPendingTriage();
    expect(Array.isArray(pendingItems)).toBe(true);

    if (pendingItems.length > 0) {
      const itemToResolve = pendingItems[0];
      const resolved = await cashbookService.resolveTriage(itemToResolve.id, {
        nature: 0, // OperatingExpense
        isTaxDeductible: true,
        category: 'Chi phí mua đá lạnh',
        resolutionNote: 'Đã duyệt hợp lệ theo hóa đơn bán lẻ',
      });

      expect(resolved.id).toBe(itemToResolve.id);
      expect(resolved.status).toBe('PAID');
    }
  });
});
