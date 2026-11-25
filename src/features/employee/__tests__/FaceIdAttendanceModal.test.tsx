// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FaceIdAttendanceModal } from '../components/attendance/FaceIdAttendanceModal';
import { scheduleApi } from '../api/scheduleApi';
import { employeeApi } from '../api/employeeApi';

const mockUser = { id: 'u1', fullName: 'Nguyễn Văn A', role: 'STAFF' };
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

vi.mock('../api/employeeApi', () => ({
  employeeApi: {
    getMyProfile: vi.fn(),
  },
}));

vi.mock('../api/scheduleApi', () => ({
  scheduleApi: {
    getTodayStaffDescriptors: vi.fn(),
    getRawMySchedules: vi.fn(),
    checkInFaceId: vi.fn(),
    checkOutFaceId: vi.fn(),
  },
}));

vi.mock('../lib/faceIdService', () => ({
  DISTANCE_THRESHOLD: 0.45,
  loadFaceApiModels: vi.fn().mockResolvedValue(undefined),
  buildLabeledFaceDescriptors: vi.fn().mockReturnValue([{ label: 'emp-1' }]),
  createFaceMatcher: vi.fn().mockReturnValue({}),
  detectAndDrawMatches: vi.fn().mockResolvedValue({
    bestMatch: { isMatched: true, distance: 0.22 },
  }),
  captureCompressedSnapshot: vi.fn().mockReturnValue('base64-snapshot'),
}));

const getTodayIso = () => {
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  return vnNow.toISOString().slice(0, 10);
};

describe('FaceIdAttendanceModal — Multi-shift support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

    vi.mocked(employeeApi.getMyProfile).mockResolvedValue({
      id: 'emp-1',
      employeeCode: 'NV001',
      fullName: 'Nguyễn Văn A',
      faceDescriptor: '[0.1, 0.2]',
    } as any);

    vi.mocked(scheduleApi.getTodayStaffDescriptors).mockResolvedValue([]);
  });

  it('hiển thị dropdown chọn ca khi có từ 2 ca trở lên, auto-select Ca 2 khi Ca 1 đã Completed và disable Ca 1', async () => {
    const today = getTodayIso();
    vi.mocked(scheduleApi.getRawMySchedules).mockResolvedValue([
      {
        id: 'sch-1',
        employeeId: 'emp-1',
        branchId: 'br-1',
        workDate: today,
        shiftName: 'Ca Sáng',
        plannedStartTime: '08:00:00',
        plannedEndTime: '12:00:00',
        status: 'Completed',
        checkInTime: `${today}T08:00:00`,
        checkOutTime: `${today}T12:00:00`,
      },
      {
        id: 'sch-2',
        employeeId: 'emp-1',
        branchId: 'br-1',
        workDate: today,
        shiftName: 'Ca Chiều',
        plannedStartTime: '13:00:00',
        plannedEndTime: '17:00:00',
        status: 'Scheduled',
      },
    ] as any);

    vi.mocked(scheduleApi.checkInFaceId).mockResolvedValue({
      id: 'sch-2',
      status: 'InProgress',
      checkInTime: `${today}T13:00:00`,
    } as any);

    render(
      <MemoryRouter>
        <FaceIdAttendanceModal isOpen onClose={vi.fn()} branchId="br-1" branchName="Chi nhánh 1" />
      </MemoryRouter>
    );

    const select = (await screen.findByLabelText('Chọn ca làm việc')) as HTMLSelectElement;
    expect(select.value).toBe('sch-2');

    const options = Array.from(select.options);
    expect(options).toHaveLength(2);
    expect(options[0].disabled).toBe(true); // Ca 1 Completed bị disable
    expect(options[0].text).toContain('Đã hoàn thành');
    expect(options[1].disabled).toBe(false);
    expect(options[1].text).toContain('Chưa chấm công');

    await waitFor(() => {
      expect(screen.getByText(/Khoảng cách: 0.22/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận vào ca/i }));

    await waitFor(() => {
      expect(scheduleApi.checkInFaceId).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: 'sch-2',
          employeeId: 'emp-1',
        })
      );
    });
  });

  it('ưu tiên auto-select ca đang InProgress để Check-out và truyền đúng scheduleId', async () => {
    const today = getTodayIso();
    vi.mocked(scheduleApi.getRawMySchedules).mockResolvedValue([
      {
        id: 'sch-1',
        employeeId: 'emp-1',
        branchId: 'br-1',
        workDate: today,
        shiftName: 'Ca Sáng',
        plannedStartTime: '08:00:00',
        plannedEndTime: '12:00:00',
        status: 'InProgress',
        checkInTime: `${today}T08:00:00`,
      },
      {
        id: 'sch-2',
        employeeId: 'emp-1',
        branchId: 'br-1',
        workDate: today,
        shiftName: 'Ca Chiều',
        plannedStartTime: '13:00:00',
        plannedEndTime: '17:00:00',
        status: 'Scheduled',
      },
    ] as any);

    vi.mocked(scheduleApi.checkOutFaceId).mockResolvedValue({
      id: 'sch-1',
      status: 'Completed',
      checkOutTime: `${today}T12:00:00`,
    } as any);

    render(
      <MemoryRouter>
        <FaceIdAttendanceModal isOpen onClose={vi.fn()} branchId="br-1" branchName="Chi nhánh 1" />
      </MemoryRouter>
    );

    const select = (await screen.findByLabelText('Chọn ca làm việc')) as HTMLSelectElement;
    expect(select.value).toBe('sch-1');

    await waitFor(() => {
      expect(screen.getByText(/Khoảng cách: 0.22/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận ra ca/i }));

    await waitFor(() => {
      expect(scheduleApi.checkOutFaceId).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleId: 'sch-1',
          employeeId: 'emp-1',
        })
      );
    });
  });
});
