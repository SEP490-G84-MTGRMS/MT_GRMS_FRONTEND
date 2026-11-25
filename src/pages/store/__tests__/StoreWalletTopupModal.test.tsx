// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreWalletTopupModal } from '../components/StoreWalletTopupModal';
import { INITIAL_STORE_INFO } from '../storeData';
import { walletApi } from '../api/walletApi';

vi.mock('../api/walletApi', () => ({
  walletApi: {
    createTopupOrder: vi.fn(),
    getTopupStatus: vi.fn(),
  },
}));

describe('StoreWalletTopupModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not generate fake VietQR or hardcoded beneficiary account on API failure and allows retry', async () => {
    vi.mocked(walletApi.createTopupOrder)
      .mockRejectedValueOnce(new Error('Mất kết nối máy chủ thanh toán.'))
      .mockResolvedValueOnce({
        success: true,
        data: {
          orderCode: 'WAL9988',
          amount: 50000,
          bankCode: 'Vietcombank',
          bankName: 'Vietcombank',
          accountNumber: '001100999888',
          accountName: 'THVIET PLATFORM',
          transferContent: 'WAL 9988',
          qrUrl: 'https://qr.sepay.vn/img?acc=001100999888&bank=Vietcombank&amount=50000&des=WAL+9988',
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
        },
      });

    render(
      <StoreWalletTopupModal
        storeInfo={INITIAL_STORE_INFO}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Mất kết nối máy chủ thanh toán.')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(screen.queryByAltText('VietQR SePay Napas247')).not.toBeInTheDocument();
    expect(screen.queryByText(/1900\s*6522\s*8888/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xác nhận đã chuyển khoản/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Thử tạo lại mã QR/i }));

    await waitFor(
      () => {
        expect(screen.getByAltText('VietQR SePay Napas247')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(screen.getByText('001100999888')).toBeInTheDocument();
    expect(screen.getByText('WAL 9988')).toBeInTheDocument();
  });
});
