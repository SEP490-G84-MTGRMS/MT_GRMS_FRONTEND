// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionPricingCards } from '../components/SubscriptionPricingCards';
import { storeApi } from '../api/storeApi';

vi.mock('../api/storeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/storeApi')>();
  return {
    ...actual,
    storeApi: {
      ...actual.storeApi,
      getPricingPlans: vi.fn(),
    },
  };
});

describe('SubscriptionPricingCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays custom active plans from Admin with configured name, storage quota, and features', async () => {
    vi.mocked(storeApi.getPricingPlans).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'plan_pro',
          code: 'PRO',
          name: 'Gói Pro Tùy Chỉnh',
          description: 'Dành cho chuỗi vừa',
          monthlyPrice: 249000,
          yearlyPrice: 2490000,
          status: 'ACTIVE',
          quotas: {
            maxBranches: 5,
            maxEmployees: 30,
            maxStorageGb: 12,
            backupFrequency: 'Hourly',
          },
          features: {
            fefoExpiryAlert: true,
            multiUnitConversion: true,
            vietQrDynamic: true,
            debtZaloBook: true,
            barcodeScanning: true,
            financialReporting: true,
          },
        },
        {
          id: 'plan_enterprise',
          code: 'ENTERPRISE',
          name: 'Gói Siêu Chuỗi Enterprise',
          description: 'Mở rộng toàn quốc',
          monthlyPrice: 599000,
          yearlyPrice: 5990000,
          status: 'ACTIVE',
          quotas: {
            maxBranches: -1,
            maxEmployees: -1,
            maxStorageGb: 50,
            backupFrequency: 'Hourly',
          },
          features: {
            fefoExpiryAlert: true,
            multiUnitConversion: true,
            vietQrDynamic: true,
            debtZaloBook: true,
            barcodeScanning: true,
            financialReporting: true,
          },
        },
      ],
    });

    render(<SubscriptionPricingCards onSelectPlan={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Gói Siêu Chuỗi Enterprise')).toBeInTheDocument();
    });

    expect(screen.getByText('Gói Pro Tùy Chỉnh')).toBeInTheDocument();
    expect(screen.getByText('12 GB dung lượng lưu trữ ảnh/tệp')).toBeInTheDocument();
    expect(screen.getByText('50 GB dung lượng lưu trữ ảnh/tệp')).toBeInTheDocument();
    expect(screen.queryByText('Gói Thường (Cửa Hàng Độc Lập)')).not.toBeInTheDocument();
  });

  it('allows Store Owner on PRO plan to purchase higher-tier ENTERPRISE plan while blocking STANDARD downgrade', async () => {
    vi.mocked(storeApi.getPricingPlans).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'plan_std',
          code: 'STANDARD',
          name: 'Gói Thường (Cửa Hàng Độc Lập)',
          description: 'Dành cho tiệm lẻ',
          monthlyPrice: 99000,
          yearlyPrice: 1188000,
          status: 'ACTIVE',
        },
        {
          id: 'plan_pro',
          code: 'PRO',
          name: 'Gói Pro (Chuỗi Cửa Hàng)',
          description: 'Dành cho chuỗi vừa',
          monthlyPrice: 249000,
          yearlyPrice: 2988000,
          status: 'ACTIVE',
        },
        {
          id: 'plan_enterprise',
          code: 'ENTERPRISE',
          name: 'Gói Enterprise',
          description: 'Dành cho chuỗi lớn',
          monthlyPrice: 600000,
          yearlyPrice: 7200000,
          status: 'ACTIVE',
        },
      ],
    });

    const onSelectPlan = vi.fn();
    render(
      <SubscriptionPricingCards
        onSelectPlan={onSelectPlan}
        currentPlanName="Gói Pro (Chuỗi Cửa Hàng)"
        trialState="PAID"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Gói Enterprise')).toBeInTheDocument();
    });

    const downgradeBtn = screen.getByRole('button', { name: 'Không hỗ trợ hạ cấp' });
    expect(downgradeBtn).toBeDisabled();

    const currentBtn = screen.getByRole('button', { name: /Gói hiện tại đang dùng/i });
    expect(currentBtn).toBeDisabled();

    const upgradeBtn = screen.getByRole('button', { name: 'Nâng cấp ngay' });
    expect(upgradeBtn).toBeEnabled();
    fireEvent.click(upgradeBtn);
    expect(onSelectPlan).toHaveBeenCalledWith(expect.objectContaining({ code: 'ENTERPRISE' }));
  });
});
