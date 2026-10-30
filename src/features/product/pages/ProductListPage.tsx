import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { productApi } from '../api/productApi';
import {
  Plus,
  Download,
  Upload,
  Search,
  Printer,
  ShieldCheck,
  Package,
} from 'lucide-react';
import type { ProductItem, Category } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategorySidebar } from '../components/CategorySidebar';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ComboFormModal } from '../components/ComboFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { TablePagination } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import '../product.css';

export const ProductListPage: React.FC = () => {
  // State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // RBAC switch (StoreOwner vs Cashier) for BR-SEC-01 verification
  const currentUser = useAuthStore((state) => state.user);
  const initialRole: 'StoreOwner' | 'Cashier' =
    currentUser?.role === 'CASHIER' ? 'Cashier' : 'StoreOwner';
  const [userRole, setUserRole] = useState<'StoreOwner' | 'Cashier'>(initialRole);

  // Sync role if auth state changes
  useEffect(() => {
    if (currentUser?.role === 'CASHIER') {
      setUserRole('Cashier');
    } else if (
      currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'STORE_OWNER' ||
      currentUser?.role === 'MANAGER'
    ) {
      setUserRole('StoreOwner');
    }
  }, [currentUser?.role]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [stockCriteria, setStockCriteria] = useState<'all' | 'in_stock' | 'out_of_stock' | 'below_min' | 'negative'>('all');
  const [createdTime, setCreatedTime] = useState<'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState('');

  
  // 1. Tải danh mục thực tế từ backend
  const fetchCategories = useCallback(async () => {
    try {
      const catList = await categoryApi.getCategories();
      const mapped: Category[] = catList.map((c) => ({
        id: c.id,
        code: c.code || c.categoryCode || '',
        name: c.name,
        description: c.description,
        productCount: c.productCount ?? 0,
        depth: 0,
      }));
      setCategories(mapped);
    } catch (err) {
      console.error('Lỗi khi tải danh mục từ backend:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 2. Tải danh sách sản phẩm thực tế từ backend
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productApi.getProductsPaged({
        pageIndex,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        categoryId: selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : undefined,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      });
      if (res && res.items) {
        const mapped: ProductItem[] = res.items.map((p) => ({
          id: p.id,
          productCode: p.productCode || p.barcode,
          barcode: p.barcode || '',
          productName: p.name,
          categoryId: p.categoryId,
          categoryName: p.categoryName || 'Chung',
          baseUnit: p.baseUnit || 'Cái',
          sellingPrice: p.sellingPrice,
          costPrice: p.costPrice,
          onHand: 0,
          committed: 0,
          status: (p.status === 'Active' ? 'Active' : 'Discontinued') as 'Active' | 'Discontinued',
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '',
          updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('vi-VN') : '',
          imageUrl: p.imageUrl ?? undefined,
          minStock: p.minStock,
          maxStock: p.maxStock,
          vatRate: p.vatRate,
          isFavorite: p.isFavorite,
        }));
        setProducts(mapped);
        setTotalCount(res.totalCount);
      } else {
        setProducts([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách sản phẩm qua axios:', err);
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, selectedCategoryIds]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);

  const [isComboFormOpen, setIsComboFormOpen] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Table selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Category Actions
  const handleToggleCategory = (id: string) => {
    setPageIndex(1);
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((cid) => cid !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSelectAllCategories = () => {
    setPageIndex(1);
    if (selectedCategoryIds.length === categories.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(categories.map((c) => c.id));
    }
  };

  const handleSaveCategory = async (
    name: string,
    id?: string,
    code?: string,
    description?: string
  ) => {
    try {
      if (id) {
        // Cập nhật nhóm hàng qua backend API
        const updatedDto = await categoryApi.updateCategory(id, {
          name,
          description,
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: updatedDto.name,
                  code: updatedDto.code || updatedDto.categoryCode || c.code,
                  description: updatedDto.description,
                }
              : c
          )
        );
        showToast(`Đã cập nhật nhóm hàng: ${name}`);
      } else {
        // Tạo mới nhóm hàng trên backend API
        const createdDto = await categoryApi.createCategory({
          name,
          code,
          description,
        });
        const newCat: Category = {
          id: createdDto.id,
          code: createdDto.code || createdDto.categoryCode || '',
          name: createdDto.name,
          description: createdDto.description,
          productCount: createdDto.productCount ?? 0,
          depth: 0,
        };
        setCategories((prev) => [newCat, ...prev]);
        showToast(`Đã tạo nhóm hàng mới: ${createdDto.name} (${newCat.code})`);
      }
      // Làm mới danh mục và danh sách sản phẩm từ server
      await fetchCategories();
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu nhóm hàng.';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    try {
      await categoryApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setSelectedCategoryIds((prev) => prev.filter((cid) => cid !== id));
      showToast(`Đã xóa nhóm hàng: ${cat.name}`);
      await fetchCategories();
      fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa nhóm hàng.';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  // Product CRUD
  const handleSaveProduct = (data: Partial<ProductItem>, saveAndAddNew?: boolean) => {
    if (productToEdit) {
      // Update
      const updated = products.map((p) =>
        p.id === productToEdit.id ? ({ ...p, ...data, updatedAt: new Date().toLocaleDateString('vi-VN') } as ProductItem) : p
      );
      setProducts(updated);
      showToast(`Cập nhật hàng hóa "${data.productName}" thành công.`);
      if (selectedProduct && selectedProduct.id === productToEdit.id) {
        setSelectedProduct({ ...selectedProduct, ...data } as ProductItem);
      }
    } else {
      // Create
      const newProd: ProductItem = {
        id: `prod-${Date.now()}`,
        productCode: data.productCode || `SP${Math.floor(100000 + Math.random() * 900000)}`,
        barcode: data.barcode || '',
        productName: data.productName || '',
        categoryId: data.categoryId || '',
        categoryName: data.categoryName || '',
        baseUnit: data.baseUnit || 'Gói',
        sellingPrice: data.sellingPrice || 0,
        costPrice: data.costPrice ?? null,
        onHand: data.onHand || 0,
        committed: 0,
        status: 'Active',
        isFavorite: false,
        isCombo: false,
        createdAt: new Date().toLocaleDateString('vi-VN'),
        updatedAt: new Date().toLocaleDateString('vi-VN'),
        minStock: data.minStock || 0,
        maxStock: data.maxStock || 9999,
        vatRate: data.vatRate || 8,
        description: data.description || '',
        internalNote: data.internalNote || '',
        uomConversions: data.uomConversions || [],
        branchStocks: [
          { branchId: 'b-1', branchName: 'Chi nhánh trung tâm', onHand: 0, available: 0, committed: 0 },
        ],
        stockLedger: [],
      };
      setProducts([newProd, ...products]);

      // update category count
      setCategories(
        categories.map((c) =>
          c.id === newProd.categoryId ? { ...c, productCount: c.productCount + 1 } : c
        )
      );
      showToast(`Tạo mới hàng hóa "${newProd.productName}" thành công.`);
    }

    if (saveAndAddNew) {
      setProductToEdit(null);
    }
  };

  const handleSaveCombo = (data: Partial<ProductItem>) => {
    const newCombo: ProductItem = {
      id: `prod-cb-${Date.now()}`,
      productCode: data.productCode || `CB${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: data.barcode || '',
      productName: data.productName || '',
      categoryId: data.categoryId || '',
      categoryName: data.categoryName || '',
      baseUnit: data.baseUnit || 'Giỏ quà',
      sellingPrice: data.sellingPrice || 0,
      costPrice: data.costPrice ?? null,
      onHand: data.onHand || 0,
      committed: 0,
      status: 'Active',
      isFavorite: false,
      isCombo: true,
      comboComponents: data.comboComponents || [],
      createdAt: new Date().toLocaleDateString('vi-VN'),
      updatedAt: new Date().toLocaleDateString('vi-VN'),
      minStock: data.minStock || 5,
      maxStock: data.maxStock || 50,
      vatRate: 8,
      description: data.description || '',
      internalNote: data.internalNote || '',
      branchStocks: [
        { branchId: 'b-1', branchName: 'Chi nhánh trung tâm', onHand: data.onHand || 0, available: data.onHand || 0, committed: 0 },
      ],
      stockLedger: [],
    };
    setProducts([newCombo, ...products]);
    showToast(`Tạo mới gói Combo "${newCombo.productName}" thành công.`);
  };

  const handleDeleteProduct = (product: ProductItem) => {
    // BR-DATA-01 Check: If has transactions -> Soft Delete (Discontinued)
    if (product.hasTransactions) {
      setProducts(
        products.map((p) =>
          p.id === product.id ? { ...p, status: 'Discontinued' } : p
        )
      );
      showToast(
        `Sản phẩm đã có lịch sử giao dịch. Chuyển trạng thái sang "Ngừng kinh doanh" (Soft Delete theo BR-DATA-01).`,
        'warning'
      );
    } else {
      // Hard delete
      setProducts(products.filter((p) => p.id !== product.id));
      showToast(`Đã xóa sản phẩm "${product.productName}" khỏi danh mục.`);
    }
    setIsDetailModalOpen(false);
  };

  const handleToggleStatus = (product: ProductItem) => {
    const nextStatus = product.status === 'Active' ? 'Discontinued' : 'Active';
    setProducts(
      products.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );
    showToast(
      `Đã chuyển trạng thái sản phẩm sang: ${nextStatus === 'Active' ? 'Đang bán' : 'Ngừng kinh doanh'}`
    );
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct({ ...selectedProduct, status: nextStatus });
    }
  };

  const handleDuplicateProduct = (product: ProductItem) => {
    const cloned: ProductItem = {
      ...product,
      id: `prod-copy-${Date.now()}`,
      productCode: `SP${Math.floor(100000 + Math.random() * 900000)}`,
      barcode: `893${Math.floor(100000000 + Math.random() * 900000000)}`,
      productName: `${product.productName} (Bản sao)`,
      hasTransactions: false,
      onHand: 0,
      committed: 0,
      stockLedger: [],
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    setProducts([cloned, ...products]);
    showToast(`Đã sao chép thành công sản phẩm: ${cloned.productName}`);
    setIsDetailModalOpen(false);
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProducts(
      products.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  // Filtered products calculation
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const kw = searchTerm.trim().toLowerCase();
        const matchCode = item.productCode.toLowerCase().includes(kw);
        const matchBarcode = item.barcode.toLowerCase().includes(kw);
        const matchName = item.productName.toLowerCase().includes(kw);
        if (!matchCode && !matchBarcode && !matchName) return false;
      }

      // Categories
      if (selectedCategoryIds.length > 0) {
        const itemCatId = (item.categoryId || '').toLowerCase();
        if (!selectedCategoryIds.some((cid) => cid.toLowerCase() === itemCatId)) return false;
      }

      // Stock criteria
      if (stockCriteria === 'in_stock' && item.onHand <= 0) return false;
      if (stockCriteria === 'out_of_stock' && item.onHand !== 0) return false;
      if (stockCriteria === 'below_min' && item.onHand >= (item.minStock || 0)) return false;
      if (stockCriteria === 'negative' && item.onHand >= 0) return false;

      // Filter theo Thời gian tạo (Toàn thời gian vs Tùy chỉnh ngày)
      if (createdTime === 'custom' && customDate) {
        if (!item.createdAt) return false;
        // Chuẩn hóa item.createdAt (đã format vi-VN dd/mm/yyyy hoặc ISO yyyy-mm-dd)
        let itemDateStr = '';
        if (item.createdAt.includes('/')) {
          const parts = item.createdAt.split('/');
          if (parts.length === 3) {
            // dd/mm/yyyy -> yyyy-mm-dd
            itemDateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        } else if (item.createdAt.includes('-')) {
          itemDateStr = item.createdAt.split('T')[0];
        }

        if (itemDateStr && itemDateStr !== customDate) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchTerm, selectedCategoryIds, stockCriteria, createdTime, customDate]);

  // Totals
  const totalStock = filteredProducts.reduce((sum, p) => sum + p.onHand, 0);
  const totalCommitted = filteredProducts.reduce((sum, p) => sum + p.committed, 0);

  // Export mock
  const handleExport = () => {
    showToast(`Đang xuất file Excel cho ${filteredProducts.length} sản phẩm...`);
  };

  // Import mock
  const handleImport = () => {
    showToast('Chọn file Excel (.xlsx) để import danh mục hàng hóa.');
  };

  // Barcode Print mock
  const handlePrintBarcode = () => {
    showToast('Đang kết nối máy in tem mã vạch Barcode...');
  };

  return (
    <div className="product-management-container">
      {/* Toast */}
      {toast && <AdminToast toast={toast} onClose={() => setToast(null)} />}
      <div className="product-title-area">
        <Package size={28} color="#0F766E" />
        <h1>Hàng hóa</h1>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 9999,
            backgroundColor: '#ccfbf1',
            color: '#0f766e',
          }}
        >
          {filteredProducts.length} sản phẩm
        </span>
      </div>
      {/* 1. Header Toolbar */}
      <div className="product-header-toolbar">


        {/* Ô tìm kiếm nhanh */}
        <div style={{ flex: 1, maxWidth: 360, position: 'relative', margin: '0 12px' }}>
          <input
            type="text"
            className="filter-input"
            style={{ paddingLeft: 34, borderRadius: 9999 }}
            placeholder="Theo mã SKU, tên hàng, barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
        </div>

        {/* Actions buttons */}
        <div className="product-header-actions">
          {/* RBAC Role Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: 9999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} color="#0F766E" />
            <span>Vai trò:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as any)}
              style={{ border: 'none', background: 'none', fontWeight: 700, color: '#0F766E', outline: 'none', cursor: 'pointer' }}
            >
              <option value="StoreOwner">Chủ cửa hàng (Xem giá vốn)</option>
              <option value="Cashier">Thu ngân (Che giá vốn - BR-SEC-01)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary-teal"
            onClick={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
          >
            <Plus size={16} /> Thêm hàng hóa
          </button>

          <button
            type="button"
            className="btn-secondary-white"
            onClick={() => setIsComboFormOpen(true)}
          >
            <Plus size={16} /> Thêm combo - đóng gói
          </button>

          <button type="button" className="btn-secondary-white" onClick={handleImport} title="Nhập danh mục từ Excel">
            <Upload size={15} /> Import
          </button>

          <button type="button" className="btn-secondary-white" onClick={handleExport} title="Xuất danh mục ra Excel">
            <Download size={15} /> Xuất file
          </button>

          <button type="button" className="btn-secondary-white" onClick={handlePrintBarcode} title="In tem mã vạch theo tồn kho">
            <Printer size={15} /> In mã vạch
          </button>
        </div>
      </div>

      {/* 2. Main Body Grid: Sidebar + Table */}
      <div className="product-content-grid">
        {/* Left Column: Sidebar Filters */}
        <CategorySidebar
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={handleToggleCategory}
          onSelectAll={handleSelectAllCategories}
          onClearAll={() => { setSelectedCategoryIds([]); setPageIndex(1); }}
          onOpenCreateModal={() => {
            setCategoryToEdit(null);
            setIsCategoryModalOpen(true);
          }}
          onOpenEditModal={(cat) => {
            setCategoryToEdit(cat);
            setIsCategoryModalOpen(true);
          }}
          stockCriteria={stockCriteria}
          onChangeStockCriteria={setStockCriteria}
          createdTime={createdTime}
          onChangeCreatedTime={setCreatedTime}
          customDate={customDate}
          onChangeCustomDate={setCustomDate}
          supplierFilter={supplierFilter}
          onChangeSupplierFilter={setSupplierFilter}
        />

        {/* Right Column: Main Data Table */}
        <div className="product-table-wrapper">
          {/* Summary bar */}
          <div className="product-table-summary-bar">
            <div>
              Đang hiển thị <b>{filteredProducts.length}</b> mặt hàng
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                Tổng tồn kho: <span className="product-table-summary-stat">{totalStock.toLocaleString()}</span>
              </div>
              <div>
                Khách đặt: <span className="product-table-summary-stat">{totalCommitted.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="product-main-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        selectedProductIds.length === filteredProducts.length
                      }
                      onChange={() => {
                        if (selectedProductIds.length === filteredProducts.length) {
                          setSelectedProductIds([]);
                        } else {
                          setSelectedProductIds(filteredProducts.map((p) => p.id));
                        }
                      }}
                    />
                  </th>
                  <th style={{ width: 36, textAlign: 'center' }}>★</th>
                  <th style={{ width: 140 }}>Mã hàng</th>
                  <th>Tên hàng hóa</th>
                  <th style={{ textAlign: 'right', width: 110 }}>Giá bán</th>
                  {userRole === 'StoreOwner' && (
                    <th style={{ textAlign: 'right', width: 110 }}>Giá vốn</th>
                  )}
                  <th style={{ textAlign: 'right', width: 90 }}>Tồn kho</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Khách đặt</th>
                  <th style={{ width: 140 }}>Thời gian tạo</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id);
                  const isSelected = selectedProduct?.id === p.id && isDetailModalOpen;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsDetailModalOpen(true);
                      }}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? '#f0fdfa'
                          : p.status === 'Discontinued'
                            ? '#f8fafc'
                            : undefined,
                        opacity: p.status === 'Discontinued' ? 0.75 : 1,
                      }}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                            } else {
                              setSelectedProductIds([...selectedProductIds, p.id]);
                            }
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`favorite-star-btn ${p.isFavorite ? 'active' : ''}`}
                          onClick={(e) => handleToggleFavorite(p.id, e)}
                          title="Đánh dấu yêu thích"
                        >
                          {p.isFavorite ? '★' : '☆'}
                        </button>
                      </td>
                      <td>
                        <span className="product-code-link">
                          {p.productCode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {p.productName}
                        </span>
                        {p.isCombo && <span className="badge-combo">Combo</span>}
                        {p.uomConversions && p.uomConversions.length > 0 && (
                          <span className="badge-uom-tag">+{p.uomConversions.length} ĐVT</span>
                        )}
                        {p.status === 'Discontinued' && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 11,
                              color: '#dc2626',
                              background: '#fee2e2',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Ngừng kinh doanh
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {p.sellingPrice.toLocaleString()} đ
                      </td>
                      {userRole === 'StoreOwner' && (
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {p.costPrice != null ? `${p.costPrice.toLocaleString()} đ` : '—'}
                        </td>
                      )}
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: p.onHand <= 0 ? '#ef4444' : '#0F766E',
                        }}
                      >
                        {p.onHand}
                      </td>
                      <td style={{ textAlign: 'right' }}>{p.committed}</td>
                      <td style={{ fontSize: 12.5, color: '#64748b' }}>{p.createdAt}</td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={userRole === 'StoreOwner' ? 9 : 8}
                      style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}
                    >
                      <Package size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                      <div style={{ fontSize: 15, fontWeight: 600 }}>Không tìm thấy sản phẩm nào</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        Vui lòng thử tìm với từ khóa khác hoặc đặt lại bộ lọc.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Enterprise Standard TablePagination */}
          <TablePagination
            currentPage={pageIndex}
            pageSize={pageSize}
            totalItems={totalCount}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={(page) => setPageIndex(page)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPageIndex(1);
            }}
            itemLabel="hàng hóa"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 3. Product Form Modal (Add / Edit Standard Product) */}
      <ProductFormModal
        isOpen={isProductFormOpen}
        productToEdit={productToEdit}
        categories={categories}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
        onOpenCreateCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
        userRole={userRole}
      />

      {/* 4. Combo Form Modal */}
      <ComboFormModal
        isOpen={isComboFormOpen}
        categories={categories}
        availableProducts={products}
        onClose={() => setIsComboFormOpen(false)}
        onSave={handleSaveCombo}
        onOpenCreateCategoryModal={() => {
          setCategoryToEdit(null);
          setIsCategoryModalOpen(true);
        }}
      />

      {/* 5. Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        product={selectedProduct}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={(prod) => {
          setIsDetailModalOpen(false);
          setProductToEdit(prod);
          setIsProductFormOpen(true);
        }}
        onDelete={handleDeleteProduct}
        onToggleStatus={handleToggleStatus}
        onDuplicate={handleDuplicateProduct}
        userRole={userRole}
      />

      {/* 6. Category Modal (Placed last with high z-index to always render on top when opened from form modals) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        categoryToEdit={categoryToEdit}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        onDelete={handleDeleteCategory}
      />
    </div>
  );
};
