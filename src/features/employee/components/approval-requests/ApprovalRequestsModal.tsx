import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import {
  ScheduleRequestType,
  ScheduleRequestTypeLabels,
  ScheduleApprovalStatus,
  LeaveTypeLabels,
  type ScheduleApprovalRequestDto,
  type ReviewScheduleApprovalRequestDto,
} from '../../types/scheduleApprovalTypes';
import { scheduleApprovalApi } from '../../api/scheduleApprovalApi';

export interface ApprovalRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request?: ScheduleApprovalRequestDto | null;
  requests?: any[];
  onApprove?: (ids: string[]) => void;
  onReject?: (ids: string[]) => void;
  onSuccess?: () => void;
}

export const ApprovalRequestsModal: React.FC<ApprovalRequestsModalProps> = ({
  isOpen,
  onClose,
  request = null,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [requests, setRequests] = useState<ScheduleApprovalRequestDto[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sub-modal xác nhận Duyệt / Từ chối
  const [selectedRequest, setSelectedRequest] = useState<ScheduleApprovalRequestDto | null>(null);
  const [isApproveAction, setIsApproveAction] = useState<boolean>(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [approvedMinutes, setApprovedMinutes] = useState<number>(60);
  const [isPaidLeave, setIsPaidLeave] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await scheduleApprovalApi.getPendingRequests();
      setRequests(res.items || []);
    } catch {
      setActionError('Không thể tải danh sách phiếu yêu cầu chờ duyệt.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (request) {
      setActionError(null);
      setLoading(false);
      setRequests([request]);
      return;
    }
    fetchRequests();
  }, [isOpen, request, fetchRequests]);

  if (!isOpen) return null;

  const handleOpenAction = (req: ScheduleApprovalRequestDto, approve: boolean) => {
    setSelectedRequest(req);
    setIsApproveAction(approve);
    setReviewNote(approve ? 'Đã duyệt yêu cầu' : 'Từ chối yêu cầu do không đủ điều kiện');
    setApprovedMinutes(req.requestedOvertimeMinutes || 60);
    setIsPaidLeave(req.isPaidLeave);
    setConfirmModalOpen(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!isApproveAction && !reviewNote.trim()) {
      alert('Vui lòng nhập lý do từ chối yêu cầu.');
      return;
    }
    if (reviewNote.trim().length > 500) {
      alert('Ghi chú phản hồi không được vượt quá 500 ký tự.');
      return;
    }
    if (isApproveAction && selectedRequest.requestType === ScheduleRequestType.Overtime && (approvedMinutes < 0 || approvedMinutes > 480)) {
      alert('Số phút OT phê duyệt phải từ 0 đến 480 phút.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: ReviewScheduleApprovalRequestDto = {
        isApproved: isApproveAction,
        reviewNote: reviewNote.trim(),
      };

      if (isApproveAction) {
        if (selectedRequest.requestType === ScheduleRequestType.Overtime) {
          payload.approvedOvertimeMinutes = approvedMinutes;
        } else if (selectedRequest.requestType === ScheduleRequestType.LeaveRequest) {
          payload.isPaidLeave = isPaidLeave;
        }
      }

      await scheduleApprovalApi.reviewRequest(selectedRequest.id, payload);
      setConfirmModalOpen(false);
      setSelectedRequest(null);
      onSuccess?.();
      if (request) {
        onClose();
      } else {
        fetchRequests();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Xử lý yêu cầu thất bại.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'ALL') return true;
    return r.requestType === activeTab;
  });

  const getCountByType = (type: ScheduleRequestType) => {
    return requests.filter((r) => r.requestType === type).length;
  };

  return (
    <div className="emp-modal-overlay" style={{ zIndex: 1050 }}>
      <div className="emp-modal-box" style={{ maxWidth: 760, width: '92%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="emp-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
              {request ? 'Chi tiết phiếu yêu cầu ca làm việc' : 'Duyệt phiếu yêu cầu ca làm việc'}
            </h3>
            {!request && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: '#FEF2F2',
                  color: '#DC2626',
                }}
              >
                {requests.length} chờ xử lý
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs Bar */}
        {!request && (
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 16px', background: '#F8FAFC', gap: 8, overflowX: 'auto' }}>
            {[
              { key: 'ALL', label: `Tất cả (${requests.length})` },
              { key: ScheduleRequestType.LeaveRequest, label: `Nghỉ phép (${getCountByType(ScheduleRequestType.LeaveRequest)})` },
              { key: ScheduleRequestType.ShiftSwap, label: `Đổi ca (${getCountByType(ScheduleRequestType.ShiftSwap)})` },
              { key: ScheduleRequestType.CheckInIncident, label: `Sự cố công (${getCountByType(ScheduleRequestType.CheckInIncident)})` },
              { key: ScheduleRequestType.Overtime, label: `Làm thêm OT (${getCountByType(ScheduleRequestType.Overtime)})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? '#0F766E' : '#64748B',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: activeTab === tab.key ? '2px solid #0F766E' : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body content */}
        <div className="emp-modal-body" style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {actionError && (
            <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#DC2626', fontSize: 13, marginBottom: 12 }}>
              {actionError}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', gap: 8, color: '#64748B', fontSize: 13 }}>
              <Loader2 size={18} className="emp-spin" />
              <span>Đang tải danh sách phiếu chờ duyệt...</span>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 13 }}>
              Không có yêu cầu nào chờ duyệt trong mục này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredRequests.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: 10,
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{r.employeeName}</span>
                        <span style={{ fontSize: 12, color: '#64748B' }}>({r.employeeCode})</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#EFF6FF',
                            color: '#2563EB',
                          }}
                        >
                          {ScheduleRequestTypeLabels[r.requestType] || r.requestType}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        Ca: <b style={{ color: '#334155' }}>{r.shiftName}</b> ({r.plannedStartTime?.substring(0, 5)} - {r.plannedEndTime?.substring(0, 5)}) • Ngày: {r.workDate?.slice(0, 10)}
                      </div>
                    </div>

                    {r.status === ScheduleApprovalStatus.Pending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAction(r, false)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            border: '1px solid #FCA5A5',
                            background: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAction(r, true)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#0F766E',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Duyệt
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chi tiết nội dung */}
                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 8, fontSize: 12, color: '#334155', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#64748B' }}>Lý do: </span>
                      {r.reason}
                    </div>

                    {r.requestType === ScheduleRequestType.LeaveRequest && (
                      <div style={{ color: '#475569' }}>
                        <span style={{ fontWeight: 600, color: '#64748B' }}>Loại nghỉ: </span>
                        {r.leaveType ? LeaveTypeLabels[r.leaveType] : 'Xin nghỉ'}
                        {r.isPaidLeave ? ' (Có lương)' : ' (Không lương)'}
                      </div>
                    )}

                    {r.requestType === ScheduleRequestType.ShiftSwap && r.targetEmployeeName && (
                      <div style={{ padding: '6px 10px', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 6, color: '#7E22CE' }}>
                        Đồng nghiệp đổi ca: <b>{r.targetEmployeeName}</b>{r.targetEmployeeCode ? ` (${r.targetEmployeeCode})` : ''}
                      </div>
                    )}

                    {r.requestType === ScheduleRequestType.Overtime && (
                      <div style={{ color: '#2563EB', fontWeight: 500 }}>
                        Số phút đề xuất OT: <b>{r.requestedOvertimeMinutes} phút</b>
                        {r.approvedOvertimeMinutes !== null && r.approvedOvertimeMinutes !== undefined && (
                          <span style={{ color: '#16A34A', marginLeft: 8 }}>
                            (Đã duyệt: {r.approvedOvertimeMinutes} phút)
                          </span>
                        )}
                      </div>
                    )}

                    {r.requestType === ScheduleRequestType.CheckInIncident && (
                      <div style={{ color: '#D97706', fontWeight: 500 }}>
                        Giờ có mặt thực tế: <b>{r.requestedCheckInTime?.slice(11, 16) || 'N/A'}</b> - Ra: <b>{r.requestedCheckOutTime?.slice(11, 16) || 'N/A'}</b>
                      </div>
                    )}

                    {r.requestType === ScheduleRequestType.CheckOutIncident && (
                      <div style={{ color: '#D97706', fontWeight: 500 }}>
                        Giờ ra thực tế đề xuất: <b>{r.requestedCheckOutTime?.slice(11, 16) || 'N/A'}</b>
                      </div>
                    )}

                    {r.reviewNote && (
                      <div style={{ marginTop: 4, padding: '6px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, color: '#334155' }}>
                        <span style={{ fontWeight: 600, color: '#0F766E' }}>Phản hồi duyệt: </span>
                        {r.reviewNote}
                      </div>
                    )}

                    {((r.evidenceImageUrls && r.evidenceImageUrls.length > 0) || r.evidenceImageUrl) && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ color: '#64748B', display: 'block', marginBottom: 4 }}>
                          Ảnh minh chứng ({r.evidenceImageUrls?.length || 1}):
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(r.evidenceImageUrls && r.evidenceImageUrls.length > 0
                            ? r.evidenceImageUrls
                            : [r.evidenceImageUrl!]
                          ).map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Bấm để xem ảnh lớn"
                              style={{ display: 'inline-block' }}
                            >
                              <img
                                src={url}
                                alt={`Ảnh ${i + 1}`}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="emp-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="emp-btn emp-btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>
            Đóng
          </button>
        </div>
      </div>

      {/* Sub-modal xác nhận Duyệt / Từ chối */}
      {confirmModalOpen && selectedRequest && (
        <div className="emp-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="emp-modal-box" style={{ maxWidth: 440, width: '90%' }}>
            <div className="emp-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isApproveAction ? '#0F766E' : '#DC2626' }}>
                {isApproveAction ? 'Xác nhận phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
              </h4>
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReview}>
              <div className="emp-modal-body" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, color: '#334155' }}>
                  Nhân viên: <b>{selectedRequest.employeeName}</b> ({selectedRequest.employeeCode})
                </div>

                {isApproveAction && selectedRequest.requestType === ScheduleRequestType.Overtime && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Số phút OT phê duyệt
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={480}
                      step={15}
                      className="emp-form-input"
                      value={approvedMinutes}
                      onChange={(e) => setApprovedMinutes(parseInt(e.target.value, 10) || 0)}
                      style={{ width: '100%', height: 36, fontSize: 13 }}
                    />
                  </div>
                )}

                {isApproveAction && selectedRequest.requestType === ScheduleRequestType.LeaveRequest && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isPaidLeave}
                      onChange={(e) => setIsPaidLeave(e.target.checked)}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>Tính là ngày nghỉ có hưởng lương</span>
                  </label>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Ghi chú / Lý do phản hồi
                  </label>
                  <textarea
                    className="emp-form-input"
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Nhập ghi chú phản hồi cho nhân viên..."
                    style={{ width: '100%', fontSize: 13, padding: 8 }}
                  />
                </div>
              </div>

              <div className="emp-modal-footer" style={{ padding: '10px 18px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="emp-btn emp-btn-ghost"
                  onClick={() => setConfirmModalOpen(false)}
                  disabled={submitting}
                  style={{ fontSize: 13 }}
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: isApproveAction ? '#0F766E' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {submitting ? <Loader2 size={14} className="emp-spin" /> : isApproveAction ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{submitting ? 'Đang xử lý...' : isApproveAction ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequestsModal;
