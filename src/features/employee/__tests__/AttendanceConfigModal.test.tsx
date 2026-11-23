// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AttendanceConfigModal } from '../components/shift-config/AttendanceConfigModal';
import { attendancePolicyApi } from '../api/attendancePolicyApi';

vi.mock('../api/attendancePolicyApi', () => ({
  attendancePolicyApi: {
    getByBranch: vi.fn(),
    upsertPolicy: vi.fn(),
    copyPolicy: vi.fn(),
  },
}));

const defaultRules = [
  {
    id: 'rule-1',
    type: 'range',
    fromHours: 1,
    fromMinutes: 0,
    toHours: 4,
    toMinutes: 30,
    workUnits: 0.5,
    workUnitsLabel: 'nửa công',
  },
  {
    id: 'rule-2',
    type: 'gte',
    fromHours: 4,
    fromMinutes: 30,
    workUnits: 1,
    workUnitsLabel: '1 công',
  },
];

describe('AttendanceConfigModal — Tiered Workday Conversion Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attendancePolicyApi.getByBranch).mockResolvedValue({
      id: 'pol-1',
      branchId: 'br-1',
      branchName: 'Chi nhánh 1',
      standardDayHours: 8,
      isConvertHoursToDays: true,
      conversionRulesJson: JSON.stringify(defaultRules),
      enableLateThreshold: true,
      lateThresholdMinutes: 0,
      enableEarlyLeaveThreshold: true,
      earlyLeaveThresholdMinutes: 0,
      isCustomized: false,
    });
    vi.mocked(attendancePolicyApi.upsertPolicy).mockResolvedValue({
      id: 'pol-1',
      branchId: 'br-1',
      standardDayHours: 8,
      isConvertHoursToDays: true,
      conversionRulesJson: JSON.stringify(defaultRules),
      enableLateThreshold: true,
      lateThresholdMinutes: 0,
      enableEarlyLeaveThreshold: true,
      earlyLeaveThresholdMinutes: 0,
      isCustomized: true,
    });
  });

  it('cố định tối thiểu 2 mức cơ bản không có nút xóa; thêm Mức 3, 4 tự động đổi mức trước sang "đến dưới" và sinh mức mới "trở lên" có nút xóa', async () => {
    render(
      <AttendanceConfigModal
        isOpen
        onClose={vi.fn()}
        branches={[{ id: 'br-1', name: 'Chi nhánh 1' } as any]}
        initialBranchId="br-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mức 1:')).toBeTruthy();
      expect(screen.getByText('Mức 2:')).toBeTruthy();
    });

    // Ban đầu chỉ có 2 mức: 1 "đến dưới", 1 "trở lên", và KHÔNG có nút xóa nào
    expect(screen.getAllByText('đến dưới')).toHaveLength(1);
    expect(screen.getAllByText('trở lên')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Xóa Mức/i })).toBeNull();

    // Bấm "+ Thêm mức quy đổi" -> sinh Mức 3 (1.5 công), Mức 2 chuyển thành "đến dưới"
    fireEvent.click(screen.getByRole('button', { name: /Thêm mức quy đổi/i }));

    expect(screen.getByText('Mức 3:')).toBeTruthy();
    expect(screen.getAllByText('đến dưới')).toHaveLength(2);
    expect(screen.getAllByText('trở lên')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Xóa Mức 3' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Xóa Mức 1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xóa Mức 2' })).toBeNull();

    // Bấm "+ Thêm mức quy đổi" lần nữa -> sinh Mức 4 (2 công), Mức 3 chuyển thành "đến dưới"
    fireEvent.click(screen.getByRole('button', { name: /Thêm mức quy đổi/i }));

    expect(screen.getByText('Mức 4:')).toBeTruthy();
    expect(screen.getAllByText('đến dưới')).toHaveLength(3);
    expect(screen.getAllByText('trở lên')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Xóa Mức 3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Xóa Mức 4' })).toBeTruthy();

    // Lưu cấu hình -> kiểm tra payload JSON gửi lên backend đúng cấu trúc bậc thang
    fireEvent.click(screen.getByRole('button', { name: /Lưu cài đặt/i }));

    await waitFor(() => {
      expect(attendancePolicyApi.upsertPolicy).toHaveBeenCalledTimes(1);
    });
    const savedPayload = vi.mocked(attendancePolicyApi.upsertPolicy).mock.calls[0][1];
    const savedRules = JSON.parse(savedPayload.conversionRulesJson!);
    expect(savedRules).toHaveLength(4);
    expect(savedRules.map((r: any) => r.type)).toEqual(['range', 'range', 'range', 'gte']);
    expect(savedRules.map((r: any) => r.workUnits)).toEqual([0.5, 1, 1.5, 2]);
    expect(savedRules[1].toHours).toBe(8);
    expect(savedRules[2].fromHours).toBe(8);
    expect(savedRules[2].toHours).toBe(12);
    expect(savedRules[3].fromHours).toBe(12);

    // Xóa Mức 4 -> Mức 3 tự động trở lại "trở lên"; xóa Mức 3 -> Mức 2 trở lại "trở lên"
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Mức 4' }));
    expect(screen.queryByText('Mức 4:')).toBeNull();
    expect(screen.getAllByText('đến dưới')).toHaveLength(2);
    expect(screen.getAllByText('trở lên')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Xóa Mức 3' }));
    expect(screen.queryByText('Mức 3:')).toBeNull();
    expect(screen.getAllByText('đến dưới')).toHaveLength(1);
    expect(screen.getAllByText('trở lên')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Xóa Mức/i })).toBeNull();
  });
});
