// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionPlanDetailPage } from '../SubscriptionPlanDetailPage';
import { planApi } from '../../../features/admin/api';

vi.mock('../../../features/admin/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../features/admin/api')>();
  return {
    ...actual,
    planApi: {
      ...actual.planApi,
      getById: vi.fn(),
      update: vi.fn(),
      toggleStatus: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const mockBackendPlan = {
  id: 'plan_std',
  code: 'STANDARD',
  name: 'Gói Cơ Bản',
  description: 'Gói tiêu chuẩn cho cửa hàng đơn lẻ',
  monthlyPrice: 99000,
  yearlyPrice: 990000,
  status: 'ACTIVE',
  activeTenantCount: 2,
  quotas: {
    maxBranches: 1,
    maxEmployees: 3,
    maxStorageGb: 2,
    backupFrequency: 'Daily' as const,
  },
  features: {
    barcodeScanning: true,
    fefoExpiryAlert: true,
    multiUnitConversion: true,
    vietQrDynamic: true,
    debtZaloBook: false,
    financialReporting: false,
  },
  tenants: [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

describe('SubscriptionPlanDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows switching plan status from Active to Inactive when toggleStatus returns data: false', async () => {
    vi.mocked(planApi.getById).mockResolvedValue({
      success: true,
      data: mockBackendPlan,
    });
    vi.mocked(planApi.update).mockResolvedValue({
      success: true,
      data: mockBackendPlan,
    });
    vi.mocked(planApi.toggleStatus).mockResolvedValue({
      success: true,
      data: false,
      message: 'Đã tạm ngừng bán gói cước.',
    });

    render(
      <MemoryRouter initialEntries={['/admin/plans/plan_std']}>
        <Routes>
          <Route path="/admin/plans/:id" element={<SubscriptionPlanDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Gói Cơ Bản' })).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Trạng thái mở bán');
    fireEvent.change(statusSelect, { target: { value: 'Inactive' } });

    const saveButtons = screen.getAllByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(planApi.toggleStatus).toHaveBeenCalledWith('plan_std');
      expect(screen.getByRole('status')).toHaveTextContent('Đã lưu thay đổi gói "Gói Cơ Bản".');
    });

    expect(screen.getAllByText('Tạm ngừng bán').length).toBeGreaterThanOrEqual(1);
    expect(statusSelect).toHaveValue('Inactive');
  });
});
