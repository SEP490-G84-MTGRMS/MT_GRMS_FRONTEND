import { type FC, useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Receipt, FileSpreadsheet, AlertTriangle, Loader2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../../stores/useAuthStore';
import { employeeApi } from '../../employee/api/employeeApi';
import {
  AdminToast,
  type ToastState,
} from '../../admin/components';
import { BillPreviewModal } from '../components/BillPreviewModal';
import { ConfirmModal } from '../../../components/common';
import { CreateExpenseModal } from '../components/CreateExpenseModal';
import { ExpenseFilterBar } from '../components/ExpenseFilterBar';
import { ExpenseTable } from '../components/ExpenseTable';
import { PayExpenseModal } from '../components/PayExpenseModal';
import {
  useApproveExpense,
  useCancelExpense,
  useCreateExpense,
  useExpenseSummary,
  usePayExpense,
  useRejectExpense,
  useServiceExpenses,
} from '../hooks/useServiceExpenses';
import { getServiceExpenses } from '../api/expenseApi';
import {
  EXPENSE_CATEGORY_LABELS,
  type CreateExpenseRequest,
  type ExpenseFilterParams,
  type PayExpenseRequest,
  type ServiceExpenseDto,
} from '../types/expense.types';
import { calculatePeriodRange } from '../utils/datePeriodUtils';
import { getVietnamTodayIso } from '../../employee/lib/vietnamTime';
import '../../purchase-order/purchase-order.css';
import '../../../styles/so-list-page.css';
import '../service-expenses.css';

/**
 * Trích xuất branchId ban đầu từ authStore hoặc localStorage mtgrms_active_branch
 */
const getInitialActiveBranchId = (userBranchId?: string): string => {
  try {
    const raw = localStorage.getItem('mtgrms_active_branch');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.id !== 'ALL') {
        return parsed.id;
      }
    }
  } catch {
    // fallback
  }
  return userBranchId || '';
};

