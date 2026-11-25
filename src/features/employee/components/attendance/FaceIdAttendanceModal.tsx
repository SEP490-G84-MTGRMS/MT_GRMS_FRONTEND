import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, CheckCircle, AlertTriangle, RefreshCw, LogIn, LogOut, UserCheck, ShieldAlert, Store } from 'lucide-react';
import {
  loadFaceApiModels,
  buildLabeledFaceDescriptors,
  createFaceMatcher,
  detectAndDrawMatches,
  captureCompressedSnapshot,
  DISTANCE_THRESHOLD,
  type StaffFaceData,
  type MatchResult,
} from '../../lib/faceIdService';
import { scheduleApi, type ScheduleResponse } from '../../api/scheduleApi';
import { employeeApi } from '../../api/employeeApi';
import { formatLocalDateIso, getVietnamToday } from '../../lib/vietnamTime';
import { useAuthStore } from '../../../../stores/useAuthStore';

const formatShortTime = (timeStr?: string | null) =>
  timeStr ? timeStr.substring(0, 5) : '--:--';

const isShiftDisabled = (s: ScheduleResponse) =>
  s.status === 'Completed' || s.status === 'OnLeave' || s.status === 'Cancelled';

const getShiftStatusLabel = (s: ScheduleResponse) => {
  if (s.status === 'Completed') return 'Đã hoàn thành';
  if (s.status === 'OnLeave') return 'Nghỉ phép';
  if (s.status === 'Cancelled') return 'Đã hủy';
  if (s.status === 'InProgress' || (Boolean(s.checkInTime) && !s.checkOutTime)) return 'Đang trong ca';
  return 'Chưa chấm công';
};

const pickBestScheduleId = (shifts: ScheduleResponse[]): string => {
  if (shifts.length === 0) return '';
  const inProgress = shifts.find(
    (s) => !isShiftDisabled(s) && (s.status === 'InProgress' || (Boolean(s.checkInTime) && !s.checkOutTime))
  );
  if (inProgress) return inProgress.id;

  const nextAvailable = shifts.find((s) => !isShiftDisabled(s));
  if (nextAvailable) return nextAvailable.id;

  return shifts[0].id;
};

interface FaceIdAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName?: string;
  onSuccess?: (type: 'in' | 'out', staffName: string) => void;
}

