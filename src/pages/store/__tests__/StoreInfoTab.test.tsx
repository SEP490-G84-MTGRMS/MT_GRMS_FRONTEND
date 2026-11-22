// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StoreInfoTab } from '../components/StoreInfoTab';
import { StoreSettingsHubPage } from '../StoreSettingsHubPage';
import { SubscriptionPricingCards } from '../components/SubscriptionPricingCards';
import { storeApi, mapBackendStoreToFrontend } from '../api/storeApi';
import { INITIAL_STORE_INFO } from '../storeData';

describe('StoreInfoTab & EditStoreInfoModal', () => {
  it('renders store info fields and action buttons', () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    expect(screen.getByText('Thông tin gian hàng')).toBeInTheDocument();
    expect(screen.getByText('Thông tin cửa hàng')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tên cửa hàng *' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  });

  it('edits store information directly on the page', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'Tên cửa hàng *' }), { target: { value: 'Cửa hàng mới' } });
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  });

  it('submits update successfully and calls onUpdateStoreInfo', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    const saveBtn = screen.getByRole('button', { name: 'Lưu thay đổi' });
    expect(saveBtn).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên cửa hàng *' }), { target: { value: 'Cửa hàng mới' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByText(/Cập nhật thông tin cửa hàng thành công!/i)).toBeInTheDocument();
    });
  });

  it.each([
    ['Tên cửa hàng *', '  ', 'Vui lòng nhập tên cửa hàng.'],
    ['Tên cửa hàng *', 'a'.repeat(151), 'Tên cửa hàng tối đa 150 ký tự.'],
    ['Số điện thoại liên hệ', '01234567', 'Số điện thoại phải có 9–12 chữ số, có thể bắt đầu bằng +.'],
    ['Mã số thuế', '0'.repeat(51), 'Mã số thuế tối đa 50 ký tự.'],
    ['Tỉnh / Thành phố', 'a'.repeat(101), 'Tỉnh / Thành phố tối đa 100 ký tự.'],
    ['Địa chỉ', 'a'.repeat(256), 'Địa chỉ tối đa 255 ký tự.'],
  ])('shows an inline error for %s and blocks saving', (label, value, message) => {
    const mockUpdate = vi.fn();
    render(<StoreInfoTab storeInfo={INITIAL_STORE_INFO} onUpdateStoreInfo={mockUpdate} />);

    const input = screen.getByRole('textbox', { name: label });
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(message);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('StoreSettingsHubPage renders StoreInfoTab when tab=store-info', async () => {
    vi.spyOn(storeApi, 'getStoreInfo').mockResolvedValueOnce({
      success: true,
      message: '',
      data: {
        id: 'tenant-1',
        subdomain: 'tap-hoa-test',
        name: 'Tạp Hóa Test',
        code: 'THT',
        status: 'ACTIVE',
        currentPlan: 'PRO',
        planName: 'Gói Pro',
        subscriptionExpiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        branchCount: 1,
        maxBranches: 5,
        staffCount: 3,
        maxStaff: 50,
        walletBalance: 500000,
      },
    });
    vi.spyOn(storeApi, 'getTrialStatus').mockResolvedValueOnce({
      success: true,
      message: '',
      data: { state: 'PAID', planCode: 'PRO', destination: 'DASHBOARD' },
    });

    render(
      <MemoryRouter initialEntries={['/store-owner/subscriptions?tab=store-info']}>
        <Routes>
          <Route path="/store-owner/subscriptions" element={<StoreSettingsHubPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Thông tin gian hàng/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Thông tin cửa hàng')).toBeInTheDocument();
  });

  it('mapBackendStoreToFrontend sets daysRemaining=0 when unselected, and SubscriptionPricingCards does not mark PRO when ELIGIBLE', async () => {
    const mapped = mapBackendStoreToFrontend({
      id: 'tenant-noplan',
      subdomain: 'noplan-shop',
      name: 'NoPlan Shop',
      code: 'NP',
      status: 'ACTIVE',
      planName: 'Chưa kích hoạt',
      branchCount: 1,
      maxBranches: 1,
      staffCount: 1,
      maxStaff: 1,
      walletBalance: 0,
    });
    expect(mapped.currentPlan).toBe('Chưa kích hoạt');
    expect(mapped.daysRemaining).toBe(0);
    expect(mapped.subscriptionExpiresAt).toBe('Chưa kích hoạt');

    vi.spyOn(storeApi, 'getPricingPlans').mockResolvedValueOnce({
      success: true,
      message: '',
      data: [],
    });

    render(
      <SubscriptionPricingCards
        onSelectPlan={vi.fn()}
        currentPlanName="Gói Pro (Chuỗi Cửa Hàng)"
        trialState="ELIGIBLE"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Gói hiện tại đang dùng/i)).not.toBeInTheDocument();
    });
  });

  it('SubscriptionPricingCards disables TRIAL and STANDARD buttons when store already has PRO', async () => {
    const onSelectPlan = vi.fn();
    vi.spyOn(storeApi, 'getPricingPlans').mockResolvedValueOnce({
      success: true,
      message: '',
      data: [],
    });

    render(
      <SubscriptionPricingCards
        onSelectPlan={onSelectPlan}
        currentPlanName="Gói Pro (Chuỗi Cửa Hàng)"
        trialState="PAID"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gói hiện tại đang dùng/i })).toBeDisabled();
    });

    const trialBtn = screen.getByRole('button', { name: /Không khả dụng ở Gói Pro/i });
    const standardBtn = screen.getByRole('button', { name: /Không hỗ trợ hạ cấp/i });
    expect(trialBtn).toBeDisabled();
    expect(standardBtn).toBeDisabled();
    fireEvent.click(trialBtn);
    fireEvent.click(standardBtn);
    expect(onSelectPlan).not.toHaveBeenCalled();
  });
});
