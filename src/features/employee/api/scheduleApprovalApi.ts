import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  CreateScheduleApprovalRequestDto,
  ReviewScheduleApprovalRequestDto,
  PeerConfirmShiftSwapDto,
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
   * Tải nhiều tệp hình ảnh bằng chứng lên Cloudinary qua backend
   */
  uploadEvidenceImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const res = await httpClient.post<ApiResponse<string[]>>('/schedule-approval-requests/upload-evidences', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data ?? [];
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
   * Đồng nghiệp xác nhận hoặc từ chối đổi ca
   */
  peerConfirmShiftSwap: async (requestId: string, data: PeerConfirmShiftSwapDto): Promise<boolean> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/schedule-approval-requests/${requestId}/peer-confirm`, data);
    return res.data.data ?? false;
  },

  /**
   * Quản lý phê duyệt hoặc từ chối đơn yêu cầu
   */
  reviewRequest: async (requestId: string, data: ReviewScheduleApprovalRequestDto): Promise<boolean> => {
    const res = await httpClient.post<ApiResponse<boolean>>(`/schedule-approval-requests/${requestId}/review`, data);
    return res.data.data ?? false;
  },
};
