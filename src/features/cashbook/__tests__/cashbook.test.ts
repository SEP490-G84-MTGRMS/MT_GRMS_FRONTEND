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
});
