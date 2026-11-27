import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddScheduleModal } from '../components/work-schedule/AddScheduleModal';
import { scheduleApi } from '../api/scheduleApi';
import type { Employee, Branch, WorkShiftDefinition, ScheduleAssignment } from '../types';

vi.mock('../api/shiftConfigApi', () => ({
  shiftConfigApi: {
    getShiftConfigs: vi.fn().mockResolvedValue([]),
    getShiftConfigsPaged: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

vi.mock('../api/scheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/scheduleApi')>();
  return {
    ...actual,
    scheduleApi: {
      ...actual.scheduleApi,
      getSchedules: vi.fn().mockResolvedValue([]),
      getRecurringSeries: vi.fn().mockResolvedValue({
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftConfigId: 'shift-1',
        shiftName: 'Ca Sáng',
        plannedStartTime: '08:00:00',
        plannedEndTime: '12:00:00',
        isRepeating: false,
        repeatDays: [],
        startDate: null,
        endDate: null,
        schedules: [],
      }),
      syncRecurringSchedule: vi.fn().mockResolvedValue({
        updatedCount: 1,
        createdCount: 2,
        deletedCount: 0,
        skippedCount: 0,
        schedules: [],
      }),
      createRecurringSchedule: vi.fn().mockResolvedValue([]),
      batchCreateSchedules: vi.fn().mockResolvedValue([]),
    },
  };
});

const branches: Branch[] = [{ id: 'br-1', name: 'Chi nhánh Trung tâm' }];

const employees: Employee[] = [
  {
    id: 'emp-1',
    employeeCode: 'NV01',
    fullName: 'Nguyễn Văn A',
    branchId: 'br-1',
    branchName: 'Chi nhánh Trung tâm',
    workingBranchIds: ['br-1'],
    workingBranchNames: ['Chi nhánh Trung tâm'],
    status: 'Active',
  } as unknown as Employee,
];

const shifts: WorkShiftDefinition[] = [
  {
    id: 'shift-1',
    code: 'CA-SANG',
    name: 'Ca Sáng',
    startTime: '08:00',
    endTime: '12:00',
    totalHours: 4,
    checkInAllowance: '0',
    status: 'active',
    color: '#F59E0B',
  },
];

const editingAssignment: ScheduleAssignment = {
  id: 'sched-1',
  employeeId: 'emp-1',
  employeeName: 'Nguyễn Văn A',
  employeeCode: 'NV01',
  shiftId: 'shift-1',
  shiftName: 'Ca Sáng',
  shiftTime: '08:00 - 12:00',
  shiftColor: '#F59E0B',
  dayOfWeek: 'T2',
  dateStr: '23/11',
  workDate: '2026-11-23',
  branchId: 'br-1',
  branchName: 'Chi nhánh Trung tâm',
  status: 'Scheduled',
};

describe('AddScheduleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps modal open and shows error when onUpdate rejects', async () => {
    const onClose = vi.fn();
    const onUpdate = vi.fn().mockRejectedValue(new Error('Trùng khung giờ với ca khác'));

    render(
      <AddScheduleModal
        isOpen={true}
        onClose={onClose}
        employees={employees}
        shifts={shifts}
        branches={branches}
        editingAssignment={editingAssignment}
        onUpdate={onUpdate}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Cập nhật' });
    fireEvent.click(submitBtn);

    const errEl = await screen.findByText(/Trùng khung giờ với ca khác/i);
    expect(errEl).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('loads and highlights recurring repeat days when toggling "Lặp lại hàng tuần" and syncs on save', async () => {
    vi.mocked(scheduleApi.getRecurringSeries)
      .mockResolvedValueOnce({
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftConfigId: 'shift-1',
        shiftName: 'Ca Sáng',
        plannedStartTime: '08:00:00',
        plannedEndTime: '12:00:00',
        isRepeating: false,
        repeatDays: ['T2'],
        startDate: '2026-11-23',
        endDate: '2026-11-23',
        schedules: [{ id: 'sched-1' } as any],
      })
      .mockResolvedValueOnce({
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftConfigId: 'shift-1',
        shiftName: 'Ca Sáng',
        plannedStartTime: '08:00:00',
        plannedEndTime: '12:00:00',
        isRepeating: true,
        repeatDays: ['T2', 'T4', 'T6'],
        startDate: '2026-11-23',
        endDate: '2026-12-30',
        schedules: [{ id: 'sched-1' } as any, { id: 'sched-2' } as any, { id: 'sched-3' } as any],
      });

    const onClose = vi.fn();
    const onSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <AddScheduleModal
        isOpen={true}
        onClose={onClose}
        employees={employees}
        shifts={shifts}
        branches={branches}
        editingAssignment={editingAssignment}
        onSuccess={onSuccess}
      />
    );

    await waitFor(() => {
      expect(scheduleApi.getRecurringSeries).toHaveBeenCalledTimes(1);
    });

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    const summary = await screen.findByTestId('recurring-series-summary');
    expect(summary.textContent).toContain('Đang lặp 3 ca');
    expect(summary.textContent).toContain('T2, T4, T6');

    const submitBtn = screen.getByRole('button', { name: 'Cập nhật' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.syncRecurringSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          branchId: 'br-1',
          repeatDays: ['T2', 'T4', 'T6'],
          sourceScheduleId: 'sched-1',
        })
      );
    });
    expect(onSuccess).toHaveBeenCalledWith('update');
    expect(onClose).toHaveBeenCalled();
  });

  it('defaults "Lặp lại hàng tuần" to disabled in create mode and anchors startDate to selected day for future repeats', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const weekDays = [
      { key: 'T2' as const, label: 'Thứ 2', date: '23', dateStr: '23/11', dateIso: '2026-11-23' },
      { key: 'T3' as const, label: 'Thứ 3', date: '24', dateStr: '24/11', dateIso: '2026-11-24' },
      { key: 'T4' as const, label: 'Thứ 4', date: '25', dateStr: '25/11', dateIso: '2026-11-25' },
      { key: 'T5' as const, label: 'Thứ 5', date: '26', dateStr: '26/11', dateIso: '2026-11-26' },
      { key: 'T6' as const, label: 'Thứ 6', date: '27', dateStr: '27/11', dateIso: '2026-11-27' },
      { key: 'T7' as const, label: 'Thứ 7', date: '28', dateStr: '28/11', dateIso: '2026-11-28' },
      { key: 'CN' as const, label: 'CN', date: '29', dateStr: '29/11', dateIso: '2026-11-29' },
    ];
    // Đã có ca Sáng vào Thứ 2 (2026-11-23 < startDate 2026-11-25) -> không được chặn khi tạo lặp từ Thứ 4
    const weekAssignments: ScheduleAssignment[] = [
      {
        ...editingAssignment,
        id: 'past-mon-sched',
        dayOfWeek: 'T2',
        dateStr: '23/11',
        workDate: '2026-11-23',
      },
    ];

    render(
      <AddScheduleModal
        isOpen={true}
        onClose={onClose}
        employees={employees}
        shifts={shifts}
        branches={branches}
        defaultEmployeeId="emp-1"
        defaultDayOfWeek="T4"
        weekDays={weekDays}
        weekAssignments={weekAssignments}
        onSuccess={onSuccess}
      />
    );

    const toggle = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    // Bật Lặp lại hàng tuần và chọn thêm Thứ 2 (ngày trước T4) + Thứ 6 (ngày sau T4)
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Thứ 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thứ 6' }));

    const submitBtn = screen.getByRole('button', { name: 'Lưu' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.createRecurringSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp-1',
          startDate: '2026-11-25',
          repeatDays: ['T4', 'T2', 'T6'],
        })
      );
    });
    expect(onClose).toHaveBeenCalled();
  });
});
