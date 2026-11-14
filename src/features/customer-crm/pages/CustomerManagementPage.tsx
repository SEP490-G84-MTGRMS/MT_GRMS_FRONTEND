import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FC } from 'react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useCustomerCrm } from '../hooks/useCustomerCrm';
import { CustomerKpiCards } from '../components/CustomerKpiCards';
import { CustomerFilterBar } from '../components/CustomerFilterBar';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerDrawerDetail } from '../components/CustomerDrawerDetail';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { DebtCollectionModal } from '../components/DebtCollectionModal';
import { CustomerDebtLedgerDrawer } from '../components/CustomerDebtLedgerDrawer';
import type { CreateCustomerInput, UpdateCustomerInput } from '../types/customer.types';
import '../customer-crm.css';

export const CustomerManagementPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('keyword') || '';
  const {
    customers,
    kpiSummary,
    isLoading,
    isKpiLoading,
    refetch,

    searchTerm,
    setSearchTerm,
    selectedTier,
    setSelectedTier,
    selectedDebtStatus,
    setSelectedDebtStatus,

    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,

    selectedCustomer,
    isFormModalOpen,
    setIsFormModalOpen,
    editingCustomer,
    collectingCustomer,
    setCollectingCustomer,

    handleOpenCreateModal,
    handleOpenEditModal,
    handleOpenCollectModal,
    handleSelectCustomer,
    handleCloseDrawer,

    createMutation,
    updateMutation,
    collectDebtMutation,
  } = useCustomerCrm();

  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch, setSearchTerm]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (term) {
          next.set('search', term);
        } else {
          next.delete('search');
          next.delete('keyword');
        }
        return next;
      },
      { replace: true }
    );
  };

  const [ledgerCustomer, setLedgerCustomer] = useState<any>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: String(Date.now()), message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (editingCustomer) {
        await updateMutation.mutateAsync({
          id: editingCustomer.id,
          input: data as UpdateCustomerInput,
        });
        showToast(`Cập nhật thông tin khách hàng ${data.fullName} thành công!`);
      } else {
        await createMutation.mutateAsync(data as CreateCustomerInput);
        showToast(`Thêm mới khách hàng ${data.fullName} thành công!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi xử lý dữ liệu khách hàng', 'error');
      throw err;
    }
  };

  const handleCollectDebtConfirm = async (data: any) => {
    try {
      await collectDebtMutation.mutateAsync(data);
      showToast(
        `Đã lập phiếu thu nợ ${data.amount.toLocaleString('vi-VN')} đ qua ${
          data.method === 'VietQR' ? 'VietQR' : 'Tiền mặt'
        } và đồng bộ Sổ quỹ thành công!`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thu nợ', 'error');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F7] font-finance">
      <div className="customer-page">
        {/* Toast Notification chuẩn của dự án */}
        {toast && (
          <AdminToast
            toast={toast}
            onClose={() => {
              if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
              setToast(null);
            }}
          />
        )}

        {/* 1. Page Header & Title chuẩn prototype mới */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Khách hàng &amp; công nợ</h1>
            <p className="page-subtitle">
              Hạn mức tín dụng, mã số thuế &amp; thu nợ FIFO 1 nguồn duy nhất đồng bộ Sổ quỹ
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
            >
              + Thêm khách hàng
            </button>
          </div>
        </div>

        {/* 2. 3 Thẻ KPI chuẩn prototype */}
        <CustomerKpiCards
          summary={kpiSummary}
          customers={customers}
          isLoading={isKpiLoading}
          onFilterDebt={() => setSelectedDebtStatus('DEBT')}
          onFilterOverLimit={() => setSelectedDebtStatus('OVER_LIMIT')}
        />

        {/* 3. Filter & Quick Chips Bar */}
        <CustomerFilterBar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          selectedDebtStatus={selectedDebtStatus}
          onDebtStatusChange={setSelectedDebtStatus}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* 4. Customer Table (Bảng 5 cột chuẩn prototype) */}
        <CustomerTable
          customers={customers}
          isLoading={isLoading}
          onSelect={handleSelectCustomer}
          onEdit={handleOpenEditModal}
          onCollect={handleOpenCollectModal}
          onViewLedger={(c) => setLedgerCustomer(c)}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {/* 5. Customer Drawer Detail */}
        <CustomerDrawerDetail
          customer={selectedCustomer}
          onClose={handleCloseDrawer}
          onOpenEdit={handleOpenEditModal}
          onOpenCollect={handleOpenCollectModal}
          onViewLedger={(c) => setLedgerCustomer(c)}
        />

        {/* 6. Create / Edit Modal */}
        <CustomerFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingCustomer}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />

        {/* 7. Collect Debt Modal (VietQR & Cash) */}
        <DebtCollectionModal
          isOpen={Boolean(collectingCustomer)}
          onClose={() => setCollectingCustomer(null)}
          customer={collectingCustomer}
          onConfirm={handleCollectDebtConfirm}
          isSubmitting={collectDebtMutation.isPending}
        />

        {/* 8. Customer Debt Ledger Drawer */}
        <CustomerDebtLedgerDrawer
          isOpen={Boolean(ledgerCustomer)}
          customer={ledgerCustomer}
          onClose={() => setLedgerCustomer(null)}
          onOpenCollect={handleOpenCollectModal}
        />
      </div>
    </div>
  );
};

export default CustomerManagementPage;
