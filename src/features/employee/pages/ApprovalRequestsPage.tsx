import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RotateCw,
  Building2,
  X,
  FileCheck2,
  AlertTriangle,
  Paperclip,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { scheduleApprovalApi } from '../api/scheduleApprovalApi';
import {
  ScheduleRequestType,
  ScheduleRequestTypeLabels,
  ScheduleApprovalStatus,
  LeaveTypeLabels,
  type ScheduleApprovalRequestDto,
  type ReviewScheduleApprovalRequestDto,
} from '../types/scheduleApprovalTypes';
import { TablePagination, NotificationModal } from '../../../components/common';
import { matchesAnyVietnameseSearch } from '../lib/vietnamTime';
import '../employee.css';

const ACTIVE_BRANCH_STORAGE_KEY = 'mtgrms_active_branch';

export const ApprovalRequestsPage: React.FC = () => {
  // State data
  const [requests, setRequests] = useState<ScheduleApprovalRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeBranch, setActiveBranch] = useState<{ id: string; name: string } | null>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Lắng nghe thay đổi chi nhánh từ StoreOwnerLayout (BranchSelectorDropdown)
  useEffect(() => {
    const handleBranchChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
        setPage(1);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_BRANCH_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveBranch(parsed);
          setPage(1);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleBranchChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleBranchChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sub-modal xác nhận Duyệt / Từ chối
  const [selectedRequest, setSelectedRequest] = useState<ScheduleApprovalRequestDto | null>(null);
  const [isApproveAction, setIsApproveAction] = useState<boolean>(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [approvedMinutes, setApprovedMinutes] = useState<number>(60);
  const [isPaidLeave, setIsPaidLeave] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lightbox xem ảnh minh chứng
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Notification Modal
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      // Gọi API lấy toàn bộ requests (lọc theo activeBranch nếu có và khác 'ALL')
      const branchIdParam = activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : undefined;
      const typeParam = selectedType !== 'ALL' ? (selectedType as ScheduleRequestType) : undefined;
      const statusParam = selectedStatus !== 'ALL' ? selectedStatus : undefined;

      const res = await scheduleApprovalApi.getAllRequests(branchIdParam, typeParam, statusParam);
      const list = (res as any)?.items || (res as any)?.Items || (Array.isArray(res) ? res : []);
      setRequests(list);
    } catch (err: any) {
      console.error('Lỗi khi fetch danh sách đơn yêu cầu:', err);
      const apiMsg = err?.response?.data?.message || err?.message;
      setErrorMessage(apiMsg ? `Lỗi: ${apiMsg}` : 'Không thể tải danh sách phiếu yêu cầu phê duyệt. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  }, [activeBranch, selectedType, selectedStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Client-side filtering (Search keyword & Active branch)
  const filteredRequests = requests.filter((req) => {
    // 1. Keyword search (Mã NV, Tên NV, Lý do, Tên ca - không phân biệt dấu/hoa-thường)
    if (
      searchTerm.trim() &&
      !matchesAnyVietnameseSearch(
        [req.employeeName, req.employeeCode, req.reason, req.shiftName],
        searchTerm
      )
    ) {
      return false;
    }

    // 2. Active branch filter (nếu client có danh sách tổng)
    if (activeBranch && activeBranch.id !== 'ALL') {
      if (req.branchId && req.branchId !== activeBranch.id) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalItems = filteredRequests.length;
  const paginatedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedType !== 'ALL' ||
    selectedStatus !== 'ALL';

  // Action Review handlers
  const handleOpenAction = (req: ScheduleApprovalRequestDto, approve: boolean) => {
    setSelectedRequest(req);
    setIsApproveAction(approve);
    setReviewNote(approve ? 'Đã duyệt yêu cầu' : 'Từ chối yêu cầu do không đủ điều kiện');
    setApprovedMinutes(req.requestedOvertimeMinutes || 60);
    setIsPaidLeave(req.isPaidLeave);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!isApproveAction && !reviewNote.trim()) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Thiếu lý do từ chối',
        message: 'Vui lòng cung cấp lý do từ chối yêu cầu.',
      });
      return;
    }
    if (reviewNote.trim().length > 500) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Quá giới hạn ký tự',
        message: 'Ghi chú phản hồi không được vượt quá 500 ký tự.',
      });
      return;
    }
    if (isApproveAction && selectedRequest.requestType === ScheduleRequestType.Overtime && (approvedMinutes < 0 || approvedMinutes > 480)) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Số phút OT không hợp lệ',
        message: 'Số phút làm thêm giờ phê duyệt phải từ 0 đến 480 phút.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
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
      setIsConfirmModalOpen(false);
      setSelectedRequest(null);
      setNotification({
        isOpen: true,
        type: 'success',
        title: isApproveAction ? 'Duyệt yêu cầu thành công' : 'Đã từ chối yêu cầu',
        message: `Phiếu yêu cầu của nhân viên "${selectedRequest.employeeName}" đã được cập nhật thành công.`,
      });
      fetchRequests();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Có lỗi xảy ra khi xử lý yêu cầu.';
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Thao tác thất bại',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Image preview Lightbox
  const handleOpenLightbox = (images: string[], index = 0) => {
    setPreviewImages(images);
    setActiveImageIndex(index);
    setIsPreviewOpen(true);
  };

  // Request Type Helpers
  const renderRequestTypeBadge = (type: ScheduleRequestType) => {
    return (
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>
        {ScheduleRequestTypeLabels[type] || type}
      </span>
    );
  };

  const renderStatusBadge = (status: ScheduleApprovalStatus) => {
    switch (status) {
      case ScheduleApprovalStatus.Pending:
        return <span className="emp-status-pill warning">● Chờ duyệt</span>;
      case ScheduleApprovalStatus.Approved:
        return <span className="emp-status-pill active">● Đã duyệt</span>;
      case ScheduleApprovalStatus.Rejected:
        return <span className="emp-status-pill danger">● Đã từ chối</span>;
      case ScheduleApprovalStatus.Cancelled:
        return <span className="emp-status-pill inactive">● Đã hủy</span>;
      default:
        return <span className="emp-status-pill">{status}</span>;
    }
  };

  return (
    <div className="emp-page-container">
      {/* ─── TITLE BAR ─── */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 className="emp-header-title" style={{ margin: 0 }}>
          <span>Duyệt đơn yêu cầu</span>
          <span className="count-badge">{totalItems}</span>
        </h2>

        <button
          type="button"
          onClick={() => fetchRequests()}
          className="emp-btn emp-btn-secondary"
          style={{ height: 38, padding: '0 14px', fontSize: 13, gap: 6 }}
          title="Tải lại dữ liệu"
        >
          <RotateCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ─── TOP FILTER BAR ─── */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          {/* 1. Ô tìm kiếm */}
          <div className="emp-search-box" style={{ width: 300, position: 'relative' }}>
            <span className="emp-search-icon">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã NV, tên, lý do..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{ paddingRight: searchTerm ? 36 : 16 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 2,
                  fontSize: 18,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Xóa tìm kiếm"
              >
                &times;
              </button>
            )}
          </div>

          {/* 2. Hiển thị Chi nhánh đang áp dụng từ StoreOwnerLayout */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 40,
              padding: '0 14px',
              borderRadius: 8,
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              color: '#0F766E',
              fontSize: 13,
              fontWeight: 500,
            }}
            title="Chi nhánh được đồng bộ trực tiếp từ bộ chọn chi nhánh của hệ thống ở thanh điều hướng trên cùng"
          >
            <Building2 size={16} color="#0F766E" />
            <span>
              Chi nhánh:{' '}
              <strong style={{ fontWeight: 600 }}>
                {activeBranch?.name || 'Tất cả chi nhánh'}
              </strong>
            </span>
          </div>

          {/* 3. Lọc Loại đơn (Dropdown) */}
          <div style={{ minWidth: 170 }}>
            <select
              className="emp-form-select"
              style={{ height: 40, padding: '0 12px', fontSize: 13, background: '#F8FAFC' }}
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả loại đơn</option>
              <option value={ScheduleRequestType.Overtime}>Làm thêm giờ (OT)</option>
              <option value={ScheduleRequestType.CheckInIncident}>Sự cố Check-in (Vào ca)</option>
              <option value={ScheduleRequestType.CheckOutIncident}>Sự cố Check-out (Ra ca)</option>
              <option value={ScheduleRequestType.ShiftSwap}>Đổi ca làm việc</option>
              <option value={ScheduleRequestType.LeaveRequest}>Xin nghỉ ca</option>
            </select>
          </div>

          {/* 4. Lọc Trạng thái duyệt (Dropdown) */}
          <div style={{ minWidth: 150 }}>
            <select
              className="emp-form-select"
              style={{ height: 40, padding: '0 12px', fontSize: 13, background: '#F8FAFC' }}
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value={ScheduleApprovalStatus.Pending}>Chờ duyệt</option>
              <option value={ScheduleApprovalStatus.Approved}>Đã duyệt</option>
              <option value={ScheduleApprovalStatus.Rejected}>Đã từ chối</option>
            </select>
          </div>

          {/* 5. Nút Đặt lại bộ lọc */}
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 40,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              color: hasActiveFilters ? '#EF4444' : '#94A3B8',
              background: hasActiveFilters ? '#FEE2E2' : '#F8FAFC',
              border: `1px solid ${hasActiveFilters ? '#FECACA' : '#E2E8F0'}`,
              borderRadius: 8,
              cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
            title="Xóa toàn bộ bộ lọc và từ khóa"
          >
            <RotateCw size={13} />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner if fetch fails */}
      {errorMessage && (
        <div
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchRequests()}
            style={{
              background: '#FFFFFF',
              border: '1px solid #F87171',
              color: '#B91C1C',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCw size={12} />
            Thử lại
          </button>
        </div>
      )}

      {/* ─── FULL-WIDTH TABLE CONTAINER ─── */}
      <div className="emp-table-container" style={{ width: '100%' }}>
        <table className="emp-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Mã NV</th>
              <th>Nhân viên</th>
              <th>Chi nhánh</th>
              <th>Ngày & Ca làm</th>
              <th>Loại đơn</th>
              <th>Nội dung / Chi tiết</th>
              <th style={{ width: 120 }}>Trạng thái</th>
              <th>Người duyệt / Ghi chú</th>
              <th style={{ width: 140, textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Loader2 size={28} className="animate-spin text-teal-600" />
                    <span style={{ color: '#64748B', fontSize: 13 }}>Đang tải danh sách đơn yêu cầu...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedRequests.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <FileCheck2 size={40} color="#94A3B8" />
                    <span style={{ color: '#64748B', fontSize: 14, fontWeight: 500 }}>
                      Không tìm thấy đơn yêu cầu nào phù hợp
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0F766E',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                      >
                        Xóa bộ lọc để xem tất cả
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRequests.map((req) => {
                const images = (req.evidenceImageUrls && req.evidenceImageUrls.length > 0)
                  ? req.evidenceImageUrls
                  : req.evidenceImageUrl
                  ? [req.evidenceImageUrl]
                  : [];

                const isPending = req.status === ScheduleApprovalStatus.Pending;

                return (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 600, color: '#0F766E' }}>
                      {req.employeeCode || '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{req.employeeName}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: '#475569' }}>{req.branchName || '—'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>
                        {new Date(req.workDate).toLocaleDateString('vi-VN')}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {req.shiftName} ({req.plannedStartTime.substring(0, 5)} - {req.plannedEndTime.substring(0, 5)})
                      </div>
                    </td>
                    <td>{renderRequestTypeBadge(req.requestType)}</td>
                    <td>
                      <div style={{ fontSize: 13, color: '#1E293B', maxWidth: 300 }}>
                        <div>{req.reason}</div>

                        {req.requestType === ScheduleRequestType.LeaveRequest && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            Loại nghỉ: {req.leaveType ? LeaveTypeLabels[req.leaveType] : 'Xin nghỉ'}
                            {req.isPaidLeave && ' (Có lương)'}
                          </div>
                        )}

                        {req.requestType === ScheduleRequestType.Overtime && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            Thời gian tăng ca: <strong>{req.requestedOvertimeMinutes || 0} phút</strong>
                          </div>
                        )}

                        {req.requestType === ScheduleRequestType.ShiftSwap && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            Đổi ca với: <strong>{req.targetEmployeeName || 'Đồng nghiệp'}</strong>
                            {req.peerConfirmed === true && ' (Đã đồng ý)'}
                            {req.peerConfirmed === false && ' (Đã từ chối)'}
                            {req.peerConfirmed === null && ' (Chờ xác nhận)'}
                          </div>
                        )}

                        {req.requestType === ScheduleRequestType.CheckInIncident && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {req.requestedCheckInTime && (
                              <span>Vào đề xuất: {new Date(req.requestedCheckInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        )}

                        {req.requestType === ScheduleRequestType.CheckOutIncident && (
                          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {req.requestedCheckOutTime && (
                              <span>Ra đề xuất: {new Date(req.requestedCheckOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        )}

                        {images.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <span
                              onClick={() => handleOpenLightbox(images, 0)}
                              style={{
                                color: '#0F766E',
                                cursor: 'pointer',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                              title="Xem ảnh minh chứng đính kèm"
                            >
                              <Paperclip size={12} />
                              <span>Minh chứng ({images.length} tệp)</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>
                      {req.reviewNote ? (
                        <div style={{ fontSize: 13, color: '#1E293B', maxWidth: 200 }}>
                          <div>{req.reviewNote}</div>
                          {req.approvedBy && (
                            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{req.approvedBy}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isPending ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(req, true)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0F766E',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Duyệt yêu cầu"
                          >
                            Duyệt
                          </button>
                          <span style={{ color: '#CBD5E1' }}>|</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAction(req, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              fontWeight: 500,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                            title="Từ chối yêu cầu"
                          >
                            Từ chối
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (images.length > 0) handleOpenLightbox(images, 0);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: images.length > 0 ? '#0F766E' : '#94A3B8',
                            fontSize: 13,
                            cursor: images.length > 0 ? 'pointer' : 'default',
                            padding: 0,
                          }}
                          disabled={images.length === 0}
                          title={images.length > 0 ? 'Xem ảnh minh chứng' : 'Đã xử lý'}
                        >
                          {images.length > 0 ? 'Xem ảnh' : '—'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ─── FOOTER PAGINATION ─── */}
        <div className="emp-table-footer">
          <TablePagination
            currentPage={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* ─── SUB-MODAL XÁC NHẬN DUYỆT / TỪ CHỐI ─── */}
      {isConfirmModalOpen && selectedRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: isApproveAction ? '#F0FDFA' : '#FEF2F2',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: isApproveAction ? '#0F766E' : '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isApproveAction ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                {isApproveAction ? 'Phê duyệt phiếu yêu cầu' : 'Từ chối phiếu yêu cầu'}
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} style={{ padding: 20 }}>
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <strong>Nhân viên:</strong> {selectedRequest.employeeName} ({selectedRequest.employeeCode})
                </div>
                <div>
                  <strong>Loại đơn:</strong> {ScheduleRequestTypeLabels[selectedRequest.requestType]}
                </div>
                <div>
                  <strong>Ngày làm việc:</strong> {new Date(selectedRequest.workDate).toLocaleDateString('vi-VN')} ({selectedRequest.shiftName})
                </div>
                <div>
                  <strong>Lý do gửi:</strong> {selectedRequest.reason}
                </div>
                {((selectedRequest.evidenceImageUrls && selectedRequest.evidenceImageUrls.length > 0) ||
                  selectedRequest.evidenceImageUrl) && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Ảnh minh chứng:</strong>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {((selectedRequest.evidenceImageUrls && selectedRequest.evidenceImageUrls.length > 0)
                        ? selectedRequest.evidenceImageUrls
                        : [selectedRequest.evidenceImageUrl!]
                      ).map((url, idx) => (
                        <img
                          key={url}
                          src={url}
                          alt={`Minh chứng ${idx + 1}`}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 6,
                            objectFit: 'cover',
                            border: '1px solid #CBD5E1',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            const list =
                              selectedRequest.evidenceImageUrls && selectedRequest.evidenceImageUrls.length > 0
                                ? selectedRequest.evidenceImageUrls
                                : [selectedRequest.evidenceImageUrl!];
                            handleOpenLightbox(list, idx);
                          }}
                          title="Bấm để xem phóng to"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tùy chọn riêng cho đơn Làm thêm giờ (OT) */}
              {isApproveAction && selectedRequest.requestType === ScheduleRequestType.Overtime && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                    Số phút OT duyệt tính công:
                  </label>
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={approvedMinutes}
                    onChange={(e) => setApprovedMinutes(Number(e.target.value))}
                    className="emp-form-input"
                    style={{ height: 38, width: '100%' }}
                    required
                  />
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    Yêu cầu ban đầu: {selectedRequest.requestedOvertimeMinutes || 0} phút
                  </span>
                </div>
              )}

              {/* Tùy chọn riêng cho đơn Xin nghỉ */}
              {isApproveAction && selectedRequest.requestType === ScheduleRequestType.LeaveRequest && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={isPaidLeave}
                      onChange={(e) => setIsPaidLeave(e.target.checked)}
                      style={{ accentColor: '#0F766E', width: 16, height: 16 }}
                    />
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>
                      Tính ngày nghỉ này có hưởng lương (Nghỉ phép năm)
                    </span>
                  </label>
                </div>
              )}

              {/* Ghi chú phê duyệt */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1E293B', marginBottom: 6 }}>
                  Ghi chú phản hồi / Lý do {isApproveAction ? 'duyệt' : 'từ chối'}:
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Nhập ghi chú cho nhân viên..."
                  className="emp-form-input"
                  style={{ width: '100%', minHeight: 80, padding: '8px 12px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="emp-btn emp-btn-secondary"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={isApproveAction ? 'emp-btn emp-btn-primary' : 'emp-btn'}
                  style={{
                    background: isApproveAction ? '#0F766E' : '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    minWidth: 110,
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isApproveAction ? (
                    'Xác nhận Duyệt'
                  ) : (
                    'Xác nhận Từ chối'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX XEM ẢNH MINH CHỨNG ─── */}
      {isPreviewOpen && previewImages.length > 0 && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              style={{
                position: 'absolute',
                top: -40,
                right: 0,
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
              }}
            >
              <X size={20} /> Đóng
            </button>

            <img
              src={previewImages[activeImageIndex]}
              alt="Minh chứng chi tiết"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: 8,
                objectFit: 'contain',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              }}
            />

            {previewImages.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginTop: 16,
                  overflowX: 'auto',
                  padding: 4,
                }}
              >
                {previewImages.map((img, idx) => (
                  <img
                    key={img}
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 6,
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: idx === activeImageIndex ? '2px solid #14B8A6' : '2px solid transparent',
                      opacity: idx === activeImageIndex ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── THÔNG BÁO HOÀN THÀNH ─── */}
      {notification && (
        <NotificationModal
          isOpen={notification.isOpen}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
export default ApprovalRequestsPage;
