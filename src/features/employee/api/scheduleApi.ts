import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { ScheduleAssignment } from '../types';

export interface ScheduleResponse {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeAvatarUrl?: string | null;
  branchId: string;
  branchName?: string | null;
  shiftConfigId?: string | null;
  workDate: string;
  shiftCode: string;
  shiftName: string;
  plannedStartTime: string;
  plannedEndTime: string;
  durationHours: number;
  allowedCheckInStart: string;
  allowedCheckInEnd: string;
  isCheckInNextDay: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
  checkInFaceImageUrl?: string | null;
  faceMatchScore?: number | null;
  checkOutMethod?: string | null;
  checkOutFaceImageUrl?: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  actualWorkHours: number;
  status: string;
  approvalType?: string | null;
  approvalStatus: string;
  approvalReason?: string | null;
  evidenceImageUrl?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface ScheduleQueryFilter {
  branchId?: string;
  employeeId?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  status?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateScheduleItemPayload {
  employeeId: string;
  branchId: string;
  workDate: string; // YYYY-MM-DD
  shiftConfigId?: string | null;
  shiftCode?: string;
  shiftName?: string;
  plannedStartTime?: string; // "HH:mm:ss"
  plannedEndTime?: string;   // "HH:mm:ss"
  durationHours?: number;
  allowedCheckInStart?: string;
  allowedCheckInEnd?: string;
  isCheckInNextDay?: boolean;
}

export interface BatchCreateSchedulePayload {
  branchId: string;
  schedules: CreateScheduleItemPayload[];
  hasEndDate?: boolean;
  endDate?: string | null;
}

export interface CreateRecurringSchedulePayload {
  employeeId: string;
  branchId: string;
  startDate: string; // "YYYY-MM-DD"
  hasEndDate?: boolean;
  endDate?: string | null; // "YYYY-MM-DD"
  repeatDays?: string[]; // e.g. ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
  additionalEmployeeIds?: string[];
  shiftConfigId?: string | null;
  shiftCode?: string;
  shiftName?: string;
  plannedStartTime?: string; // "HH:mm:ss"
  plannedEndTime?: string;   // "HH:mm:ss"
  durationHours?: number;
  allowedCheckInStart?: string;
  allowedCheckInEnd?: string;
  isCheckInNextDay?: boolean;
}

export interface UpdateSchedulePayload {
  employeeId?: string;
  branchId?: string;
  workDate?: string;
  shiftConfigId?: string | null;
  shiftCode?: string;
  shiftName?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  durationHours?: number;
  allowedCheckInStart?: string;
  allowedCheckInEnd?: string;
  isCheckInNextDay?: boolean;
  status?: string;
}

export interface PublishSchedulesPayload {
  branchId: string;
  fromDate: string;
  toDate: string;
  employeeIds?: string[];
}

export interface PublishSchedulesResponse {
  publishedCount: number;
  message: string;
}

export type ManualAttendanceType = 1 | 2 | 3; // 1: Working (Đi làm), 2: PaidLeave (Nghỉ phép có lương), 3: UnpaidLeave (Nghỉ phép không lương)

export interface ManualAttendancePayload {
  attendanceType: ManualAttendanceType;
  checkInTime?: string | null;  // "HH:mm" hoặc "HH:mm:ss"
  checkOutTime?: string | null; // "HH:mm" hoặc "HH:mm:ss"
  note?: string | null;
}

export interface ResetAttendancePayload {
  reason?: string | null;
}

export interface ResetAttendanceResponse {
  schedule: ScheduleResponse;
  hasUnpaidPayslip: boolean;
  message: string;
}

export const getShiftColor = (nameOrCode: string = ''): string => {
  const lower = nameOrCode.toLowerCase();
  if (lower.includes('sáng') || lower.includes('sang')) return '#3B82F6';
  if (lower.includes('chiều') || lower.includes('chieu')) return '#10B981';
  if (lower.includes('đêm') || lower.includes('dem') || lower.includes('tối') || lower.includes('toi')) return '#6366F1';
  return '#F59E0B';
};

const DAY_KEYS: Array<'CN' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7'> = [
  'CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'
];

export const mapScheduleResponseToAssignment = (s: ScheduleResponse): ScheduleAssignment => {
  const d = new Date(s.workDate);
  const dayOfWeek = DAY_KEYS[d.getDay()] || 'T2';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dateStr = `${dd}/${mm}`;

  const startFormatted = (s.plannedStartTime || '00:00').substring(0, 5);
  const endFormatted = (s.plannedEndTime || '00:00').substring(0, 5);

  return {
    id: s.id,
    employeeId: s.employeeId,
    employeeName: s.employeeName || 'Nhân viên',
    employeeCode: s.employeeCode || '',
    shiftId: s.shiftConfigId || s.shiftCode || s.id,
    shiftName: s.shiftName || 'Ca làm việc',
    shiftTime: `${startFormatted} - ${endFormatted}`,
    shiftColor: getShiftColor(s.shiftName || s.shiftCode),
    durationHours: s.durationHours,
    dayOfWeek,
    dateStr,
    workDate: s.workDate,
    branchId: s.branchId,
    branchName: s.branchName || 'Chi nhánh',
    status: s.status,
  };
};

export const scheduleApi = {
  /**
   * Tra cứu danh sách lịch làm việc đầy đủ từ backend (bao gồm thông tin chấm công, check-in, check-out, đi muộn)
   * Backend: GET /api/schedules
   */
  async getRawSchedules(filter: ScheduleQueryFilter = {}): Promise<ScheduleResponse[]> {
    const params: Record<string, any> = {};

    if (filter.branchId && filter.branchId !== '' && filter.branchId !== 'all') {
      params.branchId = filter.branchId;
    }
    if (filter.employeeId && filter.employeeId !== '') {
      params.employeeId = filter.employeeId;
    }
    if (filter.fromDate) {
      params.fromDate = filter.fromDate;
    }
    if (filter.toDate) {
      params.toDate = filter.toDate;
    }
    if (filter.status) {
      params.status = filter.status;
    }
    if (filter.keyword) {
      params.keyword = filter.keyword;
    }
    if (filter.page) {
      params.page = filter.page;
    }
    if (filter.pageSize) {
      params.pageSize = filter.pageSize;
    }

    const res = await httpClient.get<ApiResponse<ScheduleResponse[]>>('/schedules', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  },

  /**
   * Tra cứu danh sách lịch làm việc từ backend
   * Backend: GET /api/schedules
   */
  async getSchedules(filter: ScheduleQueryFilter = {}): Promise<ScheduleAssignment[]> {
    const params: Record<string, any> = {};

    if (filter.branchId && filter.branchId !== '' && filter.branchId !== 'all') {
      params.branchId = filter.branchId;
    }
    if (filter.employeeId && filter.employeeId !== '') {
      params.employeeId = filter.employeeId;
    }
    if (filter.fromDate) {
      params.fromDate = filter.fromDate;
    }
    if (filter.toDate) {
      params.toDate = filter.toDate;
    }
    if (filter.status) {
      params.status = filter.status;
    }
    if (filter.keyword) {
      params.keyword = filter.keyword;
    }
    if (filter.page) {
      params.page = filter.page;
    }
    if (filter.pageSize) {
      params.pageSize = filter.pageSize;
    }

    const res = await httpClient.get<ApiResponse<ScheduleResponse[]>>('/schedules', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(mapScheduleResponseToAssignment);
    }
    return [];
  },

  /**
   * Tra cứu lịch làm việc của cá nhân người đăng nhập
   * Backend: GET /api/v1/schedules/my-schedule
   */
  async getMySchedules(fromDate?: string, toDate?: string): Promise<ScheduleAssignment[]> {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const res = await httpClient.get<ApiResponse<ScheduleResponse[]>>('/schedules/my-schedule', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(mapScheduleResponseToAssignment);
    }
    return [];
  },

  async getRawMySchedules(fromDate?: string, toDate?: string): Promise<ScheduleResponse[]> {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const res = await httpClient.get<ApiResponse<ScheduleResponse[]>>('/schedules/my-schedule', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  },

  /**
   * Tạo một ca làm việc đơn lẻ
   * Backend: POST /api/schedules
   */
  async createSchedule(payload: CreateScheduleItemPayload): Promise<ScheduleAssignment> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse>>('/schedules', payload);
    if (res.data?.success && res.data.data) {
      return mapScheduleResponseToAssignment(res.data.data);
    }
    throw new Error(res.data?.message || 'Tạo ca làm việc thất bại.');
  },

  /**
   * Phân ca hàng loạt theo tuần/tháng
   * Backend: POST /api/schedules/batch
   */
  async batchCreateSchedules(payload: BatchCreateSchedulePayload): Promise<ScheduleAssignment[]> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse[]>>('/schedules/batch', payload);
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(mapScheduleResponseToAssignment);
    }
    throw new Error(res.data?.message || 'Phân ca hàng loạt thất bại.');
  },

