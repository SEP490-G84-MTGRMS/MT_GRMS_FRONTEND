import { describe, it, expect, beforeEach } from 'vitest';
import { cashbookService } from '../services/cashbookService';

describe('FE-17 Cashbook & Cash Flow Service Tests', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
  });

  it('REQ-17.1: should get initial cash and bank accounts properly', async () => {
    const accounts = await cashbookService.getCashAccounts();
    expect(accounts.length).toBeGreaterThanOrEqual(4);

    const cashAccount = accounts.find((a) => a.accountType === 'CASH');
    expect(cashAccount).toBeDefined();
    expect(cashAccount?.currentBalance).toBeGreaterThan(0);

    const bankAccount = accounts.find((a) => a.accountType === 'BANK');
    expect(bankAccount).toBeDefined();
    expect(bankAccount?.bankName).toBeDefined();
  });

  it('REQ-17.2: should create a manual receipt and update account balance', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const targetAccount = accounts[0];
    const initialBal = targetAccount.currentBalance;

    const receiptAmount = 500000;
    const newTx = await cashbookService.createReceipt({
      accountId: targetAccount.id,
      amount: receiptAmount,
      category: 'Thu nợ khách hàng',
      counterpartyType: 'CUSTOMER',
      counterpartyName: 'Khách hàng VIP test',
      description: 'Khách thanh toán đợt 1',
    });

    expect(newTx.transactionType).toBe('RECEIPT');
    expect(newTx.amount).toBe(receiptAmount);
    expect(newTx.balanceAfter).toBe(initialBal + receiptAmount);

    const updatedAccount = await cashbookService.getCashAccountById(targetAccount.id);
    expect(updatedAccount?.currentBalance).toBe(initialBal + receiptAmount);
  });

  it('REQ-17.2: should throw error when receipt amount is <= 0', async () => {
    const accounts = await cashbookService.getCashAccounts();
    await expect(
      cashbookService.createReceipt({
        accountId: accounts[0].id,
        amount: 0,
        category: 'Thu test',
        counterpartyType: 'OTHER',
        counterpartyName: 'Test',
        description: 'Test',
      })
    ).rejects.toThrow('Số tiền thu phải lớn hơn 0');
  });

  it('REQ-17.3: should create a payment when sufficient cash balance exists', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH')!;
    const initialBal = cashAccount.currentBalance;

    const paymentAmount = 200000;
    const newTx = await cashbookService.createPayment({
      accountId: cashAccount.id,
      amount: paymentAmount,
      category: 'Chi phí vận hành',
      counterpartyType: 'SUPPLIER',
      counterpartyName: 'EVN Điện Lực',
      description: 'Thanh toán tiền điện',
    });

    expect(newTx.transactionType).toBe('PAYMENT');
    expect(newTx.amount).toBe(paymentAmount);
    expect(newTx.balanceAfter).toBe(initialBal - paymentAmount);

    const updatedAccount = await cashbookService.getCashAccountById(cashAccount.id);
    expect(updatedAccount?.currentBalance).toBe(initialBal - paymentAmount);
  });

  it('REQ-17.3 (Rule GBR-CSH-03): should strictly throw error preventing cash drawer overdraft', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH')!;

    const excessiveAmount = cashAccount.currentBalance + 5000000;

    await expect(
      cashbookService.createPayment({
        accountId: cashAccount.id,
        amount: excessiveAmount,
        category: 'Chi quá số dư két',
        counterpartyType: 'OTHER',
        counterpartyName: 'Người nhận',
        description: 'Thử nghiệm âm két',
      })
    ).rejects.toThrow(/vượt quá số dư két hiện có.*GBR-CSH-03/);
  });

  it('REQ-17.4 (Rule GBR-CSH-04): should reconcile cash without discrepancy', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH')!;

    const adj = await cashbookService.reconcileCashAccount({
      accountId: cashAccount.id,
      systemBalance: cashAccount.currentBalance,
      actualCountedBalance: cashAccount.currentBalance,
      differenceAmount: 0,
      reason: '',
      auditedBy: 'Kiểm toán viên',
    });

    expect(adj).toBeNull();
  });

  it('REQ-17.4 (Rule GBR-CSH-04): should throw error if discrepancy exists but reason is missing', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH')!;

    await expect(
      cashbookService.reconcileCashAccount({
        accountId: cashAccount.id,
        systemBalance: cashAccount.currentBalance,
        actualCountedBalance: cashAccount.currentBalance - 50000,
        differenceAmount: -50000,
        reason: '   ',
        auditedBy: 'Kiểm toán viên',
      })
    ).rejects.toThrow(/bắt buộc phải có lý do giải trình cụ thể theo quy tắc GBR-CSH-04/);
  });

  it('REQ-17.4: should create ADJUSTMENT transaction when discrepancy is justified', async () => {
    const accounts = await cashbookService.getCashAccounts();
    const cashAccount = accounts.find((a) => a.accountType === 'CASH')!;

    const diff = -20000;
    const actual = cashAccount.currentBalance + diff;

    const adj = await cashbookService.reconcileCashAccount({
      accountId: cashAccount.id,
      systemBalance: cashAccount.currentBalance,
      actualCountedBalance: actual,
      differenceAmount: diff,
      reason: 'Bù tiền thối nhầm khách',
      auditedBy: 'Nguyễn Trường An',
    });

    expect(adj).not.toBeNull();
    expect(adj?.transactionType).toBe('ADJUSTMENT');
    expect(adj?.amount).toBe(diff);
    expect(adj?.balanceAfter).toBe(actual);

    const updatedAccount = await cashbookService.getCashAccountById(cashAccount.id);
    expect(updatedAccount?.currentBalance).toBe(actual);
  });

  it('REQ-17.5: should export CSV with UTF-8 BOM prefix', async () => {
    const { items } = await cashbookService.getTransactions({}, 1, 5);
    const csv = cashbookService.exportCashbookToCSV(items);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Mã giao dịch');
    expect(csv).toContain('Số dư sau GD (VNĐ)');
  });
});
