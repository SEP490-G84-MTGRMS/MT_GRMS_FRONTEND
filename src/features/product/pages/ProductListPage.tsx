import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../api/productApi';
import {
  Plus,
  Package,
  Folder,
  Layers,
  Store,
  Loader2,
} from 'lucide-react';
import type { ProductItem, Category, UomConversion } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductDeleteConfirmModal } from '../components/ProductDeleteConfirmModal';
import {
  MasterProductFilterBar,
  type MasterProductFilterValues,
} from '../components/MasterProductFilterBar';
import { MasterProductTable } from '../components/MasterProductTable';
import { NotificationModal } from '../../../components/common';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AdminToast, type ToastState } from '../../admin/components';
import '../../purchase-order/purchase-order.css';
import '../../supplier/supplier.css';
import '../product.css';

const DEFAULT_PRODUCT_FILTERS: MasterProductFilterValues = {
  skus: [],
  names: [],
  barcodes: [],
  categoryId: 'ALL',
  statusFilter: 'ALL',
};

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

  // Filter state (chip-token — layout giống Sản phẩm theo NCC)
  const [appliedFilters, setAppliedFilters] =
    useState<MasterProductFilterValues>(DEFAULT_PRODUCT_FILTERS);

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
      const searchBits = [
        ...appliedFilters.skus,
        ...appliedFilters.names,
        ...appliedFilters.barcodes,
      ].filter(Boolean);
      const res = await productApi.getProductsPaged({
        pageIndex,
        pageSize,
        searchTerm: searchBits[0] || undefined,
        categoryId:
          appliedFilters.categoryId !== 'ALL' ? appliedFilters.categoryId : undefined,
        categoryIds:
          appliedFilters.categoryId !== 'ALL' ? [appliedFilters.categoryId] : undefined,
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
              allowRepack: Boolean((p as { allowRepack?: boolean }).allowRepack),
              processedSellingPricePerKg:
                (p as { processedSellingPricePerKg?: number | null }).processedSellingPricePerKg ?? null,
              eligibleForVatReduction: Boolean((p as any).eligibleForVatReduction),
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
  }, [pageIndex, pageSize, appliedFilters]);

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
      setAppliedFilters((prev) => (prev.categoryId === id ? { ...prev, categoryId: 'ALL' } : prev));
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
          hasBatches: data.hasBatches !== undefined ? data.hasBatches : Boolean(productToEdit.hasBatches),
          allowRepack: data.allowRepack !== undefined ? data.allowRepack : Boolean(productToEdit.allowRepack),
          processedSellingPricePerKg:
            data.processedSellingPricePerKg !== undefined
              ? data.processedSellingPricePerKg
              : productToEdit.processedSellingPricePerKg ?? null,
          eligibleForVatReduction: data.eligibleForVatReduction ?? productToEdit.eligibleForVatReduction ?? false,
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
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productToEdit.id
              ? {
                  ...p,
                  ...data,
                  hasBatches: data.hasBatches !== undefined ? data.hasBatches : Boolean(p.hasBatches),
                  isFavorite: data.isFavorite !== undefined ? data.isFavorite : Boolean(p.isFavorite),
                }
              : p
          )
        );
        if (selectedProduct && selectedProduct.id === productToEdit.id) {
          setSelectedProduct({
            ...selectedProduct,
            ...data,
            hasBatches: data.hasBatches !== undefined ? data.hasBatches : Boolean(selectedProduct.hasBatches),
          } as ProductItem);
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
          status: data.status || 'Active',
          hasBatches: data.hasBatches ?? false,
          allowRepack: data.allowRepack ?? false,
          processedSellingPricePerKg: data.processedSellingPricePerKg ?? null,
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

  const handleToggleHasBatches = async (product: ProductItem, nextVal: boolean) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, hasBatches: nextVal } : p))
    );
    if (selectedProduct && selectedProduct.id === product.id) {
      setSelectedProduct({ ...selectedProduct, hasBatches: nextVal });
    }
    try {
      await productApi.updateProduct(product.id, {
        name: product.productName,
        categoryId: product.categoryId,
        sellingPrice: product.sellingPrice,
        barcode: product.barcode?.trim() || undefined,
        baseUnit: product.baseUnit?.trim() || 'Cái',
        costPrice: product.costPrice ?? undefined,
        status: product.status,
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
        description: product.description,
        internalNote: product.internalNote,
        isFavorite: Boolean(product.isFavorite),
        hasBatches: nextVal,
        eligibleForVatReduction: Boolean(product.eligibleForVatReduction),
      });
      showToast(
        nextVal
          ? `Đã bật quản lý theo lô & HSD cho "${product.productName}"`
          : `Đã tắt quản lý theo lô & HSD cho "${product.productName}"`
      );
    } catch (err: any) {
      console.warn('Lỗi khi cập nhật trạng thái quản lý theo lô:', err);
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

  // Lọc client theo multi-token / status (API đã lọc 1 keyword + category)
  const filteredProducts = useMemo(() => {
    const skuTokens = appliedFilters.skus.map((s) => s.toLowerCase());
    const nameTokens = appliedFilters.names.map((s) => removeVietnameseTones(s));
    const barcodeTokens = appliedFilters.barcodes.map((s) => s.toLowerCase());

    return products
      .filter((item) => {
        if (appliedFilters.statusFilter !== 'ALL' && item.status !== appliedFilters.statusFilter) {
          return false;
        }
        if (skuTokens.length > 0) {
          const code = (item.productCode || '').toLowerCase();
          if (!skuTokens.some((t) => code.includes(t))) return false;
        }
        if (nameTokens.length > 0) {
          const name = removeVietnameseTones(item.productName || '');
          if (!nameTokens.some((t) => name.includes(t))) return false;
        }
        if (barcodeTokens.length > 0) {
          const barcode = (item.barcode || '').toLowerCase();
          const unitHit = item.uomConversions?.some((u) =>
            barcodeTokens.some((t) => (u.barcode || '').toLowerCase().includes(t))
          );
          if (!barcodeTokens.some((t) => barcode.includes(t)) && !unitHit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
        const timeB = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [products, appliedFilters]);



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
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Hàng hóa (Master)</span>
            {isLoading && (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--blue-primary, #0f766e)' }} />
            )}
          </h1>
        </div>

        <div className="so-list-header-actions">
          <Link
            to="/store-owner/categories"
            className="po-btn po-btn-secondary"
            title="Quản lý nhóm hàng"
          >
            <Folder size={14} />
            <span>Nhóm hàng</span>
          </Link>
          <Link
            to="/store-owner/stores/products"
            className="po-btn po-btn-secondary"
            title="Sản phẩm theo cửa hàng"
          >
            <Store size={14} />
            <span>Sản phẩm theo Cửa hàng</span>
          </Link>
          <Link
            to="/store-owner/suppliers/products"
            className="po-btn po-btn-secondary"
            title="Sản phẩm theo nhà cung cấp"
          >
            <Package size={14} />
            <span>SP theo NCC</span>
          </Link>
          <button
            type="button"
            className="po-btn po-btn-primary"
            onClick={() => {
              setProductToEdit(null);
              setIsProductFormOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Thêm hàng hóa</span>
          </button>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginBottom: 8 }}>
        <MasterProductFilterBar
          initialValues={appliedFilters}
          products={products}
          categories={categories}
          onSearch={(values) => {
            setAppliedFilters(values);
            setPageIndex(1);
          }}
          onReset={() => {
            setAppliedFilters(DEFAULT_PRODUCT_FILTERS);
            setPageIndex(1);
          }}
          onExport={handleExport}
          onImport={handleImport}
          onPrintBarcode={handlePrintBarcode}
        />
      </div>

      {/* 2. Table — cùng cấu trúc header/body/footer với SP theo NCC */}
      <MasterProductTable
        products={filteredProducts}
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        userRole={userRole}
        isLoading={isLoading}
        onPageChange={(page) => setPageIndex(page)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPageIndex(1);
        }}
        onEdit={(prod) => {
          setProductToEdit(prod);
          setIsDetailModalOpen(false);
          setIsProductFormOpen(true);
        }}
        onOpenCreate={() => {
          setProductToEdit(null);
          setIsProductFormOpen(true);
        }}
      />

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
        onToggleHasBatches={handleToggleHasBatches}
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
