// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateScheduleRequestModal } from '../components/approval-requests/CreateScheduleRequestModal';
import { ScheduleApprovalStatus, ScheduleRequestType } from '../types/scheduleApprovalTypes';
import { scheduleApprovalApi } from '../api/scheduleApprovalApi';

vi.mock('../api/scheduleApprovalApi', () => ({
  scheduleApprovalApi: {
    getRequestsByScheduleId: vi.fn(),
    createRequest: vi.fn(),
    updateRequest: vi.fn(),
  },
}));

vi.mock('../api/scheduleApi', () => ({
  scheduleApi: {
    getRawMySchedules: vi.fn().mockResolvedValue([]),
  },
}));

describe('CreateScheduleRequestModal — Complaint status rules (InProgress & Completed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scheduleApprovalApi.getRequestsByScheduleId).mockResolvedValue([]);
    vi.mocked(scheduleApprovalApi.createRequest).mockResolvedValue({
      id: 'req-1',
      scheduleId: 'sch-1',
      employeeId: 'emp-1',
      employeeName: 'Nguyễn Văn A',
      employeeCode: 'NV001',
      branchId: 'br-1',
      requestType: ScheduleRequestType.CheckInIncident,
      status: ScheduleApprovalStatus.Pending,
      reason: 'Khiếu nại giờ vào ca thực tế',
      evidenceImageUrls: [],
      isPaidLeave: false,
      createdAt: new Date().toISOString(),
      workDate: '2026-11-24',
      shiftName: 'Ca Sáng',
      plannedStartTime: '08:00:00',
      plannedEndTime: '12:00:00',
    });
  });

  it('cho phép gửi khiếu nại CheckInIncident khi ca đang ở trạng thái InProgress (đã check-in)', async () => {
    render(
      <CreateScheduleRequestModal
        isOpen
        onClose={vi.fn()}
        initialType={ScheduleRequestType.CheckInIncident}
        schedule={{
          id: 'sch-1',
          workDate: '2026-11-24',
          shiftName: 'Ca Sáng',
          branchId: 'br-1',
          plannedStartTime: '08:00:00',
          plannedEndTime: '12:00:00',
          employeeId: 'emp-1',
          status: 'InProgress',
          checkInTime: '2026-11-24T08:15:00',
          checkInMethod: 'FACE_ID',
        }}
      />
    );

    await waitFor(() => {
      expect(scheduleApprovalApi.getRequestsByScheduleId).toHaveBeenCalledWith('sch-1');
    });

    expect(screen.queryByText('Ca đã được ghi nhận giờ vào')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/Nhập lý do gửi yêu cầu/i), {
      target: { value: 'Máy chấm công nhận trễ giờ vào ca' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/i }));

    await waitFor(() => {
      expect(scheduleApprovalApi.createRequest).toHaveBeenCalledWith(
        'sch-1',
        expect.objectContaining({
          requestType: ScheduleRequestType.CheckInIncident,
          reason: 'Máy chấm công nhận trễ giờ vào ca',
        })
      );
    });
  });

  it('cho phép gửi khiếu nại CheckOutIncident khi ca đã Completed (đã check-in & check-out)', async () => {
    render(
      <CreateScheduleRequestModal
        isOpen
        onClose={vi.fn()}
        initialType={ScheduleRequestType.CheckOutIncident}
        schedule={{
          id: 'sch-2',
          workDate: '2026-11-24',
          shiftName: 'Ca Chiều',
          branchId: 'br-1',
          plannedStartTime: '13:00:00',
          plannedEndTime: '17:00:00',
          employeeId: 'emp-1',
          status: 'Completed',
          checkInTime: '2026-11-24T13:00:00',
          checkOutTime: '2026-11-24T17:00:00',
          checkInMethod: 'FACE_ID',
          checkOutMethod: 'FACE_ID',
        }}
      />
    );

    await waitFor(() => {
      expect(scheduleApprovalApi.getRequestsByScheduleId).toHaveBeenCalledWith('sch-2');
    });

    expect(screen.queryByText('Ca đã được ghi nhận giờ ra')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/Nhập lý do gửi yêu cầu/i), {
      target: { value: 'Khiếu nại giờ ra ca thực tế bị ghi nhận sai' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu/i }));

    await waitFor(() => {
      expect(scheduleApprovalApi.createRequest).toHaveBeenCalledWith(
        'sch-2',
        expect.objectContaining({
          requestType: ScheduleRequestType.CheckOutIncident,
          reason: 'Khiếu nại giờ ra ca thực tế bị ghi nhận sai',
        })
      );
    });
  });
});
