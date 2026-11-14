import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  CreateScheduleApprovalRequestDto,
  ReviewScheduleApprovalRequestDto,
  ScheduleApprovalRequestDto,
  PendingApprovalRequestsResponse,
  ScheduleRequestType,
} from '../types/scheduleApprovalTypes';

export const scheduleApprovalApi = {
  /**
   * Nhân viên gửi đơn yêu cầu cho một ca làm việc
   */
  createRequest: async (scheduleId: string, data: CreateScheduleApprovalRequestDto): Promise<ScheduleApprovalRequestDto> => {
    const res = await httpClient.post<ApiResponse<ScheduleApprovalRequestDto>>(`/schedules/${scheduleId}/requests`, data);
    return res.data.data!;
  },

  /**
   * Cập nhật đơn yêu cầu (chỉ khi đang ở trạng thái Pending)
   */
  updateRequest: async (requestId: string, data: CreateScheduleApprovalRequestDto): Promise<ScheduleApprovalRequestDto> => {
    const res = await httpClient.put<ApiResponse<ScheduleApprovalRequestDto>>(`/schedule-approval-requests/${requestId}`, data);
    return res.data.data!;
  },

  /**
   * Xóa đơn yêu cầu (chỉ khi đang ở trạng thái Pending)
   */
  deleteRequest: async (requestId: string): Promise<boolean> => {
    const res = await httpClient.delete<ApiResponse<boolean>>(`/schedule-approval-requests/${requestId}`);
    return res.data.data ?? false;
  },

  /**
   * Lấy lịch sử các đơn đã gửi của một ca làm việc
   */
  getRequestsByScheduleId: async (scheduleId: string): Promise<ScheduleApprovalRequestDto[]> => {
    const res = await httpClient.get<ApiResponse<ScheduleApprovalRequestDto[]>>(`/schedules/${scheduleId}/requests`);
    return res.data.data ?? [];
  },

  /**
   * Quản lý lấy danh sách các đơn đang chờ phê duyệt (Pending)
   */
  getPendingRequests: async (branchId?: string, requestType?: ScheduleRequestType): Promise<PendingApprovalRequestsResponse> => {
    const res = await httpClient.get<ApiResponse<PendingApprovalRequestsResponse>>('/schedule-approval-requests/pending', {
      params: { branchId, requestType },
    });
    return res.data.data ?? { total: 0, items: [] };
  },

  /**
   * Quản lý lấy danh sách tất cả các đơn yêu cầu có lọc theo Chi nhánh, Loại đơn, Trạng thái
   */
  getAllRequests: async (
    branchId?: string,
    requestType?: ScheduleRequestType,
    status?: string
  ): Promise<PendingApprovalRequestsResponse> => {
    const params: Record<string, any> = {};
    if (branchId) params.branchId = branchId;
    if (requestType) params.requestType = requestType;
    if (status && status !== 'ALL') params.status = status;

    const res = await httpClient.get<ApiResponse<PendingApprovalRequestsResponse>>('/schedule-approval-requests', {
      params,
    });
    return res.data.data ?? { total: 0, items: [] };
  },

  /**
   * Quản lý phê duyệt hoặc từ chối đơn yêu cầu
   */
  reviewRequest: async (requestId: string, data: ReviewScheduleApprovalRequestDto): Promise<boolean> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/schedule-approval-requests/${requestId}/review`, data);
    return res.data.data ?? false;
  },
};
