import React, { useState, useEffect } from 'react';
import {
  Clock,
  Building2,
  Trash2,
  Info,
  X,
  Loader2,
  Camera,
  LogIn,
  LogOut,
  Calendar,
  FileText,
  UserCheck,
  Maximize2,
} from 'lucide-react';
import type { AttendanceRecord } from '../../types';
import { shiftConfigApi, type ShiftConfigDto } from '../../api/shiftConfigApi';
import {
  scheduleApi,
  type ScheduleResponse,
  type UpdateSchedulePayload,
  type ManualAttendancePayload,
} from '../../api/scheduleApi';
import { ScheduleRequestType } from '../../types/scheduleApprovalTypes';

export interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
  onSaved?: () => void;
  isReadOnly?: boolean;
  onRequestIncident?: (record: AttendanceRecord, type: ScheduleRequestType) => void;
}

interface AttendanceDetailModalContentProps {
  record: AttendanceRecord;
  onClose: () => void;
  onUpdateStatus?: (recordId: string, newStatus: AttendanceRecord['status']) => void;
  onSaved?: () => void;
}

const extractHHmm = (t?: string | null): string => {
  if (!t) return '';
  // Trích xuất trực tiếp theo chuẩn múi giờ UTC+7 đã lưu trữ, không dùng new Date() tránh lệch múi giờ client
  if (t.includes('T') || t.includes(' ')) {
    const timePart = t.includes('T') ? t.split('T')[1] : t.split(' ')[1];
    if (timePart) {
      const parts = timePart.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
    }
  }
  const parts = t.trim().split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return t.substring(0, 5);
};

// ============================================================================
// COMPONENT DÀNH CHO ROLE STAFF: VIEW-ONLY CHI TIẾT CA & CHẤM CÔNG
// ============================================================================
interface StaffAttendanceDetailViewProps {
  record: AttendanceRecord;
  onClose: () => void;
  onRequestIncident?: (record: AttendanceRecord, type: ScheduleRequestType) => void;
}

