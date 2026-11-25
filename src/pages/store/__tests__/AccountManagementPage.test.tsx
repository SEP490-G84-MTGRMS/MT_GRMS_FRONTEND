// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountManagementPage } from '../AccountManagementPage';
import { authService } from '../../../features/auth/authService';
import { storeApi } from '../api/storeApi';

vi.mock('../api/storeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/storeApi')>();
  return {
    ...actual,
    storeApi: {
      ...actual.storeApi,
      getStoreInfo: vi.fn(),
    },
  };
});

vi.mock('../components/WalletLedgerTab', () => ({
  WalletLedgerTab: () => <div>Bảng sổ cái ví tiền</div>,
}));

describe('AccountManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storeApi.getStoreInfo).mockResolvedValue({
      success: true,
      data: {
        id: 'tenant_01',
        subdomain: 'tap-hoa-an',
        name: 'Tạp Hóa Bình An',
        code: 'BA-01',
        status: 'ACTIVE',
        planName: 'Gói Cơ Bản',
        branchCount: 1,
        maxBranches: 1,
        staffCount: 1,
        maxStaff: 3,
        address: 'Số 10 Trần Phú, Hà Nội',
      },
    });
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      id: 'usr_01',
      email: 'binhan@mtgrms.vn',
      fullName: 'Trần Bình An',
      phone: '0912345678',
      role: 'STORE_OWNER',
      tenantId: 'tenant_01',
      isTwoFactorEnabled: false,
    });
    vi.spyOn(authService, 'getTwoFactorStatus').mockResolvedValue({
      enabled: false,
      maskedEmail: 'bi***n@mtgrms.vn',
      isEmailVerified: true,
    });
  });

  it('renders AccountSidebarNav on ?tab=wallet, avoids sample profile data, and persists profile via updateProfile API', async () => {
    const updateSpy = vi.spyOn(authService, 'updateProfile').mockResolvedValue({
      id: 'usr_01',
      email: 'binhan@mtgrms.vn',
      fullName: 'Trần Bình An Mới',
      phone: '0987654321',
      role: 'STORE_OWNER',
      tenantId: 'tenant_01',
      isTwoFactorEnabled: false,
    });

    render(
      <MemoryRouter initialEntries={['/store-owner/account?tab=wallet']}>
        <Routes>
          <Route path="/store-owner/account" element={<AccountManagementPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole('complementary', { name: 'Thanh điều hướng tài khoản' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText('Bảng sổ cái ví tiền')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tài khoản người dùng/i }));

    await waitFor(() => {
      expect(screen.getByText('Trần Bình An')).toBeInTheDocument();
    });

    expect(screen.queryByText('1995-08-15')).not.toBeInTheDocument();
    expect(screen.queryByText(/Minh Đức/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kiểm tra' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }));
    fireEvent.change(screen.getByLabelText('Tên hiển thị *'), {
      target: { value: 'Trần Bình An Mới' },
    });
    fireEvent.change(screen.getByLabelText('Số điện thoại *'), {
      target: { value: '0987654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        fullName: 'Trần Bình An Mới',
        phone: '0987654321',
      });
      expect(screen.getByText('Trần Bình An Mới')).toBeInTheDocument();
    });
  });
});
