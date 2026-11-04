import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import type {
  SupplierSummary,
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../types/supplier.types';
import {
  SupplierProductFilterBar,
  type SupplierProductFilterValues,
} from '../components/products/SupplierProductFilterBar';
import { SupplierProductTable } from '../components/products/SupplierProductTable';
import { AssignProductModal } from '../components/products/AssignProductModal';
import { EditSupplierProductModal } from '../components/products/EditSupplierProductModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierProductApi, type BatchAssignProductInput } from '../api/supplierProductApi';
import { supplierApi } from '../api/supplierApi';
import { Building2, Download, Plus, Layers, Store, Loader2 } from 'lucide-react';
import '../../purchase-order/purchase-order.css';
import '../supplier.css';

export interface ProductFilterState extends SupplierProductFilterValues {
  pageIndex: number;
  pageSize: number;
}

const DEFAULT_FILTERS: ProductFilterState = {
  skus: [],
  names: [],
  supplierCodes: [],
  supplierNames: [],
  productSearch: '',
  supplierSearch: '',
  searchTerm: '',
  supplierId: 'ALL',
  categoryFilter: 'ALL',
  statusFilter: 'ALL',
  pageIndex: 1,
  pageSize: 20,
};

export const SupplierProductManagementPage: FC = () => {
  const { id: paramSupplierId } = useParams<{ id?: string }>();

  // Suppliers state (fetched from API)
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [products, setProducts] = useState<SupplierProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Applied filter criteria state - Only updated when clicking "Tìm kiếm" or reset
  const [appliedFilters, setAppliedFilters] = useState<ProductFilterState>(() => ({
    ...DEFAULT_FILTERS,
    supplierId: paramSupplierId || 'ALL',
  }));

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierProductItem | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Fetch suppliers & master products independently so one failure does not blank the other
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const resSuppliers = await supplierApi.getSuppliers({
          pageIndex: 1,
          pageSize: 100,
          status: 'Active',
        });
        setSuppliers(resSuppliers.items ?? []);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách nhà cung cấp.', 'error');
      }
    };

    const loadMasterProducts = async () => {
      try {
        const resProducts = await supplierProductApi.getMasterProducts();
        setMasterProducts(resProducts ?? []);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách sản phẩm Master.', 'error');
      }
    };

    void loadSuppliers();
    void loadMasterProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch supplier products based on applied filters & pagination
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await supplierProductApi.getSupplierProducts(
        appliedFilters.supplierId,
        {
          ...appliedFilters,
          suppliers,
        }
      );
      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách sản phẩm.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, suppliers]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Prefer filtered supplier; otherwise first Active supplier so assign popup feels populated
  const currentSupplier = useMemo(() => {
    if (appliedFilters.supplierId && appliedFilters.supplierId !== 'ALL') {
      return suppliers.find((s) => s.id === appliedFilters.supplierId) || null;
    }
    return suppliers.find((s) => s.status === 'Active') || suppliers[0] || null;
  }, [suppliers, appliedFilters.supplierId]);

  // Available categories across master products and supplier products
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    masterProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products, masterProducts]);

  // Filter Search & Reset Handlers
  const handleApplySearch = (newValues: SupplierProductFilterValues) => {
    setAppliedFilters((prev) => ({
      ...prev,
      ...newValues,
      pageIndex: 1,
    }));
  };

  const handleResetFilters = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (page: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize: size, pageIndex: 1 }));
  };

  // Item Handlers
  const handleAssignProduct = async (input: AssignProductInput) => {
    try {
      const res = await supplierProductApi.assignProduct(input);
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        showToast(`Đã gán sản phẩm thành công. Hệ thống đã tự động phân bổ sản phẩm đến ${syncedCount} chi nhánh.`);
      } else {
        showToast('Đã gán sản phẩm thành công. Sản phẩm sẽ được tự động phân bổ khi nhà cung cấp được liên kết với chi nhánh.');
      }
      setIsAssignModalOpen(false);
      await fetchProducts();
      return res;
    } catch (err: any) {
      showToast(err.message || 'Thao tác gán sản phẩm không thành công.', 'error');
      throw err;
    }
  };

  const handleAssignBatchProducts = async (input: BatchAssignProductInput) => {
    try {
      const res = await supplierProductApi.assignBatchProducts(input);
      const assignedCount = res?.assignedCount ?? input.productIds.length;
      const syncedCount = res?.syncedBranchesCount ?? 0;
      if (syncedCount > 0) {
        showToast(
          `Đã gán thành công ${assignedCount} sản phẩm cho nhà cung cấp. Hệ thống đã tự động phân bổ đến ${syncedCount} chi nhánh.`
        );
      } else {
        showToast(
          `Đã gán thành công ${assignedCount} sản phẩm cho nhà cung cấp. Sản phẩm sẽ được tự động phân bổ khi NCC liên kết với chi nhánh.`
        );
      }
      setIsAssignModalOpen(false);
      await fetchProducts();
      return res;
    } catch (err: any) {
      showToast(err.message || 'Thao tác gán sản phẩm không thành công.', 'error');
      throw err;
    }
  };

  const handleSaveEdit = async (input: EditSupplierProductInput) => {
    if (!editingItem) return;
    try {
      await supplierProductApi.updateProduct(editingItem.supplierId, editingItem.productId, input);
      if (input.status !== editingItem.status) {
        await supplierProductApi.toggleStatus(
          editingItem.supplierId,
          editingItem.productId,
          input.status
        );
      }
      showToast('Đã cập nhật điều khoản cung ứng.');
      setEditingItem(null);
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật sản phẩm.', 'error');
      throw err;
    }
  };

  const handleToggleStatus = async (item: SupplierProductItem) => {
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await supplierProductApi.toggleStatus(item.supplierId, item.productId, nextStatus);
      showToast(
        nextStatus === 'Active'
          ? `Đã kích hoạt lại mặt hàng "${item.name}".`
          : `Đã tạm ngưng cung ứng mặt hàng "${item.name}".`
      );
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể đổi trạng thái sản phẩm.', 'error');
      throw err;
    }
  };

  const handleSetPrimary = async (item: SupplierProductItem) => {
    try {
      await supplierProductApi.setPrimarySupplier(item.supplierId, item.productId, true);
      showToast(`Đã đặt "${suppliers.find(s => s.id === item.supplierId)?.name || 'NCC'}" làm Nhà cung cấp chính cho sản phẩm "${item.name}".`);
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể đặt NCC chính.', 'error');
    }
  };

  const assignedProductIds = useMemo(
    () => products.map((p) => p.productId),
    [products]
  );

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
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Sản Phẩm Theo Nhà Cung Cấp</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <Link
            to="/store-owner/suppliers"
            className="po-btn po-btn-secondary"
            title="Quay lại danh sách nhà cung cấp"
          >
            <Building2 size={14} />
            <span>Danh sách NCC</span>
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
            onClick={() => showToast('Đang kết xuất danh mục mặt hàng NCC ra tệp Excel (.xlsx)...', 'info')}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            id="btnOpenAssignProductModal"
            className="po-btn po-btn-primary"
            onClick={() => setIsAssignModalOpen(true)}
          >
            <Plus size={14} />
            <span>Gán sản phẩm mới</span>
          </button>
        </div>
      </div>


      {/* ── Filter bar chip-token theo chuẩn Store Products ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierProductFilterBar
          initialValues={appliedFilters}
          suppliers={suppliers}
          products={products}
          categories={availableCategories}
          totalCount={totalCount}
          filteredCount={products.length}
          onSearch={handleApplySearch}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── MAIN DATA TABLE WITH FIXED HEADER & INTEGRATED PAGING ── */}
      <SupplierProductTable
        products={products}
        suppliers={suppliers}
        totalCount={totalCount}
        pageIndex={appliedFilters.pageIndex}
        pageSize={appliedFilters.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={(item) => setEditingItem(item)}
        onToggleStatus={handleToggleStatus}
        onSetPrimary={handleSetPrimary}
        onOpenAssignModal={() => setIsAssignModalOpen(true)}
      />

      {/* Modal 1: Assign New Product */}
      <AssignProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        supplier={currentSupplier}
        suppliers={suppliers}
        masterProducts={masterProducts}
        assignedProductIds={assignedProductIds}
        onAssign={handleAssignProduct}
        onAssignBatch={handleAssignBatchProducts}
      />

      {/* Modal 2: Edit Product Price & MOQ */}
      <EditSupplierProductModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        supplierName={
          suppliers.find((s) => s.id === editingItem?.supplierId)?.name || currentSupplier?.name || ''
        }
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default SupplierProductManagementPage;
