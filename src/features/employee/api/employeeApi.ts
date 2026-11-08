import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type { Employee, Branch } from '../types';
import {
  mapBackendSummaryToEmployee,
  mapBackendDetailToEmployee,
  type EmployeeBackendSummaryDto,
  type EmployeeBackendDetailDto,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
  type CreateIdentityAccountPayload,
  type EmployeeQueryFilterParams,
} from '../lib/employeeMapper';

export const employeeApi = {
  /**
   * Lấy danh sách nhân viên có phân trang, tìm kiếm và lọc theo chi nhánh/trạng thái
   * Backend: GET /api/v1/employees
   */
  async getEmployeesPaged(filter: EmployeeQueryFilterParams = {}): Promise<{
    items: Employee[];
    totalItems: number;
    page: number;
    pageSize: number;
  }> {
    const params: Record<string, any> = {
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
    };

    if (filter.keyword && filter.keyword.trim() !== '') {
      params.keyword = filter.keyword.trim();
    }

    if (filter.branchIds && filter.branchIds.length > 0) {
      params.branchIds = filter.branchIds;
    } else if (filter.branchId && filter.branchId !== '' && filter.branchId !== 'all') {
      params.branchId = filter.branchId;
    }

    if (filter.status && filter.status !== 'all') {
      params.status = filter.status;
    }

    const res = await httpClient.get<ApiResponse<PagedResult<EmployeeBackendSummaryDto>>>('/employees', {
      params,
    });

    if (res.data?.success && res.data.data) {
      const paged = res.data.data;
      const items = (paged.items || []).map(mapBackendSummaryToEmployee);
      return {
        items,
        totalItems: paged.totalItems ?? items.length,
        page: paged.page ?? filter.page ?? 1,
        pageSize: paged.pageSize ?? filter.pageSize ?? 20,
      };
    }

    return {
      items: [],
      totalItems: 0,
      page: 1,
      pageSize: 20,
    };
  },

  /**
   * Lấy thông tin chi tiết một nhân viên theo ID
   * Backend: GET /api/v1/employees/{id}
   */
  async getEmployeeById(id: string): Promise<Employee> {
    const res = await httpClient.get<ApiResponse<EmployeeBackendDetailDto>>(`/employees/${id}`);
    if (res.data?.success && res.data.data) {
      return mapBackendDetailToEmployee(res.data.data);
    }
    throw new Error(res.data?.message || 'Không thể tải thông tin nhân viên.');
  },

  /**
   * Tạo mới hồ sơ nhân viên
   * Backend: POST /api/v1/employees
   */
  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await httpClient.post<ApiResponse<EmployeeBackendDetailDto>>('/employees', payload);
    if (res.data?.success && res.data.data) {
      return mapBackendDetailToEmployee(res.data.data);
    }
    throw new Error(res.data?.message || 'Tạo nhân viên thất bại.');
  },

  /**
   * Cập nhật thông tin nhân viên và mức lương
   * Backend: PUT /api/v1/employees/{id}
   */
  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    const res = await httpClient.put<ApiResponse<EmployeeBackendDetailDto>>(`/employees/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return mapBackendDetailToEmployee(res.data.data);
    }
    throw new Error(res.data?.message || 'Cập nhật nhân viên thất bại.');
  },

  /**
   * Cập nhật trạng thái hoạt động của nhân viên (active / inactive)
   * Backend: PATCH /api/v1/employees/{id}/status
   */
  async updateEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<boolean> {
    const res = await httpClient.patch<ApiResponse<object>>(`/employees/${id}/status`, { status });
    return !!res.data?.success;
  },

  /**
   * Cấp tài khoản đăng nhập Identity cho nhân viên
   * Backend: POST /api/v1/employees/{id}/identity-account
   */
  async createIdentityAccount(
    id: string,
    payload: CreateIdentityAccountPayload
  ): Promise<{ userId: string; username: string; role: string }> {
    const res = await httpClient.post<
      ApiResponse<{ userId: string; username: string; role: string; message: string }>
    >(`/employees/${id}/identity-account`, payload);

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Cấp tài khoản thất bại.');
  },

  /**
   * Cập nhật tài khoản đăng nhập Identity cho nhân viên
   * Backend: PUT /api/v1/employees/{id}/identity-account
   */
  async updateIdentityAccount(
    id: string,
    payload: CreateIdentityAccountPayload
  ): Promise<{ userId: string; username: string; role: string }> {
    const res = await httpClient.put<
      ApiResponse<{ userId: string; username: string; role: string; message: string }>
    >(`/employees/${id}/identity-account`, payload);

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Cập nhật tài khoản thất bại.');
  },

  /**
   * Xóa mềm nhân viên
   * Backend: DELETE /api/v1/employees/{id}
   */
  async deleteEmployee(id: string): Promise<boolean> {
    const res = await httpClient.delete<ApiResponse<object>>(`/employees/${id}`);
    return !!res.data?.success;
  },

  /**
   * Lấy danh sách chi nhánh phục vụ chọn chi nhánh làm việc
   * Backend: GET /api/v1/branches (fallback mock nếu lỗi)
   */
  async getBranches(): Promise<Branch[]> {
    try {
      const res = await httpClient.get<any>('/branches', { params: { pageSize: 100 } });
      const raw = res.data?.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((b: any) => ({
          id: String(b.id),
          name: b.name || b.branchName || 'Chi nhánh',
        }));
      }
    } catch {
      // ignore, fallback
    }
    return [];
  },

  /**
   * Lấy thông tin hồ sơ nhân viên của tài khoản người dùng đang đăng nhập
   * Backend: GET /api/v1/employees/me
   */
  async getMyProfile(): Promise<Employee | null> {
    try {
      const res = await httpClient.get<ApiResponse<any>>('/employees/me');
      if (res.data?.success && res.data.data) {
        return mapBackendDetailToEmployee(res.data.data);
      }
      return null;
    } catch {
      return null;
    }
  },
};

