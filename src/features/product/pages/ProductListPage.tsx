import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { productApi } from '../api/productApi';
import {
  Plus,
  SlidersHorizontal,
  Download,
  Upload,
  Search,
  Printer,
  Package,
  ChevronDown,
  Trash2,
  Folder,
  Calendar,
  X,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductDeleteConfirmModal } from '../components/ProductDeleteConfirmModal';
import { TablePagination, NotificationModal } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import '../product.css';

// Hàm chuẩn hóa tiếng Việt loại bỏ dấu thanh & ký tự đặc biệt phục vụ tìm kiếm thông minh
const removeVietnameseTones = (str?: string | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
};

export const ProductListPage: React.FC = () => {
  // State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // RBAC switch (StoreOwner vs Staff) for BR-SEC-01 verification
  const currentUser = useAuthStore((state) => state.user);
  const initialRole: 'StoreOwner' | 'Cashier' =
    currentUser?.role === 'STAFF' ? 'Cashier' : 'StoreOwner';
  const [userRole, setUserRole] = useState<'StoreOwner' | 'Cashier'>(initialRole);

  // Sync role if auth state changes
  useEffect(() => {
    if (currentUser?.role === 'STAFF') {
      setUserRole('Cashier');
    } else if (
      currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'STORE_OWNER'
    ) {
      setUserRole('StoreOwner');
    }
  }, [currentUser?.role]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [createdTime, setCreatedTime] = useState<'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Dropdown Tùy chọn Thao tác (Import, Xuất file, In mã vạch)
  const [isOptionMenuOpen, setIsOptionMenuOpen] = useState(false);
  const optionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOptionMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (optionMenuRef.current && !optionMenuRef.current.contains(e.target as Node)) {
        setIsOptionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOptionMenuOpen]);

  // Searchable Multi-Select Category Dropdown (Dựa vào base EmployeeFormModal - Các chi nhánh làm việc)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchKeyword, setCategorySearchKeyword] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const filteredCategoriesList = useMemo(() => {
    if (!categorySearchKeyword.trim()) return categories;
    const kw = categorySearchKeyword.trim().toLowerCase();
    return categories.filter((c) =>
      c.name.toLowerCase().includes(kw) || (c.code && c.code.toLowerCase().includes(kw))
    );
  }, [categories, categorySearchKeyword]);

  const handleCategoryToggle = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
    setPageIndex(1);
  };

  const handleSelectAllCategories = () => {
    setSelectedCategoryIds(categories.map((c) => c.id));
    setPageIndex(1);
  };

  const handleClearAllCategories = () => {
    setSelectedCategoryIds([]);
    setPageIndex(1);
  };

  const handleRemoveCategoryTag = (e: React.MouseEvent, catId: string) => {
    e.stopPropagation();
    setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    setPageIndex(1);
  };

  // Dropdown đơn vị tính theo dòng sản phẩm (Ảnh 2 - REQ-07)
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [activeUnitDropdownId, setActiveUnitDropdownId] = useState<string | null>(null);
  const [unitDropdownPos, setUnitDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
  } | null>(null);

  // Đóng popover chọn đơn vị khi click ra ngoài hoặc cuộn trang
  useEffect(() => {
    if (!activeUnitDropdownId) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.unit-dropdown-container')) {
        setActiveUnitDropdownId(null);
      }
    };
    const handleScrollOrResize = () => {
      setActiveUnitDropdownId(null);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
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
            let isBaseUnitPurchaseUnit: boolean | undefined = p.isBaseUnitPurchaseUnit;
            let purchaseUnit: string | undefined = p.purchaseUnit ?? undefined;
            if (uomConversions.length === 0 && p.id) {
              const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id);
              if (isGuid) {
                try {
                  const units = await productApi.getProductUnits(p.id);
                  if (units && units.length > 0) {
                    const baseRow = units.find((u) => u.isBaseUnit);
                    const purchaseRow = units.find((u) => Boolean(u.isPurchaseUnit));
                    if (purchaseRow) {
                      isBaseUnitPurchaseUnit = Boolean(purchaseRow.isBaseUnit);
                      purchaseUnit = purchaseRow.unitName;
                    } else if (baseRow) {
                      isBaseUnitPurchaseUnit = baseRow.isPurchaseUnit ?? true;
                    }
                    uomConversions = units
                      .filter((u) => !u.isBaseUnit)
                      .map((u) => ({
                        id: u.id,
                        unitName: u.unitName,
                        conversionRate: u.conversionRate,
                        price: u.price,
                        barcode: u.barcode ?? undefined,
                        isPurchaseUnit: Boolean(u.isPurchaseUnit),
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
              rawCreatedAt: p.createdAt || '',
              updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('vi-VN') : '',
              imageUrl: p.imageUrl ?? undefined,
              imageUrls: p.imageUrls || (p.imageUrl ? [p.imageUrl] : []),
              description: p.description ?? undefined,
              internalNote: p.internalNote ?? undefined,
              taxCategory: (p as any).taxCategory || 'STANDARD_1PCT',
              isFavorite: Boolean(p.isFavorite),
              hasBatches: Boolean(p.hasBatches),
              isBaseUnitPurchaseUnit,
              purchaseUnit,
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

  // Notification Modal (Success / Error alerts)
  const [notificationModal, setNotificationModal] = useState<{
    isOpen: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string | React.ReactNode;
    itemCode?: string;
  } | null>(null);

  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Category Actions

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
        // Cập nhật sản phẩm qua PUT /api/products/{id}
        await productApi.updateProduct(productToEdit.id, {
          name: data.productName || productToEdit.productName,
          categoryId: data.categoryId || productToEdit.categoryId,
          sellingPrice: data.sellingPrice ?? productToEdit.sellingPrice,
          barcode: data.barcode?.trim() || undefined,
          baseUnit: data.baseUnit?.trim() || productToEdit.baseUnit || 'Cái',
          costPrice: data.costPrice,
          status: data.status || productToEdit.status,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          isFavorite: data.isFavorite ?? productToEdit.isFavorite,
          hasBatches: data.hasBatches ?? productToEdit.hasBatches ?? false,
          isBaseUnitPurchaseUnit: data.isBaseUnitPurchaseUnit,
        });

        // 1. Xóa các đơn vị quy đổi đã bị người dùng gỡ bỏ qua DELETE /api/product-units/{id}
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
                  isPurchaseUnit: Boolean(uom.isPurchaseUnit),
                });
              } catch (unitErr) {
                console.warn('Lỗi khi thêm đơn vị quy đổi:', unitErr);
              }
            } else {
              // Cập nhật đơn vị quy đổi hiện có qua PUT /api/product-units/{id}
              try {
                await productApi.updateProductUnit(uom.id, {
                  unitName: uom.unitName,
                  conversionRate: uom.conversionRate,
                  price: uom.price,
                  barcode: uom.barcode?.trim() || null,
                  isBaseUnit: false,
                  isPurchaseUnit: Boolean(uom.isPurchaseUnit),
                });
              } catch (unitErr) {
                console.warn(`Lỗi khi cập nhật đơn vị quy đổi ${uom.id}:`, unitErr);
              }
            }
          }
        }

        showToast(`Cập nhật hàng hóa "${data.productName}" thành công.`);
        setNotificationModal({
          isOpen: true,
          type: 'success',
          title: 'Cập nhật hàng hóa thành công',
          message: `Thông tin hàng hóa "${data.productName}" đã được cập nhật thành công vào hệ thống.`,
          itemCode: data.productCode,
        });
        if (selectedProduct && selectedProduct.id === productToEdit.id) {
          setSelectedProduct({ ...selectedProduct, ...data } as ProductItem);
        }
      } else {
        // Tạo mới sản phẩm trên Backend qua POST /api/products
        const created = await productApi.createProduct({
          name: data.productName!,
          categoryId: data.categoryId!,
          sellingPrice: data.sellingPrice || 0,
          productCode: data.productCode?.trim() || undefined,
          barcode: data.barcode?.trim() || undefined,
          baseUnit: data.baseUnit?.trim() || 'Cái',
          costPrice: data.costPrice,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          isFavorite: data.isFavorite ?? false,
          hasBatches: data.hasBatches ?? false,
          isBaseUnitPurchaseUnit: data.isBaseUnitPurchaseUnit ?? true,
        });

        // Thêm các đơn vị quy đổi cho sản phẩm vừa tạo qua POST /api/products/{id}/units
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
                isPurchaseUnit: Boolean(uom.isPurchaseUnit),
              });
            } catch (unitErr: any) {
              console.warn('Lỗi khi thêm đơn vị quy đổi:', unitErr);
              showToast(`Lỗi khi tạo đơn vị tính "${uom.unitName}": ${unitErr?.message || 'Không thành công'}`, 'warning');
            }
          }
        }

        showToast(`Tạo mới hàng hóa "${created.name || data.productName}" thành công.`);
        setNotificationModal({
          isOpen: true,
          type: 'success',
          title: 'Tạo mới hàng hóa thành công',
          message: `Hàng hóa "${created.name || data.productName}" đã được thêm mới thành công vào danh mục.`,
          itemCode: created.productCode || data.productCode,
        });
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
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Xóa hàng hóa thành công',
        message: `Đã xóa hàng hóa "${productToDelete.productName}" khỏi danh mục kinh doanh.`,
        itemCode: productToDelete.productCode,
      });
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
      setNotificationModal({
        isOpen: true,
        type: 'success',
        title: 'Xóa hàng hóa thành công',
        message: `Đã xóa thành công ${successCount} hàng hóa đã chọn khỏi danh mục kinh doanh.`,
      });
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
      createdAt: new Date().toLocaleDateString('vi-VN'),
      rawCreatedAt: new Date().toISOString(),
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
      // Search thông minh tiếng Việt (cả có dấu chuẩn hóa NFC lẫn không dấu)
      if (searchTerm.trim()) {
        const rawKw = searchTerm.trim().toLowerCase();
        const kwNfc = rawKw.normalize('NFC');
        const kwNoTone = removeVietnameseTones(rawKw);

        const name = (item.productName || '').toLowerCase();
        const nameNfc = name.normalize('NFC');
        const nameNoTone = removeVietnameseTones(name);

        const code = (item.productCode || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();

        // 1. Khớp theo mã hàng (SKU) hoặc mã vạch (Barcode)
        const matchCode = code.includes(rawKw);
        const matchBarcode = barcode.includes(rawKw);

        // 2. Khớp theo tên hàng hóa (có dấu hoặc không dấu)
        const matchName = nameNfc.includes(kwNfc) || nameNoTone.includes(kwNoTone);

        // 3. Khớp theo nhóm hàng
        const catName = (item.categoryName || '').toLowerCase();
        const matchCategory =
          catName.normalize('NFC').includes(kwNfc) ||
          removeVietnameseTones(catName).includes(kwNoTone);

        // 4. Khớp theo đơn vị quy đổi (tên đơn vị hoặc mã vạch riêng của đơn vị)
        const matchUnits = item.uomConversions?.some((u) => {
          const uName = (u.unitName || '').toLowerCase();
          const uBarcode = (u.barcode || '').toLowerCase();
          return (
            uName.normalize('NFC').includes(kwNfc) ||
            removeVietnameseTones(uName).includes(kwNoTone) ||
            uBarcode.includes(rawKw)
          );
        });

        if (!matchCode && !matchBarcode && !matchName && !matchCategory && !matchUnits) return false;
      }

      // Categories
      if (selectedCategoryIds.length > 0) {
        const itemCatId = (item.categoryId || '').toLowerCase();
        if (!selectedCategoryIds.some((cid) => cid.toLowerCase() === itemCatId)) return false;
      }


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
    }).sort((a, b) => {
      const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
      const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [products, searchTerm, selectedCategoryIds, createdTime, customDate]);



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


        {/* Bộ lọc: Tìm kiếm + Nhóm hàng + Thời gian tạo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, minWidth: 280 }}>
          {/* Ô tìm kiếm nhanh */}
          <div style={{ position: 'relative', minWidth: 220, maxWidth: 300, flex: 1 }}>
            <input
              type="text"
              className="filter-input"
              style={{ paddingLeft: 34, borderRadius: 9999, width: '100%', height: 38 }}
              placeholder="Theo mã SKU, tên hàng, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8' }} />
          </div>

          {/* Lọc Nhóm hàng - Searchable Multi-Select Dropdown theo base EmployeeFormModal */}
          <div ref={categoryDropdownRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#FFFFFF',
                border: isCategoryDropdownOpen ? '1.5px solid #0F766E' : '1px solid #cbd5e1',
                borderRadius: 9999,
                padding: '0 14px',
                height: 38,
                maxHeight: 38,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isCategoryDropdownOpen ? '0 0 0 3px rgba(15, 118, 110, 0.12)' : 'none',
                boxSizing: 'border-box',
                flexWrap: 'nowrap',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                userSelect: 'none',
              }}
            >
              <Folder size={15} color="#0F766E" style={{ flexShrink: 0 }} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  flexWrap: 'nowrap',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  maxWidth: 240,
                }}
              >
                {selectedCategoryIds.length === 0 || selectedCategoryIds.length === categories.length ? (
                  <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Tất cả nhóm hàng ({categories.length})
                  </span>
                ) : (
                  <>
                    {(() => {
                      const firstCat = categories.find((c) => selectedCategoryIds.includes(c.id));
                      if (!firstCat) return null;
                      return (
                        <span
                          key={firstCat.id}
                          title={firstCat.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 500,
                            background: '#F0FDFA',
                            color: '#0F766E',
                            border: '1px solid #99F6E4',
                            whiteSpace: 'nowrap',
                            maxWidth: selectedCategoryIds.length > 1 ? 140 : 180,
                          }}
                        >
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {firstCat.name.length > 22 ? `${firstCat.name.slice(0, 22)}...` : firstCat.name}
                          </span>
                          <span
                            onClick={(e) => handleRemoveCategoryTag(e, firstCat.id)}
                            title="Bỏ nhóm hàng này"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: '50%',
                              width: 14,
                              height: 14,
                              color: '#0F766E',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            <X size={11} />
                          </span>
                        </span>
                      );
                    })()}

                    {selectedCategoryIds.length > 1 && (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11.5,
                          fontWeight: 700,
                          background: '#E0F2FE',
                          color: '#0369A1',
                          border: '1px solid #BAE6FD',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                        title={`Đã chọn thêm ${selectedCategoryIds.length - 1} nhóm hàng khác`}
                      >
                        +{selectedCategoryIds.length - 1}
                      </span>
                    )}
                  </>
                )}
              </div>

              <ChevronDown
                size={15}
                color="#64748B"
                style={{
                  transform: isCategoryDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }}
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryToEdit(null);
                  setIsCategoryModalOpen(true);
                }}
                title="Quản lý / Thêm nhóm hàng"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#0F766E',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 4,
                  marginLeft: 2,
                  flexShrink: 0,
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Dropdown Panel */}
            {isCategoryDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 6,
                  width: 320,
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1050,
                  overflow: 'hidden',
                }}
              >
                {/* Search Input Bar */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '5px 10px',
                    }}
                  >
                    <Search size={14} color="#94A3B8" />
                    <input
                      type="text"
                      value={categorySearchKeyword}
                      onChange={(e) => setCategorySearchKeyword(e.target.value)}
                      placeholder="Tìm kiếm nhóm hàng theo tên..."
                      style={{
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '100%',
                        fontSize: 13,
                        color: '#1E293B',
                      }}
                      autoFocus
                    />
                    {categorySearchKeyword && (
                      <button
                        type="button"
                        onClick={() => setCategorySearchKeyword('')}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#94A3B8',
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Selection Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 12px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #F1F5F9',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: '#64748B' }}>
                    Tìm thấy {filteredCategoriesList.length} nhóm hàng
                  </span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#0F766E',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      Chọn tất cả ({categories.length})
                    </button>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <button
                      type="button"
                      onClick={handleClearAllCategories}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#64748B',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      Bỏ chọn (Tất cả)
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div style={{ maxHeight: 220, overflowY: 'auto', padding: '4px 0' }}>
                  {filteredCategoriesList.length ? (
                    filteredCategoriesList.map((c) => {
                      const isChecked = selectedCategoryIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleCategoryToggle(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            background: isChecked ? '#F0FDFA' : 'transparent',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) e.currentTarget.style.background = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <label
                            title={c.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              cursor: 'pointer',
                              fontSize: 13,
                              flex: 1,
                              minWidth: 0,
                              marginRight: 8,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => { }} // Handled at row click
                              style={{ accentColor: '#0F766E', width: 16, height: 16, flexShrink: 0 }}
                            />
                            <span
                              style={{
                                fontWeight: isChecked ? 600 : 400,
                                color: isChecked ? '#134E4A' : '#1E293B',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c.name.length > 26 ? `${c.name.slice(0, 26)}...` : c.name}
                            </span>
                          </label>
                          {c.productCount !== undefined && (
                            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, flexShrink: 0 }}>
                              {c.productCount} SP
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      Không tìm thấy nhóm hàng phù hợp
                    </div>
                  )}
                </div>

                {/* Dropdown Footer */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #F1F5F9',
                    background: '#FAFAFA',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryDropdownOpen(false);
                      setCategoryToEdit(null);
                      setIsCategoryModalOpen(true);
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#0F766E',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Plus size={13} /> Thêm nhóm hàng
                  </button>
                  <button
                    type="button"
                    className="btn-primary-teal"
                    style={{ height: 28, padding: '0 14px', fontSize: 12 }}
                    onClick={() => setIsCategoryDropdownOpen(false)}
                  >
                    Xong {selectedCategoryIds.length > 0 ? `(${selectedCategoryIds.length})` : '(Tất cả)'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lọc Thời gian tạo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 9999,
              padding: '4px 12px',
              minHeight: 38,
            }}
          >
            <Calendar size={15} color="#0F766E" />
            <select
              value={createdTime}
              onChange={(e) => {
                const val = e.target.value as 'all' | 'custom';
                setCreatedTime(val);
                if (val === 'all') setCustomDate('');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                color: '#1E293B',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Thời gian: Toàn bộ</option>
              <option value="custom">Thời gian: Tùy chỉnh</option>
            </select>
            {createdTime === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 12,
                  outline: 'none',
                  backgroundColor: '#ffffff',
                }}
              />
            )}
          </div>
        </div>

        {/* Actions buttons */}
        <div className="product-header-actions">


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

          {/* Button option cho: Import, Xuất file, In mã vạch */}
          <div ref={optionMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-pill-outline"
              onClick={() => setIsOptionMenuOpen(!isOptionMenuOpen)}
              title="Tùy chọn thao tác"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 38,
                background: isOptionMenuOpen ? '#F0FDFA' : '#FFFFFF',
                borderColor: isOptionMenuOpen ? '#0F766E' : '#CBD5E1',
              }}
            >
              <SlidersHorizontal size={15} color="#0F766E" />
              <span>Thao tác</span>
              <ChevronDown
                size={14}
                color="#64748B"
                style={{
                  transform: isOptionMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {isOptionMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 6,
                  background: '#FFFFFF',
                  borderRadius: 12,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E2E8F0',
                  minWidth: 170,
                  zIndex: 1050,
                  padding: '6px 0',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionMenuOpen(false);
                    handleImport();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 13.5,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Upload size={16} color="#0F766E" />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionMenuOpen(false);
                    handleExport();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 13.5,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Download size={16} color="#0F766E" />
                  <span>Xuất file</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOptionMenuOpen(false);
                    handlePrintBarcode();
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 13.5,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Printer size={16} color="#0F766E" />
                  <span>In mã vạch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Body: Full-width Table */}
      <div className="product-table-wrapper" style={{ width: '100%' }}>
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
                <th style={{ width: 180, minWidth: 150 }}>Mã hàng</th>
                <th>Tên hàng hóa</th>
                <th style={{ width: 110 }}>Đơn vị tính</th>
                <th style={{ textAlign: 'right', width: 120 }}>Giá bán</th>
                {userRole === 'StoreOwner' && (
                  <th style={{ textAlign: 'right', width: 120 }}>Giá vốn</th>
                )}
                <th style={{ textAlign: 'center', width: 130 }}>Trạng thái</th>
                <th style={{ width: 130 }}>Thời gian tạo</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, rowIndex) => {
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
                    <td style={{ minWidth: 180, width: 220 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
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
                    {/* Tên hàng hóa */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>
                          {p.productName}
                        </span>
                        {p.hasBatches && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#1d4ed8',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Lô & HSD
                          </span>
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
                    {/* Đơn vị tính (chứa option chuyển đổi ĐVT) */}
                    <td>
                      {p.uomConversions && p.uomConversions.length > 0 ? (
                        <div className="unit-dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeUnitDropdownId === p.id) {
                                setActiveUnitDropdownId(null);
                                setUnitDropdownPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const estimatedMenuHeight = Math.max(allUnits.length * 34 + 12, 90);
                                const isLastRows =
                                  filteredProducts.length > 1 && rowIndex >= filteredProducts.length - 2;
                                const openUpward =
                                  (isLastRows || window.innerHeight - rect.bottom < estimatedMenuHeight + 24) &&
                                  rect.top > estimatedMenuHeight;
                                setUnitDropdownPos(
                                  openUpward
                                    ? { bottom: window.innerHeight - rect.top + 4, left: rect.left }
                                    : { top: rect.bottom + 4, left: rect.left }
                                );
                                setActiveUnitDropdownId(p.id);
                              }
                            }}
                            style={{
                              background: '#F0FDFA',
                              border: '1px solid #CCFBF1',
                              color: '#0F766E',
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer',
                              padding: '3px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease',
                            }}
                            title="Bấm để chuyển đổi đơn vị tính"
                          >
                            <span>{currentUnitName}</span>
                            <ChevronDown
                              size={13}
                              style={{
                                transform: activeUnitDropdownId === p.id ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s ease',
                              }}
                            />
                          </button>

                          {activeUnitDropdownId === p.id && otherUnits.length > 0 && unitDropdownPos && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'fixed',
                                top: unitDropdownPos.top,
                                bottom: unitDropdownPos.bottom,
                                left: unitDropdownPos.left,
                                zIndex: 9999,
                                minWidth: 110,
                                background: '#ffffff',
                                borderRadius: 8,
                                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
                                border: '1px solid #E2E8F0',
                                padding: '4px 0',
                              }}
                            >
                              {allUnits.map((u) => {
                                const isSelected = u.unitName === currentUnitName;
                                return (
                                  <button
                                    key={u.unitName}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedUnits((prev) => ({ ...prev, [p.id]: u.unitName }));
                                      setActiveUnitDropdownId(null);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      width: '100%',
                                      padding: '6px 12px',
                                      fontSize: 12.5,
                                      background: isSelected ? '#F0FDFA' : 'transparent',
                                      color: isSelected ? '#0F766E' : '#334155',
                                      fontWeight: isSelected ? 700 : 500,
                                      border: 'none',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'left',
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                  >
                                    <span>{u.unitName}</span>
                                    {u.unitName === (p.baseUnit || 'Cái') ? (
                                      <span style={{ fontSize: 10, color: '#0F766E', background: '#CCFBF1', padding: '1px 4px', borderRadius: 4 }}>
                                        Cơ bản
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#0F766E' }}>
                          {p.baseUnit || 'Cái'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {(displayPrice ?? 0).toLocaleString('vi-VN')} đ
                    </td>
                    {userRole === 'StoreOwner' && (
                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {p.costPrice != null ? `${Number(p.costPrice).toLocaleString('vi-VN')} đ` : '—'}
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 9999,
                          backgroundColor: p.status === 'Active' ? '#CCFBF1' : '#FEE2E2',
                          color: p.status === 'Active' ? '#0F766E' : '#DC2626',
                        }}
                      >
                        {p.status === 'Active' ? 'Đang bán' : 'Ngừng kinh doanh'}
                      </span>
                    </td>
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

      {/* 8. Notification Modal (Success / Alert popup) */}
      {notificationModal && (
        <NotificationModal
          isOpen={notificationModal.isOpen}
          onClose={() => setNotificationModal(null)}
          type={notificationModal.type}
          title={notificationModal.title}
          message={notificationModal.message}
          itemCode={notificationModal.itemCode}
        />
      )}
    </div>
  );
};
