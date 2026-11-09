import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, CheckCircle, AlertTriangle, RefreshCw, LogIn, LogOut, UserCheck } from 'lucide-react';
import {
  loadFaceApiModels,
  buildLabeledFaceDescriptors,
  createFaceMatcher,
  detectAndDrawMatches,
  captureCompressedSnapshot,
  type StaffFaceData,
  type MatchResult,
} from '../lib/faceIdService';
import { scheduleApi } from '../api/scheduleApi';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [staffList, setStaffList] = useState<StaffFaceData[]>([]);
  const [faceMatcher, setFaceMatcher] = useState<any | null>(null);

  const [currentMatch, setCurrentMatch] = useState<MatchResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  // Khởi động camera máy POS
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
      console.error('Không thể mở camera POS:', err);
      setCameraError('Không thể truy cập camera. Vui lòng cấp quyền truy cập camera trên thiết bị POS.');
    }
  }, []);

  // 1. Tải models và danh sách vector nhân viên trong ngày
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCurrentMatch(null);
      setActionSuccessMsg(null);
      setActionErrorMsg(null);
      return;
    }

    let isMounted = true;

    async function init() {
      setIsLoadingModels(true);
      setIsLoadingStaff(true);
      setActionSuccessMsg(null);
      setActionErrorMsg(null);

      try {
        await loadFaceApiModels();
        if (!isMounted) return;
        setIsLoadingModels(false);

        // Lấy danh sách nhân viên trực ca trong ngày có vector khuôn mặt
        const staffData = await scheduleApi.getTodayStaffDescriptors(branchId);
        if (!isMounted) return;

        setStaffList(staffData);
        setIsLoadingStaff(false);

        const labeled = buildLabeledFaceDescriptors(staffData);
        const matcher = createFaceMatcher(labeled);
        setFaceMatcher(matcher);

        await startCamera();
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Lỗi khởi tạo FaceID:', err);
        setCameraError(err?.message || 'Lỗi tải mô hình nhận diện khuôn mặt.');
        setIsLoadingModels(false);
        setIsLoadingStaff(false);
      }
    }

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, branchId, startCamera, stopCamera]);

  // 2. Vòng lặp nhận diện & vẽ bounding box đè chính xác lên canvas
  useEffect(() => {
    if (!isOpen || isLoadingModels || isLoadingStaff || !videoRef.current || !canvasRef.current) {
      return;
    }

    let active = true;

    async function loop() {
      if (!active) return;
      if (videoRef.current && canvasRef.current && faceMatcher) {
        try {
          const { bestMatch } = await detectAndDrawMatches(
            videoRef.current,
            canvasRef.current,
            faceMatcher
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
  }, [isOpen, isLoadingModels, isLoadingStaff, faceMatcher]);

  // 3. Xử lý Chấm công Vào ca / Ra ca khi bấm nút
  const handleAttendance = async (type: 'in' | 'out') => {
    setActionErrorMsg(null);
    setActionSuccessMsg(null);

    if (!videoRef.current) {
      setActionErrorMsg('Camera chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    // Kiểm tra nhận diện hiện tại theo khoảng cách Euclid (distance <= 0.50)
    if (!currentMatch || !currentMatch.isMatched || !currentMatch.employeeId || currentMatch.distance > 0.5) {
      setActionErrorMsg('Khuôn mặt chưa khớp với nhân viên nào (khoảng cách > 0.50). Vui lòng nhìn thẳng vào camera.');
      return;
    }

    // Tìm thông tin ca làm việc của nhân viên này
    const staff = staffList.find((s) => s.employeeId === currentMatch.employeeId);
    if (!staff) {
      setActionErrorMsg('Không tìm thấy thông tin ca làm việc của nhân viên trong ngày hôm nay.');
      return;
    }

    if (!staff.scheduleId) {
      setActionErrorMsg(`Nhân viên ${staff.fullName} không có ca làm việc được phân công hôm nay.`);
      return;
    }

    try {
      setIsSubmitting(true);
      // Chụp ảnh snapshot nén JPEG <= 100KB từ video camera
      const snapshot = captureCompressedSnapshot(videoRef.current);
      const faceDistance = Number(currentMatch.distance.toFixed(4));

      if (type === 'in') {
        await scheduleApi.checkInFaceId({
          scheduleId: staff.scheduleId,
          employeeId: staff.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        const successText = `Điểm danh VÀO CA thành công: ${staff.fullName} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        if (onSuccess) onSuccess('in', staff.fullName);
      } else {
        await scheduleApi.checkOutFaceId({
          scheduleId: staff.scheduleId,
          employeeId: staff.employeeId,
          faceMatchScore: faceDistance,
          snapshotBase64: snapshot,
        });

        const successText = `Điểm danh RA CA thành công: ${staff.fullName} (Khoảng cách: ${currentMatch.distance.toFixed(2)})`;
        setActionSuccessMsg(successText);
        if (onSuccess) onSuccess('out', staff.fullName);
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
        {/* Header */}
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
                Chấm công AI FaceID quầy POS
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
                Chi nhánh: <b style={{ color: '#0F766E' }}>{branchName || 'Hiện tại'}</b> · Ngưỡng khoảng cách: &le; 0.50
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
                }}
              >
                <RefreshCw size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {isLoadingModels ? 'Đang nạp mô hình AI Face-API...' : 'Đang tải dữ liệu ca làm việc trong ngày...'}
                </span>
              </div>
            )}

            {/* Lỗi camera */}
            {cameraError && (
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

            {/* Tag nhận diện khuôn mặt trực tiếp */}
            {currentMatch && currentMatch.isMatched && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  right: 12,
                  backgroundColor: 'rgba(6, 78, 59, 0.9)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={18} color="#34D399" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{currentMatch.fullName}</div>
                    <div style={{ fontSize: 11, color: '#A7F3D0' }}>Mã NV: {currentMatch.employeeCode}</div>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: '#059669',
                    padding: '3px 8px',
                    borderRadius: 12,
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

        {/* Action Buttons: MẶC ĐỊNH LUÔN HIỂN THỊ RÕ RÀNG ĐỂ BẤM XÁC NHẬN */}
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

          {/* NÚT XÁC NHẬN VÀO CA - LUÔN HIỂN THỊ SÁNG MÀU */}
          <button
            type="button"
            onClick={() => handleAttendance('in')}
            disabled={isSubmitting}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#0F766E',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.25)',
            }}
          >
            <LogIn size={16} />
            {isSubmitting ? 'Đang xác nhận...' : 'Xác nhận vào ca'}
          </button>

          {/* NÚT XÁC NHẬN RA CA - LUÔN HIỂN THỊ SÁNG MÀU */}
          <button
            type="button"
            onClick={() => handleAttendance('out')}
            disabled={isSubmitting}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#EA580C',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: isSubmitting ? 'wait' : 'pointer',
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

