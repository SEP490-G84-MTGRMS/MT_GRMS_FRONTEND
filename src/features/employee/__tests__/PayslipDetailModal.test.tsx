// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PayslipDetailModal } from '../components/payslip-management/PayslipDetailModal';
import { scheduleApi } from '../api/scheduleApi';

vi.mock('../api/scheduleApi', () => ({
  scheduleApi: {
    getRawSchedules: vi.fn(),
    getRawMySchedules: vi.fn(),
  },
}));

describe('PayslipDetailModal — Base salary breakdown modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 2 ca đã chấm công trong cùng 1 ngày + 1 ca khác ngày => 2 ngày chấm công thực tế, dù workedDays quy đổi là 1.5
    vi.mocked(scheduleApi.getRawSchedules).mockResolvedValue([
      {
        id: 's1',
        workDate: '2026-11-05',
        status: 'Completed',
        checkInTime: '2026-11-05T08:00:00',
        actualWorkHours: 4,
      },
      {
        id: 's2',
        workDate: '2026-11-05',
        status: 'InProgress',
        checkInTime: '2026-11-05T13:00:00',
        actualWorkHours: 0,
      },
      {
        id: 's3',
        workDate: '2026-11-06',
        status: 'Completed',
        checkInTime: '2026-11-06T08:00:00',
        actualWorkHours: 8,
      },
      {
        id: 's4',
        workDate: '2026-11-07',
        status: 'Scheduled',
        checkInTime: null,
        actualWorkHours: 0,
      },
    ] as any);
  });

  it('mở modal chi tiết Lương chính, lấy Số ngày chấm công từ các ca đã chấm công và đóng khi bấm Bỏ qua', async () => {
    render(
      <PayslipDetailModal
        isOpen
        onClose={vi.fn()}
        onPayNow={vi.fn()}
        payslip={{
          id: 'ps-1',
          payslipCode: 'PL-202611-0001',
          periodMonth: '2026-11',
          branchId: 'br-1',
          branchName: 'Chi nhánh 1',
          employeeId: 'emp-1',
          employeeCode: 'NV001',
          employeeName: 'Nguyen Minh Tam',
          salaryType: 'MONTHLY',
          baseRate: 10_000_000,
          contractBaseSalary: 10_000_000,
          lunchAllowance: 0,
          travelAllowance: 0,
          standardDays: 30,
          standardDayHours: 8,
          workedDays: 0.5,
          totalWorkHours: 4,
          totalShifts: 1,
          otHours: 0,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          totalLateMinutes: 0,
          totalEarlyLeaveMinutes: 0,
          baseSalaryEarned: 166_667,
          overtimePay: 0,
          bonus: 0,
          violationDeduction: 0,
          allowances: [],
          totalAllowance: 0,
          totalEarnings: 166_667,
          advanceDeduction: 0,
          socialInsurance: 0,
          totalDeductions: 0,
          netSalary: 166_667,
          status: 'UNPAID',
        }}
      />
    );

    await waitFor(() => {
      expect(scheduleApi.getRawSchedules).toHaveBeenCalledTimes(1);
    });

    const baseSalaryBtn = screen.getByRole('button', { name: '166,667' });
    fireEvent.click(baseSalaryBtn);

    expect(screen.getByRole('dialog', { name: 'Chi tiết lương chính' })).toBeTruthy();
    expect(screen.getByText(/Nhân viên: Nguyen Minh Tam/)).toBeTruthy();
    expect(screen.getByText(/Loại lương: Theo ngày công chuẩn/)).toBeTruthy();
    expect(screen.getByText(/Ngày công chuẩn: 30/)).toBeTruthy();
    expect(screen.getByText('333,333')).toBeTruthy();
    // Số ngày chấm công thực tế = 2 ngày (05/11 và 06/11), Số ngày tính lương = 0.5
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('0.5')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(screen.queryByRole('dialog', { name: 'Chi tiết lương chính' })).toBeNull();
  });
});
