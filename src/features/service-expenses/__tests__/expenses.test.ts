import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as expenseApi from '../api/expenseApi';
import { financeHttpClient } from '../../../api/financeHttpClient';

describe('FE-07 Service Expenses API & Workflow Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Happy Cases', () => {
    it('TC-EXP-01: should fetch and map paged expenses correctly from live backend', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            {
              id: '01a1a64c-4421-7751-9c42-e5a5f4a00295',
              voucherCode: 'EXP-001',
              branchId: '01a188b1-f1b0-7640-ad7c-a1dc16e62218',
              beneficiaryName: 'Công ty Điện lực EVN',
              category: 'Tiền điện',
              amount: 3500000,
              status: 'Approved',
              expenseDate: '2026-11-04T10:00:00Z',
              note: 'Hóa đơn tiền điện tháng 10/2026',
            },
            {
              id: '01a1a64c-4421-7751-9c42-e5a5f4a00296',
              voucherCode: 'EXP-002',
              branchId: '01a188b1-f1b0-7640-ad7c-a1dc16e62218',
              beneficiaryName: 'Chủ nhà cho thuê',
              category: 'Thuê mặt bằng',
              amount: 15000000,
              status: 'Paid',
              expenseDate: '2026-11-01T10:00:00Z',
              note: 'Tiền thuê mặt bằng tháng 11/2026',
            },
          ],
        },
      };

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce(mockResponse as any);

      const result = await expenseApi.getServiceExpenses();

      expect(result.items).toHaveLength(2);
      expect(result.items[0].vendorName).toBe('Công ty Điện lực EVN');
      expect(result.items[0].amount).toBe(3500000);
      expect(result.items[0].status).toBe('Pending'); // Approved maps to Pending payment
      expect(result.items[1].status).toBe('Paid');
    });

    it('TC-EXP-02: should fetch KPI expense summary metrics', async () => {
      const mockSummary = {
        data: {
          success: true,
          data: {
            totalAmount: 45000000,
            pendingApprovalAmount: 18500000,
            paidAmount: 26500000,
            suspiciousCount: 1,
          },
        },
      };

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce(mockSummary as any);

      const summary = await expenseApi.getExpenseSummary();

      expect(summary.totalExpenseThisMonth).toBe(45000000);
      expect(summary.totalPendingAmount).toBe(18500000);
      expect(summary.totalPaidAmount).toBe(26500000);
      expect(summary.overdueCount).toBe(1);
    });

    it('TC-EXP-03: should create a new valid service expense voucher', async () => {
      const createdItem = {
        data: {
          success: true,
          data: {
            id: '99999999-9999-9999-9999-999999999999',
            voucherCode: 'EXP-20261104-999',
            beneficiaryName: 'Viễn thông VNPT',
            category: 'Internet & Phần mềm',
            amount: 850000,
            status: 'Approved',
            expenseDate: '2026-11-04T00:00:00Z',
            note: 'Cước cáp quang tháng 11',
          },
        },
      };

      vi.spyOn(financeHttpClient, 'post').mockResolvedValueOnce(createdItem as any);

      const newExpense = await expenseApi.createServiceExpense({
        branchId: '01a188b1-f1b0-7640-ad7c-a1dc16e62218',
        category: 'Internet',
        amount: 850000,
        expenseDate: '2026-11-04',
        dueDate: '2026-11-10',
        vendorName: 'Viễn thông VNPT',
        note: 'Cước cáp quang tháng 11',
      });

      expect(newExpense.expenseId).toBe('99999999-9999-9999-9999-999999999999');
      expect(newExpense.amount).toBe(850000);
      expect(newExpense.vendorName).toBe('Viễn thông VNPT');
    });

    it('TC-EXP-04: should disburse payment and return updated paid voucher', async () => {
      vi.spyOn(financeHttpClient, 'post')
        .mockResolvedValueOnce({ data: { success: true } } as any) // approve
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              id: '01a1a64c-4421-7751-9c42-e5a5f4a00295',
              voucherCode: 'EXP-001',
              status: 'Paid',
              amount: 3500000,
              beneficiaryName: 'EVN HCMC',
              category: 'Tiền điện',
            },
          },
        } as any); // disburse

      const paid = await expenseApi.payServiceExpense('01a1a64c-4421-7751-9c42-e5a5f4a00295', {
        paymentMethod: 'Cash',
        paidFromAccountId: '01a19664-6210-7b12-a9eb-6fa16ca5b9db',
        createCashBookEntry: true,
        paymentDate: '2026-11-04',
        note: 'Thanh toán tiền điện qua két quầy',
      });

      expect(paid.status).toBe('Paid');
      expect(paid.amount).toBe(3500000);
    });
  });

  describe('Bad & Edge Cases', () => {
    it('TC-EXP-05: should throw error when backend returns failure on create', async () => {
      vi.spyOn(financeHttpClient, 'post').mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Số tiền chi phí phải lớn hơn 0',
        },
      } as any);

      await expect(
        expenseApi.createServiceExpense({
          branchId: '01a188b1-f1b0-7640-ad7c-a1dc16e62218',
          category: 'Other',
          amount: 0,
          expenseDate: '2026-11-04',
          dueDate: '2026-11-04',
          vendorName: 'NCC Test',
        })
      ).rejects.toThrow('Số tiền chi phí phải lớn hơn 0');
    });

    it('TC-EXP-06: should throw error when disburse fails due to insufficient balance', async () => {
      vi.spyOn(financeHttpClient, 'post')
        .mockResolvedValueOnce({ data: { success: true } } as any) // approve
        .mockResolvedValueOnce({
          data: {
            success: false,
            message: 'Tài khoản không đủ số dư để chi tiền',
          },
        } as any); // disburse

      await expect(
        expenseApi.payServiceExpense('01a1a64c-4421-7751-9c42-e5a5f4a00295', {
          paymentMethod: 'Cash',
          paidFromAccountId: '01a19664-6210-7b12-a9eb-6fa16ca5b9db',
          createCashBookEntry: true,
          paymentDate: '2026-11-04',
        })
      ).rejects.toThrow('Tài khoản không đủ số dư để chi tiền');
    });

    it('TC-EXP-07: should cancel an expense voucher properly', async () => {
      vi.spyOn(financeHttpClient, 'post').mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Hủy phiếu chi thành công',
        },
      } as any);

      const success = await expenseApi.cancelServiceExpense(
        '01a1a64c-4421-7751-9c42-e5a5f4a00295',
        'Hóa đơn bị sai thông tin cước'
      );

      expect(success).toBe(true);
    });

    it('TC-EXP-08: should handle search keyword filtering properly', async () => {
      const mockList = {
        data: {
          success: true,
          data: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              voucherCode: 'EXP-NET',
              beneficiaryName: 'FPT Telecom',
              category: 'Internet',
              amount: 500000,
              status: 'Approved',
            },
            {
              id: '22222222-2222-2222-2222-222222222222',
              voucherCode: 'EXP-WATER',
              beneficiaryName: 'SAWACO Nước',
              category: 'Water',
              amount: 300000,
              status: 'Paid',
            },
          ],
        },
      };

      vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce(mockList as any);

      const result = await expenseApi.getServiceExpenses({ keyword: 'FPT' });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].vendorName).toBe('FPT Telecom');
    });
  });
});

