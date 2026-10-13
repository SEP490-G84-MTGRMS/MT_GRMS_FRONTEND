import { type FC, useState, useRef } from 'react';
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

export const ServiceExpensesPage: FC = () => {
  const [periodLabel, setPeriodLabel] = useState('Tháng 10/2026');
  const [filters, setFilters] = useState<ExpenseFilterParams>(() => {
    const range = calculatePeriodRange('this-month');
    return {
      page: 1,
      pageSize: 10,
      branchId: '',
      category: '',
      status: '',
      keyword: '',
      fromDate: range.fromDate,
      toDate: range.toDate,
    };
  });

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
    setFilters((prev) => ({
      ...prev,
      ...updated,
      page: 1, // Reset to page 1 on filter change
    }));
  };

  const handleResetFilters = () => {
    const range = calculatePeriodRange('this-month');
    setPeriodLabel(range.label);
    setFilters({
      page: 1,
      pageSize: 10,
      branchId: '',
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
    await payExpenseMutation.mutateAsync({ expenseId, data });
    showToast('Đã hoàn tất thanh toán và hạch toán dòng tiền Sổ quỹ!', 'success');
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
      <div className="expense-topbar">
        <div className="expense-topbar-title">
          <h1>
            <span>Quản Lý Chi Phí Dịch Vụ & Vận Hành (FE-07)</span>
          </h1>
          <p>
            Theo dõi hóa đơn định kỳ, kiểm soát hạn nợ đối soát và liên kết tự động Sổ quỹ tiền mặt
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
      />

      {/* Create Modal */}
      <CreateExpenseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={createExpenseMutation.isPending}
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