export const ServiceExpensesPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const canManageExpenses = user?.role === 'STORE_OWNER';
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const urlBranchId = searchParams.get('branchId');
  const initialRange = calculatePeriodRange('this-month');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilterParams>(() => {
    return {
      page: 1,
      pageSize: 10,
      branchId: urlBranchId === 'ALL' ? '' : (urlBranchId || getInitialActiveBranchId(user?.branchId)),
      category: '',
      status: '',
      quickStatus: 'ALL',
      keyword: urlSearch,
      fromDate: urlSearch ? undefined : initialRange.fromDate,
      toDate: urlSearch ? undefined : initialRange.toDate,
    };
  });

  // Tải danh sách chi nhánh hoạt động thực tế từ Backend
  useEffect(() => {
    let isMounted = true;
    employeeApi.getBranches().then((list) => {
      if (isMounted && list && list.length > 0) {
        setBranches(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Đồng bộ chi nhánh đang chọn từ TopNav (mtgrms_active_branch & event mtgrms:branch-changed)
  useEffect(() => {
    if (urlBranchId !== null) return;
    const handleGlobalBranchChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ id?: string }>;
      const branch = customEvent.detail;
      if (branch) {
        const nextBranchId = branch.id === 'ALL' ? '' : (branch.id || '');
        setFilters((prev) => ({
          ...prev,
          branchId: nextBranchId,
          page: 1,
        }));
      }
    };

    window.addEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    return () => {
      window.removeEventListener('mtgrms:branch-changed', handleGlobalBranchChange);
    };
  }, [urlBranchId]);

  // Keep filters in sync when navigation query parameters change
  useEffect(() => {
    if (urlSearch) {
      setFilters((prev) => ({
        ...prev,
        keyword: urlSearch,
        ...(urlBranchId !== null ? { branchId: urlBranchId === 'ALL' ? '' : urlBranchId, status: '', category: '', quickStatus: 'ALL' } : {}),
        fromDate: undefined,
        toDate: undefined,
        page: 1,
      }));
    }
  }, [urlSearch, urlBranchId]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<ServiceExpenseDto | null>(null);
  const [cancelingItem, setCancelingItem] = useState<ServiceExpenseDto | null>(null);
  const [rejectingItem, setRejectingItem] = useState<ServiceExpenseDto | null>(null);
  const [approvingSuspiciousItem, setApprovingSuspiciousItem] = useState<ServiceExpenseDto | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [approvalReasonError, setApprovalReasonError] = useState('');
  const [previewBill, setPreviewBill] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Toast state (AdminToast standard)
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2800);
  };

  // Queries & Mutations
  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isRefetching,
  } = useServiceExpenses(filters);

  const { data: summaryData } = useExpenseSummary(
    filters.branchId || undefined,
    filters.fromDate,
    filters.toDate
  );

  const createExpenseMutation = useCreateExpense();
  const payExpenseMutation = usePayExpense();
  const cancelExpenseMutation = useCancelExpense();
  const rejectExpenseMutation = useRejectExpense();
  const approveExpenseMutation = useApproveExpense();

  const handleCreateSubmit = async (data: CreateExpenseRequest) => {
    try {
      await createExpenseMutation.mutateAsync(data);
      showToast('Đã tạo phiếu chi phí vận hành thành công!', 'success');
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Lỗi khi tạo phiếu chi phí';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleApproveClick = async (item: ServiceExpenseDto) => {
    if (item.isFlaggedAsSuspiciousSplit) {
      setApprovingSuspiciousItem(item);
      setApprovalReason('');
      setApprovalReasonError('');
      return;
    }

    try {
      await approveExpenseMutation.mutateAsync({
        expenseId: item.expenseId,
      });
      showToast(`Đã phê duyệt phiếu chi ${item.voucherCode || item.expenseId} thành công!`, 'success');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Lỗi khi phê duyệt phiếu chi';
      showToast(msg, 'error');
    }
  };

  const handleConfirmSuspiciousApprove = async () => {
    if (!approvingSuspiciousItem) return;
    const trimmedReason = approvalReason.trim();
    if (!trimmedReason) {
      setApprovalReasonError('Bắt buộc nhập lý do giải trình khi phê duyệt phiếu chi bị gắn cờ nghi vấn.');
      return;
    }

    try {
      await approveExpenseMutation.mutateAsync({
        expenseId: approvingSuspiciousItem.expenseId,
        note: trimmedReason,
      });
      showToast(
        `Đã phê duyệt phiếu chi ${approvingSuspiciousItem.voucherCode || approvingSuspiciousItem.expenseId} thành công!`,
        'success'
      );
      setApprovingSuspiciousItem(null);
      setApprovalReason('');
      setApprovalReasonError('');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Lỗi khi phê duyệt phiếu chi';
      showToast(msg, 'error');
    }
  };

  const handleFilterChange = (updated: Partial<ExpenseFilterParams>) => {
    if (updated.keyword !== undefined) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (updated.keyword) {
            next.set('search', updated.keyword);
          } else {
            next.delete('search');
            next.delete('keyword');
          }
          return next;
        },
        { replace: true }
      );
    }
    setFilters((prev) => ({
      ...prev,
      ...updated,
      page: 1, // Reset to page 1 on filter change
    }));
  };

  const handleResetFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        next.delete('keyword');
        return next;
      },
      { replace: true }
    );
    const range = calculatePeriodRange('this-month');
    setFilters({
      page: 1,
      pageSize: 10,
      branchId: getInitialActiveBranchId(user?.branchId),
      category: '',
      status: '',
      quickStatus: 'ALL',
      keyword: '',
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
  };

  const handlePaySubmit = async (
    expenseId: string,
    data: PayExpenseRequest
  ) => {
    try {
      await payExpenseMutation.mutateAsync({ expenseId, data });
      showToast('Đã hoàn tất thanh toán và hạch toán dòng tiền Sổ quỹ!', 'success');
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errObj?.response?.data?.message || errObj?.message || 'Lỗi khi xuất quỹ thanh toán chi phí';
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleCancelClick = (item: ServiceExpenseDto) => {
    setCancelingItem(item);
  };

  const handleConfirmCancel = async () => {
    if (!cancelingItem) return;
    try {
      await cancelExpenseMutation.mutateAsync({
        expenseId: cancelingItem.expenseId,
        reason:
          cancelingItem.status === 'Paid'
            ? 'Chủ cửa hàng yêu cầu đảo bút toán hoàn tiền phiếu chi'
            : 'Người dùng hủy thao tác trên hệ thống quản lý',
      });
      showToast(
        cancelingItem.status === 'Paid'
          ? 'Đã đảo bút toán và hoàn tiền vào quỹ nguồn thành công.'
          : 'Đã hủy khoản chi phí thành công.',
        'info'
      );
      setCancelingItem(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi hủy khoản chi', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      await rejectExpenseMutation.mutateAsync({
        expenseId: rejectingItem.expenseId,
        reason: 'Chủ cửa hàng từ chối phê duyệt phiếu chi',
      });
      showToast('Đã từ chối phê duyệt phiếu chi.', 'info');
      setRejectingItem(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi từ chối phiếu chi', 'error');
    }
  };

  const todayIso = getVietnamTodayIso();
  const expenseRows = useMemo(() => {
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    return (expensesData?.items ?? []).map((item) => ({
      ...item,
      branchName: item.branchName || branchNames.get(item.branchId) || 'Không xác định',
    }));
  }, [branches, expensesData?.items]);

  const clientOverdueCount = expensesData?.items
    ? expensesData.items.filter(
        (i) => i.status === 'Pending' && Boolean(i.dueDate) && i.dueDate < todayIso
      ).length
    : 0;
  const overdueCount = summaryData?.overdueCount ?? clientOverdueCount;

  const sanitizeExcelCell = (raw: string | number | null | undefined): string => {
    const str = String(raw ?? '');
    return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Đang kết xuất danh sách chi phí vận hành ra tệp Excel (.xlsx)...', 'info');

    try {
      const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
      const allPaged = await getServiceExpenses({
        ...filters,
        page: 1,
        pageSize: 200,
      });
      const exportItems = (allPaged.items.length > 0 ? allPaged.items : expenseRows).map((item) => ({
        ...item,
        branchName: item.branchName || branchNames.get(item.branchId) || 'Không xác định',
      }));
      if (!exportItems.length) {
        showToast('Không có dữ liệu chi phí nào để xuất theo bộ lọc hiện tại.', 'warning');
        return;
      }

      const headers = [
        'Mã Phiếu Chi',
        'Danh Mục Chi Phí',
        'Chi Nhánh',
        'Nhà Cung Cấp / Đối Tác',
        'Diễn Giải',
        'Hạn Thanh Toán',
        'Số Tiền (đ)',
        'Trạng Thái',
        'Thuế Hợp Lệ',
        'Định Kỳ',
      ];

      const sheetRows: Array<Array<string | number>> = [headers];

      for (const item of exportItems) {
        const code = item.voucherCode || item.expenseId;
        const catLabel = EXPENSE_CATEGORY_LABELS[item.category] || item.category;
        const statusLabel =
          item.status === 'Paid'
            ? 'Đã thanh toán'
            : item.status === 'Pending'
            ? 'Chờ thanh toán'
            : item.status === 'Cancelled'
            ? 'Đã hủy'
            : item.status;
        sheetRows.push([
          sanitizeExcelCell(code),
          sanitizeExcelCell(catLabel),
          sanitizeExcelCell(item.branchName || item.branchId || ''),
          sanitizeExcelCell(item.vendorName || ''),
          sanitizeExcelCell(item.note || ''),
          sanitizeExcelCell(item.dueDate || ''),
          Number(item.amount || 0),
          sanitizeExcelCell(statusLabel),
          sanitizeExcelCell(item.isTaxDeductible === false ? 'Loại trừ' : 'Hợp lệ'),
          sanitizeExcelCell(item.isRecurring ? 'Định kỳ' : 'Không'),
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ChiPhiVanHanh');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      XLSX.writeFile(workbook, `ChiPhi_VanHanh_${dateStr}.xlsx`);

      showToast(`Đã xuất thành công ${exportItems.length} khoản chi ra tệp Excel (.xlsx).`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất file Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Toast Notification (Shared AdminToast) */}
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── 1. Page Header: Fixed Height ~44px Standard Store-Owner Header ── */}
      <div className="so-list-header" style={{ minHeight: 44 }}>
        <div>
          <h1 className="so-list-title">
            <Receipt size={22} color="var(--blue-primary, #0f766e)" />
            <span>Chi Phí Vận Hành &amp; Dịch Vụ Ngoài</span>
            <span className="so-list-filter-badge">{expensesData?.totalItems ?? 0} khoản chi</span>
            {(isExpensesLoading || isRefetching) && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          {overdueCount > 0 && (
            <button
              type="button"
              className="po-btn po-btn-secondary"
              onClick={() =>
                handleFilterChange({
                  status: filters.status === 'Pending' ? undefined : 'Pending',
                })
              }
              style={{
                borderColor: '#f87171',
                color: '#be123c',
                fontWeight: 800,
                backgroundColor: filters.status === 'Pending' ? '#fef2f2' : undefined,
              }}
              title="Lọc nhanh các khoản chi quá hạn / chờ thanh toán"
            >
              <AlertTriangle size={14} />
              <span>{overdueCount} khoản quá hạn</span>
            </button>
          )}

          <Link
            to="/store-owner/cashbook"
            className="po-btn po-btn-secondary"
            title="Xem đối chiếu Sổ quỹ Cashbook"
          >
            <span>Đối chiếu Sổ quỹ</span>
          </Link>

          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={handleExportExcel}
            disabled={isExporting}
            title="Xuất danh sách chi phí ra tệp Excel (.xlsx)"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            <span>Xuất Excel</span>
          </button>

          {canManageExpenses && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
              title="Tạo phiếu chi phí vận hành mới"
            >
              <Plus size={14} />
              <span>Tạo phiếu chi</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 1.5 KPI Summary Strip (Live from /api/expenses/summary) ── */}
      {summaryData && (
        <div className="so-kpi-strip" aria-label="Tổng hợp chi phí trong kỳ">
          <div className="so-kpi-strip-card">
            <span className="so-kpi-strip-label">Tổng chi phí trong kỳ</span>
            <span className="so-kpi-strip-value" style={{ color: '#0f172a' }}>
              {summaryData.totalExpenseThisMonth.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="so-kpi-strip-card">
            <span className="so-kpi-strip-label">Đã thanh toán</span>
            <span className="so-kpi-strip-value" style={{ color: '#0f766e' }}>
              {summaryData.totalPaidAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="so-kpi-strip-card">
            <span className="so-kpi-strip-label">Chờ duyệt / Chờ chi</span>
            <span className="so-kpi-strip-value" style={{ color: '#b45309' }}>
              {summaryData.totalPendingAmount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>
      )}

      {/* ── 2. Standardized Filter Bar (CSS Grid 4x2 ~86px) ── */}
      <ExpenseFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        branches={branches}
        categories={Array.from(new Set(expenseRows.map((row) => row.category).filter(Boolean)))}
      />

      {/* ── 3. Standardized Expense Table (.so-list-table-card with pinned pagination) ── */}
      <ExpenseTable
        data={expenseRows}
        isLoading={isExpensesLoading}
        totalItems={expensesData?.totalItems}
        page={filters.page}
        pageSize={filters.pageSize}
        onPageChange={(newPage) =>
          setFilters((prev) => ({ ...prev, page: newPage }))
        }
        onPageSizeChange={(newPageSize) =>
          setFilters((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
        }
        onViewBill={(url, title) => setPreviewBill({ url, title })}
        onPay={(item) => setPayingItem(item)}
        onApprove={handleApproveClick}
        onReject={(item) => setRejectingItem(item)}
        onCancel={handleCancelClick}
        canManageExpenses={canManageExpenses}
      />

      {/* ── 4. Create Expense Modal ── */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createExpenseMutation.isPending}
        branches={branches}
        defaultBranchId={filters.branchId || undefined}
      />

      {/* ── 5. Pay Modal ── */}
      <PayExpenseModal
        item={payingItem}
        isOpen={Boolean(payingItem)}
        onClose={() => setPayingItem(null)}
        onSubmit={handlePaySubmit}
        isSubmitting={payExpenseMutation.isPending}
      />

      {/* ── 6. Bill Preview Modal ── */}
      <BillPreviewModal
        isOpen={Boolean(previewBill)}
        onClose={() => setPreviewBill(null)}
        imageUrl={previewBill?.url || null}
        title={previewBill?.title || ''}
      />

      {/* ── 7. Cancel / Reverse Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(cancelingItem)}
        onClose={() => setCancelingItem(null)}
        onConfirm={handleConfirmCancel}
        title={cancelingItem?.status === 'Paid' ? 'Xác nhận đảo bút toán phiếu chi' : 'Xác nhận hủy khoản chi phí'}
        itemName={cancelingItem ? `${cancelingItem.voucherCode || cancelingItem.expenseId} - ${cancelingItem.vendorName}` : ''}
        message={
          cancelingItem?.status === 'Paid'
            ? 'Thao tác này sẽ tạo bút toán đảo hoàn tiền về tài khoản quỹ nguồn và chuyển phiếu sang trạng thái Đã đảo. Bạn có chắc chắn muốn tiếp tục?'
            : 'Khoản chi sau khi hủy sẽ không thể hoàn tác hoặc tiếp tục thanh toán. Bạn có chắc chắn muốn hủy không?'
        }
        confirmText={cancelingItem?.status === 'Paid' ? 'Xác nhận đảo bút toán' : 'Đồng ý hủy'}
        cancelText="Đóng"
        variant="danger"
        isLoading={cancelExpenseMutation.isPending}
      />

      {/* ── 8. Reject Approval Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(rejectingItem)}
        onClose={() => setRejectingItem(null)}
        onConfirm={handleConfirmReject}
        title="Xác nhận từ chối phê duyệt phiếu chi"
        itemName={rejectingItem ? `${rejectingItem.voucherCode || rejectingItem.expenseId} - ${rejectingItem.vendorName}` : ''}
        message="Phiếu chi sẽ bị từ chối duyệt và chuyển sang trạng thái Đã hủy. Bạn có chắc chắn muốn từ chối không?"
        confirmText="Từ chối duyệt"
        cancelText="Đóng"
        variant="danger"
        isLoading={rejectExpenseMutation.isPending}
      />

      {/* ── 9. Suspicious Split Approval Explanation Modal (BUG-065) ── */}
      {approvingSuspiciousItem && (
        <div
          className="expense-modal-backdrop"
          onClick={() => {
            setApprovingSuspiciousItem(null);
            setApprovalReason('');
            setApprovalReasonError('');
          }}
        >
          <div
            className="expense-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suspicious-approve-title"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="expense-modal-header">
              <div className="expense-modal-title">
                <h3 id="suspicious-approve-title">Giải trình phê duyệt phiếu chi nghi vấn</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  setApprovingSuspiciousItem(null);
                  setApprovalReason('');
                  setApprovalReasonError('');
                }}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.84rem',
                  color: '#991b1b',
                }}
              >
                <strong>Phiếu chi {approvingSuspiciousItem.voucherCode || approvingSuspiciousItem.expenseId}</strong> bị gắn cờ cảnh báo:
                <div style={{ marginTop: 4 }}>
                  {approvingSuspiciousItem.suspiciousReason || 'Nghi vấn chia nhỏ hạn mức chi (Anti-Splitting).'}
                </div>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                <span>Lý do giải trình phê duyệt <span style={{ color: '#dc2626' }}>*</span></span>
                <textarea
                  rows={3}
                  value={approvalReason}
                  onChange={(e) => {
                    setApprovalReason(e.target.value);
                    if (approvalReasonError) setApprovalReasonError('');
                  }}
                  placeholder="Nhập rõ lý do xác minh hợp lệ để lưu vào nhật ký kiểm toán..."
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: approvalReasonError ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    padding: '10px 12px',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </label>
              {approvalReasonError && (
                <div role="alert" style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
                  {approvalReasonError}
                </div>
              )}
            </div>
            <div className="expense-modal-footer">
              <button
                type="button"
                className="po-btn po-btn-secondary"
                onClick={() => {
                  setApprovingSuspiciousItem(null);
                  setApprovalReason('');
                  setApprovalReasonError('');
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="po-btn po-btn-primary"
                disabled={approveExpenseMutation.isPending}
                onClick={() => void handleConfirmSuspiciousApprove()}
              >
                {approveExpenseMutation.isPending ? 'Đang phê duyệt...' : 'Xác nhận phê duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceExpensesPage;

