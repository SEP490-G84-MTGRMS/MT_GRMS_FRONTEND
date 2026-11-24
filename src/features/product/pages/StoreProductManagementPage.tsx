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
import { StoreProductImportResultModal } from '../components/StoreProductImportResultModal';
import { AdminToast, type ToastState } from '../../admin/components';
import { storeProductApi, type StoreProductExcelImportResult } from '../api/storeProductApi';
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

  // Fetch products based on applied filters & pagination (avoid double fetch on stores load — BP-07)
  const storesRef = useRef(stores);
  storesRef.current = stores;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storeProductApi.getStoreProducts(appliedFilters);
      const enriched = res.items.map((item) => ({
        ...item,
        storeCode: item.storeCode || storesRef.current.find((s) => s.id === item.storeId)?.code || '---',
      }));
      setProducts(enriched);
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
      const count = input.items?.length ?? input.productIds.length;
      showToast(`Đã gán thành công ${count} sản phẩm vào cửa hàng.`);
      await fetchProducts();
      // Refresh summaries
      const summaries = await storeProductApi.getStoreSummaries();
      setStores(summaries);
    } catch (err: any) {
      showToast(err.message || 'Không thể gán sản phẩm.', 'error');
      throw err;
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

  // Actions: Toggle status (confirmed via custom modal — BP-06)
  const [confirmToggleItem, setConfirmToggleItem] = useState<StoreProductItem | null>(null);

  const handleToggleStatus = async (item: StoreProductItem): Promise<void> => {
    setConfirmToggleItem(item);
  };

  const executeToggleStatus = async (item: StoreProductItem): Promise<void> => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await storeProductApi.toggleStatus(item.storeId, item.productId, newStatus);
      showToast(
        newStatus === 'Active'
          ? `Đã kích hoạt kinh doanh sản phẩm "${item.name}" tại chi nhánh.`
          : `Đã tạm ngừng kinh doanh sản phẩm "${item.name}" tại chi nhánh.`
      );
      setConfirmToggleItem(null);
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


  const [importResult, setImportResult] = useState<StoreProductExcelImportResult | null>(null);
  const [pendingImport, setPendingImport] = useState<{ storeId: string; file: File } | null>(null);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);

  const handleExportExcel = async (storeId: string) => {
    if (!storeId || storeId === 'ALL') {
      showToast('Vui lòng chọn một cửa hàng cụ thể để xuất Excel.', 'error');
      return;
    }
    setExcelBusy(true);
    try {
      await storeProductApi.exportUnitPriceExcel(storeId, appliedFilters);
      showToast('Đã tải file Excel giá bán theo ĐVT theo bộ lọc màn hình.', 'success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể xuất Excel. Kiểm tra cửa hàng có SP đã gán.';
      showToast(msg, 'error');
    } finally {
      setExcelBusy(false);
    }
  };

  const handleImportExcel = async (storeId: string, file: File, previewOnly = true) => {
    if (!storeId || storeId === 'ALL') {
      showToast('Vui lòng chọn một cửa hàng cụ thể để nhập Excel.', 'error');
      return;
    }
    setExcelBusy(true);
    try {
      const result = await storeProductApi.importUnitPriceExcel(storeId, file, appliedFilters, previewOnly);
      setImportResult(result);
      setIsImportResultOpen(true);
      if (previewOnly) {
        setPendingImport(result.isPreview && result.summary.failedCount === 0 ? { storeId, file } : null);
        return;
      }
      setPendingImport(null);
      if (result.summary.successCount > 0) {
        await fetchProducts();
      }
      if (result.summary.failedCount === 0) {
        setIsImportResultOpen(false);
        setImportResult(null);
        showToast(
          `Import thành công ${result.summary.successCount}/${result.summary.totalRows} dòng.`,
          'success'
        );
      } else {
        // Giữ popup để xem dòng lỗi
        showToast(
          `Import xong: ${result.summary.successCount} OK, ${result.summary.failedCount} lỗi.`,
          'info'
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Import Excel thất bại.';
      showToast(msg, 'error');
    } finally {
      setExcelBusy(false);
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
            title="Quản lý gán nhà cung cấp với cửa hàng"
          >
            <span>Gán NCC với Cửa hàng</span>
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
          onExportExcel={handleExportExcel}
          onImportExcel={handleImportExcel}
          excelBusy={excelBusy}
          fallbackStoreId={currentStore?.id ?? stores[0]?.id ?? null}
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

      <StoreProductImportResultModal
        busy={excelBusy}
        onConfirm={pendingImport ? () => void handleImportExcel(pendingImport.storeId, pendingImport.file, false) : undefined}
        isOpen={isImportResultOpen}
        result={importResult}
        onClose={() => {
          setIsImportResultOpen(false);
          setImportResult(null);
          setPendingImport(null);
        }}
      />
      {confirmToggleItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, maxWidth: 440, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Xác nhận đổi trạng thái
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
              {confirmToggleItem.status === 'Active'
                ? `Tạm ngừng kinh doanh "${confirmToggleItem.name}" tại chi nhánh này? Các chi nhánh khác không bị ảnh hưởng.`
                : `Kích hoạt lại "${confirmToggleItem.name}" tại chi nhánh này?`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="po-btn po-btn-secondary" onClick={() => setConfirmToggleItem(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="po-btn po-btn-primary"
                onClick={() => void executeToggleStatus(confirmToggleItem)}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StoreProductManagementPage;
