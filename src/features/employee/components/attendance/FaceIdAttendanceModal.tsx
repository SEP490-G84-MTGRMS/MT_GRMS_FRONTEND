import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, CheckCircle, AlertTriangle, RefreshCw, LogIn, LogOut, UserCheck, ShieldAlert } from 'lucide-react';
import {
  loadFaceApiModels,
  buildLabeledFaceDescriptors,
  createFaceMatcher,
  detectAndDrawMatches,
  captureCompressedSnapshot,
  DISTANCE_THRESHOLD,
  type StaffFaceData,
  type MatchResult,
} from '../lib/faceIdService';
import { scheduleApi } from '../api/scheduleApi';
import { employeeApi } from '../api/employeeApi';
import { useAuthStore } from '../../../stores/useAuthStore';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<StaffFaceData | null>(null);
  const [faceMatcher, setFaceMatcher] = useState<any | null>(null);

  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

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

        // Lấy thông tin hồ sơ nhân viên của tài khoản đang đăng nhập
        const [profile, branchStaffList] = await Promise.all([
          employeeApi.getMyProfile().catch(() => null),
          branchId ? scheduleApi.getTodayStaffDescriptors(branchId).catch(() => []) : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        // Tìm ca trực hôm nay của nhân viên này
        const myScheduleInfo = branchStaffList.find(
          (s: any) =>
            (profile && s.employeeId === profile.id) ||
            s.employeeCode === profile?.employeeCode ||
            s.fullName === user?.fullName
        );

        const employeeId = profile?.id || myScheduleInfo?.employeeId;
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
          scheduleId: myScheduleInfo?.scheduleId,
          shiftCode: myScheduleInfo?.shiftCode,
          shiftName: myScheduleInfo?.shiftName,
          plannedStartTime: myScheduleInfo?.plannedStartTime,
          plannedEndTime: myScheduleInfo?.plannedEndTime,
          checkInTime: myScheduleInfo?.checkInTime,
          checkOutTime: myScheduleInfo?.checkOutTime,
          status: myScheduleInfo?.status,
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
    if (!currentUserData.scheduleId) {
      setActionErrorMsg(
        `Nhân viên ${currentUserData.fullName} không có ca làm việc nào được phân công hôm nay tại chi nhánh này.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      // Chụp ảnh snapshot nén JPEG <= 100KB từ video camera làm bằng chứng
      const snapshot = captureCompressedSnapshot(videoRef.current);
      const faceDistance = Number(currentMatch.distance.toFixed(4));

      if (type === 'in') {
        await scheduleApi.checkInFaceId({
          scheduleId: currentUserData.scheduleId,
          employeeId: currentUserData.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        const successText = `Điểm danh VÀO CA thành công: ${currentUserData.fullName} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        if (onSuccess) onSuccess('in', currentUserData.fullName);
      } else {
        await scheduleApi.checkOutFaceId({
          scheduleId: currentUserData.scheduleId,
          employeeId: currentUserData.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        const successText = `Điểm danh RA CA thành công: ${currentUserData.fullName} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        if (onSuccess) onSuccess('out', currentUserData.fullName);
      }

      // Tự động đóng modal sau 2.5s thành công
      setTimeout(() => {
        onClose();
      }, 2500);
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
        <div style={{ padding: 20, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                      {currentUserData.shiftName ? `Ca: ${currentUserData.shiftName}` : 'Đã xác thực danh tính'}
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
