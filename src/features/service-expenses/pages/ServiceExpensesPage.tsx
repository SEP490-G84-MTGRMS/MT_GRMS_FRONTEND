import { type FC, useState } from 'react';
import { PlusCircle, RefreshCw } from 'lucide-react';
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

export const ServiceExpensesPage: FC = () => {
  const [filters, setFilters] = useState<ExpenseFilterParams>({
    page: 1,
    pageSize: 10,
    branchId: '',
    category: '',
    status: '',
    keyword: '',
  });

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<ServiceExpenseDto | null>(null);
  const [previewBill, setPreviewBill] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Queries & Mutations
  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    refetch,
    isRefetching,
  } = useServiceExpenses(filters);

  const { data: summaryData, isLoading: isSummaryLoading } =
    useExpenseSummary(filters.branchId || undefined);

  const createExpenseMutation = useCreateExpense();
  const payExpenseMutation = usePayExpense();
  const cancelExpenseMutation = useCancelExpense();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFilterChange = (updated: Partial<ExpenseFilterParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...updated,
      page: 1, // Reset to page 1 on filter change
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      pageSize: 10,
      branchId: '',
      category: '',
      status: '',
      keyword: '',
    });
  };

  const handleCreateSubmit = async (data: CreateExpenseRequest) => {
    await createExpenseMutation.mutateAsync(data);
    showToast('Đã ghi nhận chi phí vận hành mới thành công!');
  };

  const handlePaySubmit = async (
    expenseId: string,
    data: PayExpenseRequest
  ) => {
    await payExpenseMutation.mutateAsync({ expenseId, data });
    showToast('Đã hoàn tất thanh toán và hạch toán dòng tiền!');
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
    showToast('Đã hủy khoản chi phí thành công.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Quản Lý Chi Phí Dịch Vụ & Vận Hành (FE-07)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi hóa đơn định kỳ, kiểm soát hạn trả nợ và liên kết tự động Sổ
            quỹ tiền mặt
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Làm mới dữ liệu"
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-full text-gray-600 shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0066ff] hover:bg-[#0052cc] rounded-full shadow-[0_10px_25px_-4px_rgba(0,102,255,0.32)] transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ghi nhận chi phí</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <ExpenseKpiCards summary={summaryData} isLoading={isSummaryLoading} />

      {/* Filter Bar */}
      <ExpenseFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
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
