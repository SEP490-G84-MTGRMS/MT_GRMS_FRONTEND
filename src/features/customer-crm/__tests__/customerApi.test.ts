import { describe, it, expect, vi, beforeEach } from 'vitest';
import { customerApi } from '../api/customerApi';
import { financeHttpClient } from '../../../api/financeHttpClient';

vi.mock('../../../api/financeHttpClient', () => ({
  financeHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('customerApi Live Neon Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomers', () => {
    it('should query /customers with sanitized filter params', async () => {
      const mockList = [
        {
          id: '11111111-aaaa-aaaa-aaaa-111111111111',
          customerCode: 'KH001',
          fullName: 'Nguyễn Văn An',
          phoneNumber: '0901234567',
          currentDebtAR: 3000000,
          membershipTier: 'Gold',
        },
      ];

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockList },
      } as any);

      const result = await customerApi.getCustomers({
        search: 'Nguyễn',
        tier: 'Gold',
        debtStatus: 'DEBT',
      });

      expect(financeHttpClient.get).toHaveBeenCalledWith('/customers', {
        params: {
          search: 'Nguyễn',
          tier: 'Gold',
          debtStatus: undefined,
        },
      });
      expect(result).toEqual(mockList);
    });

    it('should omit debtStatus param when DEBT is specified to support client-side filtering', async () => {
      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: [] },
      } as any);

      await customerApi.getCustomers({
        debtStatus: 'DEBT',
      });

      expect(financeHttpClient.get).toHaveBeenCalledWith('/customers', {
        params: {
          search: undefined,
          tier: undefined,
          debtStatus: undefined,
        },
      });
    });

    it('should throw error when server returns success = false', async () => {
      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: false, message: 'Server database error' },
      } as any);

      await expect(customerApi.getCustomers()).rejects.toThrow('Server database error');
    });
  });

  describe('createCustomer', () => {
    it('should post new customer payload and return created record', async () => {
      const newCust = {
        id: '99999999-aaaa-aaaa-aaaa-999999999999',
        customerCode: 'KH005',
        fullName: 'Trương Hoàng',
        phoneNumber: '0988776655',
        currentDebtAR: 0,
        membershipTier: 'Standard',
      };

      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true, data: newCust },
      } as any);

      const res = await customerApi.createCustomer({
        fullName: 'Trương Hoàng',
        phoneNumber: '0988776655',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith('/customers', {
        fullName: 'Trương Hoàng',
        phoneNumber: '0988776655',
        email: null,
        address: null,
        membershipTier: 'Standard',
      });
      expect(res).toEqual(newCust);
    });
  });

  describe('collectDebt', () => {
    const input = {
      customerId: 'customer-1',
      amount: 500000,
      method: 'Cash' as const,
      targetAccountId: 'till-1',
    };
    const getKey = () => 'repayment-key';

    it('rejects a non-positive amount before posting', async () => {
      await expect(customerApi.collectDebt({ ...input, amount: 0 }, getKey))
        .rejects.toThrow('Số tiền thu nợ phải lớn hơn 0 VNĐ');
      expect(financeHttpClient.post).not.toHaveBeenCalled();
    });

    it('completes from the repayment receipt without requesting the customer again', async () => {
      const receipt = { debtEntryId: 'receipt-1', remainingDebt: 0 };
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({ data: { success: true, data: receipt } });

      await expect(customerApi.collectDebt(input, getKey)).resolves.toEqual(receipt);
      expect(financeHttpClient.get).not.toHaveBeenCalled();
      expect(financeHttpClient.post).toHaveBeenCalledWith('/customers/debt/repay',
        expect.objectContaining({ paymentSourceType: 1, paymentSourceAccountId: 'till-1' }),
        { headers: { 'Idempotency-Key': 'repayment-key' } },
      );
    });

    it('reuses the exact repayment payload and key after an ambiguous failure', async () => {
      vi.mocked(financeHttpClient.post)
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce({ data: { success: true, data: { remainingDebt: 1000000 } } });

      await expect(customerApi.collectDebt(input, getKey)).rejects.toThrow('Connection lost');
      await expect(customerApi.collectDebt(input, getKey)).resolves.toEqual({ remainingDebt: 1000000 });
      expect(financeHttpClient.post).toHaveBeenCalledTimes(2);
      expect(vi.mocked(financeHttpClient.post).mock.calls[1])
        .toEqual(vi.mocked(financeHttpClient.post).mock.calls[0]);
    });

    it('sends the confirmed bank reference for a VietQR repayment', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({ data: { success: true, data: { remainingDebt: 1 } } });
      await customerApi.collectDebt({ ...input, method: 'VietQR', targetAccountId: 'bank-1', transactionRef: '  FT-01 ' }, getKey);
      expect(financeHttpClient.post).toHaveBeenCalledWith('/customers/debt/repay',
        expect.objectContaining({ paymentSourceType: 3, paymentSourceAccountId: 'bank-1', referenceCode: 'FT-01' }),
        expect.anything(),
      );
    });

    it('reports rejection by the repayment endpoint', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: false, message: 'Số tiền thu vượt quá dư nợ.' },
      });
      await expect(customerApi.collectDebt(input, getKey)).rejects.toThrow('Số tiền thu vượt quá dư nợ.');
    });

    it('does not post a repayment without a selected account', async () => {
      await expect(customerApi.collectDebt({ ...input, targetAccountId: undefined }, getKey))
        .rejects.toThrow('Vui lòng chọn tài khoản nhận tiền đang hoạt động.');
      expect(financeHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerDebtLedger', () => {
    it('should map Backend customer debt entries correctly to DEBT_DECREASE and DEBT_INCREASE', async () => {
      const mockEntries = [
        {
          id: 'ent-1',
          entryCode: 'CDE-001',
          customerId: 'cust-1',
          entryType: 'DebtRepayment',
          amount: 5000000,
          balanceAfter: 3000000,
          referenceCode: 'REC-001',
          description: 'Thu nợ',
          occurredAtUtc: '2026-11-02T12:00:00Z',
        },
        {
          id: 'ent-2',
          entryCode: 'CDE-002',
          customerId: 'cust-1',
          entryType: 'DebtIncurred',
          amount: 8000000,
          balanceAfter: 8000000,
          referenceCode: 'ORD-001',
          description: 'Bán nợ',
          occurredAtUtc: '2026-11-01T10:00:00Z',
        },
      ];

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockEntries },
      } as any);

      const ledgers = await customerApi.getCustomerDebtLedger('cust-1');

      expect(ledgers).toHaveLength(2);
      expect(ledgers[0].transactionType).toBe('DEBT_DECREASE');
      expect(ledgers[1].transactionType).toBe('DEBT_INCREASE');
    });
  });

  describe('getKpiSummary', () => {
    it('should call /customers/debts/summary endpoint and return summary data', async () => {
      const mockSummary = {
        totalCustomers: 45,
        totalDebtAR: 82700000,
        debtorCount: 3,
        totalLoyaltyPoints: 12500,
      };

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockSummary },
      } as any);

      const res = await customerApi.getKpiSummary();

      expect(financeHttpClient.get).toHaveBeenCalledWith('/customers/debts/summary');
      expect(res).toEqual(mockSummary);
    });

    it('should throw error when getKpiSummary fails', async () => {
      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: false, message: 'Server down' },
      } as any);

      await expect(customerApi.getKpiSummary()).rejects.toThrow('Server down');
    });
  });
});

