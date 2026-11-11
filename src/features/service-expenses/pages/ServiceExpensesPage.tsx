import { type FC, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../../stores/useAuthStore';
import { employeeApi } from '../../employee/api/employeeApi';
import {
  AdminToast,
  type ToastState,
  PlusIcon,
  RefreshIcon,
} from '../../admin/components';
import { BillPreviewModal } from '../components/BillPreviewModal';
import { CreateExpenseModal } from '../components/CreateExpenseModal';
import { ExpenseFilterBar } from '../components/ExpenseFilterBar';
import { ExpenseKpiCards } from '../components/ExpenseKpiCards';
import { ExpenseTable } from '../components/ExpenseTable';
import { PayExpenseModal } from '../components/PayExpenseModal';
import {
  useCancelExpense,
  useCreateExpense,
  useExpenseSummary,
  usePayExpense,
  useServiceExpenses,
} from '../hooks/useServiceExpenses';
import type {
  CreateExpenseRequest,
  ExpenseFilterParams,
  PayExpenseRequest,
  ServiceExpenseDto,
} from '../types/expense.types';
import { calculatePeriodRange } from '../utils/datePeriodUtils';
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
  const isEmployee =
    user?.role === 'STAFF' ||
    (user?.role as unknown as string) === 'EMPLOYEE' ||
    (user?.role as unknown as string) === 'CASHIER';
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const initialRange = calculatePeriodRange('this-month');
  const [periodLabel, setPeriodLabel] = useState(urlSearch ? 'Tất cả thời gian' : initialRange.label);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<ExpenseFilterParams>(() => {
    return {
      page: 1,
      pageSize: 10,
      branchId: getInitialActiveBranchId(user?.branchId),
      category: '',
      status: '',
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
  }, []);

  // Keep filters in sync when navigation query parameters change
  useEffect(() => {
    if (urlSearch) {
      setPeriodLabel('Tất cả thời gian');
      setFilters((prev) => ({
        ...prev,
        keyword: urlSearch,
        fromDate: undefined,
        toDate: undefined,
        page: 1,
      }));
    }
  }, [urlSearch]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<ServiceExpenseDto | null>(null);
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
    refetch,
    isRefetching,
  } = useServiceExpenses(filters);

  const { data: summaryData, isLoading: isSummaryLoading } = useExpenseSummary(
    filters.branchId || undefined,
    filters.fromDate,
    filters.toDate
  );

  const createExpenseMutation = useCreateExpense();
  const payExpenseMutation = usePayExpense();
  const cancelExpenseMutation = useCancelExpense();

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
    setPeriodLabel(range.label);
    setFilters({
      page: 1,
      pageSize: 10,
      branchId: getInitialActiveBranchId(user?.branchId),
      category: '',
      status: '',
      keyword: '',
      fromDate: range.fromDate,
      toDate: range.toDate,
    });
  };

  const handleCreateSubmit = async (data: CreateExpenseRequest) => {
    await createExpenseMutation.mutateAsync(data);
    showToast('Đã ghi nhận chi phí vận hành mới thành công!', 'success');
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

  const handleCancelClick = async (item: ServiceExpenseDto) => {
    const confirm = window.confirm(
      `Bạn có chắc chắn muốn hủy khoản chi "${item.expenseId} - ${item.vendorName}"? Thao tác này không thể hoàn tác.`
    );
    if (!confirm) return;

    await cancelExpenseMutation.mutateAsync({
      expenseId: item.expenseId,
      reason: 'Người dùng hủy thao tác trên hệ thống quản lý',
    });
    showToast('Đã hủy khoản chi phí thành công.', 'info');
  };

  return (
    <div className="expense-page">
      {/* Toast Notification (Shared AdminToast) */}
      {toast && (
        <AdminToast
          toast={toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Header Bar */}
      <div className="expense-topbar" style={{ marginTop: '16px' }}>
        <div className="expense-topbar-title">
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0F172A)' }}>
            Phải trả
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748B' }}>
            Theo dõi tiền điện kho lạnh bảo quản thực phẩm, tiền thuê mặt bằng cửa hàng, mua bao bì túi ni lông &amp; cuộn in bill, bảo trì tủ đông mát...
          </p>
        </div>

        <div className="expense-topbar-actions">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Làm mới dữ liệu danh sách"
            className="action-icon-btn"
          >
            <RefreshIcon size={16} color="currentColor" />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary-pill"
            style={{
              background: 'var(--brand-700, #115E59)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: '9999px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(17,94,89,0.25)',
            }}
          >
            <PlusIcon size={16} color="#ffffff" />
            <span>Ghi nhận chi phí</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <ExpenseKpiCards
        summary={summaryData}
        isLoading={isSummaryLoading}
        periodLabel={periodLabel}
      />

      {/* Filter Bar */}
      <ExpenseFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onPeriodLabelChange={setPeriodLabel}
        branches={branches}
      />

      {/* Main Expense Table */}
      <ExpenseTable
        data={expensesData?.items}
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
        onCancel={handleCancelClick}
        canManageExpenses={!isEmployee}
      />

      {/* Create Modal */}
      <CreateExpenseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createExpenseMutation.isPending}
        branches={branches}
        defaultBranchId={filters.branchId || branches[0]?.id || ''}
      />

      {/* Pay Modal */}
      <PayExpenseModal
        item={payingItem}
        isOpen={Boolean(payingItem)}
        onClose={() => setPayingItem(null)}
        onSubmit={handlePaySubmit}
        isSubmitting={payExpenseMutation.isPending}
      />

      {/* Bill Preview Modal */}
      <BillPreviewModal
        isOpen={Boolean(previewBill)}
        onClose={() => setPreviewBill(null)}
        imageUrl={previewBill?.url || null}
        title={previewBill?.title || ''}
      />
    </div>
  );
};
export default ServiceExpensesPage;
