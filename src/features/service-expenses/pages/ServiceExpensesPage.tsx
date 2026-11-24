import { type FC, useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Receipt, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { employeeApi } from '../../employee/api/employeeApi';
import {
  AdminToast,
  type ToastState,
} from '../../admin/components';
import { BillPreviewModal } from '../components/BillPreviewModal';
import { ConfirmModal } from '../../../components/common';
import { ExpenseFilterBar } from '../components/ExpenseFilterBar';
import { ExpenseTable } from '../components/ExpenseTable';
import { PayExpenseModal } from '../components/PayExpenseModal';
import {
  useApproveExpense,
  useCancelExpense,
  useExpenseSummary,
  usePayExpense,
  useServiceExpenses,
} from '../hooks/useServiceExpenses';
import {
  EXPENSE_CATEGORY_LABELS,
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
  const [payingItem, setPayingItem] = useState<ServiceExpenseDto | null>(null);
  const [cancelingItem, setCancelingItem] = useState<ServiceExpenseDto | null>(null);
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

  const payExpenseMutation = usePayExpense();
  const cancelExpenseMutation = useCancelExpense();
  const approveExpenseMutation = useApproveExpense();

  const handleApproveClick = async (item: ServiceExpenseDto) => {
    try {
      await approveExpenseMutation.mutateAsync({
        expenseId: item.expenseId,
        note: 'Chủ cửa hàng duyệt phiếu chi',
      });
      showToast(`Đã phê duyệt phiếu chi ${item.voucherCode || item.expenseId} thành công!`, 'success');
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
        reason: 'Người dùng hủy thao tác trên hệ thống quản lý',
      });
      showToast('Đã hủy khoản chi phí thành công.', 'info');
      setCancelingItem(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi hủy khoản chi', 'error');
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

  const handleExportExcel = () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Đang kết xuất danh sách chi phí vận hành ra tệp Excel (.csv)...', 'info');

    try {
      const exportItems = expenseRows;
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

      const csvRows = [headers.join(',')];

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
        const row = [
          `"${code.replace(/"/g, '""')}"`,
          `"${catLabel.replace(/"/g, '""')}"`,
          `"${(item.branchName || item.branchId || '').replace(/"/g, '""')}"`,
          `"${(item.vendorName || '').replace(/"/g, '""')}"`,
          `"${(item.note || '').replace(/"/g, '""')}"`,
          `"${item.dueDate || ''}"`,
          item.amount,
          `"${statusLabel}"`,
          `"${item.isTaxDeductible === false ? 'Loại trừ' : 'Hợp lệ'}"`,
          `"${item.isRecurring ? 'Định kỳ' : 'Không'}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.setAttribute('download', `ChiPhi_VanHanh_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Đã xuất thành công ${exportItems.length} khoản chi ra tệp Excel (.csv).`);
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
            title="Xuất danh sách chi phí ra tệp Excel (.csv)"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            <span>Xuất Excel</span>
          </button>

        </div>
      </div>

      {/* ── 2. Standardized Filter Bar (CSS Grid 4x2 ~86px) ── */}
      <ExpenseFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        branches={branches}
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
        onCancel={handleCancelClick}
        canManageExpenses={canManageExpenses}
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

      {/* ── 7. Cancel Confirmation Modal ── */}
      <ConfirmModal
        isOpen={Boolean(cancelingItem)}
        onClose={() => setCancelingItem(null)}
        onConfirm={handleConfirmCancel}
        title="Xác nhận hủy khoản chi phí"
        itemName={cancelingItem ? `${cancelingItem.expenseId} - ${cancelingItem.vendorName}` : ''}
        message="Khoản chi sau khi hủy sẽ không thể hoàn tác hoặc tiếp tục thanh toán. Bạn có chắc chắn muốn hủy không?"
        confirmText="Đồng ý hủy"
        cancelText="Đóng"
        variant="danger"
        isLoading={cancelExpenseMutation.isPending}
      />
    </div>
  );
};

export default ServiceExpensesPage;

