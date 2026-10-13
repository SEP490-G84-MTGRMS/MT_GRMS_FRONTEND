import { useState, useRef } from 'react';
import type { FC } from 'react';
import { Users } from 'lucide-react';
import { AdminToast, type ToastState } from '../../admin/components';
import { useCustomerCrm } from '../hooks/useCustomerCrm';
import { CustomerKpiCards } from '../components/CustomerKpiCards';
import { CustomerFilterBar } from '../components/CustomerFilterBar';
import { CustomerTable } from '../components/CustomerTable';
import { CustomerDrawerDetail } from '../components/CustomerDrawerDetail';
import { CustomerFormModal } from '../components/CustomerFormModal';
import { DebtCollectionModal } from '../components/DebtCollectionModal';
import type { CreateCustomerInput, UpdateCustomerInput } from '../types/customer.types';
import '../customer-crm.css';

export const CustomerManagementPage: FC = () => {
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
        `Đã lập phiếu thu nợ ${data.amount.toLocaleString('vi-VN')} đ qua ${data.method === 'VietQR' ? 'VietQR' : 'Tiền mặt'} và đồng bộ Sổ quỹ thành công!`
      );
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thu nợ', 'error');
      throw err;
    }
  };

  return (
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

      {/* Page Header */}
      <div className="customer-topbar">
        <div className="customer-topbar-title">
          <div className="customer-topbar-icon">
            <Users size={22} color="#ffffff" />
          </div>
          <div className="customer-topbar-text">
            <h1>Quản Lý Khách Hàng & Công Nợ</h1>
            <p>
              Phân hệ FE-08 (Customer CRM & Accounts Receivable) · Tích hợp thanh toán VietQR động
            </p>
          </div>
        </div>
      </div>

      {/* 1. KPI Cards */}
      <CustomerKpiCards summary={kpiSummary} isLoading={isKpiLoading} />

      {/* 2. Filter & Action Bar */}
      <CustomerFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
        selectedDebtStatus={selectedDebtStatus}
        onDebtStatusChange={setSelectedDebtStatus}
        onOpenCreate={handleOpenCreateModal}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />

      {/* 3. Customer Table */}
      <CustomerTable
        customers={customers}
        isLoading={isLoading}
        onSelect={handleSelectCustomer}
        onEdit={handleOpenEditModal}
        onCollect={handleOpenCollectModal}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 4. Customer Drawer Detail */}
      <CustomerDrawerDetail
        customer={selectedCustomer}
        onClose={handleCloseDrawer}
        onOpenEdit={handleOpenEditModal}
        onOpenCollect={handleOpenCollectModal}
      />

      {/* 5. Create / Edit Modal */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* 6. Collect Debt Modal (VietQR & Cash) */}
      <DebtCollectionModal
        isOpen={Boolean(collectingCustomer)}
        onClose={() => setCollectingCustomer(null)}
        customer={collectingCustomer}
        onConfirm={handleCollectDebtConfirm}
        isSubmitting={collectDebtMutation.isPending}
      />
    </div>
  );
};

export default CustomerManagementPage;