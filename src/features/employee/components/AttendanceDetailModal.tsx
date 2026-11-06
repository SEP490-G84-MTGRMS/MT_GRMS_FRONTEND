import React, { useState, useEffect } from 'react';
import {
  Clock,
  Building2,
  Trash2,
  Info,
  X,
  Loader2,
} from 'lucide-react';
import type { AttendanceRecord } from '../types';
import { shiftConfigApi, type ShiftConfigDto } from '../api/shiftConfigApi';
import {
  scheduleApi,
  type ScheduleResponse,
  type UpdateSchedulePayload,
  type ManualAttendancePayload,
} from '../api/scheduleApi';

export interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
  onSaved?: () => void;
}

interface AttendanceDetailModalContentProps {
  record: AttendanceRecord;
  onClose: () => void;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
  onSaved?: () => void;
}

const extractHHmm = (t?: string | null): string => {
  if (!t) return '';
  if (t.includes('T')) {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const parts = t.trim().split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return t.substring(0, 5);
};

const AttendanceDetailModalContent: React.FC<AttendanceDetailModalContentProps> = ({
  record,
  onClose,
  onUpdateStatus,
  onSaved,
}) => {
  // Backend shift configs & schedule states
  const [availableShifts, setAvailableShifts] = useState<ShiftConfigDto[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isLoadingShifts, setIsLoadingShifts] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [, setScheduleDetail] = useState<ScheduleResponse | null>(null);

  // Form states
  const [note, setNote] = useState(record.note || '');
  const [attendanceType, setAttendanceType] = useState<'working' | 'paid_leave' | 'unpaid_leave'>('working');

  // Check-in / Check-out states - Mặc định theo dữ liệu ca làm việc của record
  const [hasCheckIn, setHasCheckIn] = useState<boolean>(true);
  const [checkInTime, setCheckInTime] = useState<string>(
    record.checkInTime || record.plannedStartTime || '08:00'
  );
  const [hasCheckOut, setHasCheckOut] = useState<boolean>(true);
  const [checkOutTime, setCheckOutTime] = useState<string>(
    record.checkOutTime || record.plannedEndTime || '17:00'
  );

  // Sync khi record thay đổi
  useEffect(() => {
    setNote(record.note || '');
    setCheckInTime(record.checkInTime || record.plannedStartTime || '08:00');
    setCheckOutTime(record.checkOutTime || record.plannedEndTime || '17:00');
    setHasCheckIn(!!record.checkInTime || record.status === 'ontime' || record.status === 'late');
    setHasCheckOut(!!record.checkOutTime || record.status === 'ontime' || record.status === 'early');
  }, [record]);

  // 1. Fetch danh sách cấu hình ca thực tế của chi nhánh từ backend ShiftConfigsController
  useEffect(() => {
    let isMounted = true;
    const fetchBranchShifts = async () => {
      setIsLoadingShifts(true);
      try {
        const shiftList = await shiftConfigApi.getShiftConfigsByBranch(record.branchId, true);
        if (!isMounted) return;
        setAvailableShifts(shiftList);

        // Khớp ca hiện tại với danh sách cấu hình ca của chi nhánh
        const matched = shiftList.find(
          (s) =>
            s.id === record.shiftConfigId ||
            s.shiftCode === record.shiftCode ||
            s.shiftName.trim().toLowerCase() === record.shiftName.trim().toLowerCase()
        );

        const currentShift = matched || (shiftList.length > 0 ? shiftList[0] : null);
        if (currentShift) {
          setSelectedShiftId(currentShift.id);
          // Mặc định input Chấm công Vào / Ra dựa trên ca làm việc của dropdown nếu chưa check-in thực tế
          if (!record.checkInTime && currentShift.startTime) {
            setCheckInTime(extractHHmm(currentShift.startTime));
          }
          if (!record.checkOutTime && currentShift.endTime) {
            setCheckOutTime(extractHHmm(currentShift.endTime));
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải cấu hình ca của chi nhánh:', err);
      } finally {
        if (isMounted) setIsLoadingShifts(false);
      }
    };

    fetchBranchShifts();
    return () => {
      isMounted = false;
    };
  }, [record.branchId, record.shiftConfigId, record.shiftCode, record.shiftName, record.checkInTime, record.checkOutTime]);

  // 2. Fetch chi tiết lịch làm việc thực tế từ backend SchedulesController (GET /api/v1/schedules/{id})
  useEffect(() => {
    let isMounted = true;
    const fetchSchedule = async () => {
      if (!record.id) return;
      try {
        const schedule = await scheduleApi.getScheduleById(record.id);
        if (!isMounted) return;
        setScheduleDetail(schedule);

        if (schedule.checkInTime) {
          setCheckInTime(extractHHmm(schedule.checkInTime));
          setHasCheckIn(true);
        } else {
          if (schedule.plannedStartTime) {
            setCheckInTime(extractHHmm(schedule.plannedStartTime));
          }
          setHasCheckIn(!!record.checkInTime || record.status === 'ontime' || record.status === 'late');
        }

        if (schedule.checkOutTime) {
          setCheckOutTime(extractHHmm(schedule.checkOutTime));
          setHasCheckOut(true);
        } else {
          if (schedule.plannedEndTime) {
            setCheckOutTime(extractHHmm(schedule.plannedEndTime));
          }
          setHasCheckOut(!!record.checkOutTime || record.status === 'ontime' || record.status === 'early');
        }

        if (schedule.status === 'Cancelled') {
          setAttendanceType('unpaid_leave');
        }

        if (schedule.approvalReason) {
          setNote(schedule.approvalReason);
        }
      } catch (err) {
        console.warn('Không lấy được chi tiết lịch trực tiếp, sử dụng dữ liệu record:', err);
      }
    };

    fetchSchedule();
    return () => {
      isMounted = false;
    };
  }, [record.id, record.checkInTime, record.checkOutTime, record.status]);

  // Chọn ca làm việc từ dropdown: Tự động cập nhật input Vào / Ra mặc định dựa trên ca vừa chọn
  const handleSelectShift = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    const targetShift = availableShifts.find((s) => s.id === shiftId);
    if (targetShift) {
      if (targetShift.startTime) {
        setCheckInTime(extractHHmm(targetShift.startTime));
      }
      if (targetShift.endTime) {
        setCheckOutTime(extractHHmm(targetShift.endTime));
      }
    }
  };

  // Lưu thay đổi ca làm việc và thực hiện chấm công thủ công
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Cập nhật cấu hình ca nếu người dùng chọn ca khác từ dropdown
      const selectedShiftObj = availableShifts.find((s) => s.id === selectedShiftId);
      if (selectedShiftObj && selectedShiftObj.id !== record.shiftConfigId && record.id) {
        const updatePayload: UpdateSchedulePayload = {
          shiftConfigId: selectedShiftObj.id,
          shiftCode: selectedShiftObj.shiftCode,
          shiftName: selectedShiftObj.shiftName,
          plannedStartTime: selectedShiftObj.startTime
            ? `${selectedShiftObj.startTime.substring(0, 5)}:00`
            : undefined,
          plannedEndTime: selectedShiftObj.endTime
            ? `${selectedShiftObj.endTime.substring(0, 5)}:00`
            : undefined,
          durationHours: selectedShiftObj.durationHours,
        };
        await scheduleApi.updateSchedule(record.id, updatePayload).catch((err) => {
          console.warn('Lỗi gọi updateSchedule backend:', err);
        });
      }

      // 2. Chấm công thủ công theo 3 tiêu chí: Đi làm, Nghỉ phép có lương, Nghỉ phép không lương
      const attendanceTypeMap = {
        working: 1 as const,
        paid_leave: 2 as const,
        unpaid_leave: 3 as const,
      };

      const manualPayload: ManualAttendancePayload = {
        attendanceType: attendanceTypeMap[attendanceType],
        checkInTime:
          attendanceType === 'working' && hasCheckIn && checkInTime
            ? `${checkInTime.substring(0, 5)}:00`
            : null,
        checkOutTime:
          attendanceType === 'working' && hasCheckOut && checkOutTime
            ? `${checkOutTime.substring(0, 5)}:00`
            : null,
        note: note.trim() || null,
      };

      let recordedResult: ScheduleResponse | null = null;
      if (record.id) {
        recordedResult = await scheduleApi.recordManualAttendance(record.id, manualPayload);
      }

      // 3. Cập nhật trạng thái hiển thị của record lên component cha
      if (onUpdateStatus && record.id) {
        if (attendanceType === 'paid_leave' || attendanceType === 'unpaid_leave') {
          onUpdateStatus(record.id, 'absent');
        } else if (recordedResult) {
          if (recordedResult.lateMinutes > 0) {
            onUpdateStatus(record.id, 'late');
          } else if (recordedResult.earlyLeaveMinutes > 0) {
            onUpdateStatus(record.id, 'early');
          } else {
            onUpdateStatus(record.id, 'ontime');
          }
        } else {
          onUpdateStatus(record.id, 'ontime');
        }
      }

      if (onSaved) {
        onSaved();
      }

      alert(`Đã lưu thiết lập chấm công thành công cho nhân viên ${record.employeeName}!`);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu thiết lập chấm công:', err);
      alert(err?.message || 'Có lỗi xảy ra khi lưu thiết lập chấm công.');
    } finally {
      setIsSaving(false);
    }
  };

  // Hủy kết quả chấm công
  const handleResetAttendance = async () => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy kết quả chấm công của ${record.employeeName}?`)) {
      if (record.id) {
        await scheduleApi.updateSchedule(record.id, { status: 'Pending' }).catch(() => {});
      }
      if (onUpdateStatus) {
        onUpdateStatus(record.id, 'not_checked');
      }
      if (onSaved) {
        onSaved();
      }
      onClose();
    }
  };

  // Status Badge Label
  const getStatusDisplay = () => {
    switch (record.status) {
      case 'ontime':
        return <span style={{ color: '#059669', fontWeight: 600 }}>[Đúng giờ]</span>;
      case 'late':
        return (
          <span style={{ color: '#D97706', fontWeight: 600 }}>
            [Đi muộn {record.lateMinutes ? `${record.lateMinutes}p` : ''}]
          </span>
        );
      case 'early':
        return <span style={{ color: '#B45309', fontWeight: 600 }}>[Về sớm]</span>;
      case 'absent':
        return <span style={{ color: '#DC2626', fontWeight: 600 }}>[Vắng mặt]</span>;
      default:
        return <span style={{ color: '#D97706', fontWeight: 600 }}>[Chưa chấm công]</span>;
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card">
        {/* Header Modal */}
        <div className="emp-modal-header" style={{ background: '#F8FAFC', padding: '16px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
              Chấm công
            </h3>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span><b>{record.employeeName}</b></span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span>{record.employeeCode}</span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0F766E', fontWeight: 600 }}>
                <Building2 size={13} />
                {record.branchName || record.gpsLocation || 'Chi nhánh'}
              </span>
              <span style={{ color: '#CBD5E1' }}>|</span>
              {getStatusDisplay()}
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Thông tin chung: Thời gian, Chi nhánh, Ca làm việc, Ghi chú */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              paddingBottom: 16,
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Thời gian</span>
              <span style={{ fontSize: 13, color: '#334155' }}>
                Thứ {record.dayOfWeek ? record.dayOfWeek.replace('T', '') : '2'}, {record.dateStr}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Chi nhánh</span>
              <span style={{ fontSize: 13, color: '#0F766E', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={15} />
                {record.branchName || record.gpsLocation || 'Chi nhánh mặc định'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Ca làm việc</span>
              <select
                className="emp-form-select"
                style={{ height: 36, maxWidth: 380, fontSize: 13 }}
                value={selectedShiftId}
                onChange={(e) => handleSelectShift(e.target.value)}
                disabled={isLoadingShifts}
              >
                {isLoadingShifts ? (
                  <option value="">Đang tải ca làm việc từ chi nhánh...</option>
                ) : availableShifts.length === 0 ? (
                  <option value="">{record.shiftName || 'Không có ca mẫu cấu hình'}</option>
                ) : (
                  availableShifts.map((sc) => {
                    const timeStr = `${sc.startTime ? sc.startTime.substring(0, 5) : ''} - ${sc.endTime ? sc.endTime.substring(0, 5) : ''}`;
                    return (
                      <option key={sc.id} value={sc.id}>
                        {sc.shiftName} ({timeStr}){sc.durationHours ? ` • ${sc.durationHours}h` : ''}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', paddingTop: 8 }}>Ghi chú</span>
              <div style={{ maxWidth: 380, width: '100%' }}>
                <textarea
                  className="emp-form-textarea"
                  rows={3}
                  placeholder="Nhập ghi chú hoặc lý do điều chỉnh công (nếu có)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    fontSize: 13,
                    minHeight: 68,
                    maxHeight: 120,
                    lineHeight: 1.5,
                    resize: 'vertical',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0F766E';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15, 118, 110, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          </div>

          {/* THIẾT LẬP CHẤM CÔNG */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '16px 20px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>
              Thiết lập chấm công
            </div>

            {/* Radio Group: Đi làm, Nghỉ phép hưởng lương, Nghỉ không lương */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="attType"
                  checked={attendanceType === 'working'}
                  onChange={() => setAttendanceType('working')}
                  style={{ accentColor: '#0F766E' }}
                />
                <span>Đi làm</span>
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="attType"
                  checked={attendanceType === 'paid_leave'}
                  onChange={() => setAttendanceType('paid_leave')}
                  style={{ accentColor: '#0F766E' }}
                />
                <span>Nghỉ phép hưởng lương</span>
                <Info size={13} color="#94A3B8" />
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="attType"
                  checked={attendanceType === 'unpaid_leave'}
                  onChange={() => setAttendanceType('unpaid_leave')}
                  style={{ accentColor: '#0F766E' }}
                />
                <span>Nghỉ không lương</span>
                <Info size={13} color="#94A3B8" />
              </label>
            </div>

            {/* Thiết lập giờ Vào / Ra */}
            {attendanceType === 'working' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 80, fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasCheckIn}
                      onChange={(e) => setHasCheckIn(e.target.checked)}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>Vào</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="time"
                      className="emp-form-input"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      disabled={!hasCheckIn}
                      style={{ width: 130, height: 34, fontSize: 13 }}
                    />
                    <Clock size={15} color="#64748B" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: 80, fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasCheckOut}
                      onChange={(e) => setHasCheckOut(e.target.checked)}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>Ra</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="time"
                      className="emp-form-input"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      disabled={!hasCheckOut}
                      style={{ width: 130, height: 34, fontSize: 13 }}
                    />
                    <Clock size={15} color="#64748B" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal chuẩn Design System */}
        <div
          className="emp-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            background: '#F8FAFC',
          }}
        >
          {/* Nút bên trái: Hủy kết quả */}
          <div>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: '#DC2626',
                borderColor: '#FECACA',
                background: '#FEF2F2',
              }}
              onClick={handleResetAttendance}
              disabled={isSaving}
            >
              <Trash2 size={14} />
              <span>Hủy</span>
            </button>
          </div>

          {/* Nút bên phải: Bỏ qua & Lưu */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={isSaving}
              style={{ fontSize: 13, minWidth: 90 }}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{ fontSize: 13, minWidth: 90, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {isSaving && <Loader2 size={14} className="emp-spin" />}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  onUpdateStatus,
  onSaved,
}) => {
  if (!isOpen || !record) return null;

  return (
    <AttendanceDetailModalContent
      record={record}
      onClose={onClose}
      onUpdateStatus={onUpdateStatus}
      onSaved={onSaved}
    />
  );
};

export default AttendanceDetailModal;
