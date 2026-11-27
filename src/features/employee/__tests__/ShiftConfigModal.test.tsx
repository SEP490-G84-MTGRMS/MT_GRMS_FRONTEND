import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShiftConfigModal } from '../components/shift-config/ShiftConfigModal';
import type { ShiftConfigDto } from '../api/shiftConfigApi';
import type { Branch } from '../types';

vi.mock('../api/shiftConfigApi', () => ({
  shiftConfigApi: {
    createShiftConfig: vi.fn().mockResolvedValue({}),
    updateShiftConfig: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/employeeApi', () => ({
  employeeApi: {
    getBranches: vi.fn().mockResolvedValue([]),
  },
}));

const branches: Branch[] = [
  { id: 'br-1', name: 'Chi nhánh Trung tâm' },
  { id: 'br-2', name: 'Chi nhánh Cầu Giấy' },
];

const existingShifts: ShiftConfigDto[] = [
  {
    id: 'shift-1',
    branchId: 'br-1',
    branchIds: ['br-1'],
    shiftCode: 'CA-HC',
    shiftName: 'Ca Hành chính',
    startTime: '08:00:00',
    endTime: '17:00:00',
    durationHours: 9,
    isCheckInNextDay: false,
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'shift-night',
    branchId: 'br-1',
    branchIds: ['br-1'],
    shiftCode: 'CA-DEM',
    shiftName: 'Ca Đêm',
    startTime: '22:00:00',
    endTime: '06:00:00',
    durationHours: 8,
    isCheckInNextDay: true,
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'shift-inactive',
    branchId: 'br-1',
    branchIds: ['br-1'],
    shiftCode: 'CA-CU',
    shiftName: 'Ca Cũ Đã Tắt',
    startTime: '09:00:00',
    endTime: '18:00:00',
    durationHours: 9,
    isCheckInNextDay: false,
    isActive: false,
    createdAt: '2026-11-01T00:00:00Z',
  },
];

const getTimeInputs = (container: HTMLElement) => {
  const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="time"]'));
  return { startInput: inputs[0], endInput: inputs[1] };
};

describe('ShiftConfigModal - Duplicate Time Range Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chặn tạo ca trùng 100% khung giờ (08:00 - 17:00) với ca đang hoạt động cùng chi nhánh', () => {
    const { container } = render(
      <ShiftConfigModal
        isOpen
        onClose={vi.fn()}
        branchId="br-1"
        branches={branches}
        existingShifts={existingShifts}
      />
    );

    const { startInput, endInput } = getTimeInputs(container);
    fireEvent.change(startInput, { target: { value: '08:00' } });
    fireEvent.change(endInput, { target: { value: '17:00' } });
    fireEvent.blur(endInput);

    expect(
      screen.getByText(/Khung giờ 08:00 - 17:00 bị trùng hoàn toàn với ca "Ca Hành chính"/i)
    ).toBeDefined();
  });

  it('cho phép ca giao nhau một phần (08:00 - 12:00) và cho phép trùng giờ với ca đã ngừng hoạt động (09:00 - 18:00)', () => {
    const { container } = render(
      <ShiftConfigModal
        isOpen
        onClose={vi.fn()}
        branchId="br-1"
        branches={branches}
        existingShifts={existingShifts}
      />
    );

    const { startInput, endInput } = getTimeInputs(container);
    fireEvent.change(startInput, { target: { value: '08:00' } });
    fireEvent.change(endInput, { target: { value: '12:00' } });
    fireEvent.blur(endInput);
    expect(screen.queryByText(/bị trùng hoàn toàn/i)).toBeNull();

    fireEvent.change(startInput, { target: { value: '09:00' } });
    fireEvent.change(endInput, { target: { value: '18:00' } });
    fireEvent.blur(endInput);
    expect(screen.queryByText(/bị trùng hoàn toàn/i)).toBeNull();
  });

  it('chặn tạo trùng ca qua đêm (22:00 - 06:00) và chặn ca 0 phút (StartTime == EndTime)', () => {
    const { container } = render(
      <ShiftConfigModal
        isOpen
        onClose={vi.fn()}
        branchId="br-1"
        branches={branches}
        existingShifts={existingShifts}
      />
    );

    const { startInput, endInput } = getTimeInputs(container);
    fireEvent.change(startInput, { target: { value: '22:00' } });
    fireEvent.change(endInput, { target: { value: '06:00' } });
    fireEvent.blur(endInput);
    expect(
      screen.getByText(/Khung giờ 22:00 - 06:00 bị trùng hoàn toàn với ca "Ca Đêm"/i)
    ).toBeDefined();

    fireEvent.change(startInput, { target: { value: '10:00' } });
    fireEvent.change(endInput, { target: { value: '10:00' } });
    fireEvent.blur(endInput);
    expect(
      screen.getByText(/Giờ bắt đầu và giờ kết thúc ca không được trùng nhau/i)
    ).toBeDefined();
  });

  it('chế độ cập nhật: loại trừ chính ca đang sửa nhưng vẫn chặn nếu đổi sang khung giờ trùng ca khác', () => {
    const { container } = render(
      <ShiftConfigModal
        isOpen
        onClose={vi.fn()}
        branchId="br-1"
        branches={branches}
        shiftToEdit={existingShifts[0]}
        existingShifts={existingShifts}
      />
    );

    const { startInput, endInput } = getTimeInputs(container);
    fireEvent.blur(endInput);
    expect(screen.queryByText(/bị trùng hoàn toàn/i)).toBeNull();

    fireEvent.change(startInput, { target: { value: '22:00' } });
    fireEvent.change(endInput, { target: { value: '06:00' } });
    fireEvent.blur(endInput);
    expect(
      screen.getByText(/Khung giờ 22:00 - 06:00 bị trùng hoàn toàn với ca "Ca Đêm"/i)
    ).toBeDefined();
  });
});
