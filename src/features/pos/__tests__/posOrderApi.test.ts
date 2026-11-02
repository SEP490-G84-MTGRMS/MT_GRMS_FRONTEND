import { describe, it, expect, vi, beforeEach } from 'vitest';
import { posOrderApi } from '../services/posOrderApi';
import { financeHttpClient } from '../../../api/financeHttpClient';

vi.mock('../../../api/financeHttpClient', () => ({
  financeHttpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('posOrderApi Live Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should send Cash POS order with Idempotency header', async () => {
      const mockResponse = {
        id: 'ord-123',
        orderCode: 'HD-20261102-001',
        totalAmount: 130000,
        discountAmount: 0,
        finalAmount: 130000,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        status: 'Completed',
        orderDate: '2026-11-02T12:00:00Z',
        items: [],
      };

      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true, data: mockResponse },
      } as any);

      const result = await posOrderApi.createOrder({
        paymentMethod: 'CASH',
        items: [
          {
            productId: 'aaaaaaaa-1111-1111-1111-111111111111',
            productName: 'Bánh Chocopie',
            unitPrice: 65000,
            quantity: 2,
          },
        ],
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          paymentMethod: 'CASH',
          items: expect.arrayContaining([
            expect.objectContaining({
              productName: 'Bánh Chocopie',
              unitPrice: 65000,
              quantity: 2,
            }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': expect.any(String),
          }),
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should send Credit Sale with managerBypassCode when requested', async () => {
      const mockResponse = {
        id: 'ord-credit-456',
        orderCode: 'HD-CREDIT-002',
        totalAmount: 500000,
        discountAmount: 0,
        finalAmount: 500000,
        paymentMethod: 'CREDIT',
        paymentStatus: 'DEBT',
        status: 'Completed',
        orderDate: '2026-11-02T12:00:00Z',
        items: [],
        debtInvoice: {
          id: 'deb-inv-1',
          totalDebtAmount: 500000,
          remainingDebtAmount: 500000,
          status: 'Unpaid',
        },
      };

      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: true, data: mockResponse },
      } as any);

      const result = await posOrderApi.createOrder({
        customerId: '11111111-aaaa-aaaa-aaaa-111111111111',
        paymentMethod: 'CREDIT',
        items: [
          {
            productId: 'prod-1',
            productName: 'Thùng bia Tiger',
            unitPrice: 500000,
            quantity: 1,
          },
        ],
        managerBypassCode: 'MGR-BYPASS-2026',
        note: 'Duyệt nợ ngoại lệ',
      });

      expect(financeHttpClient.post).toHaveBeenCalledWith(
        '/orders',
        expect.objectContaining({
          customerId: '11111111-aaaa-aaaa-aaaa-111111111111',
          paymentMethod: 'CREDIT',
          managerBypassCode: 'MGR-BYPASS-2026',
          note: 'Duyệt nợ ngoại lệ',
        }),
        expect.anything()
      );

      expect(result.paymentStatus).toBe('DEBT');
      expect(result.debtInvoice?.status).toBe('Unpaid');
    });

    it('should throw error when server returns failure', async () => {
      vi.mocked(financeHttpClient.post).mockResolvedValueOnce({
        data: { success: false, message: 'CREDIT_LIMIT_EXCEEDED: Hạn mức không đủ' },
      } as any);

      await expect(
        posOrderApi.createOrder({
          paymentMethod: 'CREDIT',
          items: [],
        })
      ).rejects.toThrow('CREDIT_LIMIT_EXCEEDED: Hạn mức không đủ');
    });
  });
});

