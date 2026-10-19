import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, Download, Plus, Loader2 } from 'lucide-react';
import type {
  SupplierSummary,
  SupplierFilterState,
  CreateSupplierInput,
} from '../types/supplier.types';
import { SupplierFilterBar } from '../components/SupplierFilterBar';
import { SupplierTable } from '../components/SupplierTable';
import { SupplierFormModal } from '../components/SupplierFormModal';
import { SupplierDetailPage } from './SupplierDetailPage';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierApi } from '../api/supplierApi';
import '../../purchase-order/purchase-order.css';
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
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    }, 3200);
  };

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await supplierApi.getSuppliers(appliedFilters);
      setSuppliers(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách nhà cung cấp từ máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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

  const handleSaveSupplier = async (input: CreateSupplierInput & { id?: string }) => {
    try {
      if (input.id) {
        await supplierApi.updateSupplier(input.id, { ...input, id: input.id });
        showToast(`Đã cập nhật thông tin nhà cung cấp ${input.name} thành công!`, 'success');
      } else {
        const created = await supplierApi.createSupplier(input);
        showToast(`Đã thêm mới nhà cung cấp ${created.name} (${created.code}) thành công!`, 'success');
      }
      setIsFormModalOpen(false);
      await fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Thao tác không thành công.', 'error');
    }
  };

  const handlePayDebt = (supplier: SupplierSummary) => {
    const amount = new Intl.NumberFormat('vi-VN').format(supplier.currentDebt) + ' đ';
    showToast(`Đã lập lệnh chi trả nợ ${amount} cho NCC ${supplier.name} (${supplier.code})`, 'success');
  };

  const handleToggleStatus = async (supplier: SupplierSummary) => {
    const newStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    if (newStatus === 'Inactive' && supplier.currentDebt > 0) {
      showToast(`Không thể tạm ngưng ${supplier.name}! Đang có dư nợ AP chưa thanh toán.`, 'warning');
      return;
    }
    try {
      await supplierApi.updateSupplierStatus(supplier.id, newStatus);
      showToast(`Đã chuyển trạng thái ${supplier.name} sang [${newStatus}]!`, 'success');
      await fetchSuppliers();
      if (selectedSupplier && selectedSupplier.id === supplier.id) {
        setSelectedSupplier((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể đổi trạng thái nhà cung cấp.', 'error');
    }
  };

  const handleDeleteSupplier = async (supplier: SupplierSummary) => {
    if (supplier.currentDebt > 0) {
      showToast(`Không thể xóa ${supplier.name}! Đã phát sinh dư nợ AP.`, 'warning');
      return;
    }
    try {
      await supplierApi.deleteSupplier(supplier.id);
      showToast(`Đã xóa nhà cung cấp ${supplier.name}!`, 'success');
      setSelectedSupplier(null);
      await fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa nhà cung cấp.', 'error');
    }
  };

  const handleLinkCustomer = async (supplierId: string, customerId: string) => {
    try {
      await supplierApi.linkCustomer(supplierId, customerId);
      showToast(`Đã liên kết thành công Khách hàng cho Nhà cung cấp!`, 'success');
      await fetchSuppliers();
      if (selectedSupplier && selectedSupplier.id === supplierId) {
        setSelectedSupplier((prev) => (prev ? { ...prev, linkedCustomerId: customerId } : null));
      }
    } catch (err: any) {
      showToast(err.message || 'Không thể liên kết khách hàng.', 'error');
    }
  };

  // Khi chọn xem chi tiết NCC, hiển thị giao diện SupplierDetailPage toàn màn hình
  if (selectedSupplier) {
    return (
      <div>
        <AdminToast toast={toast} onClose={() => setToast(null)} />
        <SupplierDetailPage
          supplier={selectedSupplier}
          onBack={() => {
            setSelectedSupplier(null);
            fetchSuppliers();
          }}
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
      {/* Toast Notification */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* ── Page Header theo chuẩn PoList ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Building2 size={22} color="var(--blue-primary, #0f766e)" />
            <span>Quản lý Nhà Cung Cấp</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />}
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Quản lý danh mục sản phẩm theo từng Nhà cung cấp"
          >
            <Package size={14} />
            <span>Sản phẩm theo NCC</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => showToast('Đang kết xuất danh sách NCC ra tệp Excel (.xlsx)...', 'info')}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => {
              setEditingSupplier(null);
              setIsFormModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Thêm Nhà Cung Cấp</span>
          </button>
        </div>
      </div>

      {/* ── UNIFIED FILTER BAR ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierFilterBar
          filters={appliedFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      {/* ── MAIN DATA TABLE WITH PAGING ── */}
      <SupplierTable
        suppliers={suppliers}
        totalCount={totalCount}
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
