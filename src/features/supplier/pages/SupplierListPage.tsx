import { useState, useMemo, useRef } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import type {
  SupplierSummary,
  SupplierFilterState,
  CreateSupplierInput,
} from '../types/supplier.types';
import { INITIAL_SUPPLIERS } from '../lib/mockData';
import { SupplierFilterBar } from '../components/SupplierFilterBar';
import { SupplierTable } from '../components/SupplierTable';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { SupplierDetailPage } from './SupplierDetailPage';
import {
  AdminToast,
  type ToastState,
  ExportIcon,
  PlusIcon,
} from '../../admin/components';
import '../supplier.css';

const DEFAULT_FILTERS: SupplierFilterState = {
  searchTerm: '',
  supplierType: '',
  category: '',
  debtStatus: '',
  ratingFilter: '',
  status: '',
  pageIndex: 1,
  pageSize: 10,
};

export const SupplierListPage: FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>(INITIAL_SUPPLIERS);

  // Filters are only applied when user clicks "Tìm kiếm" or "Đặt lại"
  const [appliedFilters, setAppliedFilters] = useState<SupplierFilterState>(DEFAULT_FILTERS);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierSummary | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);

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

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((item) => {
      // Search term
      if (appliedFilters.searchTerm) {
        const kw = appliedFilters.searchTerm.trim().toLowerCase();
        const match =
          item.code.toLowerCase().includes(kw) ||
          item.name.toLowerCase().includes(kw) ||
          item.phone.toLowerCase().includes(kw) ||
          item.contactPerson.toLowerCase().includes(kw) ||
          (item.taxCode || '').toLowerCase().includes(kw);
        if (!match) return false;
      }

      // Dropdown filter: Loại hình (Goods / Service / Both)
      if (appliedFilters.supplierType && item.supplierType !== appliedFilters.supplierType) return false;

      // Dropdown filter: Phân loại (FRESH / AMBIENT / ...)
      if (appliedFilters.category && item.category !== appliedFilters.category) return false;

      // Dropdown filter: Trạng thái công nợ
      if (appliedFilters.debtStatus === 'has_debt' && item.currentDebt <= 0) return false;
      if (appliedFilters.debtStatus === 'overdue' && item.overdueDebt <= 0) return false;
      if (appliedFilters.debtStatus === 'no_debt' && item.currentDebt > 0) return false;

      return true;
    });
  }, [suppliers, appliedFilters]);

  const pagedSuppliers = useMemo(() => {
    const start = (appliedFilters.pageIndex - 1) * appliedFilters.pageSize;
    return filteredSuppliers.slice(start, start + appliedFilters.pageSize);
  }, [filteredSuppliers, appliedFilters.pageIndex, appliedFilters.pageSize]);

  const handleSearch = (newFilters: SupplierFilterState) => {
    setAppliedFilters(newFilters);
  };

  const handleReset = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }));
  };

  const handleSaveSupplier = (input: CreateSupplierInput & { id?: string }) => {
    if (input.id) {
      setSuppliers((prev) =>
        prev.map((item) =>
          item.id === input.id ? { ...item, ...input, code: input.code || item.code } : item
        )
      );
      setSelectedSupplier((prev) =>
        prev && prev.id === input.id ? { ...prev, ...input, code: input.code || prev.code } : prev
      );
      showToast(`Đã cập nhật thông tin nhà cung cấp ${input.name} thành công!`, 'success');
    } else {
      const nextCode = input.code || `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
      const newSupp: SupplierSummary = {
        id: `supp-${Date.now()}`,
        code: nextCode,
        name: input.name,
        tradeName: input.tradeName,
        supplierType: input.supplierType,
        category: input.category,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address,
        paymentTermDays: input.paymentTermDays,
        creditLimit: input.creditLimit,
        currentDebt: 0,
        overdueDebt: 0,
        rating: 5.0,
        status: 'Active',
        taxCode: input.taxCode,
        companyName: input.companyName,
        invoiceAddress: input.invoiceAddress,
        bankName: input.bankName,
        bankAccount: input.bankAccount,
        accountHolder: input.accountHolder,
        note: input.note,
        createdAt: new Date().toISOString(),
      };
      setSuppliers((prev) => [newSupp, ...prev]);
      showToast(`Đã thêm mới nhà cung cấp ${input.name} (${nextCode}) thành công!`, 'success');
    }
    setIsFormModalOpen(false);
  };

  const handlePayDebt = (supplier: SupplierSummary) => {
    const amount = new Intl.NumberFormat('vi-VN').format(supplier.currentDebt) + ' đ';
    showToast(`Đã lập lệnh chi trả nợ ${amount} cho NCC ${supplier.name} (${supplier.code})`, 'success');
  };

  const handleToggleStatus = (supplier: SupplierSummary) => {
    const newStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    if (newStatus === 'Inactive' && supplier.currentDebt > 0) {
      showToast(`Không thể tạm ngưng ${supplier.name}! Đang có dư nợ AP chưa thanh toán.`, 'warning');
      return;
    }
    setSuppliers((prev) =>
      prev.map((item) => (item.id === supplier.id ? { ...item, status: newStatus } : item))
    );
    setSelectedSupplier((prev) => (prev ? { ...prev, status: newStatus } : null));
    showToast(`Đã chuyển trạng thái ${supplier.name} sang [${newStatus}]!`, 'success');
  };

  const handleDeleteSupplier = (supplier: SupplierSummary) => {
    if (supplier.currentDebt > 0) {
      showToast(`Không thể xóa ${supplier.name}! Đã phát sinh dư nợ AP.`, 'warning');
      return;
    }
    setSuppliers((prev) => prev.filter((item) => item.id !== supplier.id));
    setSelectedSupplier(null);
    showToast(`Đã xóa nhà cung cấp ${supplier.name}!`, 'success');
  };

  const handleLinkCustomer = (supplierId: string, customerId: string) => {
    setSuppliers((prev) =>
      prev.map((item) => (item.id === supplierId ? { ...item, linkedCustomerId: customerId } : item))
    );
    setSelectedSupplier((prev) => (prev ? { ...prev, linkedCustomerId: customerId } : null));
    showToast(`Đã liên kết thành công Khách hàng ${customerId} cho NCC!`, 'success');
  };

  // Khi chọn xem chi tiết NCC, hiển thị giao diện SupplierDetailPage toàn màn hình
  if (selectedSupplier) {
    return (
      <div>
        <AdminToast toast={toast} onClose={() => setToast(null)} />
        <SupplierDetailPage
          supplier={selectedSupplier}
          onBack={() => setSelectedSupplier(null)}
          onEdit={(s) => {
            setEditingSupplier(s);
            setIsFormModalOpen(true);
          }}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteSupplier}
          onLinkCustomer={handleLinkCustomer}
        />

        <SupplierFormModal
          isOpen={isFormModalOpen}
          editingSupplier={editingSupplier}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleSaveSupplier}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 style={{ margin: 0, lineHeight: 1.25 }}>Quản lý Nhà Cung Cấp</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/suppliers/products"
            className="admin-btn admin-btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Quản lý danh mục sản phẩm theo từng Nhà cung cấp"
          >
            <span>Sản phẩm theo NCC</span>
          </Link>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => showToast('Đang kết xuất danh sách NCC ra tệp Excel (.xlsx)...')}
          >
            <ExportIcon size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              setEditingSupplier(null);
              setIsFormModalOpen(true);
            }}
          >
            <PlusIcon size={14} />
            <span>Thêm Nhà Cung Cấp</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card with Search and Reset buttons */}
      <SupplierFilterBar
        filters={appliedFilters}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* Supplier Data Table (without Loại column) */}
      <SupplierTable
        suppliers={pagedSuppliers}
        totalCount={filteredSuppliers.length}
        pageIndex={appliedFilters.pageIndex}
        pageSize={appliedFilters.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onViewDetail={(s) => {
          setSelectedSupplier(s);
        }}
        onEdit={(s) => {
          setEditingSupplier(s);
          setIsFormModalOpen(true);
        }}
        onPayDebt={handlePayDebt}
      />

      {/* Modals */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        editingSupplier={editingSupplier}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSaveSupplier}
      />
    </div>
  );
};

export default SupplierListPage;
