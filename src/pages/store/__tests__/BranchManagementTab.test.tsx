// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { branchManagementApi } from '../api/branchManagementApi';
import { BranchManagementTab } from '../components/BranchManagementTab';

const branch = {
  id: 'branch-1',
  code: 'BR-01',
  name: 'Chi nhánh Nguyễn Trãi',
  address: 'Nguyễn Trãi',
  status: 'Active',
  isHeadquarter: false,
  pendingOrdersCount: 0,
  createdAt: '2026-11-23T00:00:00Z',
};

afterEach(() => vi.restoreAllMocks());

describe('BranchManagementTab', () => {
  it.each([1, 2])('applies sole-branch controls when the tenant has %i branches', async (usedBranches) => {
    vi.spyOn(branchManagementApi, 'getQuota').mockResolvedValue({
      success: true,
      data: { usedBranches, maxBranches: 2, canAddMore: usedBranches < 2, currentPlanCode: 'PRO', currentPlanName: 'Gói Pro' },
    });
    vi.spyOn(branchManagementApi, 'getBranches').mockResolvedValue({
      success: true,
      data: { items: [branch], totalItems: 1, page: 1, pageSize: 10 },
    });
    vi.spyOn(branchManagementApi, 'getBranchDetail').mockResolvedValue({
      success: true,
      data: {
        ...branch,
        totalProducts: 0,
        totalStock: 0,
        lowStockCount: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        recentEmployees: [],
        recentProducts: [],
      },
    });
    const toggleStatus = vi.spyOn(branchManagementApi, 'toggleStatus');
    const updateBranch = vi.spyOn(branchManagementApi, 'updateBranch').mockResolvedValue({
      success: true,
      data: branch,
    });

    render(<BranchManagementTab onGoToSubscriptions={vi.fn()} />);
    if (usedBranches === 1) {
      const button = await screen.findByTitle('Không thể ngừng hoạt động chi nhánh duy nhất');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(toggleStatus).not.toHaveBeenCalled();
    } else {
      expect(await screen.findByTitle('Tạm ngưng hoạt động')).toBeEnabled();
    }

    fireEvent.click(screen.getByTitle('Xem chi tiết các thông số chi nhánh'));
    const headquarterCheckbox = await screen.findByRole('checkbox', { name: /trụ sở chính/i });
    if (usedBranches === 1) {
      expect(headquarterCheckbox).toBeChecked();
      expect(headquarterCheckbox).toBeDisabled();
    } else {
      expect(headquarterCheckbox).not.toBeChecked();
      expect(headquarterCheckbox).toBeEnabled();
    }

    const dialog = screen.getByRole('dialog', { name: branch.name });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /tên chi nhánh/i }), {
      target: { value: 'Chi nhánh đã chỉnh sửa' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await within(dialog).findByText('Đã lưu thông tin chi nhánh.')).toBeVisible();
    expect(updateBranch).toHaveBeenCalledWith(branch.id, expect.objectContaining({
      name: 'Chi nhánh đã chỉnh sửa',
      isHeadquarter: usedBranches === 1,
    }));
  });
});
