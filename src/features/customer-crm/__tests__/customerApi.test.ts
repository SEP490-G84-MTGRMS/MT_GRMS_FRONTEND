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
          debtLimit: 20000000,
          membershipTier: 'Gold',
        },
      ];

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: mockList },
      } as any);

      const result = await customerApi.getCustomers({
        search: 'Nguyễn',
        tier: 'Gold',
        debtStatus: 'IN_LIMIT',
      });

      expect(financeHttpClient.get).toHaveBeenCalledWith('/customers', {
        params: {
          search: 'Nguyễn',
          tier: 'Gold',
          debtStatus: 'IN_LIMIT',
        },
      });
      expect(result).toEqual(mockList);
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
        debtLimit: 5000000,
        membershipTier: 'Standard',
      };

      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true, data: newCust },
      } as any);

      const res = await customerApi.createCustomer({
        fullName: 'Trương Hoàng',
        phoneNumber: '0988776655',
        debtLimit: 5000000,
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith('/customers', {
        fullName: 'Trương Hoàng',
        phoneNumber: '0988776655',
        email: null,
        address: null,
        debtLimit: 5000000,
        membershipTier: 'Standard',
        allowDebt: true,
      });
      expect(res).toEqual(newCust);
    });
  });

  describe('collectDebt', () => {
    it('should reject invalid non-positive collection amount', async () => {
      await expect(
        customerApi.collectDebt({
          customerId: '11111111-aaaa-aaaa-aaaa-111111111111',
          amount: 0,
          method: 'Cash',
        })
      ).rejects.toThrow('Số tiền thu nợ phải lớn hơn 0 VNĐ');
    });

    it('should send Cash repayment with PaymentSourceType=1 (Till) and Idempotency Header', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            debtEntryId: '01a19c24-ea9e-717c-97e4-8c7d64b9b0dd',
            remainingDebt: 0,
          },
        },
      } as any);

      const updatedCustomer = {
        id: '11111111-aaaa-aaaa-aaaa-111111111111',
        fullName: 'Nguyễn Văn An',
        currentDebtAR: 0,
      };

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: { success: true, data: updatedCustomer },
      } as any);

      const result = await customerApi.collectDebt({
        customerId: '11111111-aaaa-aaaa-aaaa-111111111111',
        amount: 3000000,
        method: 'Cash',
        note: 'Trả hết nợ còn lại',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith(
        '/customers/debt/repay',
        expect.objectContaining({
          customerId: '11111111-aaaa-aaaa-aaaa-111111111111',
          amount: 3000000,
          paymentSourceType: 1, // BranchTill
          notes: 'Trả hết nợ còn lại',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );

      expect(result).toEqual(updatedCustomer);
    });

    it('should send VietQR repayment with PaymentSourceType=3 (Bank)', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          data: { remainingDebt: 1000000 },
        },
      } as any);

      vi.mocked(financeHttpClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          data: { id: '22222222-aaaa-aaaa-aaaa-222222222222', currentDebtAR: 1000000 },
        },
      } as any);

      await customerApi.collectDebt({
        customerId: '22222222-aaaa-aaaa-aaaa-222222222222',
        amount: 2000000,
        method: 'VietQR',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith(
        '/customers/debt/repay',
        expect.objectContaining({
          paymentSourceType: 3, // TenantBank
        }),
        expect.anything()
      );
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
          prepaymentAfter: 0,
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
          prepaymentAfter: 0,
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

  describe('generateVietQr', () => {
    it('should generate valid VietQR payload and image url', () => {
      const config = customerApi.generateVietQr(
        {
          id: '111',
          tenantId: 'tenant-1',
          phoneNumber: '0901-234-567',
          fullName: 'Test User',
          membershipTier: 'Standard',
          currentDebtAR: 500000,
          debtLimit: 1000000,
          totalSpending: 0,
          status: 'Active',
          loyaltyPoints: 0,
          createdAt: '',
        },
        500000
      );

      expect(config.bankId).toBe('970422');
      expect(config.amount).toBe(500000);
      expect(config.description).toBe('THUNO 0901234567');
      expect(config.qrDataUrl).toContain('img.vietqr.io');
    });
  });
});

