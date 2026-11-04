import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';

export interface ShiftConfigDto {
  id: string;
  branchId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string; // "06:00:00"
  endTime: string;   // "14:00:00"
  durationHours: number;
  allowedCheckInStart: string;
  allowedCheckInEnd: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateShiftConfigPayload {
  branchId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  allowedCheckInStart?: string;
  allowedCheckInEnd?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateShiftConfigPayload {
  shiftName: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  allowedCheckInStart?: string;
  allowedCheckInEnd?: string;
  description?: string;
  isActive?: boolean;
}

export const shiftConfigApi = {
  /**
   * Lấy danh sách cấu hình ca làm việc theo chi nhánh
   * GET /api/v1/hr/shift-configs?branchId=...&isActive=...
   */
  async getShiftConfigsByBranch(branchId: string, isActive?: boolean): Promise<ShiftConfigDto[]> {
    const params: Record<string, any> = { branchId };
    if (typeof isActive === 'boolean') {
      params.isActive = isActive;
    }

    const res = await httpClient.get<ApiResponse<ShiftConfigDto[]>>('/hr/shift-configs', {
      params,
    });

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return [];
  },

  /**
   * Lấy chi tiết ca theo ID
   * GET /api/v1/hr/shift-configs/{id}
   */
  async getShiftConfigById(id: string): Promise<ShiftConfigDto> {
    const res = await httpClient.get<ApiResponse<ShiftConfigDto>>(`/hr/shift-configs/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tải thông tin ca làm việc.');
  },

  /**
   * Tạo ca làm việc mới
   * POST /api/v1/hr/shift-configs
   */
  async createShiftConfig(payload: CreateShiftConfigPayload): Promise<ShiftConfigDto> {
    const res = await httpClient.post<ApiResponse<ShiftConfigDto>>('/hr/shift-configs', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo mới ca làm việc.');
  },

  /**
   * Cập nhật thông tin ca làm việc
   * PUT /api/v1/hr/shift-configs/{id}
   */
  async updateShiftConfig(id: string, payload: UpdateShiftConfigPayload): Promise<ShiftConfigDto> {
    const res = await httpClient.put<ApiResponse<ShiftConfigDto>>(`/hr/shift-configs/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật ca làm việc.');
  },

  /**
   * Cập nhật trạng thái bật/tắt (IsActive)
   * PATCH /api/v1/hr/shift-configs/{id}/status
   */
  async updateShiftConfigStatus(id: string, isActive: boolean): Promise<ShiftConfigDto> {
    const res = await httpClient.patch<ApiResponse<ShiftConfigDto>>(`/hr/shift-configs/${id}/status`, {
      isActive,
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật trạng thái ca.');
  },

  /**
   * Xóa mềm ca làm việc
   * DELETE /api/v1/hr/shift-configs/{id}
   */
  async deleteShiftConfig(id: string): Promise<void> {
    await httpClient.delete(`/hr/shift-configs/${id}`);
  },
};

