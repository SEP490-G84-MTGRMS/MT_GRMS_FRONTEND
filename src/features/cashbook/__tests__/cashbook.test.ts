import { afterEach, describe, expect, it, vi } from 'vitest';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { cashbookService } from '../services/cashbookService';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Sổ quỹ dùng dữ liệu từ API', () => {
  it('giữ kết quả rỗng từ API dù trình duyệt còn dữ liệu cũ', async () => {
    localStorage.setItem('mtgrms_cashbook_transactions', JSON.stringify([{ id: 'old' }]));
    const get = vi.spyOn(financeHttpClient, 'get').mockResolvedValue({ data: { data: [], totalItems: 0 } });

    await expect(cashbookService.getTransactions()).resolves.toEqual({ items: [], totalItems: 0 });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('gửi ngày và trạng thái để backend lọc trước khi phân trang', async () => {
    const get = vi.spyOn(financeHttpClient, 'get').mockResolvedValue({ data: { data: [], totalItems: 28 } });

    const result = await cashbookService.getTransactions({
      startDate: '2026-11-20', endDate: '2026-11-24', status: 'VOIDED',
    }, 2, 10);

    expect(get).toHaveBeenCalledWith('/cashbook/entries', { params: {
      page: 2, pageSize: 10, status: 'VOIDED',
      fromDate: '2026-11-20T00:00:00+07:00', toDate: '2026-11-24T23:59:59.999999+07:00',
    } });
    expect(result.totalItems).toBe(28);
  });

  it('chuyển tiếp lỗi khi tải sổ hoặc tải tổng hợp', async () => {
    const failure = new Error('API unavailable');
    vi.spyOn(financeHttpClient, 'get').mockRejectedValue(failure);

    await expect(cashbookService.getTransactions()).rejects.toBe(failure);
    await expect(cashbookService.getSummaryKPI()).rejects.toBe(failure);
  });

  it('chuyển tiếp lỗi chuyển quỹ và gạch bỏ, không ghi dữ liệu cục bộ', async () => {
    const failure = new Error('Backend rejected transaction');
    vi.spyOn(financeHttpClient, 'post').mockRejectedValue(failure);

    await expect(cashbookService.transferFunds({
      fromAccountId: 'from', toAccountId: 'to', amount: 5000, note: 'Chuyển quỹ',
    })).rejects.toBe(failure);
    await expect(cashbookService.voidTransaction('entry', 'Sai chứng từ')).rejects.toBe(failure);
    expect(localStorage.length).toBe(0);
  });

  it('giữ dấu âm cho bút toán ADJUSTMENT Payment và dương cho ADJUSTMENT Receipt', async () => {
    vi.spyOn(financeHttpClient, 'get').mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'adj-pay', entryCode: 'CB-ADJ-1', accountId: 'acc-1', accountType: 'Till',
            entryType: 'Payment', amount: 150000, balanceAfter: 850000, sourceType: 'ADJUSTMENT',
            referenceCode: 'ADJ-1', auditHash: 'H1', description: 'Thiếu quỹ kiểm kê', occurredAtUtc: '2026-11-24T10:00:00Z',
          },
          {
            id: 'adj-rec', entryCode: 'CB-ADJ-2', accountId: 'acc-1', accountType: 'Till',
            entryType: 'Receipt', amount: 50000, balanceAfter: 900000, sourceType: 'ADJUSTMENT',
            referenceCode: 'ADJ-2', auditHash: 'H2', description: 'Thừa quỹ kiểm kê', occurredAtUtc: '2026-11-24T11:00:00Z',
          },
        ],
        totalItems: 2,
      },
    });

    const result = await cashbookService.getTransactions({}, 1, 10, [
      { id: 'acc-1', branchId: 'b-1', branchName: 'CN1', accountName: 'Két 1', accountType: 'CASH', currentBalance: 900000, initialBalance: 0, isActive: true, currency: 'VND' },
    ]);
    expect(result.items[0].transactionType).toBe('ADJUSTMENT');
    expect(result.items[0].amount).toBe(-150000);
    expect(result.items[1].transactionType).toBe('ADJUSTMENT');
    expect(result.items[1].amount).toBe(50000);
  });
});