export const FaceIdAttendanceModal: React.FC<FaceIdAttendanceModalProps> = ({
  isOpen,
  onClose,
  branchId,
  branchName,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<StaffFaceData | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<ScheduleResponse[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  const [faceMatcher, setFaceMatcher] = useState<any | null>(null);

  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [hasCheckedInForPos, setHasCheckedInForPos] = useState(false);

  // Dừng camera và giải phóng tài nguyên
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Khởi động camera thiết bị
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Không thể mở camera:', err);
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền truy cập camera trên thiết bị để thực hiện chấm công FaceID.');
    }
  }, []);

  // 1. Tải models và CHỈ NẠP DUY NHẤT vector khuôn mặt của tài khoản đang đăng nhập (Chế độ 1:1)
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCurrentMatch(null);
      setCurrentUserData(null);
      setTodaySchedules([]);
      setSelectedScheduleId('');
      setHasCheckedInForPos(false);
      setActionSuccessMsg(null);
      setActionErrorMsg(null);
      setInitError(null);
      return;
    }

    if (!user) {
      setInitError('Yêu cầu đăng nhập: Bạn cần đăng nhập vào tài khoản cá nhân để thực hiện chấm công FaceID.');
      setIsLoadingModels(false);
      setIsLoadingStaff(false);
      return;
    }

    let isMounted = true;

    async function init() {
      setIsLoadingModels(true);
      setIsLoadingStaff(true);
      setInitError(null);
      setActionSuccessMsg(null);
      setActionErrorMsg(null);

      try {
        await loadFaceApiModels();
        if (!isMounted) return;
        setIsLoadingModels(false);

        const vnToday = getVietnamToday();
        const todayIso = formatLocalDateIso(vnToday);
        const yesterdayIso = formatLocalDateIso(
          new Date(vnToday.getFullYear(), vnToday.getMonth(), vnToday.getDate() - 1)
        );

        // Lấy thông tin hồ sơ nhân viên + các ca trong ngày (hỗ trợ nhiều ca/ngày & ca qua đêm)
        const [profile, branchStaffList, rawMySchedules] = await Promise.all([
          employeeApi.getMyProfile().catch(() => null),
          branchId ? scheduleApi.getTodayStaffDescriptors(branchId).catch(() => []) : Promise.resolve([]),
          scheduleApi.getRawMySchedules(yesterdayIso, todayIso).catch(() => []),
        ]);

        if (!isMounted) return;

        // Lọc các ca trong ngày hôm nay (hoặc ca qua đêm hôm qua đang InProgress) thuộc chi nhánh
        const relevantSchedules = (rawMySchedules || [])
          .filter((s) => {
            if (s.status === 'Cancelled') return false;
            if (branchId && s.branchId !== branchId) return false;
            const workIso = (s.workDate || '').slice(0, 10);
            if (workIso === todayIso) return true;
            if (workIso === yesterdayIso) {
              return s.status === 'InProgress' || (Boolean(s.checkInTime) && !s.checkOutTime);
            }
            return false;
          })
          .sort((a, b) => {
            const dCmp = (a.workDate || '').localeCompare(b.workDate || '');
            if (dCmp !== 0) return dCmp;
            return (a.plannedStartTime || '').localeCompare(b.plannedStartTime || '');
          });

        const bestId = pickBestScheduleId(relevantSchedules);
        const bestSchedule = relevantSchedules.find((s) => s.id === bestId) || null;
        setTodaySchedules(relevantSchedules);
        setSelectedScheduleId(bestId);

        // Tìm ca trực hôm nay của nhân viên này (fallback từ today-descriptors)
        const myScheduleInfo = branchStaffList.find(
          (s: any) =>
            (profile && s.employeeId === profile.id) ||
            s.employeeCode === profile?.employeeCode ||
            s.fullName === user?.fullName
        );

        const employeeId = profile?.id || bestSchedule?.employeeId || myScheduleInfo?.employeeId;
        const employeeCode = profile?.employeeCode || myScheduleInfo?.employeeCode || 'NV';
        const fullName = profile?.fullName || myScheduleInfo?.fullName || user?.fullName || 'Nhân viên';
        const faceDescriptor = profile?.faceDescriptor || myScheduleInfo?.faceDescriptor;

        if (!faceDescriptor) {
          setInitError(
            `Tài khoản của bạn (${fullName}) chưa đăng ký dữ liệu khuôn mặt FaceID. Vui lòng liên hệ quản lý để cài đặt khuôn mặt trước khi điểm danh.`
          );
          setIsLoadingStaff(false);
          return;
        }

        const staffData: StaffFaceData = {
          employeeId: employeeId || '',
          employeeCode,
          fullName,
          faceDescriptor,
          faceImageUrls: profile?.faceImageUrls || myScheduleInfo?.faceImageUrls,
          scheduleId: bestSchedule?.id || myScheduleInfo?.scheduleId,
          shiftCode: bestSchedule?.shiftCode || myScheduleInfo?.shiftCode,
          shiftName: bestSchedule?.shiftName || myScheduleInfo?.shiftName,
          plannedStartTime: bestSchedule?.plannedStartTime || myScheduleInfo?.plannedStartTime,
          plannedEndTime: bestSchedule?.plannedEndTime || myScheduleInfo?.plannedEndTime,
          checkInTime: bestSchedule?.checkInTime ?? myScheduleInfo?.checkInTime,
          checkOutTime: bestSchedule?.checkOutTime ?? myScheduleInfo?.checkOutTime,
          status: bestSchedule?.status || myScheduleInfo?.status,
        };

        setCurrentUserData(staffData);
        setIsLoadingStaff(false);

        // Chế độ 1:1 Verification: FaceMatcher CHỈ CHỨA DUY NHẤT dữ liệu khuôn mặt của tài khoản này
        const labeled = buildLabeledFaceDescriptors([staffData]);
        if (labeled.length === 0) {
          setInitError('Dữ liệu khuôn mặt của tài khoản không hợp lệ. Vui lòng đăng ký lại.');
          return;
        }

        const matcher = createFaceMatcher(labeled, DISTANCE_THRESHOLD);
        setFaceMatcher(matcher);

        await startCamera();
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Lỗi khởi tạo FaceID 1:1:', err);
        setInitError(err?.message || 'Lỗi tải mô hình nhận diện khuôn mặt.');
        setIsLoadingModels(false);
        setIsLoadingStaff(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, branchId, user, startCamera, stopCamera]);

  // 2. Vòng lặp nhận diện 1:1 & vẽ bounding box đè lên canvas
  useEffect(() => {
    if (!isOpen || isLoadingModels || isLoadingStaff || !videoRef.current || !canvasRef.current || !faceMatcher || !currentUserData) {
      return;
    }

    let active = true;

    async function loop() {
      if (!active) return;
      if (videoRef.current && canvasRef.current && faceMatcher && currentUserData) {
        try {
          const { bestMatch } = await detectAndDrawMatches(
            videoRef.current,
            canvasRef.current,
            faceMatcher,
            {
              fullName: currentUserData.fullName,
              employeeCode: currentUserData.employeeCode,
              employeeId: currentUserData.employeeId,
            }
          );
          if (active) {
            setCurrentMatch(bestMatch);
          }
        } catch {
          // Bỏ qua lỗi frame đơn lẻ
        }
      }
      if (active) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    }

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, isLoadingModels, isLoadingStaff, faceMatcher, currentUserData]);

  const selectedSchedule = todaySchedules.find((s) => s.id === selectedScheduleId) || null;
  const activeScheduleId = selectedSchedule?.id || currentUserData?.scheduleId || '';
  const activeShiftName = selectedSchedule?.shiftName || currentUserData?.shiftName;
  const isSelectedShiftInProgress = Boolean(
    selectedSchedule
      ? selectedSchedule.status === 'InProgress' || (Boolean(selectedSchedule.checkInTime) && !selectedSchedule.checkOutTime)
      : Boolean(currentUserData?.checkInTime) && !currentUserData?.checkOutTime
  );
  const isSelectedShiftDisabled = selectedSchedule ? isShiftDisabled(selectedSchedule) : false;

  // 3. Xử lý Chấm công Vào ca / Ra ca khi bấm nút
  const handleAttendance = async (type: 'in' | 'out') => {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    if (!currentUserData) {
      setActionErrorMsg('Chưa tải được thông tin tài khoản nhân viên. Vui lòng thử lại.');
      return;
    }

    if (!videoRef.current) {
      setActionErrorMsg('Camera chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    // Bắt buộc khuôn mặt trên camera phải trùng khớp với nhân viên đang đăng nhập
    if (!currentMatch || !currentMatch.isMatched || currentMatch.distance > DISTANCE_THRESHOLD) {
      const distInfo = currentMatch?.distance !== undefined ? ` (Khoảng cách: ${currentMatch.distance.toFixed(2)})` : '';
      setActionErrorMsg(
        `Khuôn mặt trước camera không trùng khớp với nhân viên ${currentUserData.fullName}${distInfo}. Vui lòng nhìn thẳng vào camera và thử lại.`
      );
      return;
    }

    // Kiểm tra ca làm việc hôm nay
    if (!activeScheduleId) {
      setActionErrorMsg(
        `Nhân viên ${currentUserData.fullName} không có ca làm việc nào được phân công hôm nay tại chi nhánh này.`
      );
      return;
    }

    if (isSelectedShiftDisabled) {
      setActionErrorMsg('Ca làm việc đã chọn đã hoàn thành hoặc đang nghỉ phép. Vui lòng chọn ca khác.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Chụp ảnh snapshot nén JPEG <= 100KB từ video camera làm bằng chứng
      const snapshot = captureCompressedSnapshot(videoRef.current);
      const faceDistance = Number(currentMatch.distance.toFixed(4));

      if (type === 'in') {
        const updated = await scheduleApi.checkInFaceId({
          scheduleId: activeScheduleId,
          employeeId: currentUserData.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        setTodaySchedules((prev) =>
          prev.map((s) =>
            s.id === activeScheduleId
              ? { ...s, status: updated.status || 'InProgress', checkInTime: updated.checkInTime || new Date().toISOString() }
              : s
          )
        );
        const successText = `Điểm danh VÀO CA thành công: ${currentUserData.fullName}${activeShiftName ? ` - ${activeShiftName}` : ''} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        setHasCheckedInForPos(true);
        window.dispatchEvent(new CustomEvent('pos-attendance-updated'));
        if (onSuccess) onSuccess('in', currentUserData.fullName);
      } else {
        const updated = await scheduleApi.checkOutFaceId({
          scheduleId: activeScheduleId,
          employeeId: currentUserData.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        setTodaySchedules((prev) =>
          prev.map((s) =>
            s.id === activeScheduleId
              ? { ...s, status: updated.status || 'Completed', checkOutTime: updated.checkOutTime || new Date().toISOString() }
              : s
          )
        );
        const successText = `Điểm danh RA CA thành công: ${currentUserData.fullName}${activeShiftName ? ` - ${activeShiftName}` : ''} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        setHasCheckedInForPos(false);
        window.dispatchEvent(new CustomEvent('pos-attendance-updated'));
        if (onSuccess) onSuccess('out', currentUserData.fullName);
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    } catch (err: any) {
      console.error(`Lỗi chấm công ${type}:`, err);
      setActionErrorMsg(err?.response?.data?.message || err?.message || `Chấm công thất bại. Vui lòng thử lại.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 680,
          maxHeight: 'calc(100dvh - 32px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                Chấm công AI FaceID
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                Nhân viên: <b style={{ color: '#0F766E' }}>{currentUserData?.fullName || user?.fullName}</b>
                {currentUserData?.employeeCode ? ` (${currentUserData.employeeCode})` : ''}
                {branchName ? ` · Chi nhánh: ${branchName}` : ''} · Ngưỡng đo lường: &le; {DISTANCE_THRESHOLD}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Camera Container */}
        <div
          style={{
            padding: 20,
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
          }}
        >
          {/* Chọn ca làm việc nếu có nhiều ca trong ngày */}
          {!isLoadingStaff && todaySchedules.length >= 2 && (
            <div
              style={{
                width: '100%',
                maxWidth: 560,
                marginBottom: 12,
                padding: '10px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxSizing: 'border-box',
              }}
            >
              <label
                htmlFor="faceid-shift-select"
                style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}
              >
                Chọn ca chấm công ({todaySchedules.length} ca trong ngày)
              </label>
              <select
                id="faceid-shift-select"
                aria-label="Chọn ca làm việc"
                value={selectedScheduleId}
                onChange={(e) => {
                  setSelectedScheduleId(e.target.value);
                  setActionErrorMsg(null);
                  setActionSuccessMsg(null);
                  setHasCheckedInForPos(false);
                }}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                {todaySchedules.map((s) => {
                  const disabled = isShiftDisabled(s);
                  const statusLabel = getShiftStatusLabel(s);
                  return (
                    <option key={s.id} value={s.id} disabled={disabled}>
                      {s.shiftName || s.shiftCode || 'Ca làm việc'} ({formatShortTime(s.plannedStartTime)} - {formatShortTime(s.plannedEndTime)}) • {statusLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {!isLoadingStaff && todaySchedules.length === 1 && (
            <div
              style={{
                width: '100%',
                maxWidth: 560,
                marginBottom: 12,
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: 12.5,
                color: '#334155',
                boxSizing: 'border-box',
              }}
            >
              <span>
                Ca làm việc: <b>{todaySchedules[0].shiftName || todaySchedules[0].shiftCode || 'Ca làm việc'}</b> ({formatShortTime(todaySchedules[0].plannedStartTime)} - {formatShortTime(todaySchedules[0].plannedEndTime)})
              </span>
              <span style={{ fontWeight: 700, color: '#0F766E' }}>{getShiftStatusLabel(todaySchedules[0])}</span>
            </div>
          )}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 560,
              aspectRatio: '4 / 3',
              backgroundColor: '#0F172A',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {/* Thẻ Video stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror video tự nhiên
              }}
            />

            {/* Thẻ Canvas đè chính xác lên video để vẽ khung nhận diện */}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                transform: 'scaleX(-1)', // Đồng bộ mirror với video
              }}
            />

            {/* Trạng thái tải model / staff */}
            {(isLoadingModels || isLoadingStaff) && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  gap: 12,
                  padding: 20,
                  textAlign: 'center',
                }}
              >
                <RefreshCw size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {isLoadingModels
                    ? 'Đang nạp mô hình AI Face-API...'
                    : 'Đang chuẩn bị dữ liệu nhận diện...'}
                </span>
              </div>
            )}

            {/* Lỗi khởi tạo / Chưa đăng nhập / Chưa đăng ký FaceID */}
            {initError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F87171',
                  padding: 24,
                  textAlign: 'center',
                  gap: 12,
                }}
              >
                <ShieldAlert size={40} color="#EF4444" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Không thể truy cập chấm công FaceID</span>
                <span style={{ fontSize: 13, color: '#FECACA', maxWidth: 440 }}>{initError}</span>
              </div>
            )}

            {/* Lỗi camera */}
            {!initError && cameraError && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#F87171',
                  padding: 20,
                  textAlign: 'center',
                  gap: 10,
                }}
              >
                <AlertTriangle size={36} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{cameraError}</span>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    marginTop: 8,
                    padding: '6px 14px',
                    borderRadius: 6,
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Thử lại Camera
                </button>
              </div>
            )}

            {/* Tag nhận diện khuôn mặt trực tiếp - TRƯỜNG HỢP KHỚP CHÍNH CHỦ (XANH LÁ) */}
            {currentMatch && currentMatch.isMatched && currentUserData && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  right: 12,
                  backgroundColor: 'rgba(6, 78, 59, 0.92)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                  border: '1px solid #10B981',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserCheck size={22} color="#34D399" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {currentUserData.fullName}
                      <span style={{ marginLeft: 6, fontSize: 11, color: '#A7F3D0', fontWeight: 500 }}>
                        ({currentUserData.employeeCode})
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#D1FAE5' }}>
                      {activeShiftName ? `Ca: ${activeShiftName}` : 'Đã xác thực danh tính'}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#059669',
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Khoảng cách: {currentMatch.distance.toFixed(2)}
                </div>
              </div>
            )}

            {/* Tag nhận diện khuôn mặt trực tiếp - TRƯỜNG HỢP NGƯỜI KHÁC HOẶC KHÔNG KHỚP (ĐỎ CẢNH BÁO) */}
            {currentMatch && !currentMatch.isMatched && currentUserData && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  right: 12,
                  backgroundColor: 'rgba(153, 27, 27, 0.92)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                  border: '1px solid #EF4444',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={22} color="#FCA5A5" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#FEE2E2' }}>
                      Khuôn mặt không trùng khớp với nhân viên {currentUserData.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: '#FECACA' }}>
                      Vui lòng nhìn thẳng vào camera và thử lại
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#DC2626',
                    padding: '4px 10px',
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Khoảng cách: {currentMatch.distance.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Thông báo kết quả thao tác */}
          {actionSuccessMsg && (
            <div
              style={{
                marginTop: 12,
                width: '100%',
                maxWidth: 560,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={18} color="#059669" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {actionErrorMsg && (
            <div
              style={{
                marginTop: 12,
                width: '100%',
                maxWidth: 560,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={18} color="#DC2626" />
              <span>{actionErrorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: LUÔN HIỂN THỊ RÕ RÀNG */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Đóng
          </button>

          {/* NÚT VÀO MÀN HÌNH BÁN HÀNG POS SAU KHI CHẤM CÔNG VÀO CA */}
          {(hasCheckedInForPos || isSelectedShiftInProgress) && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/employee/pos');
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
              }}
            >
              <Store size={16} />
              <span>Vào màn hình Bán hàng POS</span>
            </button>
          )}

          {/* NÚT XÁC NHẬN VÀO CA */}
          <button
            type="button"
            onClick={() => handleAttendance('in')}
            disabled={isSubmitting || Boolean(initError)}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: initError ? '#94A3B8' : '#0F766E',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isSubmitting || initError ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
            }}
          >
            <LogIn size={16} />
            {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận vào ca'}
          </button>

          {/* NÚT XÁC NHẬN RA CA */}
          <button
            type="button"
            onClick={() => handleAttendance('out')}
            disabled={isSubmitting || Boolean(initError)}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: initError ? '#94A3B8' : '#EA580C',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isSubmitting || initError ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
            }}
          >
            <LogOut size={16} />
            {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận ra ca'}
          </button>
        </div>
      </div>
    </div>
  );
};
