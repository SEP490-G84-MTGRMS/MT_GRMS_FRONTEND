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

  it('fetches all pages when totalItems is 101, displays Tất cả trạng thái (101), and exports all 101 rows', async () => {
    let capturedBlob: Blob | null = null;
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob;
      return 'blob:mock-csv-101';
    });
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const fullDataset = Array.from({ length: 101 }, (_, idx) => ({
      id: `tenant_${idx + 1}`,
      subdomain: `cua-hang-${idx + 1}`,
      name: `Cửa Hàng Thứ ${idx + 1}`,
      ownerName: `Chủ ${idx + 1}`,
      ownerEmail: `owner${idx + 1}@mtgrms.vn`,
      ownerPhone: '0912345678',
      plan: 'Gói Pro',
      branchCount: 1,
      maxBranches: 5,
      staffCount: 2,
      maxStaff: 20,
      status: 'ACTIVE',
    }));

    vi.mocked(tenantApi.getTenants).mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      const size = params?.pageSize ?? 100;
      const start = (page - 1) * size;
      return {
        success: true,
        data: {
          items: fullDataset.slice(start, start + size),
          totalItems: 101,
          page,
          pageSize: size,
        },
      };
    });

    render(
      <MemoryRouter>
        <TenantManagementPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tất cả trạng thái (101)' })).toBeInTheDocument();
    });

    expect(tenantApi.getTenants).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 100 }));
    expect(tenantApi.getTenants).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 100 }));

    fireEvent.click(screen.getByRole('button', { name: /Xuất Excel/i }));
    expect(capturedBlob).not.toBeNull();

    const csvText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(capturedBlob!);
    });
    const lines = csvText.replace(/^\uFEFF/, '').split('\r\n');
    // 1 header line + 101 tenant rows = 102 lines
    expect(lines.length).toBe(102);
    expect(csvText).toContain('cua-hang-101');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    anchorClickSpy.mockRestore();
  });

  it('fetches beyond 50 pages when totalItems is 5001 and exports all 5001 rows (5002 CSV lines)', async () => {
    let capturedBlob: Blob | null = null;
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob;
      return 'blob:mock-csv-5001';
    });
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const fullDataset = Array.from({ length: 5001 }, (_, idx) => ({
      id: `tenant_${idx + 1}`,
      subdomain: `cua-hang-${idx + 1}`,
      name: `Cửa Hàng Thứ ${idx + 1}`,
      ownerName: `Chủ ${idx + 1}`,
      ownerEmail: `owner${idx + 1}@mtgrms.vn`,
      ownerPhone: '0912345678',
      plan: 'Gói Pro',
      branchCount: 1,
      maxBranches: 5,
      staffCount: 2,
      maxStaff: 20,
      status: 'ACTIVE',
    }));

    vi.mocked(tenantApi.getTenants).mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      const size = params?.pageSize ?? 100;
      const start = (page - 1) * size;
      return {
        success: true,
        data: {
          items: fullDataset.slice(start, start + size),
          totalItems: 5001,
          page,
          pageSize: size,
        },
      };
    });

    render(
      <MemoryRouter>
        <TenantManagementPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tất cả trạng thái (5001)' })).toBeInTheDocument();
    });

    expect(tenantApi.getTenants).toHaveBeenCalledWith(expect.objectContaining({ page: 51, pageSize: 100 }));

    fireEvent.click(screen.getByRole('button', { name: /Xuất Excel/i }));
    expect(capturedBlob).not.toBeNull();

    const csvText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(capturedBlob!);
    });
    const lines = csvText.replace(/^\uFEFF/, '').split('\r\n');
    // 1 header line + 5001 tenant rows = 5002 lines
    expect(lines.length).toBe(5002);
    expect(csvText).toContain('cua-hang-5001');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    anchorClickSpy.mockRestore();
  });
});
