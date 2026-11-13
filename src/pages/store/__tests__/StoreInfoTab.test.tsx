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
    expect(screen.getByText('Hồ sơ định danh chuỗi')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật thông tin')).toBeInTheDocument();
    expect(screen.getByText('Lưu thay đổi')).toBeInTheDocument();
  });

  it('opens EditStoreInfoModal when clicking "Cập nhật thông tin"', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    const updateBtn = screen.getByText('Cập nhật thông tin');
    fireEvent.click(updateBtn);

    expect(screen.getByRole('heading', { level: 2, name: /Thông tin gian hàng/i })).toBeInTheDocument();
    expect(screen.getByText('Cập nhật tên chuỗi cửa hàng, mã số thuế, hotline và địa chỉ trụ sở chính.')).toBeInTheDocument();
  });

  it('submits update successfully and calls onUpdateStoreInfo', async () => {
    const mockUpdate = vi.fn().mockResolvedValue(true);
    render(
      <StoreInfoTab
        storeInfo={INITIAL_STORE_INFO}
        onUpdateStoreInfo={mockUpdate}
      />
    );

    const saveBtn = screen.getByText('Lưu thay đổi');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByText(/Cập nhật thông tin gian hàng thành công!/i)).toBeInTheDocument();
    });
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
    expect(screen.getByText('Hồ sơ định danh chuỗi')).toBeInTheDocument();
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
