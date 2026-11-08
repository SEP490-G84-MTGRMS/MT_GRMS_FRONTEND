import { useState, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, Store, Plus, Loader2, Download } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import type {
  SupplierSummary,
  SupplierFilterState,
  CreateSupplierInput,
  UpdateBasicSupplierInput,
} from '../types/supplier.types';
import { SupplierFilterBar } from '../components/SupplierFilterBar';
import { SupplierTable } from '../components/SupplierTable';
import { CreateSupplierModal } from '../components/CreateSupplierModal';
import { EditSupplierModal } from '../components/EditSupplierModal';
import { SupplierDetailPage } from './SupplierDetailPage';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierApi } from '../api/supplierApi';
import {
  exportSuppliersToExcel,
  formatDeliveryDaysForExcel,
  type SupplierExportDeliveryInfo,
} from '../lib/supplierExcelExporter';
import '../../purchase-order/purchase-order.css';
import '../supplier.css';

const DEFAULT_FILTERS: SupplierFilterState = {
  searchTerm: '',
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  codes: [],
  names: [],
  contactPersons: [],
  phones: [],
  supplierType: '',
  debtStatus: '',
  ratingFilter: '',
  status: '',
  pageIndex: 1,
  pageSize: 15,
};

export const SupplierListPage: FC = () => {
  const role = useAuthStore((s) => s.user?.role);
  const isStoreOwner = role === 'STORE_OWNER' || role === 'ADMIN' || !role;

  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters are only applied when user clicks "Tìm kiếm" or "Đặt lại"
  const [appliedFilters, setAppliedFilters] = useState<SupplierFilterState>(DEFAULT_FILTERS);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierSummary | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
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

  const handleCreateSupplier = async (input: CreateSupplierInput) => {
    try {
      const created = await supplierApi.createSupplier(input);
      showToast(`Đã thêm mới nhà cung cấp ${created.name} (${created.code}) thành công!`, 'success');
      setIsCreateModalOpen(false);
      await fetchSuppliers();
    } catch (err: any) {
      // Re-throw so modal error banner displays the message
      throw err;
    }
  };

  const handleEditSupplier = async (input: UpdateBasicSupplierInput) => {
    try {
      const updated = await supplierApi.updateBasicSupplier(input.id, input);
      showToast(`Đã cập nhật thông tin nhà cung cấp ${updated.name} thành công!`, 'success');
      setIsEditModalOpen(false);
      setEditingSupplier(null);
      await fetchSuppliers();
      if (selectedSupplier && selectedSupplier.id === input.id) {
        setSelectedSupplier((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
              }
            : null
        );
      }
    } catch (err: any) {
      throw err;
    }
  };

  const handleToggleStatus = async (supplier: SupplierSummary) => {
    const newStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    if (newStatus === 'Inactive' && supplier.currentDebt > 0) {
      showToast(`${supplier.name} vẫn còn dư nợ AP. Hệ thống sẽ ngừng giao dịch mới, không tự hủy đơn đã xác nhận.`, 'warning');
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
    try {
      await supplierApi.deleteSupplier(supplier.id);
      showToast(`Đã xóa nhà cung cấp ${supplier.name}!`, 'success');
      setSelectedSupplier(null);
      await fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Không thể xóa nhà cung cấp.', 'error');
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await supplierApi.getSuppliers({
        ...appliedFilters,
        pageIndex: 1,
        pageSize: Math.max(totalCount, appliedFilters.pageSize, 100),
      });
      if (res.items.length === 0) {
        showToast('Không có nhà cung cấp để xuất file.', 'warning');
        return;
      }

      const deliveryResults = await Promise.allSettled(
        res.items.map((s) => supplierApi.getDeliveryConfig(s.id))
      );
      const deliveryBySupplierId: Record<string, SupplierExportDeliveryInfo> = {};
      res.items.forEach((s, idx) => {
        const result = deliveryResults[idx];
        if (result.status !== 'fulfilled' || !result.value) return;
        const cfg = result.value;
        const deliveryDays: string[] = Array.isArray(cfg.deliveryDays) ? cfg.deliveryDays : [];
        deliveryBySupplierId[s.id] = {
          deliveryDays,
          deliveryDaysDisplay: formatDeliveryDaysForExcel(deliveryDays),
          cutoffDayOffset: typeof cfg.cutoffDayOffset === 'number' ? cfg.cutoffDayOffset : null,
          cutoffTime: cfg.cutoffTime || cfg.orderCutoffTime || null,
          minOrderQuantity: typeof cfg.minOrderQuantity === 'number' ? cfg.minOrderQuantity : null,
        };
      });

      exportSuppliersToExcel(res.items, {
        storeName: 'HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS',
        exportedBy: isStoreOwner ? 'Quản lý cửa hàng (Store Owner)' : 'Nhân viên chi nhánh',
        deliveryBySupplierId,
      });

      showToast(`Đã xuất ${res.items.length} nhà cung cấp ra tệp Excel (.xlsx) chuẩn định dạng.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xuất danh sách nhà cung cấp.';
      showToast(msg, 'error');
    } finally {
      setIsExporting(false);
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
          onSupplierUpdated={(updated) => {
            setSelectedSupplier(updated);
            fetchSuppliers();
          }}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDeleteSupplier}
          onLinkCustomer={handleLinkCustomer}
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

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Building2 size={22} color="var(--blue-primary, #0f766e)" />
            <span>Quản lý Nhà Cung Cấp</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            title="Quản lý danh mục sản phẩm theo từng Nhà cung cấp"
          >
            <Package size={14} />
            <span>Sản phẩm theo NCC</span>
          </Link>
          <Link
            to="/store-owner/stores/products"
            className="po-btn po-btn-secondary"
            title="Quản lý sản phẩm theo cửa hàng / chi nhánh"
          >
            <Store size={14} />
            <span>Sản phẩm theo Cửa hàng</span>
          </Link>
          <Link
            to="/store-owner/suppliers/branches"
            className="po-btn po-btn-secondary"
            title="Gán nhà cung cấp phân bổ tới các cửa hàng / chi nhánh"
          >
            <Store size={14} />
            <span>Gán NCC với Cửa hàng</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            title="Xuất danh sách nhà cung cấp ra Excel"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Xuất Excel</span>
          </button>
          {isStoreOwner && (
            <button
              type="button"
              className="po-btn po-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={14} />
              <span>Thêm Nhà Cung Cấp</span>
            </button>
          )}
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
          setIsEditModalOpen(true);
        }}
        canEdit={isStoreOwner}
      />

      {/* Modals */}
      <CreateSupplierModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSupplier}
      />

      <EditSupplierModal
        isOpen={isEditModalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSupplier(null);
        }}
        onSubmit={handleEditSupplier}
      />
    </div>
  );
};

export default SupplierListPage;
