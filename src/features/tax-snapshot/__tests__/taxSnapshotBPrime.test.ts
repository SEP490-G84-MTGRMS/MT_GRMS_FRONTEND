import { beforeEach, describe, expect, it, vi } from 'vitest';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { taxSnapshotApi } from '../api/taxSnapshotApi';
import { generateMockSummary } from './mockTaxData';

vi.mock('../../../api/financeHttpClient', () => ({ financeHttpClient: { get: vi.fn(), post: vi.fn() } }));
const filter = { year: 2026, periodType: 2, periodNumber: 3, calculationMethod: 1, applyVatReduction2026: false } as const;
beforeEach(() => vi.resetAllMocks());

describe('Tax API uses server data and propagates failures in every environment', () => {
  it('rejects a missing declaration preview instead of turning it into an empty object', async () => {
    vi.mocked(financeHttpClient.get).mockResolvedValue({ data: { success: true } });
    await expect(taxSnapshotApi.getDeclarationPreview(filter)).rejects.toThrow('không hợp lệ');
  });
  it('normalizes ASP.NET string enums so Quarter is never rendered as Year', async () => {
    const summary = { ...generateMockSummary(filter), periodType: 'Quarter', householdGroup: 'Group1_Under1B', calculationMethod: 'RevenuePercentage' };
    vi.mocked(financeHttpClient.get).mockResolvedValue({ data: { success: true, data: summary } });
    expect(await taxSnapshotApi.getTaxSummary(filter)).toMatchObject({ periodType: 2, householdGroup: 1, calculationMethod: 1 });
  });
  it('returns the server summary unchanged and sends custom rates', async () => {
    const summary = { ...generateMockSummary(filter), totalTaxAmount: 123456 };
    vi.mocked(financeHttpClient.get).mockResolvedValue({ data: { success: true, data: summary } });
    expect(await taxSnapshotApi.getTaxSummary({ ...filter, customVatRate: 1.5 })).toEqual(summary);
    expect(financeHttpClient.get).toHaveBeenCalledWith('/tax/household/summary', expect.objectContaining({ params: expect.objectContaining({ customVatRate: 1.5 }) }));
  });

  it.each([undefined, null, {}])('rejects missing or malformed summary data: %s', async (data) => {
    vi.mocked(financeHttpClient.get).mockResolvedValue({ data: { success: true, data } });
    await expect(taxSnapshotApi.getTaxSummary(filter)).rejects.toThrow();
  });

  it.each(['getTaxSummary', 'getSnapshots', 'getBookDetails'] as const)('%s never replaces an HTTP error with mock data', async (method) => {
    vi.mocked(financeHttpClient.get).mockRejectedValue({ response: { data: { message: 'Máy chủ đang bảo trì.' } } });
    const request = method === 'getTaxSummary' ? taxSnapshotApi.getTaxSummary(filter)
      : method === 'getSnapshots' ? taxSnapshotApi.getSnapshots(2026) : taxSnapshotApi.getBookDetails(filter);
    await expect(request).rejects.toThrow('Máy chủ đang bảo trì.');
  });

  it('distinguishes a valid empty history from a malformed response', async () => {
    vi.mocked(financeHttpClient.get).mockResolvedValueOnce({ data: { success: true, data: [] } })
      .mockResolvedValueOnce({ data: { success: true } });
    expect(await taxSnapshotApi.getSnapshots(2026)).toEqual([]);
    await expect(taxSnapshotApi.getSnapshots(2026)).rejects.toThrow('không hợp lệ');
  });

  it('preserves server PIN rejection instead of authenticating a demo PIN locally', async () => {
    vi.mocked(financeHttpClient.post).mockRejectedValue({ response: { data: { message: 'Mã PIN bị khóa.' } } });
    await expect(taxSnapshotApi.createSnapshot({ ...filter, pin: '1234' })).rejects.toThrow('Mã PIN bị khóa.');
    expect(financeHttpClient.post).toHaveBeenCalledWith('/tax/household/snapshots', expect.objectContaining({ securityPin: '1234' }), expect.anything());
  });

  it.each(['changeSecurityPin', 'resetSecurityPin'] as const)('%s never swallows a rejected PIN change', async (method) => {
    vi.mocked(financeHttpClient.post).mockRejectedValue(new Error('Không xác thực được tài khoản.'));
    await expect(taxSnapshotApi[method]({ password: 'test', newPin: '123456', confirmNewPin: '123456' })).rejects.toThrow('Không xác thực');
  });
});
