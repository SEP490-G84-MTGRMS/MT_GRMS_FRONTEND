import { describe, it, expect, vi, beforeEach } from 'vitest';
import { employeeApi } from '../api/employeeApi';
import { httpClient } from '../../../api/httpClient';
import {
  mapBackendSummaryToEmployee,
  mapBackendDetailToEmployee,
  mapFormToCreatePayload,
} from '../lib/employeeMapper';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('employeeMapper', () => {
  it('mapBackendSummaryToEmployee: chuyển đổi đầy đủ trường sang Employee model', () => {
    const summaryDto = {
      id: 'emp-101',
      employeeCode: 'NV0001',
      fullName: 'Nguyễn Văn A',
      phone: '0912345678',
      email: 'nva@test.com',
      branchId: 'branch-1',
      branchName: 'Chi nhánh Quận 1',
      status: 'active',
      salaryType: 'monthly',
      baseRate: 8500000,
      userId: 'usr-101',
      userName: 'nguyenvana',
      createdAt: '2026-11-01T08:00:00Z',
    };

    const result = mapBackendSummaryToEmployee(summaryDto);

    expect(result.id).toBe('emp-101');
    expect(result.employeeCode).toBe('NV0001');
    expect(result.fullName).toBe('Nguyễn Văn A');
    expect(result.phone).toBe('0912345678');
    expect(result.salaryConfig!.baseSalary).toBe(8500000);
    expect(result.salaryConfig!.salaryType).toBe('monthly');
    expect(result.workingBranchNames).toContain('Chi nhánh Quận 1');
    expect(result.status).toBe('active');
    expect(result.userName).toBe('nguyenvana');
  });

  it('mapBackendDetailToEmployee: bóc tách danh sách allowances', () => {
    const detailDto = {
      id: 'emp-202',
      employeeCode: 'NV0002',
      fullName: 'Trần Thị B',
      citizenId: '012345678901',
      dateOfBirth: '1995-05-15T00:00:00Z',
      gender: 'female',
      phone: '0987654321',
      email: 'ttb@test.com',
      branchId: 'branch-2',
      branchName: 'Chi nhánh Cầu Giấy',
      salaryType: 'hourly',
      baseRate: 35000,
      allowances: [
        { name: 'Phụ cấp ăn trưa', amount: 650000 },
        { name: 'Phụ cấp xăng xe', amount: 300000 },
      ],
      debtAmount: 500000,
      status: 'active',
      bankAccountNumber: '1903456789',
      bankName: 'Techcombank',
      bankAccountHolder: 'TRAN THI B',
      createdAt: '2026-11-01T08:00:00Z',
    };

    const result = mapBackendDetailToEmployee(detailDto);

    expect(result.citizenId).toBe('012345678901');
    expect(result.gender).toBe('female');
    expect(result.salaryConfig!.salaryType).toBe('hourly');
    expect(result.salaryConfig!.baseSalary).toBe(35000);
    expect(result.debtAmount).toBe(500000);
    expect(result.bankAccountNumber).toBe('1903456789');

    // Kiểm tra allowance
    expect(result.salaryConfig!.allowances).toHaveLength(2);
    expect(result.salaryConfig!.allowances[0].name).toBe('Phụ cấp ăn trưa');
    expect(result.salaryConfig!.allowances[0].amount).toBe(650000);
    expect(result.salaryConfig!.allowances[1].name).toBe('Phụ cấp xăng xe');
    expect(result.salaryConfig!.allowances[1].amount).toBe(300000);
  });

  it('mapFormToCreatePayload: đóng gói form input sang đúng CreateEmployeePayload', () => {
    const payload = mapFormToCreatePayload(
      {
        fullName: 'Lê Văn C',
        citizenId: '034098765432',
        phone: '0901234567',
        email: 'lvc@test.com',
        gender: 'male',
        dateOfBirth: '1998-10-20',
      },
      {
        salaryType: 'monthly',
        baseSalary: 9000000,
        otWeekday: '150%',
        otSunday: '200%',
        otDayOff: '200%',
        otHoliday: '300%',
        allowances: [
          { id: '1', name: 'Phụ cấp ăn trưa', type: 'monthly', amount: 700000, enabled: true },
          { id: '2', name: 'Phụ cấp đi lại', type: 'monthly', amount: 250000, enabled: true },
          { id: '3', name: 'Thưởng chuyên cần', type: 'monthly', amount: 500000, enabled: false },
        ],
      },
      'branch-3'
    );

    expect(payload.fullName).toBe('Lê Văn C');
    expect(payload.citizenId).toBe('034098765432');
    expect(payload.phone).toBe('0901234567');
    expect(payload.branchId).toBe('branch-3');
    expect(payload.baseRate).toBe(9000000);
    expect(payload.allowances).toHaveLength(2);
    expect(payload.allowances![0]).toEqual({ name: 'Phụ cấp ăn trưa', amount: 700000 });
  });

  it('mapBackendDetailToEmployee: ưu tiên dùng mảng allowances động từ backend', () => {
    const detailDto = {
      id: 'emp-303',
      employeeCode: 'NV0003',
      fullName: 'Phạm Văn D',
      citizenId: '012345678888',
      phone: '0911223344',
      branchId: 'b-1',
      branchName: 'Chi nhánh 1',
      salaryType: 'monthly',
      baseRate: 12000000,
      lunchAllowance: 0,
      travelAllowance: 0,
      debtAmount: 0,
      status: 'active',
      allowances: [
        { name: 'Phụ cấp trách nhiệm', amount: 1500000 },
        { name: 'Phụ cấp điện thoại', amount: 300000 },
      ],
      createdAt: '2026-11-02',
    };

    const result = mapBackendDetailToEmployee(detailDto);
    expect(result.salaryConfig!.allowances).toHaveLength(2);
    expect(result.salaryConfig!.allowances[0].name).toBe('Phụ cấp trách nhiệm');
    expect(result.salaryConfig!.allowances[0].amount).toBe(1500000);
    expect(result.salaryConfig!.allowances[1].name).toBe('Phụ cấp điện thoại');
    expect(result.salaryConfig!.allowances[1].amount).toBe(300000);
  });
});

