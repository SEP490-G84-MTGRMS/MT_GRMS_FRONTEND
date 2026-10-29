import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type {
  StoreSummary,
  StoreProductItem,
  StoreProductFilterValues,
  AssignStoreProductInput,
  EditStoreProductInput,
} from '../types/storeProduct.types';
import { StoreProductContextCard } from '../components/StoreProductContextCard';
import { StoreProductFilterBar } from '../components/StoreProductFilterBar';
import { StoreProductTable } from '../components/StoreProductTable';
import { AssignStoreProductModal } from '../components/AssignStoreProductModal';
import { EditStoreProductModal } from '../components/EditStoreProductModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { storeProductApi } from '../api/storeProductApi';
import { MASTER_PRODUCTS } from '../../supplier/lib/mockData';
import { Loader2 } from 'lucide-react';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';

export interface StoreProductFilterState extends StoreProductFilterValues {
  pageIndex: number;
  pageSize: number;
}

const DEFAULT_FILTERS: StoreProductFilterState = {
  searchTerm: '',
  storeId: 'ALL',
  categoryFilter: 'ALL',
  statusFilter: 'ALL',
  stockAlertFilter: 'ALL',
  pageIndex: 1,
  pageSize: 10,
};

export const StoreProductManagementPage: FC = () => {
  const [searchParams] = useSearchParams();
  const queryStoreId = searchParams.get('storeId');

  // Stores & Products state
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Applied filter criteria state
  const [appliedFilters, setAppliedFilters] = useState<StoreProductFilterState>(() => ({
    ...DEFAULT_FILTERS,
    storeId: queryStoreId || 'ALL',
  }));

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreProductItem | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now().toString(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Load stores summary on mount
  useEffect(() => {
    const loadStores = async () => {
      try {
        const summaries = await storeProductApi.getStoreSummaries();
        setStores(summaries);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách chi nhánh.', 'error');
      }
    };
    loadStores();
  }, []);

  // Fetch products based on applied filters & pagination
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storeProductApi.getStoreProducts(appliedFilters);
      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách sản phẩm cửa hàng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Current active store (if a single store is selected)
  const currentStore = useMemo(() => {
    if (appliedFilters.storeId !== 'ALL') {
      return stores.find((s) => s.id === appliedFilters.storeId) || stores[0];
    }
    return stores[0];
  }, [stores, appliedFilters.storeId]);

  // Unique categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    MASTER_PRODUCTS.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, []);

  // Filter Search & Reset Handlers
  const handleApplySearch = (newValues: StoreProductFilterValues) => {
    setAppliedFilters((prev) => ({
      ...prev,
      ...newValues,
      pageIndex: 1,
    }));
  };

  const handleResetFilters = () => {
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handlePageChange = (pageIndex: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageIndex }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setAppliedFilters((prev) => ({ ...prev, pageSize, pageIndex: 1 }));
  };

  // Actions: Assign products
  const handleAssignProducts = async (input: AssignStoreProductInput) => {
    try {
      await storeProductApi.assignProducts(input);
      showToast(`Đã gán thành công ${input.productIds.length} sản phẩm vào cửa hàng.`);
      await fetchProducts();
      // Refresh summaries
      const summaries = await storeProductApi.getStoreSummaries();
      setStores(summaries);
    } catch (err: any) {
      showToast(err.message || 'Không thể gán sản phẩm.', 'error');
    }
  };

  // Actions: Update product
  const handleUpdateProduct = async (
    storeId: string,
    productId: string,
    input: EditStoreProductInput
  ) => {
    try {
      await storeProductApi.updateProduct(storeId, productId, input);
      showToast('Đã cập nhật thông tin sản phẩm tại chi nhánh thành công.');
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật sản phẩm.', 'error');
    }
  };

  // Actions: Toggle status
  const handleToggleStatus = async (item: StoreProductItem) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await storeProductApi.toggleStatus(item.storeId, item.productId, newStatus);
      showToast(
        newStatus === 'Active'
          ? `Đã kích hoạt kinh doanh sản phẩm "${item.name}" tại chi nhánh.`
          : `Đã tạm ngừng kinh doanh sản phẩm "${item.name}" tại chi nhánh.`
      );
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể đổi trạng thái sản phẩm.', 'error');
    }
  };

  // Actions: Remove product
  const handleRemoveProduct = async (item: StoreProductItem) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn gỡ bỏ sản phẩm "${item.name}" khỏi danh mục kinh doanh của chi nhánh "${item.storeName}" không?`
      )
    ) {
      return;
    }

    try {
      await storeProductApi.removeProduct(item.storeId, item.productId);
      showToast(`Đã gỡ sản phẩm "${item.name}" khỏi chi nhánh.`);
      await fetchProducts();
      const summaries = await storeProductApi.getStoreSummaries();
      setStores(summaries);
    } catch (err: any) {
      showToast(err.message || 'Không thể gỡ sản phẩm.', 'error');
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

      {/* ── Page Header ── */}
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
            <span>Sản Phẩm Theo Cửa Hàng / Chi Nhánh</span>
            {isLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />}
          </h1>
        </div>

        {/* Action buttons (Pure text, NO icons inside text) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            to="/store-owner/suppliers/branches"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Xem danh sách các cửa hàng chi nhánh"
          >
            <span>Danh sách Cửa hàng</span>
          </Link>
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px', textDecoration: 'none' }}
            title="Chuyển sang xem sản phẩm theo Nhà cung cấp"
          >
            <span>Sản phẩm theo NCC</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => showToast('Đang kết xuất danh mục hàng hóa chi nhánh ra tệp Excel (.xlsx)...', 'info')}
          >
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            id="btnOpenAssignProductModal"
            className="po-btn po-btn-primary"
            style={{ height: 32, padding: '0 14px' }}
            onClick={() => setIsAssignModalOpen(true)}
          >
            <span>Gán sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* ── Context Card: Hiển thị khi lọc theo 1 Cửa hàng cụ thể ── */}
      {appliedFilters.storeId !== 'ALL' && currentStore && (
        <div style={{ flexShrink: 0, marginBottom: 8 }}>
          <StoreProductContextCard
            store={currentStore}
            stores={stores}
            onSelectStore={(newId) =>
              setAppliedFilters((prev) => ({ ...prev, storeId: newId, pageIndex: 1 }))
            }
            productCount={totalCount}
          />
        </div>
      )}

      {/* ── Bộ Lọc Filter Bar 2 dòng rộng rãi ── */}
      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <StoreProductFilterBar
          initialValues={appliedFilters}
          stores={stores}
          categories={availableCategories}
          totalCount={totalCount}
          filteredCount={products.length}
          onSearch={handleApplySearch}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── Bảng Dữ Liệu Sản Phẩm ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <StoreProductTable
          products={products}
          totalCount={totalCount}
          pageIndex={appliedFilters.pageIndex}
          pageSize={appliedFilters.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onEdit={(item) => setEditingItem(item)}
          onToggleStatus={handleToggleStatus}
          onRemove={handleRemoveProduct}
          onOpenAssignModal={() => setIsAssignModalOpen(true)}
        />
      </div>

      {/* ── Modal Gán sản phẩm mới vào Cửa hàng ── */}
      {currentStore && (
        <AssignStoreProductModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          currentStore={currentStore}
          assignedProductIds={assignedProductIds}
          onAssign={handleAssignProducts}
        />
      )}

      {/* ── Modal Sửa Giá & Tồn kho sản phẩm ── */}
      <EditStoreProductModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        product={editingItem}
        onSave={handleUpdateProduct}
      />
    </div>
  );
};
export default StoreProductManagementPage;
