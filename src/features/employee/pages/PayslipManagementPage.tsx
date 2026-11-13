import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  CreditCard,
  Printer,
  MoreHorizontal,
  Download,
  RefreshCw,
  RotateCw,
  Check,
  Inbox,
  Building2,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { PayslipDetailedRecord, Branch } from '../types';
import { employeeApi } from '../api/employeeApi';
import { scheduleApi } from '../api/scheduleApi';
import {
  payslipApi,
  mapBackendSummaryToDetailedRecord,
  extractErrorMessage,
} from '../api/payslipApi';
import { CreatePayslipModal } from '../components/payslip-management/CreatePayslipModal';
import { PayslipDetailModal } from '../components/payslip-management/PayslipDetailModal';
import { PayslipPaymentModal } from '../components/payslip-management/PayslipPaymentModal';
import { useLocation } from 'react-router-dom';
import { ConfirmModal, NotificationModal } from '../../../components/common';
import { getVietnamCurrentMonthIso, matchesAnyVietnameseSearch } from '../lib/vietnamTime';
import { useAuthStore } from '../../../stores/useAuthStore';
import '../employee.css';

const ACTIVE_BRANCH_STORAGE_KEY = 'mtgrms_active_branch';

export const PayslipManagementPage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const roleUpper = (user?.role || '').toUpperCase();
  const isEmployeePortal = location.pathname.startsWith('/employee/') || location.pathname === '/employee';
  const isOwnerOrAdmin = !isEmployeePortal && Boolean(
    user?.isAdmin ||
    roleUpper === 'STORE_OWNER' ||
    roleUpper === 'STOREOWNER' ||
    roleUpper === 'ADMIN'
  );

  const [payslips, setPayslips] = useState<PayslipDetailedRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters state - Mặc định hiển thị kỳ tháng 10/2026 (kỳ chốt công mẫu của hệ thống)
  const [keyword, setKeyword] = useState<string>('');
  const [periodMonth, setPeriodMonth] = useState<string>('2026-10');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
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

  // Lắng nghe thay đổi chi nhánh từ StoreOwnerLayout (BranchSelectorDropdown)
  useEffect(() => {
    const handleBranchChanged = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setActiveBranch(customEvent.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_BRANCH_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setActiveBranch(parsed);
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

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [viewingPayslipId, setViewingPayslipId] = useState<string | null>(null);
  const [payingPayslip, setPayingPayslip] = useState<PayslipDetailedRecord | null>(null);
  const [batchPayingPayslips, setBatchPayingPayslips] = useState<PayslipDetailedRecord[] | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState<boolean>(false);
  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Common Notification & Confirm Modals state
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string | React.ReactNode;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
    isLoading?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string | React.ReactNode
  ) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
    });
  };

  // Click outside to close action dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch branches on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      try {
        const branchList = await employeeApi.getBranches();
        if (isMounted && branchList.length > 0) {
          setBranches(branchList);
        }
      } catch (err) {
        console.error('Không thể tải danh sách chi nhánh:', err);
      }
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Payslips data from API
  const fetchPayslips = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const branchIdParam = isOwnerOrAdmin && activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : undefined;

    try {
      const paged = await payslipApi.getPayslipsPaged({
        periodMonth,
        branchId: branchIdParam,
        status: isOwnerOrAdmin && statusFilter !== 'ALL' ? statusFilter : undefined,
        page: 1,
        pageSize: 500,
      });

      const items = (paged.items || []).map(mapBackendSummaryToDetailedRecord);
      setPayslips(items);
      setSelectedIds([]);
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Lỗi khi tải danh sách phiếu lương từ máy chủ.');
      setErrorMessage(msg);
      setPayslips([]);
    } finally {
      setIsLoading(false);
    }
  }, [periodMonth, activeBranch, statusFilter, isOwnerOrAdmin]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  // Lọc client-side theo từ khóa (hỗ trợ tiếng Việt có dấu / không dấu, không phân biệt hoa - thường)
  const filteredPayslips = useMemo(() => {
    if (!isOwnerOrAdmin || !keyword.trim()) return payslips;
    return payslips.filter((item) =>
      matchesAnyVietnameseSearch(
        [item.employeeCode, item.employeeName, item.payslipCode, item.branchName, item.note],
        keyword
      )
    );
  }, [payslips, keyword, isOwnerOrAdmin]);

  useEffect(() => {
    setSelectedIds([]);
  }, [keyword]);

  // Financial Summary Cards
  const financialSummary = useMemo(() => {
    let totalPayroll = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    filteredPayslips.forEach((item) => {
      totalPayroll += item.netSalary;
      if (item.status === 'PAID') {
        totalPaid += item.netSalary;
      } else {
        totalRemaining += item.netSalary;
      }
    });

    return {
      totalPayroll,
      totalPaid,
      totalRemaining,
      totalEmployees: filteredPayslips.length,
    };
  }, [filteredPayslips]);

  // Format Helpers
  const formatVND = (num?: number) => {
    if (num === undefined || num === null) return '0\u00A0₫';
    return `${Math.round(num).toLocaleString('vi-VN')}\u00A0₫`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const cleanDate = dateStr.split(' ')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return cleanDate;
  };

  // Month navigation (múi giờ Việt Nam UTC+7)
  const currentMonthIso = useMemo(() => {
    return getVietnamCurrentMonthIso();
  }, []);

  const handleCurrentMonth = () => {
    setPeriodMonth(currentMonthIso);
  };

  const handlePrevMonth = () => {
    const [year, month] = periodMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    setPeriodMonth(`${yStr}-${mStr}`);
  };

  const handleNextMonth = () => {
    const [year, month] = periodMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    setPeriodMonth(`${yStr}-${mStr}`);
  };

  const monthLabel = useMemo(() => {
    const parts = periodMonth.split('-');
    if (parts.length === 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    return periodMonth;
  }, [periodMonth]);

  // Row selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPayslips.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Payment modal trigger
  const handleOpenBatchPayModal = () => {
    const unpaidSelected = filteredPayslips.filter(
      (p) => selectedIds.includes(p.id) && p.status === 'UNPAID'
    );
    if (unpaidSelected.length === 0) {
      showNotification(
        'warning',
        'Chưa chọn phiếu lương hợp lệ',
        'Vui lòng tích chọn ít nhất một phiếu lương ở trạng thái Chưa thanh toán để thực hiện chi trả.'
      );
      return;
    }
    setBatchPayingPayslips(unpaidSelected);
  };

  // Tính lại bảng lương cho các phiếu lương chưa chi trả (chỉ áp dụng cho nhân viên có ca làm trong tháng)
  const handleRecalculateUnpaid = async () => {
    setShowActionDropdown(false);

    const [year, month] = periodMonth.split('-').map(Number);
    if (!year || !month) {
      showNotification('warning', 'Kỳ tháng không hợp lệ', 'Vui lòng chọn kỳ tháng hợp lệ trước khi tính lại bảng lương.');
      return;
    }

    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const activeBranchId = activeBranch && activeBranch.id !== 'ALL' ? activeBranch.id : undefined;

    try {
      setIsRecalculating(true);
      const schedulesInMonth = await scheduleApi.getRawSchedules({
        branchId: activeBranchId,
        fromDate,
        toDate,
        pageSize: 1000,
      });

      const validSchedules = schedulesInMonth.filter(
        (s) => (s.status || '').toLowerCase() !== 'cancelled' || (s.approvalType || '').toUpperCase() === 'UNPAID_LEAVE'
      );
      const employeeIdsWithSchedules = new Set(validSchedules.map((s) => s.employeeId));

      if (employeeIdsWithSchedules.size === 0) {
        showNotification(
          'warning',
          'Không có ca làm việc trong kỳ',
          `Không tìm thấy nhân viên nào có ca làm việc trong ${monthLabel}${activeBranchId ? ` tại ${activeBranch?.name}` : ''}. Chỉ những nhân viên có ca làm việc trong tháng mới được khởi tạo hoặc tính lại bảng lương.`
        );
        return;
      }

      const unpaidWithScheduleCount = payslips.filter(
        (p) => p.status === 'UNPAID' && employeeIdsWithSchedules.has(p.employeeId)
      ).length;
      const paidCount = payslips.filter((p) => p.status === 'PAID').length;

      setConfirmModal({
        isOpen: true,
        title: `Tính lại bảng lương kỳ ${monthLabel}`,
        variant: 'primary',
        confirmText: 'Bắt đầu tính lại',
        cancelText: 'Hủy bỏ',
        message: (
          <div>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
              Hệ thống sẽ kiểm tra và tổng hợp lại ngày công, giờ làm, OT và phụ cấp mới nhất cho các nhân viên <strong>có ca làm việc</strong> trong kỳ <strong>{monthLabel}</strong>:
            </p>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0F766E', fontWeight: 600 }}>
                <span>•</span>
                <span>Nhân viên có ca làm việc trong tháng: {employeeIdsWithSchedules.size} nhân viên</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#D97706', fontWeight: 600, marginTop: 4 }}>
                <span>•</span>
                <span>Phiếu lương CHƯA CHI TRẢ hiện có: {unpaidWithScheduleCount} phiếu (sẽ được tính lại / khởi tạo theo ca thực tế)</span>
              </div>
              {paidCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#059669', fontWeight: 600, marginTop: 4 }}>
                  <span>•</span>
                  <span>Phiếu lương ĐÃ THANH TOÁN: {paidCount} phiếu (bảo lưu nguyên vẹn, không ghi đè)</span>
                </div>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
              Lưu ý: Nhân viên không có ca làm việc nào trong kỳ {monthLabel} sẽ không được khởi tạo lại bảng lương.
            </p>
          </div>
        ),
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isLoading: true }));
          setIsRecalculating(true);
          try {
            const recalculatedList = await payslipApi.recalculatePayroll({
              periodMonth,
              branchId: activeBranchId,
              note: `Tính lại lương kỳ ${periodMonth} - cập nhật công thực tế`,
            });

            setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
            showNotification(
              'success',
              'Tính lại bảng lương thành công',
              `Đã hoàn tất tính toán và cập nhật bảng lương cho ${recalculatedList.length} nhân viên có ca làm việc trong kỳ ${monthLabel}!`
            );
            await fetchPayslips();
          } catch (err: any) {
            setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
            showNotification(
              'error',
              'Không thể tính toán lại',
              extractErrorMessage(err, 'Lỗi khi tính toán lại bảng lương.')
            );
          } finally {
            setIsRecalculating(false);
          }
        },
      });
    } catch (err: any) {
      showNotification(
        'error',
        'Lỗi kiểm tra dữ liệu ca làm việc',
        extractErrorMessage(err, 'Không thể kiểm tra danh sách ca làm việc trong kỳ tháng.')
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResetFilters = () => {
    setKeyword('');
    setPeriodMonth('2026-10');
    setStatusFilter('ALL');
  };

  return (
    <div className="emp-page-container">
      {/* ─── 1. HEADER BAR ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h2 className="emp-header-title">
          <span>{isOwnerOrAdmin ? 'Bảng tính lương' : 'Phiếu lương của tôi'}</span>
          <span className="count-badge">{filteredPayslips.length}</span>
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={fetchPayslips}
            disabled={isLoading}
            title="Tải lại dữ liệu"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Tải lại</span>
          </button>

          {isOwnerOrAdmin && (
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={16} />
              <span>Khởi tạo bảng lương</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. FINANCIAL SUMMARY CARDS (Chỉ hiển thị cho Quản lý / Chủ cửa hàng) ─── */}
      {isOwnerOrAdmin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {/* Card 1: Tổng quỹ lương */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(15, 118, 110, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#CCFBF1',
                color: '#0F766E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <DollarSign size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Tổng quỹ lương</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                {formatVND(financialSummary.totalPayroll)}
              </div>
            </div>
          </div>

          {/* Card 2: Đã thanh toán */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Đã thanh toán</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                {formatVND(financialSummary.totalPaid)}
              </div>
            </div>
          </div>

          {/* Card 3: Còn phải trả */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Còn phải trả</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#D97706', marginTop: 2 }}>
                {formatVND(financialSummary.totalRemaining)}
              </div>
            </div>
          </div>

          {/* Card 4: Tổng nhân sự */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '16px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Tổng nhân sự</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                {financialSummary.totalEmployees} người
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. FILTER & TOOLBAR ─── */}
      <div className="emp-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Ô tìm kiếm (Chỉ hiển thị cho Chủ cửa hàng / Quản trị viên) */}
          {isOwnerOrAdmin && (
            <div className="emp-search-box" style={{ width: 280, position: 'relative' }}>
              <span className="emp-search-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Tìm theo mã, tên NV, ghi chú..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ paddingRight: keyword ? 36 : 16 }}
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
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
                  }}
                  title="Xóa tìm kiếm"
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Bộ lọc Chi nhánh (Chỉ hiển thị cho Chủ cửa hàng / Quản lý) */}
          {isOwnerOrAdmin && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
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
          )}

          {/* Điều hướng kỳ tháng */}
          <div className="emp-date-navigator">
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handlePrevMonth}
              title="Tháng trước"
            >
              &lt;
            </button>
            <span
              className="emp-date-navigator-label"
              onClick={handleCurrentMonth}
              style={{ cursor: 'pointer' }}
              title="Nhấn để về tháng hiện tại"
            >
              {monthLabel}
            </span>
            <button
              type="button"
              className="emp-date-navigator-btn"
              onClick={handleNextMonth}
              title="Tháng sau"
            >
              &gt;
            </button>
          </div>

          {/* Nút Tháng này */}
          <button
            type="button"
            className="emp-btn emp-btn-secondary"
            onClick={handleCurrentMonth}
            title="Quay về tháng hiện tại"
            style={{
              height: 36,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 500,
              color: periodMonth === currentMonthIso ? '#0F766E' : '#475569',
              borderColor: periodMonth === currentMonthIso ? '#0F766E' : '#CBD5E1',
              backgroundColor: periodMonth === currentMonthIso ? '#F0FDFA' : '#FFFFFF',
              boxShadow: periodMonth === currentMonthIso ? '0 0 0 1px rgba(15, 118, 110, 0.2)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Tháng này
          </button>

          {/* Bộ lọc trạng thái thanh toán (Chỉ dành cho Store Owner / Admin) */}
          {isOwnerOrAdmin && (
            <select
              className="emp-filter-select"
              style={{ height: 36, fontSize: 13, width: 160 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'UNPAID' | 'PAID')}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
            </select>
          )}

          {/* Nút đặt lại bộ lọc */}
          {isOwnerOrAdmin && (() => {
            const hasActiveFilters =
              Boolean(keyword.trim()) || statusFilter !== 'ALL' || periodMonth !== '2026-10';
            return (
              <button
                type="button"
                disabled={!hasActiveFilters}
                onClick={handleResetFilters}
                title="Xóa toàn bộ bộ lọc và từ khóa"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  padding: '0 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: hasActiveFilters ? '#EF4444' : '#94A3B8',
                  background: hasActiveFilters ? '#FEE2E2' : '#F8FAFC',
                  border: `1px solid ${hasActiveFilters ? '#FECACA' : '#E2E8F0'}`,
                  borderRadius: 8,
                  cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCw size={13} />
                <span>Đặt lại bộ lọc</span>
              </button>
            );
          })()}
        </div>

        {/* Nút hành động */}
        <div className="emp-header-actions">
          {isOwnerOrAdmin && selectedIds.length > 0 && (
            <button
              type="button"
              className="emp-btn emp-btn-primary"
              onClick={handleOpenBatchPayModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#0F766E',
              }}
            >
              <CreditCard size={15} />
              <span>Chi trả đã chọn ({selectedIds.length})</span>
            </button>
          )}

          {/* Action Dropdown */}
          <div ref={actionDropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="emp-btn emp-btn-secondary"
              style={{ width: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowActionDropdown(!showActionDropdown)}
            >
              <MoreHorizontal size={18} />
            </button>

            {showActionDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  right: 0,
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: '1px solid #E2E8F0',
                  minWidth: 220,
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      fontSize: 13,
                      cursor: isRecalculating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#0F766E',
                      fontWeight: 600,
                      borderBottom: '1px solid #F1F5F9',
                    }}
                    onClick={handleRecalculateUnpaid}
                    disabled={isRecalculating}
                  >
                    <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
                    <span>{isRecalculating ? 'Đang tính lại...' : `Tính lại lương kỳ ${monthLabel}`}</span>
                  </button>
                )}
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => {
                    setShowActionDropdown(false);
                    showNotification(
                      'info',
                      'Xuất file Excel',
                      `Đang xuất bảng lương ${filteredPayslips.length} nhân sự ra tệp Excel (.xlsx)...`
                    );
                  }}
                >
                  <Download size={14} />
                  <span>Xuất file Excel</span>
                </button>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onClick={() => {
                    window.print();
                    setShowActionDropdown(false);
                  }}
                >
                  <Printer size={14} />
                  <span>In danh sách</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. ERROR ALERT NẾU CÓ ─── */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            color: '#991B1B',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} color="#DC2626" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchPayslips}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ─── 5. BẢNG DỮ LIỆU PHIẾU LƯƠNG ─── */}
      <div className="emp-table-container" style={{ overflowX: 'auto', background: '#FFFFFF', position: 'relative' }}>
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              gap: 8,
            }}
          >
            <Loader2 size={32} className="animate-spin" color="#0F766E" />
            <span style={{ fontSize: 13, color: '#0F766E', fontWeight: 600 }}>
              Đang tải danh sách bảng lương...
            </span>
          </div>
        )}

        <table className="emp-table" style={{ width: '100%', minWidth: 880 }}>
          <thead>
            <tr>
              {isOwnerOrAdmin && (
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: '#0F766E' }}
                    checked={
                      filteredPayslips.length > 0 &&
                      selectedIds.length === filteredPayslips.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              <th style={{ width: 120, whiteSpace: 'nowrap' }}>Mã NV</th>
              <th style={{ minWidth: 200, whiteSpace: 'nowrap' }}>Nhân viên</th>
              <th style={{ width: 110, textAlign: 'center', whiteSpace: 'nowrap' }}>Kỳ lương</th>
              <th style={{ width: 120, textAlign: 'center', whiteSpace: 'nowrap' }}>Công / Giờ</th>
              <th style={{ width: 150, textAlign: 'right', whiteSpace: 'nowrap' }}>Tổng thu nhập</th>
              <th style={{ width: 180, textAlign: 'right', whiteSpace: 'nowrap' }}>Thực nhận (Net)</th>
              <th style={{ width: 180, textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
              <th style={{ width: 140, textAlign: 'center', whiteSpace: 'nowrap' }}>Ngày trả</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayslips.length === 0 && !isLoading ? (
              <tr>
                <td
                  colSpan={isOwnerOrAdmin ? 9 : 8}
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: '#94A3B8',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <Inbox size={36} color="#94A3B8" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
                    Chưa có phiếu lương nào cho kỳ {monthLabel}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: '#64748B' }}>
                    Hệ thống chưa tìm thấy phiếu lương đã tính trong kỳ này.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
                    {periodMonth !== '2026-10' && (
                      <button
                        type="button"
                        className="emp-btn emp-btn-secondary"
                        onClick={() => setPeriodMonth('2026-10')}
                        style={{ fontSize: 12, height: 32 }}
                      >
                        Chuyển về kỳ Tháng 10/2026 (Kỳ mẫu)
                      </button>
                    )}
                    {isOwnerOrAdmin && (
                      <button
                        type="button"
                        className="emp-btn emp-btn-primary"
                        onClick={() => setIsCreateOpen(true)}
                        style={{ fontSize: 12, height: 32 }}
                      >
                        + Khởi tạo bảng lương {monthLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayslips.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isPaid = item.status === 'PAID';
                const initials = item.employeeName
                  .split(' ')
                  .pop()
                  ?.charAt(0)
                  .toUpperCase() || 'E';

                return (
                  <tr
                    key={item.id}
                    onClick={() => setViewingPayslipId(item.id)}
                    title="Nhấn để xem chi tiết phiếu lương"
                    style={{
                      background: isSelected ? '#F0FDFA' : undefined,
                      cursor: 'pointer',
                    }}
                  >
                    {isOwnerOrAdmin && (
                      <td
                        style={{ textAlign: 'center', width: 44 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          style={{ accentColor: '#0F766E' }}
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                        />
                      </td>
                    )}
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: '#0F766E' }}>
                      {item.employeeCode}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="emp-avatar-cell" style={{ flexShrink: 0 }}>
                          {initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13.5, lineHeight: 1.3 }}>
                            {item.employeeName}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                            }}
                            title={item.branchName}
                          >
                            <Building2 size={12} color="#94A3B8" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.branchName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#F1F5F9',
                          color: '#334155',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {item.periodMonth.split('-').length === 2
                          ? `Tháng ${item.periodMonth.split('-')[1]}/${item.periodMonth.split('-')[0]}`
                          : item.periodMonth}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 12.5, color: '#334155' }}>
                      {item.salaryType === 'HOURLY' ? (
                        <span><strong>{item.totalWorkHours}</strong> giờ</span>
                      ) : (
                        <span><strong>{item.workedDays}</strong> công</span>
                      )}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#475569',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatVND(item.totalEarnings)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 800,
                        color: '#047857',
                        fontSize: 14,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatVND(item.netSalary)}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isPaid ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#059669',
                            background: '#ECFDF5',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          <Check size={14} strokeWidth={2.5} />
                          <span>Đã thanh toán</span>
                        </span>
                      ) : isOwnerOrAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPayingPayslip(item);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#D97706',
                            background: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            padding: '3px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                          }}
                          title="Nhấn để chi trả phiếu lương này"
                        >
                          <Clock size={13} strokeWidth={2.2} />
                          <span>Chi trả ngay</span>
                        </button>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#D97706',
                            background: '#FEF3C7',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          <Clock size={13} strokeWidth={2} />
                          <span>Chưa thanh toán</span>
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                      {formatDate(item.paidAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 6. MODALS ─── */}
      <CreatePayslipModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        branches={branches}
        initialPeriodMonth={periodMonth}
        onCalculationSuccess={(count) => {
          setIsCreateOpen(false);
          showNotification(
            'success',
            'Khởi tạo bảng lương thành công',
            `Đã tính toán và khởi tạo thành công ${count} phiếu lương cho kỳ ${periodMonth}!`
          );
          fetchPayslips();
        }}
      />

      <PayslipDetailModal
        isOpen={!!viewingPayslipId}
        onClose={() => setViewingPayslipId(null)}
        payslipId={viewingPayslipId}
        onPayNow={(p) => {
          setViewingPayslipId(null);
          setPayingPayslip(p);
        }}
      />

      <PayslipPaymentModal
        isOpen={!!payingPayslip || !!batchPayingPayslips}
        onClose={() => {
          setPayingPayslip(null);
          setBatchPayingPayslips(null);
        }}
        payslip={payingPayslip}
        batchPayslips={batchPayingPayslips}
        onPaymentSuccess={() => {
          setPayingPayslip(null);
          setBatchPayingPayslips(null);
          setSelectedIds([]);
          showNotification(
            'success',
            'Thanh toán thành công',
            'Đã ghi nhận thanh toán lương và tự động hạch toán phiếu chi tương ứng vào Sổ quỹ.'
          );
          fetchPayslips();
        }}
      />

      {/* Common Modals từ src/components/common */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        variant={confirmModal.variant}
        isLoading={confirmModal.isLoading}
      />

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

export default PayslipManagementPage;
