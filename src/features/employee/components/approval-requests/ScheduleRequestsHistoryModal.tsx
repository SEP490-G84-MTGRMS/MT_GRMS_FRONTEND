import React, { useCallback, useEffect, useState } from 'react';
import { X, Loader2, CheckCircle2, XCircle, Clock, Paperclip, Pencil, Trash2 } from 'lucide-react';
import {
  ScheduleApprovalStatus,
  ScheduleRequestTypeLabels,
  type ScheduleApprovalRequestDto,
} from '../../types/scheduleApprovalTypes';
import { scheduleApprovalApi } from '../../api/scheduleApprovalApi';
import { ConfirmModal, NotificationModal, type NotificationType } from '../../../../components/common';
import { CreateScheduleRequestModal } from './CreateScheduleRequestModal';

export interface ScheduleRequestsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleId: string | null;
  shiftTitle?: string;
  onChanged?: () => void;
}

export const ScheduleRequestsHistoryModal: React.FC<ScheduleRequestsHistoryModalProps> = ({
  isOpen,
  onClose,
  scheduleId,
  shiftTitle,
  onChanged,
}) => {
  const [requests, setRequests] = useState<ScheduleApprovalRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<ScheduleApprovalRequestDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleApprovalRequestDto | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const fetchRequests = useCallback(() => {
    if (!scheduleId) return;
    setLoading(true);
    scheduleApprovalApi
      .getRequestsByScheduleId(scheduleId)
      .then((res) => setRequests(res || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [scheduleId]);

  useEffect(() => {
    if (isOpen && scheduleId) {
      fetchRequests();
    }
  }, [isOpen, scheduleId, fetchRequests]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await scheduleApprovalApi.deleteRequest(deleteTarget.id);
      setDeleteTarget(null);
      fetchRequests();
      onChanged?.();
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Xóa phiếu yêu cầu thành công',
        message: 'Phiếu yêu cầu đang chờ duyệt đã được xóa khỏi hệ thống.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa phiếu yêu cầu. Vui lòng thử lại sau.';
      setDeleteTarget(null);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Xóa phiếu yêu cầu thất bại',
        message: msg,
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const renderStatusBadge = (status: ScheduleApprovalStatus) => {
    switch (status) {
      case ScheduleApprovalStatus.Approved:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#16A34A',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={12} /> Đã duyệt
          </span>
        );
      case ScheduleApprovalStatus.Rejected:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#DC2626',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <XCircle size={12} /> Đã từ chối
          </span>
        );
      case ScheduleApprovalStatus.Pending:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 6,
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              color: '#D97706',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <Clock size={12} /> Chờ duyệt
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 6,
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: 11,
            }}
          >
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      // Đảm bảo chuỗi datetime từ backend được hiểu đúng là UTC và hiển thị sang giờ địa phương (GMT+7)
      const normalizedStr = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : `${dateStr}Z`;
      const d = new Date(normalizedStr);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="emp-modal-box"
        style={{
          maxWidth: 600,
          width: '92%',
          maxHeight: '85vh',
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
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Lịch sử phiếu yêu cầu ca làm việc
            </h3>
            {shiftTitle && (
              <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748B' }}>
                {shiftTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="emp-modal-close-btn"
            onClick={onClose}
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className="emp-modal-body"
          style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px 0',
                gap: 8,
                color: '#64748B',
                fontSize: 13,
              }}
            >
              <Loader2 size={16} className="emp-spin-icon" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : requests.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#94A3B8',
                fontSize: 13,
              }}
            >
              Chưa có yêu cầu nào được gửi cho ca làm việc này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Dòng tiêu đề + trạng thái + thời gian */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                        {ScheduleRequestTypeLabels[r.requestType] || r.requestType}
                      </span>
                      {renderStatusBadge(r.status)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>
                        {formatDateTime(r.createdAt)}
                      </span>
                      {r.status === ScheduleApprovalStatus.Pending && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setEditingRequest(r)}
                            title="Chỉnh sửa phiếu yêu cầu"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#0F766E',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={12} />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                            title="Xóa phiếu yêu cầu"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lý do */}
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
                    <span style={{ color: '#64748B' }}>Lý do: </span>
                    {r.reason}
                  </div>

                  {/* Thông tin chi tiết */}
                  {r.targetEmployeeName && (
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <span style={{ color: '#64748B' }}>Đồng nghiệp đổi ca: </span>
                      <b>{r.targetEmployeeName}</b> ({r.targetEmployeeCode})
                    </div>
                  )}

                  {r.requestedOvertimeMinutes && (
                    <div style={{ fontSize: 12, color: '#334155' }}>
                      <span style={{ color: '#64748B' }}>Làm thêm đề xuất: </span>
                      <b>{r.requestedOvertimeMinutes} phút</b>
                      {r.approvedOvertimeMinutes !== null && r.approvedOvertimeMinutes !== undefined && (
                        <span style={{ marginLeft: 6, color: '#16A34A', fontWeight: 600 }}>
                          (Được duyệt: {r.approvedOvertimeMinutes} phút)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Ảnh chứng cứ nếu có */}
                  {((r.evidenceImageUrls && r.evidenceImageUrls.length > 0) || r.evidenceImageUrl) && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Paperclip size={12} color="#0F766E" />
                        <span>Ảnh minh chứng ({r.evidenceImageUrls?.length || 1}):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(r.evidenceImageUrls && r.evidenceImageUrls.length > 0
                          ? r.evidenceImageUrls
                          : [r.evidenceImageUrl!]
                        ).map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            title="Bấm để xem ảnh phóng to"
                            style={{ display: 'inline-block' }}
                          >
                            <img
                              src={url}
                              alt={`Minh chứng ${i + 1}`}
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: 'cover',
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phản hồi từ quản lý */}
                  {r.reviewNote && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        padding: '6px 10px',
                        background: '#FFFFFF',
                        borderRadius: 6,
                        border: '1px solid #E2E8F0',
                        color: '#334155',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#0F766E' }}>Quản lý phản hồi: </span>
                      {r.reviewNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="emp-modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={onClose}
            style={{ fontSize: 13, height: 36, padding: '0 18px' }}
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Modal chỉnh sửa phiếu yêu cầu (chỉ khi Pending) */}
      <CreateScheduleRequestModal
        isOpen={Boolean(editingRequest)}
        onClose={() => setEditingRequest(null)}
        editRequest={editingRequest}
        onSuccess={() => {
          fetchRequests();
          onChanged?.();
        }}
      />

      {/* Modal xác nhận xóa phiếu yêu cầu */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        variant="danger"
        title="Xác nhận xóa phiếu yêu cầu"
        message={
          deleteTarget
            ? `Bạn có chắc chắn muốn xóa phiếu "${ScheduleRequestTypeLabels[deleteTarget.requestType] || deleteTarget.requestType}" đang chờ duyệt này không?`
            : ''
        }
        confirmText="Xóa phiếu"
        cancelText="Hủy"
        isLoading={deleting}
      />

      {/* Modal thông báo kết quả */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification((prev) => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
};

export default ScheduleRequestsHistoryModal;
