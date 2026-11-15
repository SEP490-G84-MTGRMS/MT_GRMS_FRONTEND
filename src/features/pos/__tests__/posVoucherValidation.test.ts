import { afterEach, describe, expect, it, vi } from 'vitest';
import { promotionApi } from '../../promotion/api/promotionApi';
import { httpClient } from '../../../api/httpClient';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
  },
}));

afterEach(() => {
  vi.resetAllMocks();
});

describe('POS voucher validation API', () => {
  it('returns backend "Mã voucher không tồn tại" message when voucher code does not exist', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({
      data: {
        success: true,
        data: {
          isValid: false,
          message: 'Mã voucher không tồn tại',
          discountAmount: 0,
        },
      },
    });

    const result = await promotionApi.validateVoucher('INVALID-CODE', 120000, undefined, false);

    expect(httpClient.post).toHaveBeenCalledWith('/vouchers/validate', {
      code: 'INVALID-CODE',
      cartTotal: 120000,
      customerId: undefined,
      hasOtherPromotions: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Mã voucher không tồn tại');
    expect(result.discountAmount).toBe(0);
  });

  it('falls back to envelope message or "Mã voucher không tồn tại" when data payload is missing', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({
      data: {
        success: false,
        message: 'Mã voucher không tồn tại',
      },
    });

    const result = await promotionApi.validateVoucher('MISSING', 0);

    expect(result.isValid).toBe(false);
    expect(result.message).toBe('Mã voucher không tồn tại');
  });
});