const StaffAttendanceDetailView: React.FC<StaffAttendanceDetailViewProps> = ({
  record,
  onClose,
  onRequestIncident,
}) => {
  const [scheduleDetail, setScheduleDetail] = useState<ScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      if (!record.id) {
        setIsLoading(false);
        return;
      }
      try {
        const detail = await scheduleApi.getScheduleById(record.id);
        if (isMounted) {
          setScheduleDetail(detail);
        }
      } catch (err) {
        console.warn('Lỗi lấy chi tiết lịch làm việc:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [record.id]);

  // Giờ kế hoạch
  const planStart = extractHHmm(scheduleDetail?.plannedStartTime || record.plannedStartTime);
  const planEnd = extractHHmm(scheduleDetail?.plannedEndTime || record.plannedEndTime);
  const duration = scheduleDetail?.durationHours ?? record.workHours ?? 8;

  // Giờ thực tế
  const actualIn = scheduleDetail?.checkInTime
    ? extractHHmm(scheduleDetail.checkInTime)
    : record.checkInTime
    ? extractHHmm(record.checkInTime)
    : null;

  const actualOut = scheduleDetail?.checkOutTime
    ? extractHHmm(scheduleDetail.checkOutTime)
    : record.checkOutTime
    ? extractHHmm(record.checkOutTime)
    : null;

  const lateMins = scheduleDetail?.lateMinutes ?? record.lateMinutes ?? 0;
  const earlyMins = scheduleDetail?.earlyLeaveMinutes ?? 0;
  const overtimeMins = scheduleDetail?.overtimeMinutes ?? 0;
  const actualHours = scheduleDetail?.actualWorkHours ?? record.workHours ?? 0;

  // Điều kiện công nhận Tăng ca (OT): Bắt buộc phải có đơn xin OT đã được phê duyệt
  const hasApprovedOt =
    (scheduleDetail?.approvalType === 'OVERTIME' || scheduleDetail?.approvalStatus === 'Approved') &&
    overtimeMins > 0;

  // Trạng thái ca
  const statusStr = (scheduleDetail?.status || record.status || '').toLowerCase();
  const getBadgeInfo = () => {
    if (statusStr === 'cancelled' || statusStr === 'absent') {
      return { label: 'Vắng mặt', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
    }
    if (statusStr === 'inprogress') {
      return { label: 'Đang làm việc', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    }
    if (lateMins > 0) {
      return { label: `Đi muộn ${lateMins}p`, bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
    }
    if (earlyMins > 0) {
      return { label: `Về sớm ${earlyMins}p`, bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
    }
    if (actualIn && actualOut) {
      return { label: 'Đúng giờ', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    }
    if (actualIn) {
      return { label: 'Đã check-in', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
    }
    return { label: 'Chưa vào ca', bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' };
  };

  const badge = getBadgeInfo();

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="emp-modal-card" style={{ maxWidth: 580, borderRadius: 16, overflow: 'hidden' }}>
        {/* Header Modal */}
        <div
          className="emp-modal-header"
          style={{
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)',
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F172A' }}>
                Chi tiết ca làm việc & Chấm công
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                }}
              >
                {badge.label}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span><b>{record.employeeName}</b> ({record.employeeCode})</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0F766E', fontWeight: 600 }}>
                <Building2 size={13} />
                {record.branchName || record.gpsLocation || 'Chi nhánh'}
              </span>
            </div>
          </div>
          <button type="button" className="emp-modal-close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="emp-modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: '#64748B' }}>
              <Loader2 size={24} className="emp-spin" />
              <span style={{ fontSize: 13 }}>Đang tải dữ liệu ca làm việc...</span>
            </div>
          ) : (
            <>
              {/* Card 1: Kế hoạch Ca làm việc */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      backgroundColor: '#E0F2FE',
                      color: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      {record.shiftName || 'Ca làm việc'} {record.shiftCode ? `(${record.shiftCode})` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      Ngày: <b style={{ color: '#334155' }}>Thứ {record.dayOfWeek ? record.dayOfWeek.replace('T', '') : '2'}, {record.dateStr}</b>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F766E' }}>
                    {planStart} - {planEnd}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Định mức: {duration} giờ
                  </div>
                </div>
              </div>

              {/* Card 2: Lưới Đối Soát Thực Tế Vào Ca / Ra Ca */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {/* Cột VÀO CA */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      <LogIn size={16} color="#059669" />
                      <span>Vào ca</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Dự kiến: {planStart}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: actualIn ? '#0F172A' : '#94A3B8' }}>
                      {actualIn || '--:--'}
                    </div>

                    {actualIn ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {scheduleDetail?.checkInMethod === 'FACE_ID' ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 12,
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Camera size={12} />
                            FaceID
                          </span>
                        ) : scheduleDetail?.checkInMethod === 'MANUAL' ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 12,
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <UserCheck size={12} />
                            Chủ chấm
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748B' }}>Thủ công</span>
                        )}

                        {lateMins > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>
                            (Đi muộn {lateMins}p)
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>
                            (Đúng giờ)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Chưa ghi nhận điểm danh vào</div>
                    )}
                  </div>

                  {/* Ảnh Snapshot Check-in */}
                  {scheduleDetail?.checkInFaceImageUrl && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Ảnh chụp lúc vào:</div>
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: 70,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                        onClick={() => setPreviewImage(scheduleDetail.checkInFaceImageUrl!)}
                        title="Bấm để xem ảnh lớn"
                      >
                        <img
                          src={scheduleDetail.checkInFaceImageUrl}
                          alt="Snapshot Check-in"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            opacity: 0.9,
                          }}
                        >
                          <Maximize2 size={16} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột RA CA */}
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '14px 16px',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      <LogOut size={16} color="#0284C7" />
                      <span>Ra ca</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Dự kiến: {planEnd}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: actualOut ? '#0F172A' : '#94A3B8' }}>
                      {actualOut || '--:--'}
                    </div>

                    {actualOut ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {scheduleDetail?.checkOutMethod === 'FACE_ID' ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 12,
                              backgroundColor: '#ECFDF5',
                              color: '#065F46',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Camera size={12} />
                            FaceID
                          </span>
                        ) : scheduleDetail?.checkOutMethod === 'MANUAL' ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 12,
                              backgroundColor: '#EFF6FF',
                              color: '#1E40AF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <UserCheck size={12} />
                            Chủ chấm
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748B' }}>Thủ công</span>
                        )}

                        {earlyMins > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>
                            (Về sớm {earlyMins}p)
                          </span>
                        ) : hasApprovedOt ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#0F766E' }}>
                            (Tăng ca {overtimeMins}p - Đã duyệt)
                          </span>
                        ) : actualOut && planEnd && actualOut > planEnd ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706' }}>
                            (Sau giờ ca - Chưa duyệt OT)
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>
                            (Hoàn tất ca)
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Chưa ghi nhận điểm danh ra</div>
                    )}
                  </div>

                  {/* Ảnh Snapshot Check-out */}
                  {scheduleDetail?.checkOutFaceImageUrl && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>Ảnh chụp lúc ra:</div>
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: 70,
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                        onClick={() => setPreviewImage(scheduleDetail.checkOutFaceImageUrl!)}
                        title="Bấm để xem ảnh lớn"
                      >
                        <img
                          src={scheduleDetail.checkOutFaceImageUrl}
                          alt="Snapshot Check-out"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            opacity: 0.9,
                          }}
                        >
                          <Maximize2 size={16} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Thống Kê Giờ Công Thực Tế */}
              <div
                style={{
                  background: '#F0FDFA',
                  borderRadius: 12,
                  padding: '14px 18px',
                  border: '1px solid #CCFBF1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#0F766E', fontWeight: 600 }}>TỔNG GIỜ LÀM TÍNH LƯƠNG</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F766E', marginTop: 2 }}>
                    {actualHours.toFixed(2)} giờ
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    Định mức: <b>{duration} giờ</b>
                  </div>
                  {hasApprovedOt ? (
                    <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>
                      +{overtimeMins} phút làm thêm giờ (Đã duyệt OT)
                    </div>
                  ) : actualOut && planEnd && actualOut > planEnd ? (
                    <div style={{ fontSize: 11, color: '#D97706', fontWeight: 600, marginTop: 2 }}>
                      Chưa có đơn duyệt OT (Không tính giờ làm thêm)
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Box Cảnh báo / Nhắc nhở Quy tắc OT */}
              {actualOut && planEnd && actualOut > planEnd && !hasApprovedOt && (
                <div
                  style={{
                    backgroundColor: '#FFFBEB',
                    borderRadius: 10,
                    padding: '12px 14px',
                    border: '1px solid #FDE68A',
                    fontSize: 12,
                    color: '#92400E',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    lineHeight: 1.5,
                  }}
                >
                  <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b>Quy tắc tính tăng ca:</b> Bạn tan ca lúc <b>{actualOut}</b> (sau giờ quy định <b>{planEnd}</b>). Giờ làm thêm ngoài ca chỉ được tính khi có <b>Đơn xin OT được Chủ cửa hàng duyệt</b>. Thời gian ở lại muộn không tự động xóa lỗi <b>Đi muộn ({lateMins}p)</b> hoặc <b>Về sớm ({earlyMins}p)</b>.
                  </div>
                </div>
              )}

              {/* Ghi chú hoặc Giải trình của Quản lý nếu có */}
              {(record.note || scheduleDetail?.approvalReason) && (
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: '1px solid #E2E8F0',
                    fontSize: 12.5,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <FileText size={16} color="#64748B" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <b>Ghi chú:</b> {scheduleDetail?.approvalReason || record.note}
                  </div>
                </div>
              )}

              {/* Box Hỗ Trợ Gửi Khiếu Nại / Báo Sự Cố Chấm Công */}
              {onRequestIncident && (
                <div
                  style={{
                    marginTop: 4,
                    padding: '12px 14px',
                    borderRadius: 10,
                    backgroundColor: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    Giờ công hoặc điểm danh có sai sót?
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestIncident(record, ScheduleRequestType.CheckInIncident);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #0F766E',
                        backgroundColor: '#FFFFFF',
                        color: '#0F766E',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Báo sự cố vào/ra ca
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestIncident(record, ScheduleRequestType.Overtime);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#334155',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Xin duyệt OT
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Modal: Chỉ có nút Đóng */}
        <div
          className="emp-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '14px 24px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
          }}
        >
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={onClose}
            style={{ fontSize: 13, minWidth: 90 }}
          >
            Đóng
          </button>
        </div>

        {/* Modal Phóng To Ảnh Snapshot */}
        {previewImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setPreviewImage(null)}
          >
            <div style={{ position: 'relative', maxWidth: 640, width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <img
                src={previewImage}
                alt="Phóng to ảnh điểm danh"
                style={{ width: '100%', borderRadius: 12, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT DÀNH CHO STORE OWNER: THIẾT LẬP & CHẤM CÔNG THỦ CÔNG 3 TIÊU CHÍ
// ============================================================================
const AttendanceDetailModalContent: React.FC<AttendanceDetailModalContentProps> = ({
  record,
  onClose,
  onUpdateStatus,
  onSaved,
}) => {
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

  // 2. Fetch chi tiết lịch làm việc thực tế từ backend SchedulesController (GET /api/schedules/{id})
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
  isReadOnly,
  onRequestIncident,
}) => {
  if (!isOpen || !record) return null;

  if (isReadOnly) {
    return (
      <StaffAttendanceDetailView
        record={record}
        onClose={onClose}
        onRequestIncident={onRequestIncident}
      />
    );
  }

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
