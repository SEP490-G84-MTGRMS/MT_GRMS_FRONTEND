import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import type {
  MasterProductItem,
  MasterCatalogKpis,
  CreateMasterProductInput,
  UpdateMasterProductInput,
} from '../../features/admin/types/masterCatalog.types';
import { masterCatalogApi } from '../../features/admin/api/masterCatalogApi';
import { MasterCatalogKpiBanner } from '../../features/admin/components/master-catalog/MasterCatalogKpiBanner';
import { MasterCatalogFilterBar } from '../../features/admin/components/master-catalog/MasterCatalogFilterBar';
import { MasterCatalogTable } from '../../features/admin/components/master-catalog/MasterCatalogTable';
import { MasterProductModal } from '../../features/admin/components/master-catalog/MasterProductModal';
import { MasterExcelImportModal } from '../../features/admin/components/master-catalog/MasterExcelImportModal';
import { AdminToast, type ToastState } from '../../features/admin/components';
import './adminPlans.css';
import './masterCatalog.css';

export const MasterCatalogPage: FC = () => {
  // Data states
  const [products, setProducts] = useState<MasterProductItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpis, setKpis] = useState<MasterCatalogKpis>({
    totalProducts: 0,
    totalBrands: 0,
    totalUsage: 0,
    imageCoveragePercent: 0,
  });
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<MasterProductItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ id: String(Date.now()), message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Debounced search ref
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load KPIs, Brands, Categories once
  const loadMetadata = async () => {
    try {
      const [kpiRes, brandRes, catRes] = await Promise.all([
        masterCatalogApi.getKpis(),
        masterCatalogApi.getBrands(),
        masterCatalogApi.getCategories(),
      ]);
      setKpis(kpiRes);
      setBrands(brandRes);
      setCategories(catRes);
    } catch (err) {
      console.error('Lỗi khi nạp metadata Master Catalog:', err);
    }
  };

  // Load products list
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await masterCatalogApi.getMasterProducts({
        keyword: searchTerm.trim() || undefined,
        brand: selectedBrand === 'ALL' ? undefined : selectedBrand,
        categoryName: selectedCategory === 'ALL' ? undefined : selectedCategory,
        pageIndex: currentPage,
        pageSize: pageSize,
      });
      setProducts(result.items);
      setTotalCount(result.totalItems);
    } catch (err: any) {
      console.error('Lỗi khi nạp danh sách sản phẩm mẫu:', err);
      showToast(err?.message || 'Không thể tải danh sách sản phẩm mẫu.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedBrand, selectedCategory, currentPage, pageSize]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleOpenCreateModal = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (item: MasterProductItem) => {
    setProductToEdit(item);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (
    payload: CreateMasterProductInput | UpdateMasterProductInput,
    isEdit: boolean
  ) => {
    if (isEdit && productToEdit) {
      await masterCatalogApi.update(productToEdit.id, payload as UpdateMasterProductInput);
      showToast(`Đã cập nhật sản phẩm "${payload.name}" thành công.`);
    } else {
      await masterCatalogApi.create(payload as CreateMasterProductInput);
      showToast(`Đã thêm mới sản phẩm mẫu "${payload.name}" vào thư viện.`);
    }
    loadMetadata();
    loadProducts();
  };

  const handleDeleteProduct = async (item: MasterProductItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm mẫu "${item.name}" (Mã: ${item.barcode})?`)) {
      try {
        await masterCatalogApi.delete(item.id);
        showToast(`Đã xóa sản phẩm "${item.name}" khỏi thư viện mẫu.`, 'info');
        loadMetadata();
        loadProducts();
      } catch (err: any) {
        showToast(err?.message || 'Không thể xóa sản phẩm mẫu.', 'error');
      }
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await masterCatalogApi.downloadTemplate();
      showToast('Đã tải xuống file template Excel chuẩn.');
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải file template.', 'error');
    }
  };

  const handleImportSuccess = () => {
    showToast('Import dữ liệu vào Thư viện Toàn cầu thành công!', 'success');
    loadMetadata();
    loadProducts();
  };

  return (
    <div className="admin-plans admin-master-catalog">
      {/* Top Page Header */}
      <div className="plans-hero">
        <div>
          <p className="plans-eyebrow">CẤU HÌNH TOÀN CẦU</p>
          <h1>Dữ liệu khởi tạo cửa hàng</h1>
          <p>Quản lý danh mục hàng hóa mẫu tự động cấp cho cửa hàng khi tạo tài khoản mới.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadMetadata();
            loadProducts();
          }}
          title="Tải lại dữ liệu"
          className="admin-btn admin-btn-secondary"
          disabled={isLoading}
        >
          <RefreshCw size={14} />
          <span>Làm mới</span>
        </button>
      </div>

      <section className="catalog-initialization-policy">
        <span className="plans-name-icon"><Database size={21} /></span>
        <div>
          <h2>Tự động khởi tạo khi tạo cửa hàng</h2>
          <p>Các mẫu đang bật được sao chép thành sản phẩm, nhóm hàng và đơn vị tính riêng của cửa hàng mới, kèm giá bán gợi ý. Tồn kho ban đầu bằng 0.</p>
          <p>Thay đổi tại đây áp dụng cho cửa hàng được tạo tiếp theo. Chủ cửa hàng quản lý dữ liệu đã nhận trong danh mục của mình.</p>
        </div>
        <span className="plans-status is-active">Đang áp dụng</span>
      </section>

      {/* 4 KPI Banner */}
      <MasterCatalogKpiBanner kpis={kpis} isLoading={isLoading} />

      {/* Filter Bar */}
      <MasterCatalogFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedBrand={selectedBrand}
        onBrandChange={handleBrandChange}
        brands={brands}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        categories={categories}
        onDownloadTemplate={handleDownloadTemplate}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenCreateModal={handleOpenCreateModal}
      />

      {/* Master Catalog Data Table */}
      <MasterCatalogTable
        products={products}
        totalItems={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteProduct}
      />

      {/* Modal Thêm / Sửa thủ công */}
      <MasterProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
        brands={brands}
        categories={categories}
      />

      {/* Modal Kéo thả Import Excel */}
      <MasterExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Toast Notification */}
      <AdminToast
        toast={toast}
        onClose={closeToast}
      />
    </div>
  );
};
