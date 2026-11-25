// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantManagementPage } from '../TenantManagementPage';
import { tenantApi } from '../../../features/admin/api';

vi.mock('../../../features/admin/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../features/admin/api')>();
  return {
    ...actual,
    tenantApi: {
      ...actual.tenantApi,
      getTenants: vi.fn(),
    },
  };
});

describe('TenantManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports real CSV file on clicking Xuất Excel and preserves total tab counts across status tabs', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-csv');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const allItems = [
      {
        id: 't1',
        subdomain: 'tap-hoa-1',
        name: 'Tạp Hóa Một',
        ownerName: 'Chủ 1',
        ownerEmail: 'chu1@mtgrms.vn',
        ownerPhone: '0911111111',
        plan: 'Gói Pro',
        branchCount: 2,
        maxBranches: 5,
        staffCount: 4,
        maxStaff: 20,
        status: 'ACTIVE',
      },
      {
        id: 't2',
        subdomain: 'tap-hoa-2',
        name: 'Tạp Hóa Hai',
        ownerName: 'Chủ 2',
        ownerEmail: 'chu2@mtgrms.vn',
        ownerPhone: '0922222222',
        plan: 'Chưa kích hoạt',
        branchCount: 1,
        maxBranches: 1,
        staffCount: 1,
        maxStaff: 1,
        status: 'PENDING',
      },
    ];

    vi.mocked(tenantApi.getTenants).mockImplementation(async (params) => ({
      success: true,
      data: {
        items: params?.status === 'LOCKED' ? [] : allItems,
        totalItems: params?.status === 'LOCKED' ? 0 : 2,
        page: 1,
        pageSize: 100,
      },
    }));

    render(
      <MemoryRouter>
        <TenantManagementPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Tạp Hóa Một')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xuất Excel/i }));
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    anchorClickSpy.mockRestore();
  });
});
