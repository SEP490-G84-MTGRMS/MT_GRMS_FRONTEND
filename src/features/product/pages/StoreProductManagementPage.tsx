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
import type { SupplierSummary } from '../../supplier/types/supplier.types';
import { StoreProductContextCard } from '../components/StoreProductContextCard';
import { StoreProductFilterBar } from '../components/StoreProductFilterBar';
import { StoreProductTable } from '../components/StoreProductTable';
import { AssignStoreProductModal } from '../components/AssignStoreProductModal';
import { EditStoreProductModal } from '../components/EditStoreProductModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { storeProductApi } from '../api/storeProductApi';
import { supplierApi } from '../../supplier/api/supplierApi';
import { Building2, Loader2, Package } from 'lucide-react';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';

export interface StoreProductFilterState extends StoreProductFilterValues {
  pageIndex: number;
  pageSize: number;
}

const DEFAULT_FILTERS: StoreProductFilterState = {
  searchTerm: '',
  skus: [],
  names: [],
  storeCodes: [],
  storeNames: [],
  supplierCodes: [],
  supplierNames: [],
  storeId: 'ALL',
  statusFilter: 'ALL',
  pageIndex: 1,
  pageSize: 15,
};

export const StoreProductManagementPage: FC = () => {
  const [searchParams] = useSearchParams();
  const queryStoreId = searchParams.get('storeId');

  // Stores, Suppliers & Products state
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
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

  // Load stores summary & suppliers on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const summaries = await storeProductApi.getStoreSummaries();
        setStores(summaries);
      } catch (err: any) {
        showToast(err.message || 'Không thể tải danh sách chi nhánh.', 'error');
      }

      try {
        const suppRes = await supplierApi.getSuppliers({ pageIndex: 1, pageSize: 100 });
        setSuppliers(suppRes.items);
      } catch {
        // non-blocking for suppliers
      }
    };
    loadInitialData();
  }, []);

  // Fetch products based on applied filters & pagination
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storeProductApi.getStoreProducts(appliedFilters);
      const enriched = res.items.map((item) => ({
        ...item,
        storeCode: item.storeCode || stores.find((s) => s.id === item.storeId)?.code || '---',
      }));
      setProducts(enriched);
      setTotalCount(res.total);
    } catch (err: any) {
      showToast(err.message || 'Không thể tải danh sách sản phẩm cửa hàng.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, stores]);

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
  ): Promise<void> => {
    try {
      await storeProductApi.updateProduct(storeId, productId, input);
      showToast('Đã cập nhật thông tin sản phẩm tại chi nhánh thành công.');
      await fetchProducts();
    } catch (err: any) {
      showToast(err.message || 'Không thể cập nhật sản phẩm.', 'error');
      throw err;
    }
  };

  // Actions: Toggle status
  const handleToggleStatus = async (item: StoreProductItem): Promise<void> => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    const confirmed = window.confirm(
      newStatus === 'Inactive'
        ? `Tạm ngừng kinh doanh "${item.name}" tại chi nhánh này? Các chi nhánh khác không bị ảnh hưởng.`
        : `Kích hoạt lại "${item.name}" tại chi nhánh này?`
    );
    if (!confirmed) return;
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
      throw err;
    }
  };

  // Actions: Remove product from store
  const handleRemoveProduct = async (item: StoreProductItem): Promise<void> => {
    try {
      await storeProductApi.removeProduct(item.storeId, item.productId);
      showToast(`Đã gỡ sản phẩm "${item.name}" khỏi chi nhánh.`);
      await fetchProducts();
      const summaries = await storeProductApi.getStoreSummaries();
      setStores(summaries);
    } catch (err: any) {
      showToast(err.message || 'Không thể gỡ sản phẩm.', 'error');
      throw err;
    }
  };


  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Đang kết xuất danh mục sản phẩm theo bộ lọc ra tệp Excel (.csv)...', 'info');

    try {
      const res = await storeProductApi.getStoreProducts({
        ...appliedFilters,
        pageIndex: 1,
        pageSize: 1000,
      });

      const exportItems = res.items;
      if (!exportItems.length) {
        showToast('Không có dữ liệu sản phẩm nào để xuất theo bộ lọc hiện tại.', 'warning');
        return;
      }

      const headers = [
        'Mã Cửa Hàng',
        'Tên Cửa Hàng',
        'Mã SKU',
        'Tên Sản Phẩm',
        'Mã Nhà Cung Cấp',
        'Tên Nhà Cung Cấp',
        'Giá Vốn (đ)',
        'Giá Bán Lẻ (đ)',
        'SL Đặt Tối Thiểu',
        'ĐVT',
        'Trạng Thái',
      ];

      const csvRows = [headers.join(',')];

      for (const item of exportItems) {
        const row = [
          `"${(item.storeCode || '').replace(/"/g, '""')}"`,
          `"${(item.storeName || '').replace(/"/g, '""')}"`,
          `"${(item.sku || '').replace(/"/g, '""')}"`,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          `"${(item.primarySupplierCode || '').replace(/"/g, '""')}"`,
          `"${(item.primarySupplierName || '').replace(/"/g, '""')}"`,
          item.costPrice,
          item.retailPrice,
          item.minOrderQuantity ?? 10,
          `"${(item.unit || '').replace(/"/g, '""')}"`,
          `"${item.status === 'Active' ? 'Đang bán' : 'Tạm ngừng'}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      link.href = url;
      link.setAttribute('download', `SanPham_ChiNhanh_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Đã xuất thành công ${exportItems.length} sản phẩm ra tệp Excel (.csv).`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất file Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

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
            <Package size={22} color="var(--blue-primary, #0f766e)" />
            <span>Sản Phẩm Theo Cửa Hàng / Chi Nhánh</span>
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
            title="Xem danh sách các cửa hàng chi nhánh"
          >
            <span>Danh sách Cửa hàng</span>
          </Link>
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            title="Chuyển sang xem sản phẩm theo Nhà cung cấp"
          >
            <span>Sản phẩm theo NCC</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-secondary"
            disabled={isExporting}
            onClick={handleExportExcel}
            title="Xuất danh sách sản phẩm theo bộ lọc hiện tại ra tệp Excel"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            id="btnOpenAssignProductModal"
            className="po-btn po-btn-primary"
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
          suppliers={suppliers}
          products={products}
          totalCount={totalCount}
          filteredCount={products.length}
          onSearch={handleApplySearch}
          onReset={handleResetFilters}
        />
      </div>

      {/* ── Bảng Dữ Liệu Sản Phẩm ── */}
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

      {/* ── Modal Gán sản phẩm mới vào Cửa hàng ── */}
      <AssignStoreProductModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        stores={stores}
        currentStore={appliedFilters.storeId !== 'ALL' ? currentStore : null}
        onAssign={handleAssignProducts}
      />

      {/* ── Modal Thao tác sản phẩm chi nhánh (Đầy đủ mọi thao tác trong popup) ── */}
      <EditStoreProductModal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        product={editingItem}
        stores={stores}
        onSave={handleUpdateProduct}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
};
export default StoreProductManagementPage;
