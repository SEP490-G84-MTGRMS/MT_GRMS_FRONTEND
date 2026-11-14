import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';

export interface ShiftConfigDto {
  id: string;
  branchId: string;
  branchIds?: string[];
  shiftCode: string;
  shiftName: string;
  startTime: string; // "17:00:00"
  endTime: string;   // "21:00:00"
  durationHours: number;
  isCheckInNextDay?: boolean;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  branchName?: string | null;
  branchNames?: string[] | null;
}

export interface ShiftConfigQueryFilter {
  keyword?: string;
  branchId?: string;
  branchIds?: string[];
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateShiftConfigPayload {
  shiftName: string;
  startTime: string;
  endTime: string;
  branchIds?: string[];
  branchId?: string;
  shiftCode?: string;
  durationHours?: number;
  isCheckInNextDay?: boolean;
  description?: string;
  isActive?: boolean;
}

export interface UpdateShiftConfigPayload {
  shiftName: string;
  startTime: string;
  endTime: string;
  branchIds?: string[];
  branchId?: string;
  shiftCode?: string;
  durationHours?: number;
  isCheckInNextDay?: boolean;
  description?: string;
  isActive?: boolean;
}

export const shiftConfigApi = {
  /**
   * Lấy danh sách cấu hình ca làm việc có phân trang, tìm kiếm và lọc
   * GET /api/shift-configs
   */
  async getShiftConfigsPaged(filter?: ShiftConfigQueryFilter): Promise<PagedResult<ShiftConfigDto>> {
    const params: Record<string, any> = {};
    if (filter) {
      if (filter.keyword) params.keyword = filter.keyword;
      if (filter.branchId) params.branchId = filter.branchId;
      if (filter.branchIds && filter.branchIds.length > 0) params.branchIds = filter.branchIds;
      if (typeof filter.isActive === 'boolean') params.isActive = filter.isActive;
      if (filter.page) params.page = filter.page;
      if (filter.pageSize) params.pageSize = filter.pageSize;
    }

    const res = await httpClient.get<ApiResponse<PagedResult<ShiftConfigDto>>>('/shift-configs', {
      params,
    });

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return { items: [], page: 1, pageSize: 20, totalItems: 0 };
  },

  /**
   * Lấy danh sách cấu hình ca làm việc theo chi nhánh (hoặc toàn bộ chi nhánh nếu không truyền branchId)
   * GET /api/shift-configs?branchId=...&isActive=...
   */
  async getShiftConfigsByBranch(branchId?: string, isActive?: boolean): Promise<ShiftConfigDto[]> {
    const params: Record<string, any> = { page: 1, pageSize: 1000 };
    if (branchId) {
      params.branchId = branchId;
    }
    if (typeof isActive === 'boolean') {
      params.isActive = isActive;
    }

    const res = await httpClient.get<ApiResponse<any>>('/shift-configs', {
      params,
    });

    if (res.data?.success && res.data.data) {
      if (Array.isArray(res.data.data)) {
        return res.data.data;
      }
      if (Array.isArray(res.data.data.items)) {
        return res.data.data.items;
      }
    }
    return [];
  },

  /**
   * Lấy chi tiết ca theo ID
   * GET /api/shift-configs/{id}
   */
  async getShiftConfigById(id: string): Promise<ShiftConfigDto> {
    const res = await httpClient.get<ApiResponse<ShiftConfigDto>>(`/shift-configs/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tải thông tin ca làm việc.');
  },

  /**
   * Tạo ca làm việc mới
   * POST /api/shift-configs
   */
  async createShiftConfig(payload: CreateShiftConfigPayload): Promise<ShiftConfigDto> {
    const res = await httpClient.post<ApiResponse<ShiftConfigDto>>('/shift-configs', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo mới ca làm việc.');
  },

  /**
   * Cập nhật thông tin ca làm việc
   * PUT /api/shift-configs/{id}
   */
  async updateShiftConfig(id: string, payload: UpdateShiftConfigPayload): Promise<ShiftConfigDto> {
    const res = await httpClient.put<ApiResponse<ShiftConfigDto>>(`/shift-configs/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật ca làm việc.');
  },

  /**
   * Cập nhật trạng thái bật/tắt (IsActive)
   * PATCH /api/shift-configs/{id}/status
   */
  async updateShiftConfigStatus(id: string, isActive: boolean): Promise<ShiftConfigDto> {
    const res = await httpClient.patch<ApiResponse<ShiftConfigDto>>(`/shift-configs/${id}/status`, {
      isActive,
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật trạng thái ca.');
  },

  /**
   * Xóa mềm ca làm việc
   * DELETE /api/shift-configs/{id}
   */
  async deleteShiftConfig(id: string): Promise<void> {
    await httpClient.delete(`/shift-configs/${id}`);
  },
};
