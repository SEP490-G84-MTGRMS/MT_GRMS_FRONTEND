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
  ChevronDown,
  Trash2,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategorySidebar } from '../components/CategorySidebar';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductDeleteConfirmModal } from '../components/ProductDeleteConfirmModal';
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [stockCriteria, setStockCriteria] = useState<'all' | 'in_stock' | 'out_of_stock' | 'below_min' | 'negative'>('all');
  const [createdTime, setCreatedTime] = useState<'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Dropdown đơn vị tính theo dòng sản phẩm (Ảnh 2 - REQ-07)
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [activeUnitDropdownId, setActiveUnitDropdownId] = useState<string | null>(null);

  // Đóng popover chọn đơn vị khi click ra ngoài
  useEffect(() => {
    if (!activeUnitDropdownId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.unit-dropdown-container')) {
        setActiveUnitDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [activeUnitDropdownId]);

  // Debounce tìm kiếm 300ms (REQ-02)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPageIndex(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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
        searchTerm: debouncedSearchTerm.trim() || undefined,
        categoryId: selectedCategoryIds.length === 1 ? selectedCategoryIds[0] : undefined,
        categoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
      });
      if (res && res.items) {
        const mapped: ProductItem[] = await Promise.all(
          res.items.map(async (p) => {
            let uomConversions: UomConversion[] = (p as any).uomConversions || [];
            if (uomConversions.length === 0 && p.id) {
              const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
              if (isGuid) {
                try {
                  const units = await productApi.getProductUnits(p.id);
                  if (units && units.length > 0) {
                    uomConversions = units
                      .filter((u) => !u.isBaseUnit)
                      .map((u) => ({
                        id: u.id,
                        unitName: u.unitName,
                        conversionRate: u.conversionRate,
                        price: u.price,
                        barcode: u.barcode ?? undefined,
                      }));
                  }
                } catch {
                  // ignore network or not found
                }
              }
            }
            return {
              id: p.id,
              productCode: p.productCode || (p as any).sku || p.barcode || 'SP000000',
              barcode: p.barcode || '',
              productName: p.name || (p as any).productName || '',
              categoryId: p.categoryId,
              categoryName: p.categoryName || 'Chung',
              baseUnit: p.baseUnit || (p as any).unitName || 'Cái',
              sellingPrice: p.sellingPrice ?? (p as any).basePrice ?? 0,
              costPrice: p.costPrice != null ? Number(p.costPrice) : null,
              onHand: 0,
              committed: 0,
              status: (p.status === 'Active' ? 'Active' : 'Discontinued') as 'Active' | 'Discontinued',
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '',
              updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('vi-VN') : '',
              imageUrl: p.imageUrl ?? undefined,
              imageUrls: p.imageUrls || (p.imageUrl ? [p.imageUrl] : []),
              description: p.description ?? undefined,
              internalNote: p.internalNote ?? undefined,
              minStock: p.minStock ?? 0,
              maxStock: p.maxStock ?? 1000,
              vatRate: p.vatRate ?? 0,
              isFavorite: Boolean(p.isFavorite),
              uomConversions,
            };
          })
        );
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
  }, [pageIndex, pageSize, debouncedSearchTerm, selectedCategoryIds]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Table selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Delete product modal states
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  // Product CRUD (kết nối trực tiếp Backend ProductsController & ProductUnitsController)
  const handleSaveProduct = async (
    data: Partial<ProductItem>,
    saveAndAddNew?: boolean,
    deletedUnitIds?: string[]
  ) => {
    try {
      if (productToEdit) {
        // Cập nhật sản phẩm qua PUT /api/v1/products/{id}
        await productApi.updateProduct(productToEdit.id, {
          name: data.productName || productToEdit.productName,
          categoryId: data.categoryId || productToEdit.categoryId,
          sellingPrice: data.sellingPrice ?? productToEdit.sellingPrice,
          barcode: data.barcode?.trim() || undefined,
          baseUnit: data.baseUnit?.trim() || productToEdit.baseUnit || 'Cái',
          costPrice: data.costPrice,
          minStock: data.minStock ?? productToEdit.minStock,
          maxStock: data.maxStock ?? productToEdit.maxStock,
          vatRate: data.vatRate ?? productToEdit.vatRate,
          status: data.status || productToEdit.status,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          hasBatches: data.hasBatches ?? productToEdit.hasBatches,
          isFavorite: data.isFavorite ?? productToEdit.isFavorite,
        });

        // 1. Xóa các đơn vị quy đổi đã bị người dùng gỡ bỏ qua DELETE /api/v1/product-units/{id}
        if (deletedUnitIds && deletedUnitIds.length > 0) {
          for (const unitId of deletedUnitIds) {
            try {
              await productApi.deleteProductUnit(unitId);
            } catch (delErr) {
              console.warn(`Lỗi khi xóa đơn vị quy đổi ${unitId}:`, delErr);
            }
          }
        }

        // 2. Xử lý thêm mới hoặc cập nhật các đơn vị quy đổi
        if (data.uomConversions && data.uomConversions.length > 0) {
          const validUnits = data.uomConversions.filter((u) => u.unitName && u.unitName.trim() !== '');
          for (const uom of validUnits) {
            if (uom.id.startsWith('uom-')) {
              try {
                await productApi.createProductUnit(productToEdit.id, {
                  unitName: uom.unitName,
                  conversionRate: uom.conversionRate,
                  price: uom.price,
                  barcode: uom.barcode?.trim() || null,
                  isBaseUnit: false,
                });
              } catch (unitErr) {
                console.warn('Lỗi khi thêm đơn vị quy đổi:', unitErr);
              }
            } else {
              // Cập nhật đơn vị quy đổi hiện có qua PUT /api/v1/product-units/{id}
              try {
                await productApi.updateProductUnit(uom.id, {
                  unitName: uom.unitName,
                  conversionRate: uom.conversionRate,
                  price: uom.price,
                  barcode: uom.barcode?.trim() || null,
                  isBaseUnit: false,
                });
              } catch (unitErr) {
                console.warn(`Lỗi khi cập nhật đơn vị quy đổi ${uom.id}:`, unitErr);
              }
            }
          }
        }

        showToast(`Cập nhật hàng hóa "${data.productName}" thành công.`);
        if (selectedProduct && selectedProduct.id === productToEdit.id) {
          setSelectedProduct({ ...selectedProduct, ...data } as ProductItem);
        }
      } else {
        // Tạo mới sản phẩm trên Backend qua POST /api/v1/products
        const created = await productApi.createProduct({
          name: data.productName!,
          categoryId: data.categoryId!,
          sellingPrice: data.sellingPrice || 0,
          productCode: data.productCode?.trim() || undefined,
          barcode: data.barcode?.trim() || undefined,
          baseUnit: data.baseUnit?.trim() || 'Cái',
          costPrice: data.costPrice,
          minStock: data.minStock ?? 0,
          maxStock: data.maxStock ?? 1000,
          vatRate: data.vatRate ?? 0,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          hasBatches: data.hasBatches ?? false,
          isFavorite: data.isFavorite ?? false,
        });

        // Thêm các đơn vị quy đổi cho sản phẩm vừa tạo qua POST /api/v1/products/{id}/units
        if (data.uomConversions && data.uomConversions.length > 0) {
          const validUnits = data.uomConversions.filter((u) => u.unitName && u.unitName.trim() !== '');
          for (const uom of validUnits) {
            try {
              await productApi.createProductUnit(created.id, {
                unitName: uom.unitName.trim(),
                conversionRate: uom.conversionRate || 1,
                price: uom.price || 0,
                barcode: uom.barcode?.trim() || null,
                isBaseUnit: false,
              });
            } catch (unitErr: any) {
              console.warn('Lỗi khi thêm đơn vị quy đổi:', unitErr);
              showToast(`Lỗi khi tạo đơn vị tính "${uom.unitName}": ${unitErr?.message || 'Không thành công'}`, 'warning');
            }
          }
        }

        showToast(`Tạo mới hàng hóa "${created.name || data.productName}" thành công.`);
      }

      // Làm mới danh mục và danh sách sản phẩm từ backend
      await fetchCategories();
      await fetchProducts();

      if (saveAndAddNew) {
        setProductToEdit(null);
      } else {
        setIsProductFormOpen(false);
        setProductToEdit(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu hàng hóa.';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const handleDeleteProduct = (product: ProductItem) => {
    setProductToDelete(product);
  };

  const handleConfirmSingleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productApi.deleteProduct(productToDelete.id);
      showToast(`Đã xóa hàng hóa "${productToDelete.productName}" thành công.`);
      if (selectedProduct?.id === productToDelete.id) {
        setIsDetailModalOpen(false);
        setSelectedProduct(null);
      }
      if (productToEdit?.id === productToDelete.id) {
        setIsProductFormOpen(false);
        setProductToEdit(null);
      }
      setSelectedProductIds((prev) => prev.filter((id) => id !== productToDelete.id));
      setProductToDelete(null);
      await fetchCategories();
      await fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa hàng hóa.';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setIsDeleting(true);
    try {
      let successCount = 0;
      for (const id of selectedProductIds) {
        try {
          await productApi.deleteProduct(id);
          successCount++;
        } catch (delErr) {
          console.warn(`Lỗi khi xóa hàng hóa ${id}:`, delErr);
        }
      }
      showToast(`Đã xóa thành công ${successCount} hàng hóa đã chọn.`);
      setSelectedProductIds([]);
      setIsBulkDeleteOpen(false);
      if (selectedProduct && selectedProductIds.includes(selectedProduct.id)) {
        setIsDetailModalOpen(false);
        setSelectedProduct(null);
      }
      await fetchCategories();
      await fetchProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa hàng hóa đã chọn.';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
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
        const matchCode = (item.productCode || '').toLowerCase().includes(kw);
        const matchBarcode = (item.barcode || '').toLowerCase().includes(kw);
        const matchName = (item.productName || '').toLowerCase().includes(kw);
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
  const totalStock = filteredProducts.reduce((sum, p) => sum + (p.onHand || 0), 0);
  const totalCommitted = filteredProducts.reduce((sum, p) => sum + (p.committed || 0), 0);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                Đang hiển thị <b>{filteredProducts.length}</b> mặt hàng
              </div>
              {selectedProductIds.length > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 10px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#991B1B' }}>
                    Đã chọn {selectedProductIds.length} hàng hóa
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteOpen(true)}
                    style={{
                      padding: '2px 8px',
                      fontSize: 12,
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#EF4444',
                      color: '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <Trash2 size={13} />
                    Xóa đã chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      fontSize: 12,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: '0 4px',
                    }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
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

                  // Tính toán đơn vị tính đang chọn và giá tương ứng (Ảnh 2 - REQ-07)
                  const allUnits = [
                    { unitName: p.baseUnit || 'Cái', price: p.sellingPrice ?? 0, barcode: p.barcode, productCode: p.productCode },
                    ...(p.uomConversions || []),
                  ];
                  const currentUnitName = selectedUnits[p.id] || p.baseUnit || 'Cái';
                  const currentUom = p.uomConversions?.find((u) => u.unitName === currentUnitName);
                  const displayPrice = currentUom ? currentUom.price : (p.sellingPrice ?? 0);
                  const displayCode = currentUom?.productCode || p.productCode;
                  const otherUnits = allUnits.filter((u) => u.unitName !== currentUnitName);

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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt=""
                              style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 4,
                                backgroundColor: '#f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 13,
                                color: '#94a3b8',
                                flexShrink: 0,
                              }}
                            >
                              📦
                            </div>
                          )}
                          <span className="product-code-link">
                            {displayCode}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {p.productName}
                          </span>
                          {p.uomConversions && p.uomConversions.length > 0 && (
                            <div className="unit-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveUnitDropdownId(activeUnitDropdownId === p.id ? null : p.id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#0284c7',
                                  fontWeight: 600,
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  borderRadius: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                }}
                                title="Chọn đơn vị tính"
                              >
                                <span>- {currentUnitName}</span>
                                <ChevronDown size={14} />
                              </button>

                              {activeUnitDropdownId === p.id && otherUnits.length > 0 && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    zIndex: 50,
                                    marginTop: 4,
                                    minWidth: 90,
                                    background: '#ffffff',
                                    borderRadius: 6,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid #E2E8F0',
                                    padding: '4px 0',
                                  }}
                                >
                                  {otherUnits.map((u) => (
                                    <button
                                      key={u.unitName}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUnits((prev) => ({ ...prev, [p.id]: u.unitName }));
                                        setActiveUnitDropdownId(null);
                                      }}
                                      style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'center',
                                        padding: '6px 14px',
                                        fontSize: 12.5,
                                        background: 'transparent',
                                        color: '#334155',
                                        fontWeight: 500,
                                        border: 'none',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                      onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                      }}
                                    >
                                      {u.unitName}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {p.isCombo && <span className="badge-combo">Combo</span>}
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
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {(displayPrice ?? 0).toLocaleString('vi-VN')} đ
                      </td>
                      {userRole === 'StoreOwner' && (
                        <td style={{ textAlign: 'right', color: '#64748b' }}>
                          {p.costPrice != null ? `${Number(p.costPrice).toLocaleString('vi-VN')} đ` : '—'}
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
        onDelete={handleDeleteProduct}
        userRole={userRole}
      />

      {/* 4. Product Detail Modal */}
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

      {/* 5. Product Delete Confirm Modal (Single) */}
      <ProductDeleteConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        productName={productToDelete?.productName}
        productCode={productToDelete?.productCode}
        isDeleting={isDeleting}
      />

      {/* 6. Product Delete Confirm Modal (Bulk) */}
      <ProductDeleteConfirmModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        itemCount={selectedProductIds.length}
        isDeleting={isDeleting}
      />

      {/* 7. Category Modal (Placed last with high z-index to always render on top when opened from form modals) */}
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
