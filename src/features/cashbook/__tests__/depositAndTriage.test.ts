import { afterEach, expect, it, vi } from 'vitest';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { cashbookService } from '../services/cashbookService';

afterEach(() => vi.restoreAllMocks());

it('xử lý phiếu chờ phân loại qua API và chuyển tiếp lỗi xác nhận', async () => {
  const get = vi.spyOn(financeHttpClient, 'get').mockResolvedValue({ data: { data: [{ id: 'voucher-1' }] } });
  const failure = new Error('Không thể lưu phân loại');
  const post = vi.spyOn(financeHttpClient, 'post').mockRejectedValue(failure);

  const [voucher] = await cashbookService.getPendingTriage('branch-1');
  expect(get).toHaveBeenCalledWith('/cashbook/triage/pending', { params: { branchId: 'branch-1' } });
  await expect(cashbookService.resolveTriage(voucher.id, {
    nature: 0, isTaxDeductible: true, category: 'Chi phí điện', resolutionNote: 'Có hóa đơn',
  })).rejects.toBe(failure);
  expect(post).toHaveBeenCalledWith('/cashbook/triage/voucher-1/resolve',
    expect.objectContaining({ nature: 1 }), expect.objectContaining({ headers: expect.any(Object) }));
});
