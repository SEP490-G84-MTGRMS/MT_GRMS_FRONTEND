export const ScheduleRequestType = {
  Overtime: 'Overtime',
  CheckInIncident: 'CheckInIncident',
  CheckOutIncident: 'CheckOutIncident',
  ShiftSwap: 'ShiftSwap',
  LeaveRequest: 'LeaveRequest',
} as const;
export type ScheduleRequestType = (typeof ScheduleRequestType)[keyof typeof ScheduleRequestType];

export const LeaveType = {
  AnnualLeave: 'AnnualLeave',
  SickLeave: 'SickLeave',
  UnpaidLeave: 'UnpaidLeave',
  Maternity: 'Maternity',
  Other: 'Other',
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const ScheduleApprovalStatus = {
  None: 'None',
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Cancelled: 'Cancelled',
} as const;
export type ScheduleApprovalStatus = (typeof ScheduleApprovalStatus)[keyof typeof ScheduleApprovalStatus];

export const ScheduleRequestTypeLabels: Record<ScheduleRequestType, string> = {
  [ScheduleRequestType.Overtime]: 'Làm thêm giờ (OT)',
  [ScheduleRequestType.CheckInIncident]: 'Sự cố Check-in (Vào ca)',
  [ScheduleRequestType.CheckOutIncident]: 'Sự cố Check-out (Ra ca)',
  [ScheduleRequestType.ShiftSwap]: 'Đổi ca làm việc',
  [ScheduleRequestType.LeaveRequest]: 'Xin nghỉ ca làm việc',
};

export const LeaveTypeLabels: Record<LeaveType, string> = {
  [LeaveType.AnnualLeave]: 'Nghỉ phép năm (hưởng lương)',
  [LeaveType.SickLeave]: 'Nghỉ ốm / Khám bệnh',
  [LeaveType.UnpaidLeave]: 'Nghỉ việc riêng không lương',
  [LeaveType.Maternity]: 'Nghỉ thai sản',
  [LeaveType.Other]: 'Lý do khác',
};

export interface CreateScheduleApprovalRequestDto {
  requestType: ScheduleRequestType;
  reason: string;
  evidenceImageUrls?: string[] | null;
  scheduleId?: string | null;
  leaveType?: LeaveType | null;
  isPaidLeaveRequested?: boolean;
  requestedCheckInTime?: string | null;
  requestedCheckOutTime?: string | null;
  requestedOvertimeMinutes?: number | null;
}

export interface ReviewScheduleApprovalRequestDto {
  isApproved: boolean;
  reviewNote?: string | null;
  isPaidLeave?: boolean | null;
  approvedCheckInTime?: string | null;
  approvedCheckOutTime?: string | null;
  approvedOvertimeMinutes?: number | null;
}

export interface ScheduleApprovalRequestDto {
  id: string;
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branchId: string;
  branchName?: string | null;
  requestType: ScheduleRequestType;
  status: ScheduleApprovalStatus;
  reason: string;
  evidenceImageUrls?: string[] | null;
  leaveType?: LeaveType | null;
  isPaidLeave: boolean;
  requestedCheckInTime?: string | null;
  requestedCheckOutTime?: string | null;
  approvedCheckInTime?: string | null;
  approvedCheckOutTime?: string | null;
  requestedOvertimeMinutes?: number | null;
  approvedOvertimeMinutes?: number | null;
  reviewNote?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  workDate: string;
  shiftName: string;
  plannedStartTime: string;
  plannedEndTime: string;
}

export interface PendingApprovalRequestsResponse {
  total: number;
  items: ScheduleApprovalRequestDto[];
}