  /**
   * Khởi tạo ca làm việc lặp lại cho nhân viên (có ngày kết thúc -> tạo đến ngày chỉ định, không có ngày kết thúc -> tạo đến hết tháng sau)
   * Backend: POST /api/schedules/recurring
   */
  async createRecurringSchedule(payload: CreateRecurringSchedulePayload): Promise<ScheduleAssignment[]> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse[]>>('/schedules/recurring', payload);
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data.map(mapScheduleResponseToAssignment);
    }
    throw new Error(res.data?.message || 'Khởi tạo ca làm việc lặp lại thất bại.');
  },

  /**
   * Lấy chi tiết lịch làm việc theo ID
   * Backend: GET /api/schedules/{id}
   */
  async getScheduleById(id: string): Promise<ScheduleResponse> {
    const res = await httpClient.get<ApiResponse<ScheduleResponse>>(`/schedules/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không tìm thấy ca làm việc.');
  },

  /**
   * Cập nhật thông tin ca làm việc
   * Backend: PUT /api/schedules/{id}
   */
  async updateSchedule(id: string, payload: UpdateSchedulePayload): Promise<ScheduleAssignment> {
    const res = await httpClient.put<ApiResponse<ScheduleResponse>>(`/schedules/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return mapScheduleResponseToAssignment(res.data.data);
    }
    throw new Error(res.data?.message || 'Cập nhật ca làm việc thất bại.');
  },

  /**
   * Xóa ca làm việc
   * Backend: DELETE /api/schedules/{id}
   */
  async deleteSchedule(id: string): Promise<boolean> {
    const res = await httpClient.delete<ApiResponse<object>>(`/schedules/${id}`);
    return !!res.data?.success;
  },

  /**
   * Ban hành lịch tuần
   * Backend: POST /api/schedules/publish
   */
  async publishSchedules(payload: PublishSchedulesPayload): Promise<PublishSchedulesResponse> {
    const res = await httpClient.post<ApiResponse<PublishSchedulesResponse>>('/schedules/publish', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Ban hành ca thất bại.');
  },

  /**
   * Chấm công thủ công (Đi làm, Nghỉ phép có lương, Nghỉ phép không lương)
   * Backend: POST /api/schedules/{id}/attendance
   */
  async recordManualAttendance(id: string, payload: ManualAttendancePayload): Promise<ScheduleResponse> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse>>(`/schedules/${id}/attendance`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Chấm công thủ công thất bại.');
  },

  /**
   * Hủy chấm công và đưa ca làm việc về trạng thái chờ vào ca (Published)
   * Backend: POST /api/schedules/{id}/attendance/reset
   */
  async resetManualAttendance(
    id: string,
    payload: ResetAttendancePayload = {}
  ): Promise<ResetAttendanceResponse> {
    const res = await httpClient.post<ApiResponse<ResetAttendanceResponse>>(
      `/schedules/${id}/attendance/reset`,
      payload
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể hủy kết quả chấm công.');
  },

  /**
   * Lấy danh sách vector khuôn mặt nhân viên trong ngày theo chi nhánh (phục vụ FaceMatcher tại POS)
   * Backend: GET /api/v1/schedules/face-id/today-descriptors?branchId=...
   */
  async getTodayStaffDescriptors(branchId: string): Promise<any[]> {
    const res = await httpClient.get<ApiResponse<any[]>>('/schedules/face-id/today-descriptors', {
      params: { branchId },
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return [];
  },

  /**
   * Điểm danh vào ca FaceID tại máy POS
   * Backend: POST /api/v1/schedules/face-id/check-in
   */
  async checkInFaceId(payload: {
    scheduleId: string;
    employeeId: string;
    faceMatchScore: number;
    snapshotBase64?: string | null;
  }): Promise<ScheduleResponse> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse>>('/schedules/face-id/check-in', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Điểm danh vào ca FaceID thất bại.');
  },

  /**
   * Điểm danh ra ca FaceID tại máy POS
   * Backend: POST /api/v1/schedules/face-id/check-out
   */
  async checkOutFaceId(payload: {
    scheduleId: string;
    employeeId: string;
    faceMatchScore: number;
    snapshotBase64?: string | null;
  }): Promise<ScheduleResponse> {
    const res = await httpClient.post<ApiResponse<ScheduleResponse>>('/schedules/face-id/check-out', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Điểm danh ra ca FaceID thất bại.');
  },
};

