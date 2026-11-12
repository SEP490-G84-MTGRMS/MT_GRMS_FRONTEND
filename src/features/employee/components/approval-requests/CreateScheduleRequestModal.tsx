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
  ScheduleApprovalStatus,
  LeaveType,
  ScheduleRequestTypeLabels,
  LeaveTypeLabels,
  type CreateScheduleApprovalRequestDto,
  type ScheduleApprovalRequestDto,
} from '../../types/scheduleApprovalTypes';
import { scheduleApprovalApi } from '../../api/scheduleApprovalApi';
import { scheduleApi } from '../../api/scheduleApi';
import { formatLocalDateIso, getVietnamToday } from '../../lib/vietnamTime';
import { uploadImageToCloudinary } from '../../../../utils/cloudinary';
import { NotificationModal } from '../../../../components/common';

export interface ScheduleSelectionItem {
  id: string;
  workDate: string;
  shiftName: string;
  branchId: string;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  employeeId: string;
  status?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
  checkOutMethod?: string | null;
}

export interface CreateScheduleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: ScheduleSelectionItem | null;
  initialType?: ScheduleRequestType;
  editRequest?: ScheduleApprovalRequestDto | null;
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
  editRequest = null,
  onSuccess,
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSelectionItem | null>(schedule);
  const [mySchedules, setMySchedules] = useState<ScheduleSelectionItem[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);

  const [requestType, setRequestType] = useState<ScheduleRequestType>(initialType);
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.SickLeave);
  const [isPaidLeaveRequested, setIsPaidLeaveRequested] = useState<boolean>(false);
  const [checkInTime, setCheckInTime] = useState<string>('08:00');
  const [checkOutTime, setCheckOutTime] = useState<string>('17:00');
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(60);
  const [reason, setReason] = useState<string>('');

  // Tệp đính kèm nhiều ảnh (Cloudinary)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [evidenceImageUrls, setEvidenceImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reasonTouched, setReasonTouched] = useState<boolean>(false);
  const [existingRequests, setExistingRequests] = useState<ScheduleApprovalRequestDto[]>([]);
  const [createdNotification, setCreatedNotification] = useState<{
    isOpen: boolean;
    requestTypeLabel: string;
    shiftInfo: string;
  }>({
    isOpen: false,
    requestTypeLabel: '',
    shiftInfo: '',
  });

  const reasonError = !reason.trim()
    ? 'Vui lòng nhập lý do giải trình.'
    : reason.trim().length < 5
      ? 'Lý do giải trình tối thiểu 5 ký tự.'
      : reason.length > 500
        ? 'Lý do giải trình không vượt quá 500 ký tự.'
        : null;

  const overtimeError =
    requestType === ScheduleRequestType.Overtime && (overtimeMinutes < 15 || overtimeMinutes > 480)
      ? 'Số phút làm thêm giờ (OT) phải từ 15 đến 480 phút.'
      : null;

  // Khởi tạo form khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    setRequestType(initialType);
    setLeaveType(LeaveType.SickLeave);
    setIsPaidLeaveRequested(false);
    setOvertimeMinutes(60);
    setReason('');
    setReasonTouched(false);
    setEvidenceImageUrls([]);
    setUploadingImage(false);
    setUploadError(null);
    setErrorMessage(null);
    setCreatedNotification({ isOpen: false, requestTypeLabel: '', shiftInfo: '' });

    if (editRequest) {
      setRequestType(editRequest.requestType);
      setLeaveType(editRequest.leaveType || LeaveType.SickLeave);
      setIsPaidLeaveRequested(Boolean(editRequest.isPaidLeave));
      setOvertimeMinutes(editRequest.requestedOvertimeMinutes ?? 60);
      setReason(editRequest.reason || '');
      const existingImages =
        editRequest.evidenceImageUrls && editRequest.evidenceImageUrls.length > 0
          ? editRequest.evidenceImageUrls
          : editRequest.evidenceImageUrl
            ? [editRequest.evidenceImageUrl]
            : [];
      setEvidenceImageUrls(existingImages);

      const resolvedSchedule: ScheduleSelectionItem = schedule || {
        id: editRequest.scheduleId,
        workDate: editRequest.workDate ? editRequest.workDate.slice(0, 10) : '',
        shiftName: editRequest.shiftName || 'Ca làm việc',
        branchId: editRequest.branchId,
        plannedStartTime: editRequest.plannedStartTime || '08:00',
        plannedEndTime: editRequest.plannedEndTime || '17:00',
        employeeId: editRequest.employeeId,
      };
      setSelectedSchedule(resolvedSchedule);
      setCheckInTime(
        editRequest.requestedCheckInTime
          ? editRequest.requestedCheckInTime.slice(11, 16)
          : safeFormatTime(resolvedSchedule.plannedStartTime, '08:00')
      );
      setCheckOutTime(
        editRequest.requestedCheckOutTime
          ? editRequest.requestedCheckOutTime.slice(11, 16)
          : safeFormatTime(resolvedSchedule.plannedEndTime, '17:00')
      );
      return;
    }

    if (schedule) {
      setSelectedSchedule(schedule);
      setCheckInTime(safeFormatTime(schedule.plannedStartTime, '08:00'));
      setCheckOutTime(safeFormatTime(schedule.plannedEndTime, '17:00'));
    } else {
      // Mở từ thanh điều hướng (chưa chọn ca) -> tải danh sách ca của nhân viên theo chuẩn múi giờ UTC+7
      setLoadingSchedules(true);
      const vnToday = getVietnamToday();
      const fromDate = formatLocalDateIso(new Date(vnToday.getFullYear(), vnToday.getMonth(), vnToday.getDate() - 7));
      const toDate = formatLocalDateIso(new Date(vnToday.getFullYear(), vnToday.getMonth(), vnToday.getDate() + 14));

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
            status: s.status,
            checkInTime: s.checkInTime,
            checkOutTime: s.checkOutTime,
            checkInMethod: s.checkInMethod,
            checkOutMethod: s.checkOutMethod,
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
  }, [isOpen, initialType, schedule, editRequest]);

  // Tải danh sách yêu cầu hiện có của ca để kiểm tra xung đột giữa các loại đơn
  useEffect(() => {
    if (!isOpen || editRequest || !selectedSchedule?.id) {
      setExistingRequests([]);
      return;
    }

    let cancelled = false;
    scheduleApprovalApi
      .getRequestsByScheduleId(selectedSchedule.id)
      .then((res) => {
        if (!cancelled) {
          setExistingRequests(res || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExistingRequests([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, editRequest, selectedSchedule?.id]);

  const getOptionDisabledReason = (optType: ScheduleRequestType): string | null => {
    if (editRequest) {
      return optType !== editRequest.requestType ? 'Không thể đổi loại phiếu khi chỉnh sửa' : null;
    }
    if (!selectedSchedule) return null;

    const pendingRequests = existingRequests.filter(
      (r) => r.status === ScheduleApprovalStatus.Pending
    );
    const approvedRequests = existingRequests.filter(
      (r) => r.status === ScheduleApprovalStatus.Approved
    );

    if (pendingRequests.some((r) => r.requestType === optType)) {
      return 'Đã có đơn cùng loại đang chờ duyệt';
    }

    if (selectedSchedule.status === 'Cancelled') {
      return 'Ca làm việc đã bị hủy';
    }

    const hasActiveLeave =
      selectedSchedule.status === 'OnLeave' ||
      pendingRequests.some((r) => r.requestType === ScheduleRequestType.LeaveRequest) ||
      approvedRequests.some((r) => r.requestType === ScheduleRequestType.LeaveRequest);
    if (hasActiveLeave) {
      return 'Ca đã có đơn xin nghỉ';
    }

    const hasPendingShiftSwap = pendingRequests.some(
      (r) => r.requestType === ScheduleRequestType.ShiftSwap
    );
    if (hasPendingShiftSwap && optType !== ScheduleRequestType.ShiftSwap) {
      return 'Ca đang có đơn đổi ca chờ duyệt';
    }

    if (optType === ScheduleRequestType.LeaveRequest) {
      if (
        selectedSchedule.status === 'Completed' ||
        selectedSchedule.status === 'InProgress' ||
        Boolean(selectedSchedule.checkInTime)
      ) {
        return 'Ca đã chấm công hoặc đã kết thúc';
      }
      if (pendingRequests.some((r) => r.requestType !== ScheduleRequestType.LeaveRequest)) {
        return 'Ca đang có đơn OT, đổi ca hoặc sự cố chờ duyệt';
      }
    }

    if (optType === ScheduleRequestType.ShiftSwap) {
      if (
        selectedSchedule.status === 'Completed' ||
        selectedSchedule.status === 'InProgress' ||
        Boolean(selectedSchedule.checkInTime)
      ) {
        return 'Ca đã bắt đầu hoặc đã chấm công';
      }
      if (pendingRequests.some((r) => r.requestType !== ScheduleRequestType.ShiftSwap)) {
        return 'Ca đang có đơn khác chờ duyệt';
      }
    }

    if (optType === ScheduleRequestType.CheckInIncident) {
      if (approvedRequests.some((r) => r.requestType === ScheduleRequestType.CheckInIncident)) {
        return 'Sự cố Check-in đã được duyệt';
      }
      if (selectedSchedule.checkInTime && selectedSchedule.checkInMethod !== 'INCIDENT_PENDING') {
        return 'Ca đã được ghi nhận giờ vào';
      }
    }

    if (optType === ScheduleRequestType.CheckOutIncident) {
      if (approvedRequests.some((r) => r.requestType === ScheduleRequestType.CheckOutIncident)) {
        return 'Sự cố Check-out đã được duyệt';
      }
      if (selectedSchedule.checkOutTime && selectedSchedule.checkOutMethod !== 'INCIDENT_PENDING') {
        return 'Ca đã được ghi nhận giờ ra';
      }
    }

    return null;
  };

  // Nếu loại đơn đang chọn không hợp lệ với ca hiện tại, tự động chuyển sang option hợp lệ đầu tiên
  const selectedOptionDisabledReason = getOptionDisabledReason(requestType);

  useEffect(() => {
    if (!isOpen || editRequest || !selectedSchedule || !selectedOptionDisabledReason) return;
    const allTypes: ScheduleRequestType[] = [
      ScheduleRequestType.CheckInIncident,
      ScheduleRequestType.CheckOutIncident,
      ScheduleRequestType.LeaveRequest,
      ScheduleRequestType.ShiftSwap,
      ScheduleRequestType.Overtime,
    ];
    const firstValid = allTypes.find((t) => !getOptionDisabledReason(t));
    if (firstValid && firstValid !== requestType) {
      setRequestType(firstValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editRequest, selectedSchedule?.id, existingRequests, selectedOptionDisabledReason]);

  if (!isOpen) return null;

  if (createdNotification.isOpen) {
    return (
      <NotificationModal
        isOpen={createdNotification.isOpen}
        onClose={() => {
          setCreatedNotification({ isOpen: false, requestTypeLabel: '', shiftInfo: '' });
          onClose();
        }}
        type="success"
        title={editRequest ? 'Cập nhật phiếu yêu cầu thành công' : 'Gửi phiếu yêu cầu thành công'}
        message={
          <div>
            <p style={{ margin: '0 0 6px' }}>
              Yêu cầu <strong>{createdNotification.requestTypeLabel}</strong>
              {createdNotification.shiftInfo ? (
                <>
                  {' '}cho ca <strong>{createdNotification.shiftInfo}</strong>
                </>
              ) : null}{' '}
              {editRequest ? 'đã được cập nhật thành công.' : 'đã được gửi thành công.'}
            </p>
            <p style={{ margin: 0, color: '#64748B', fontSize: 13 }}>
              Phiếu đang ở trạng thái chờ Store Owner xem xét và phê duyệt.
            </p>
          </div>
        }
        confirmText="Đóng"
      />
    );
  }

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
    setReasonTouched(true);
    if (!selectedSchedule) {
      setErrorMessage('Vui lòng chọn ca làm việc.');
      return;
    }

    if (selectedOptionDisabledReason) {
      setErrorMessage(selectedOptionDisabledReason);
      return;
    }

    if (uploadingImage) {
      setErrorMessage('Ảnh minh chứng đang được tải lên, vui lòng chờ giây lát.');
      return;
    }

    if (overtimeError) {
      setErrorMessage(overtimeError);
      return;
    }

    if (reasonError) {
      setErrorMessage(reasonError);
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
        // Đơn đổi ca chỉ gửi thông tin ca hiện tại & lý do muốn đổi để Store Owner xem xét duyệt
      } else if (requestType === ScheduleRequestType.CheckInIncident) {
        const datePrefix = (selectedSchedule.workDate || '').slice(0, 10);
        payload.requestedCheckInTime = `${datePrefix}T${checkInTime}:00`;
      } else if (requestType === ScheduleRequestType.CheckOutIncident) {
        const datePrefix = (selectedSchedule.workDate || '').slice(0, 10);
        payload.requestedCheckOutTime = `${datePrefix}T${checkOutTime}:00`;
      } else if (requestType === ScheduleRequestType.Overtime) {
        payload.requestedOvertimeMinutes = overtimeMinutes;
      }

      const savedRequest = editRequest
        ? await scheduleApprovalApi.updateRequest(editRequest.id, payload)
        : await scheduleApprovalApi.createRequest(selectedSchedule.id, payload);
      onSuccess?.();
      const shiftName = savedRequest?.shiftName || selectedSchedule.shiftName || 'Ca làm việc';
      const workDateLabel = formatDateVn(savedRequest?.workDate || selectedSchedule.workDate);
      setCreatedNotification({
        isOpen: true,
        requestTypeLabel: ScheduleRequestTypeLabels[requestType] || 'Yêu cầu ca làm việc',
        shiftInfo: workDateLabel ? `${shiftName} (${workDateLabel})` : shiftName,
      });
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
            {editRequest ? 'Chỉnh sửa phiếu yêu cầu ca làm việc' : 'Tạo phiếu yêu cầu ca làm việc'}
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

              {schedule || (editRequest && selectedSchedule) ? (
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
                    <b>{(schedule || selectedSchedule)!.shiftName}</b> ({safeFormatTime((schedule || selectedSchedule)!.plannedStartTime)} - {safeFormatTime((schedule || selectedSchedule)!.plannedEndTime)}) • {formatDateVn((schedule || selectedSchedule)!.workDate)}
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
                  const disabledReason = getOptionDisabledReason(opt.type);
                  const isDisabledOption = Boolean(disabledReason);
                  const Icon = opt.icon;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => {
                        if (!isDisabledOption && !editRequest) {
                          setRequestType(opt.type);
                          setErrorMessage(null);
                        }
                      }}
                      title={disabledReason || opt.desc}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: isSelected && !isDisabledOption ? '1.5px solid #0F766E' : '1px solid #CBD5E1',
                        background: isSelected && !isDisabledOption ? '#F0FDFA' : isDisabledOption ? '#F8FAFC' : '#FFFFFF',
                        cursor: isDisabledOption || editRequest ? 'not-allowed' : 'pointer',
                        opacity: isDisabledOption ? 0.55 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <Icon
                        size={18}
                        color={isSelected && !isDisabledOption ? '#0F766E' : '#64748B'}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isSelected && !isDisabledOption ? 700 : 600,
                            fontSize: 13,
                            color: isSelected && !isDisabledOption ? '#0F766E' : '#1E293B',
                          }}
                        >
                          {opt.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: disabledReason ? '#DC2626' : isSelected ? '#0F766E' : '#64748B',
                            marginTop: 1,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {disabledReason || opt.desc}
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
                  padding: '10px 12px',
                  background: '#F0FDFA',
                  borderRadius: 8,
                  border: '1px solid #CCFBF1',
                  fontSize: 12.5,
                  color: '#115E59',
                  lineHeight: 1.5,
                }}
              >
                Vui lòng ghi rõ <b>thông tin ca muốn đổi</b> (ngày/ca mong muốn hoặc người đổi cùng nếu có) và <b>lý do</b> ở ô bên dưới để Chủ cửa hàng xem xét phê duyệt và sắp xếp lại lịch làm việc.
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
                    style={{
                      width: 110,
                      height: 38,
                      fontSize: 13,
                      background: '#FFFFFF',
                      borderColor: overtimeError ? '#EF4444' : undefined,
                    }}
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
                {overtimeError && (
                  <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>
                    • {overtimeError}
                  </div>
                )}
              </div>
            )}

            {/* Lý do */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#334155',
                    margin: 0,
                  }}
                >
                  Lý do giải trình <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: reason.length > 500 ? '#EF4444' : '#94A3B8' }}>
                  {reason.length}/500
                </span>
              </div>
              <textarea
                className="emp-form-textarea"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (!reasonTouched) setReasonTouched(true);
                }}
                onBlur={() => setReasonTouched(true)}
                placeholder="Nhập lý do gửi yêu cầu (tối thiểu 5 ký tự)..."
                style={{
                  width: '100%',
                  fontSize: 13,
                  minHeight: 80,
                  lineHeight: 1.5,
                  resize: 'vertical',
                  borderColor: reasonTouched && reasonError ? '#EF4444' : undefined,
                }}
                required
              />
              {reasonTouched && reasonError && (
                <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>
                  • {reasonError}
                </div>
              )}
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
              disabled={
                submitting ||
                uploadingImage ||
                Boolean(selectedOptionDisabledReason) ||
                (!selectedSchedule && mySchedules.length === 0)
              }
              style={{
                fontSize: 13,
                height: 36,
                padding: '0 18px',
                minWidth: 120,
              }}
            >
              {submitting ? 'Đang lưu...' : editRequest ? 'Lưu thay đổi' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateScheduleRequestModal;
