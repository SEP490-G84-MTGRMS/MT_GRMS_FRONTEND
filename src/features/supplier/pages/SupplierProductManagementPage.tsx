import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  INITIAL_SUPPLIERS,
  MASTER_PRODUCTS,
} from '../lib/mockData';
import type {
  SupplierSummary,
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../types/supplier.types';
import { SupplierContextCard } from '../components/products/SupplierContextCard';
import {
  SupplierProductFilterBar,
  type SupplierProductFilterValues,
} from '../components/products/SupplierProductFilterBar';
import { SupplierProductTable } from '../components/products/SupplierProductTable';
import { AssignProductModal } from '../components/products/AssignProductModal';
import { EditSupplierProductModal } from '../components/products/EditSupplierProductModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { supplierProductApi } from '../api/supplierProductApi';
import { supplierApi } from '../api/supplierApi';
import { Building2, Download, Plus, Layers, Store, Loader2 } from 'lucide-react';
import '../../purchase-order/purchase-order.css';
import '../supplier.css';

export interface ProductFilterState extends SupplierProductFilterValues {
  pageIndex: number;
  pageSize: number;
}

const DEFAULT_FILTERS: ProductFilterState = {
  productSearch: '',
  supplierSearch: '',
  searchTerm: '',
  supplierId: 'ALL',
  categoryFilter: 'ALL',
  statusFilter: 'ALL',
  pageIndex: 1,
  pageSize: 10,
};

export const SupplierProductManagementPage: FC = () => {
  const { id: paramSupplierId } = useParams<{ id?: string }>();

  // Suppliers state (fetched from API with fallback to mock)
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>(INITIAL_SUPPLIERS);
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

  // Fetch real suppliers list for filter dropdowns
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await supplierApi.getSuppliers({ pageIndex: 1, pageSize: 100 });
        if (res.items && res.items.length > 0) {
          setSuppliers(res.items);
        }
      } catch {
        // Keep initial suppliers fallback
      }
    };
    loadSuppliers();
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

  // Current active supplier (if a single supplier is selected)
  const currentSupplier = useMemo(() => {
    if (appliedFilters.supplierId !== 'ALL') {
      return suppliers.find((s) => s.id === appliedFilters.supplierId) || suppliers[0];
    }
    return suppliers[0];
  }, [suppliers, appliedFilters.supplierId]);

  // Available categories across master products
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    MASTER_PRODUCTS.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, []);

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
      await supplierProductApi.assignProduct(input);
      showToast('Đã gán thành công sản phẩm cho nhà cung cấp.');
      setIsAssignModalOpen(false);
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Thao tác gán sản phẩm không thành công.', 'error');
    }
  };

  const handleSaveEdit = async (input: EditSupplierProductInput) => {
    if (!editingItem) return;
    try {
      await supplierProductApi.updateProduct(editingItem.supplierId, editingItem.productId, input);
      showToast('Đã cập nhật thành công giá nhập sỉ và số lượng tối thiểu (MOQ).');
      setEditingItem(null);
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật sản phẩm.', 'error');
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

      {/* ── Page Header theo chuẩn PoList / SupplierListPage ── */}
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
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Sản Phẩm Theo Nhà Cung Cấp</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />}
          </h1>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/suppliers"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Quay lại danh sách nhà cung cấp"
          >
            <Building2 size={14} />
            <span>Danh sách NCC</span>
          </Link>
          <Link
            to="/store-owner/suppliers/branches"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Gán nhà cung cấp phân bổ tới các cửa hàng / chi nhánh"
          >
            <Store size={14} />
            <span>Gán NCC với Cửa hàng</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => showToast('Đang kết xuất danh mục mặt hàng NCC ra tệp Excel (.xlsx)...', 'info')}
          >
            <Download size={14} />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            id="btnOpenAssignProductModal"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => setIsAssignModalOpen(true)}
          >
            <Plus size={14} />
            <span>Gán sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* ── Context Card: Hiển thị khi lọc theo 1 NCC cụ thể ── */}
      {appliedFilters.supplierId !== 'ALL' && (
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          <SupplierContextCard
            supplier={currentSupplier}
            suppliers={suppliers}
            onSelectSupplier={(newId) =>
              setAppliedFilters((prev) => ({ ...prev, supplierId: newId, pageIndex: 1 }))
            }
            productCount={totalCount}
          />
        </div>
      )}

      {/* ── UNIFIED FILTER BAR THEO CHUẨN SUPPLIER LIST ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <SupplierProductFilterBar
          initialValues={appliedFilters}
          suppliers={suppliers}
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
        masterProducts={MASTER_PRODUCTS}
        assignedProductIds={assignedProductIds}
        onAssign={handleAssignProduct}
      />

      {/* Modal 2: Edit Product Price & MOQ */}
      <EditSupplierProductModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        supplierName={
          suppliers.find((s) => s.id === editingItem?.supplierId)?.name || currentSupplier.name
        }
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default SupplierProductManagementPage;