describe('employeeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getEmployeesPaged: gọi GET /employees với params chính xác và map danh sách', async () => {
    (httpClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [
            {
              id: 'emp-1',
              employeeCode: 'NV0001',
              fullName: 'Nguyễn Văn Test',
              phone: '0912345678',
              branchId: 'b-1',
              branchName: 'Chi nhánh 1',
              status: 'active',
              salaryType: 'monthly',
              baseRate: 8000000,
              createdAt: '2026-11-01',
            },
          ],
          totalItems: 1,
          page: 1,
          pageSize: 10,
        },
      },
    });

    const res = await employeeApi.getEmployeesPaged({
      keyword: 'Nguyễn',
      branchId: 'b-1',
      status: 'active',
      page: 1,
      pageSize: 10,
    });

    expect(httpClient.get).toHaveBeenCalledWith('/employees', {
      params: {
        keyword: 'Nguyễn',
        branchId: 'b-1',
        status: 'active',
        page: 1,
        pageSize: 10,
      },
    });

    expect(res.totalItems).toBe(1);
    expect(res.items.length).toBe(1);
    expect(res.items[0].fullName).toBe('Nguyễn Văn Test');
  });

  it('createEmployee: gọi POST /employees và trả về Employee đã map', async () => {
    (httpClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 'emp-new',
          employeeCode: 'NV0003',
          fullName: 'Tạo Mới',
          citizenId: '012345678999',
          phone: '0933333333',
          branchId: 'b-1',
          branchName: 'Chi nhánh 1',
          status: 'active',
          salaryType: 'monthly',
          baseRate: 7000000,
          debtAmount: 0,
          createdAt: '2026-11-01',
        },
      },
    });

    const created = await employeeApi.createEmployee({
      fullName: 'Tạo Mới',
      citizenId: '012345678999',
      phone: '0933333333',
      branchId: 'b-1',
      salaryType: 'monthly',
      baseRate: 7000000,
    });

    expect(httpClient.post).toHaveBeenCalledWith(
      '/employees',
      expect.objectContaining({ fullName: 'Tạo Mới' })
    );
    expect(created.employeeCode).toBe('NV0003');
  });

  it('createIdentityAccount: gọi POST /employees/{id}/identity-account thành công', async () => {
    (httpClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          userId: 'usr-new',
          username: 'lan_cashier',
          role: 'CASHIER',
          message: 'Tạo tài khoản thành công.',
        },
      },
    });

    const res = await employeeApi.createIdentityAccount('emp-1', {
      username: 'lan_cashier',
      password: 'Password@123',
      role: 'CASHIER',
    });

    expect(httpClient.post).toHaveBeenCalledWith('/employees/emp-1/identity-account', {
      username: 'lan_cashier',
      password: 'Password@123',
      role: 'CASHIER',
    });
    expect(res.username).toBe('lan_cashier');
    expect(res.role).toBe('CASHIER');
  });

  it('updateEmployeeStatus: gọi PATCH /employees/{id}/status', async () => {
    (httpClient.patch as any).mockResolvedValueOnce({
      data: { success: true },
    });

    const success = await employeeApi.updateEmployeeStatus('emp-1', 'inactive');
    expect(httpClient.patch).toHaveBeenCalledWith('/employees/emp-1/status', {
      status: 'inactive',
    });
    expect(success).toBe(true);
  });

  it('deleteEmployee: gọi DELETE /employees/{id}', async () => {
    (httpClient.delete as any).mockResolvedValueOnce({
      data: { success: true },
    });

    const success = await employeeApi.deleteEmployee('emp-1');
    expect(httpClient.delete).toHaveBeenCalledWith('/employees/emp-1');
    expect(success).toBe(true);
  });
});

