import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  CalendarOff,
  Paperclip,
  Plus,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  ScheduleRequestType,
  ShiftSwapType,
  LeaveType,
  ScheduleRequestTypeLabels,
  LeaveTypeLabels,
  type CreateScheduleApprovalRequestDto,
} from '../types/scheduleApprovalTypes';
import { scheduleApprovalApi } from '../api/scheduleApprovalApi';
import { employeeApi } from '../api/employeeApi';
import { scheduleApi } from '../api/scheduleApi';
import { uploadImageToCloudinary } from '../../../utils/cloudinary';
import type { Employee } from '../types';

export interface ScheduleSelectionItem {
  id: string;
  workDate: string;
  shiftName: string;
  branchId: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  employeeId: string;
}

export interface CreateScheduleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: ScheduleSelectionItem | null;
  initialType?: ScheduleRequestType;
  onSuccess?: () => void;
}

const formatDateVn = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const raw = dateStr.slice(0, 10);
    const [y, m, d] = raw.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dayNames[dateObj.getDay()]}, ${pad(d)}/${pad(m)}/${y}`;
  } catch {
    return dateStr;
  }
};

const safeFormatTime = (timeStr?: string | null, fallback = '00:00') => {
  if (!timeStr) return fallback;
  return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
};

export const CreateScheduleRequestModal: React.FC<CreateScheduleRequestModalProps> = ({
  isOpen,
  onClose,
  schedule = null,
  initialType = ScheduleRequestType.LeaveRequest,
  onSuccess,
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSelectionItem | null>(schedule);
  const [mySchedules, setMySchedules] = useState<ScheduleSelectionItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);

  const [requestType, setRequestType] = useState<ScheduleRequestType>(initialType);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.SickLeave);
  const [isPaidLeaveRequested, setIsPaidLeaveRequested] = useState<boolean>(false);
  const [swapType, setSwapType] = useState<ShiftSwapType>(ShiftSwapType.Cover);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>('08:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('17:00');
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(60);
  const [reason, setReason] = useState<string>('');

  // Tệp đính kèm nhiều ảnh (Cloudinary)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceImageUrls, setEvidenceImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [loadingColleagues, setLoadingColleagues] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Khởi tạo form khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setRequestType(initialType);
    setLeaveType(LeaveType.SickLeave);
    setIsPaidLeaveRequested(false);
    setSwapType(ShiftSwapType.Cover);
    setTargetEmployeeId('');
    setOvertimeMinutes(60);
    setReason('');
    setEvidenceImageUrls([]);
    setUploadingImage(false);
    setUploadError(null);
    setErrorMessage(null);

    if (schedule) {
      setSelectedSchedule(schedule);
      setCheckInTime(safeFormatTime(schedule.plannedStartTime, '08:00'));
      setCheckOutTime(safeFormatTime(schedule.plannedEndTime, '17:00'));
    } else {
      // Mở từ thanh điều hướng (chưa chọn ca) -> tải danh sách ca của nhân viên
      setLoadingSchedules(true);
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().slice(0, 10);
      const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).toISOString().slice(0, 10);

      scheduleApi
        .getRawMySchedules(fromDate, toDate)
        .then((res) => {
          const list: ScheduleSelectionItem[] = (res || []).map((s) => ({
            id: s.id,
            workDate: s.workDate ? s.workDate.slice(0, 10) : '',
            shiftName: s.shiftName || s.shiftCode || 'Ca làm việc',
            branchId: s.branchId,
            plannedStartTime: s.plannedStartTime || '08:00',
            plannedEndTime: s.plannedEndTime || '17:00',
            employeeId: s.employeeId,
          }));
          setMySchedules(list);
          if (list.length > 0) {
            setSelectedSchedule(list[0]);
            setCheckInTime(safeFormatTime(list[0].plannedStartTime, '08:00'));
            setCheckOutTime(safeFormatTime(list[0].plannedEndTime, '17:00'));
          } else {
            setSelectedSchedule(null);
          }
        })
        .catch(() => {
          setMySchedules([]);
          setSelectedSchedule(null);
        })
        .finally(() => setLoadingSchedules(false));
    }
  }, [isOpen, initialType, schedule]);

  // Tải đồng nghiệp cùng chi nhánh
  useEffect(() => {
    if (selectedSchedule?.branchId) {
      setLoadingColleagues(true);
      employeeApi
        .getEmployeesPaged({ branchId: selectedSchedule.branchId, status: 'active', pageSize: 100 })
        .then((res) => {
          const list = (res.items || []).filter((e) => e.id !== selectedSchedule.employeeId);
          setColleagues(list);
          if (list.length > 0 && !targetEmployeeId) {
            setTargetEmployeeId(list[0].id);
          }
        })
        .catch(() => {
          setColleagues([]);
        })
        .finally(() => setLoadingColleagues(false));
    }
  }, [selectedSchedule]);

  if (!isOpen) return null;

  const handleSelectScheduleChange = (scheduleId: string) => {
    const found = mySchedules.find((s) => s.id === scheduleId);
    if (found) {
      setSelectedSchedule(found);
      setCheckInTime(safeFormatTime(found.plannedStartTime, '08:00'));
      setCheckOutTime(safeFormatTime(found.plannedEndTime, '17:00'));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    e.target.value = '';

    if (evidenceImageUrls.length + files.length > 8) {
      setUploadError('Tối đa chỉ được đính kèm 8 ảnh.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận tệp ảnh (.jpg, .jpeg, .png, .webp).`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`Tệp "${file.name}" vượt quá dung lượng 5MB.`);
        return;
      }
    }

    try {
      setUploadingImage(true);
      setUploadError(null);

      // Thử gọi API upload danh sách ảnh lên backend / Cloudinary
      let uploadedUrls: string[] = [];
      try {
        uploadedUrls = await scheduleApprovalApi.uploadEvidenceImages(files);
      } catch {
        // Fallback: upload tuần tự / song song qua client utility
        uploadedUrls = await Promise.all(
          files.map((f) => uploadImageToCloudinary(f, 'mtgrms/schedule-requests'))
        );
      }

      setEvidenceImageUrls((prev) => [...prev, ...uploadedUrls]);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Không thể tải ảnh lên máy chủ.';
      setUploadError(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEvidenceImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) {
      setErrorMessage('Vui lòng chọn ca làm việc.');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do gửi yêu cầu.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload: CreateScheduleApprovalRequestDto = {
        requestType,
        reason: reason.trim(),
        evidenceImageUrl: evidenceImageUrls.length > 0 ? evidenceImageUrls[0] : null,
        evidenceImageUrls: evidenceImageUrls.length > 0 ? evidenceImageUrls : null,
      };

      if (requestType === ScheduleRequestType.LeaveRequest) {
        payload.leaveType = leaveType;
        payload.isPaidLeaveRequested = isPaidLeaveRequested;
      } else if (requestType === ScheduleRequestType.ShiftSwap) {
        if (!targetEmployeeId) {
          setErrorMessage('Vui lòng chọn đồng nghiệp muốn đổi ca.');
          setSubmitting(false);
          return;
        }
        payload.swapType = swapType;
        payload.targetEmployeeId = targetEmployeeId;
      } else if (requestType === ScheduleRequestType.CheckInIncident) {
        const datePrefix = (selectedSchedule.workDate || '').slice(0, 10);
        payload.requestedCheckInTime = `${datePrefix}T${checkInTime}:00`;
      } else if (requestType === ScheduleRequestType.CheckOutIncident) {
        const datePrefix = (selectedSchedule.workDate || '').slice(0, 10);
        payload.requestedCheckOutTime = `${datePrefix}T${checkOutTime}:00`;
      } else if (requestType === ScheduleRequestType.Overtime) {
        payload.requestedOvertimeMinutes = overtimeMinutes;
      }

      await scheduleApprovalApi.createRequest(selectedSchedule.id, payload);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gửi yêu cầu thất bại. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const requestOptions = [
    {
      type: ScheduleRequestType.CheckInIncident,
      icon: LogIn,
      title: ScheduleRequestTypeLabels[ScheduleRequestType.CheckInIncident],
      desc: 'Lỗi FaceID đầu ca / Mở ca bán hàng ngay',
    },
    {
      type: ScheduleRequestType.CheckOutIncident,
      icon: LogOut,
      title: ScheduleRequestTypeLabels[ScheduleRequestType.CheckOutIncident],
      desc: 'Lỗi FaceID cuối ca / Quên chấm công về',
    },
    {
      type: ScheduleRequestType.LeaveRequest,
      icon: CalendarOff,
      title: ScheduleRequestTypeLabels[ScheduleRequestType.LeaveRequest],
      desc: 'Nghỉ ốm, việc riêng, phép năm',
    },
    {
      type: ScheduleRequestType.ShiftSwap,
      icon: ArrowRightLeft,
      title: ScheduleRequestTypeLabels[ScheduleRequestType.ShiftSwap],
      desc: 'Nhờ làm thay hoặc đổi ca',
    },
    {
      type: ScheduleRequestType.Overtime,
      icon: Clock,
      title: ScheduleRequestTypeLabels[ScheduleRequestType.Overtime],
      desc: 'Đăng ký làm thêm ngoài giờ (OT)',
    },
  ];

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="emp-modal-box"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="emp-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            background: '#FFFFFF',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
            Tạo phiếu yêu cầu ca làm việc
          </h3>
          <button
            type="button"
            className="emp-modal-close-btn"
            onClick={onClose}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div
            className="emp-modal-body"
            style={{
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflowY: 'auto',
              flex: '1 1 auto',
            }}
          >
            {/* Thông báo lỗi */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 8,
                  color: '#DC2626',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Thông tin ca làm việc */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Ca làm việc áp dụng <span style={{ color: '#EF4444' }}>*</span>
              </label>

              {schedule ? (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13,
                    color: '#1E293B',
                  }}
                >
                  <Calendar size={16} color="#0F766E" />
                  <span>
                    <b>{schedule.shiftName}</b> ({safeFormatTime(schedule.plannedStartTime)} - {safeFormatTime(schedule.plannedEndTime)}) • {formatDateVn(schedule.workDate)}
                  </span>
                </div>
              ) : (
                <div>
                  {loadingSchedules ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        background: '#F8FAFC',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <Loader2 size={15} className="emp-spin-icon" />
                      <span>Đang tải danh sách ca làm việc...</span>
                    </div>
                  ) : mySchedules.length === 0 ? (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#DC2626',
                        background: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        padding: '10px 14px',
                        borderRadius: 8,
                      }}
                    >
                      Không có ca làm việc nào trong 3 tuần gần đây để gửi đơn.
                    </div>
                  ) : (
                    <select
                      className="emp-form-select"
                      value={selectedSchedule?.id || ''}
                      onChange={(e) => handleSelectScheduleChange(e.target.value)}
                      style={{ width: '100%', height: 40, fontSize: 13, background: '#FFFFFF' }}
                      required
                    >
                      {mySchedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shiftName} ({safeFormatTime(s.plannedStartTime)} - {safeFormatTime(s.plannedEndTime)}) • {formatDateVn(s.workDate)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            {/* Chọn loại phiếu yêu cầu */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Loại phiếu yêu cầu <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                }}
              >
                {requestOptions.map((opt) => {
                  const isSelected = requestType === opt.type;
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => setRequestType(opt.type)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: isSelected ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                        background: isSelected ? '#F0FDFA' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <Icon
                        size={18}
                        color={isSelected ? '#0F766E' : '#64748B'}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            fontSize: 13,
                            color: isSelected ? '#0F766E' : '#1E293B',
                          }}
                        >
                          {opt.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: isSelected ? '#0F766E' : '#64748B',
                            marginTop: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form riêng theo từng loại yêu cầu */}

            {/* 1. NGHỈ PHÉP */}
            {requestType === ScheduleRequestType.LeaveRequest && (
              <div
                style={{
                  padding: 12,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Hình thức nghỉ
                  </label>
                  <select
                    className="emp-form-select"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    style={{ width: '100%', height: 38, fontSize: 13, background: '#FFFFFF' }}
                  >
                    {Object.entries(LeaveTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPaidLeaveRequested}
                    onChange={(e) => setIsPaidLeaveRequested(e.target.checked)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: '#0F766E',
                      cursor: 'pointer',
                    }}
                  />
                  <span>Đề xuất tính hưởng lương (nếu còn ngày phép năm)</span>
                </label>
              </div>
            )}

            {/* 2. ĐỔI CA */}
            {requestType === ScheduleRequestType.ShiftSwap && (
              <div
                style={{
                  padding: 12,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Hình thức đổi ca
                  </label>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="swapType"
                        value={ShiftSwapType.Cover}
                        checked={swapType === ShiftSwapType.Cover}
                        onChange={() => setSwapType(ShiftSwapType.Cover)}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <span>Nhờ làm thay</span>
                    </label>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="swapType"
                        value={ShiftSwapType.CrossSwap}
                        checked={swapType === ShiftSwapType.CrossSwap}
                        onChange={() => setSwapType(ShiftSwapType.CrossSwap)}
                        style={{ accentColor: '#0F766E' }}
                      />
                      <span>Đổi chéo ca</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    Chọn đồng nghiệp <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  {loadingColleagues ? (
                    <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Loader2 size={13} className="emp-spin-icon" />
                      <span>Đang tải danh sách nhân viên...</span>
                    </div>
                  ) : colleagues.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#B45309' }}>
                      Chưa tìm thấy đồng nghiệp trong cùng chi nhánh.
                    </div>
                  ) : (
                    <select
                      className="emp-form-select"
                      value={targetEmployeeId}
                      onChange={(e) => setTargetEmployeeId(e.target.value)}
                      style={{ width: '100%', height: 38, fontSize: 13, background: '#FFFFFF' }}
                      required
                    >
                      <option value="">-- Chọn đồng nghiệp --</option>
                      {colleagues.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.employeeCode})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* 3. SỰ CỐ CHECK-IN (VÀO CA) */}
            {requestType === ScheduleRequestType.CheckInIncident && (
              <div
                style={{
                  padding: 12,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Giờ vào ca thực tế đề xuất
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSchedule?.plannedStartTime) {
                        setCheckInTime(safeFormatTime(selectedSchedule.plannedStartTime, '08:00'));
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0F766E',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Theo giờ ca chuẩn
                  </button>
                </div>

                <div>
                  <input
                    type="time"
                    className="emp-form-input"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    style={{ width: '100%', height: 38, fontSize: 13, background: '#FFFFFF' }}
                    required
                  />
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    background: '#ECFDF5',
                    borderRadius: 6,
                    border: '1px solid #A7F3D0',
                    fontSize: 12,
                    color: '#065F46',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>💡</span>
                  <span>
                    <strong>Mở ca ngay:</strong> Gửi đơn báo sự cố Check-in thành công sẽ tự động kích hoạt giờ vào ca để bạn có thể mở ca bán hàng POS ngay lập tức. Chủ cửa hàng sẽ đối soát ảnh minh chứng sau.
                  </span>
                </div>
              </div>
            )}

            {/* 4. SỰ CỐ CHECK-OUT (RA CA) */}
            {requestType === ScheduleRequestType.CheckOutIncident && (
              <div
                style={{
                  padding: 12,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Giờ ra ca thực tế đề xuất
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSchedule?.plannedEndTime) {
                        setCheckOutTime(safeFormatTime(selectedSchedule.plannedEndTime, '17:00'));
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0F766E',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Theo giờ ca chuẩn
                  </button>
                </div>

                <div>
                  <input
                    type="time"
                    className="emp-form-input"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    style={{ width: '100%', height: 38, fontSize: 13, background: '#FFFFFF' }}
                    required
                  />
                </div>

                <div
                  style={{
                    padding: '8px 10px',
                    background: '#EFF6FF',
                    borderRadius: 6,
                    border: '1px solid #BFDBFE',
                    fontSize: 12,
                    color: '#1E40AF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>ℹ️</span>
                  <span>
                    <strong>Báo sự cố Check-out:</strong> Áp dụng khi bạn đã đóng ca POS Z-Report nhưng không thể quét FaceID ra về hoặc quên chấm công ra. Đơn sẽ được gửi cho Chủ duyệt để chốt giờ làm thực tế.
                  </span>
                </div>
              </div>
            )}

            {/* 4. LÀM THÊM GIỜ (OT) */}
            {requestType === ScheduleRequestType.Overtime && (
              <div
                style={{
                  padding: 12,
                  background: '#F8FAFC',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Số phút tăng ca đề xuất
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0F766E' }}>
                    {(overtimeMinutes / 60).toFixed(1)} giờ
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    className="emp-form-input"
                    value={overtimeMinutes}
                    onChange={(e) => setOvertimeMinutes(parseInt(e.target.value, 10) || 0)}
                    style={{ width: 110, height: 38, fontSize: 13, background: '#FFFFFF' }}
                    required
                  />
                  <span style={{ fontSize: 13, color: '#64748B' }}>phút</span>

                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    {[30, 60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setOvertimeMinutes(mins)}
                        style={{
                          border: overtimeMinutes === mins ? '1px solid #0F766E' : '1px solid #CBD5E1',
                          background: overtimeMinutes === mins ? '#F0FDFA' : '#FFFFFF',
                          color: overtimeMinutes === mins ? '#0F766E' : '#475569',
                          fontWeight: 600,
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        +{mins}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lý do */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                Lý do giải trình <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <textarea
                className="emp-form-textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do gửi yêu cầu..."
                style={{
                  width: '100%',
                  fontSize: 13,
                  minHeight: 80,
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
                required
              />
            </div>

            {/* Tệp đính kèm (Nhiều ảnh) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Paperclip size={14} color="#0F766E" />
                  <span>Ảnh chứng cứ / Tệp đính kèm ({evidenceImageUrls.length}/8)</span>
                </label>
                {evidenceImageUrls.length > 0 && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    Đã chọn {evidenceImageUrls.length} ảnh
                  </span>
                )}
              </div>

              {/* Input chọn nhiều ảnh ẩn */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {uploadError && (
                <div
                  style={{
                    padding: '6px 10px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 6,
                    color: '#DC2626',
                    fontSize: 12,
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadingImage ? (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 8,
                    border: '1px dashed #0F766E',
                    background: '#F0FDFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: '#0F766E',
                    fontSize: 13,
                  }}
                >
                  <Loader2 size={16} className="emp-spin-icon" />
                  <span>Đang tải ảnh lên Cloudinary...</span>
                </div>
              ) : evidenceImageUrls.length > 0 ? (
                /* Danh sách nhiều ảnh đã đính kèm */
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {evidenceImageUrls.map((url, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        overflow: 'hidden',
                        background: '#F1F5F9',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <a href={url} target="_blank" rel="noreferrer" title="Xem ảnh lớn">
                        <img
                          src={url}
                          alt={`Minh chứng ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Xóa ảnh này"
                        style={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}

                  {evidenceImageUrls.length < 8 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        border: '1px dashed #0F766E',
                        background: '#F0FDFA',
                        color: '#0F766E',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <Plus size={16} />
                      <span>Thêm</span>
                    </button>
                  )}
                </div>
              ) : (
                /* Nút chọn ảnh khi chưa có ảnh */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px dashed #CBD5E1',
                    background: '#F8FAFC',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: '#475569',
                    fontSize: 13,
                  }}
                >
                  <Paperclip size={15} color="#0F766E" />
                  <span>Chọn một hoặc nhiều ảnh từ thiết bị</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>(Tối đa 8 ảnh, mỗi ảnh ≤ 5MB)</span>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            className="emp-modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '12px 20px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
            }}
          >
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              onClick={onClose}
              disabled={submitting || uploadingImage}
              style={{ fontSize: 13, height: 36, padding: '0 16px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="emp-btn emp-btn-primary"
              disabled={submitting || uploadingImage || (!selectedSchedule && mySchedules.length === 0)}
              style={{
                fontSize: 13,
                height: 36,
                padding: '0 18px',
                minWidth: 120,
              }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScheduleRequestModal;
