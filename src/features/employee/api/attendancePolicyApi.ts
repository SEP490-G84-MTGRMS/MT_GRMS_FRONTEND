import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';

export interface WorkHourConversionRule {
  id: string;
  type: 'range' | 'gte';
  fromHours: number;
  fromMinutes?: number;
  toHours?: number;
  toMinutes?: number;
  workUnits: number;
  workUnitsLabel: string;
}

export interface AttendancePolicyDto {
  id: string;
  branchId: string;
  branchName?: string | null;
  standardDayHours: number;
  isConvertHoursToDays: boolean;
  conversionRulesJson?: string | null;
  enableLateThreshold: boolean;
  lateThresholdMinutes: number;
  enableEarlyLeaveThreshold: boolean;
  earlyLeaveThresholdMinutes: number;
  enableOtBeforeShift: boolean;
  otBeforeShiftMinutes: number;
  enableOtAfterShift: boolean;
  otAfterShiftMinutes: number;
  isCustomized: boolean;
}

export interface UpsertAttendancePolicyPayload {
  standardDayHours: number;
  isConvertHoursToDays: boolean;
  conversionRulesJson?: string;
  enableLateThreshold: boolean;
  lateThresholdMinutes: number;
  enableEarlyLeaveThreshold: boolean;
  earlyLeaveThresholdMinutes: number;
  enableOtBeforeShift: boolean;
  otBeforeShiftMinutes: number;
  enableOtAfterShift: boolean;
  otAfterShiftMinutes: number;
}

export interface CopyAttendancePolicyPayload {
  sourceBranchId: string;
  targetBranchIds: string[];
}

export interface CopyAttendancePolicyResult {
  sourceBranchId: string;
  copiedCount: number;
  targetBranchIds: string[];
  message: string;
}

export const attendancePolicyApi = {
  /**
   * Lấy cấu hình chính sách chấm công theo BranchId
   * GET /api/attendance-policies/branch/{branchId}
   */
  async getByBranch(branchId: string): Promise<AttendancePolicyDto> {
    const res = await httpClient.get<ApiResponse<AttendancePolicyDto>>(
      `/attendance-policies/branch/${branchId}`
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tải cấu hình chấm công chi nhánh.');
  },

  /**
   * Cập nhật / tạo mới chính sách chấm công chi nhánh (Upsert)
   * PUT /api/attendance-policies/branch/{branchId}
   */
  async upsertPolicy(
    branchId: string,
    payload: UpsertAttendancePolicyPayload
  ): Promise<AttendancePolicyDto> {
    const res = await httpClient.put<ApiResponse<AttendancePolicyDto>>(
      `/attendance-policies/branch/${branchId}`,
      payload
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể lưu cấu hình chấm công.');
  },

  /**
   * Sao chép chính sách sang các chi nhánh khác
   * POST /api/attendance-policies/copy
   */
  async copyPolicy(payload: CopyAttendancePolicyPayload): Promise<CopyAttendancePolicyResult> {
    const res = await httpClient.post<ApiResponse<CopyAttendancePolicyResult>>(
      '/attendance-policies/copy',
      payload
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể sao chép cấu hình chấm công.');
  },
};

