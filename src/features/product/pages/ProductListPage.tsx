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
import type { ProductItem, Category, UomConversion, ProductResponse } from '../types';
import { categoryApi } from '../api/categoryApi';
import { CategoryModal } from '../components/CategoryModal';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductDeleteConfirmModal } from '../components/ProductDeleteConfirmModal';
import {
  MasterProductFilterBar,
  type MasterProductFilterValues,
  type MasterProductSuggestionSource,
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

type ExcelRecord = Record<string, unknown>;

const excelCell = (row: ExcelRecord, ...headers: string[]): string => {
  for (const header of headers) {
    const value = row[header];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

const excelNumber = (value: string, fallback = 0): number => {
  if (!value) return fallback;
  const numericText = value.trim().replace(/[^0-9,.-]/g, '');
  if (!numericText) return fallback;

  const lastComma = numericText.lastIndexOf(',');
  const lastDot = numericText.lastIndexOf('.');
  let normalized = numericText;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = numericText
      .split(thousandsSeparator).join('')
      .replace(decimalSeparator, '.');
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? ',' : '.';
    const separatorIndex = numericText.lastIndexOf(separator);
    const decimalDigits = numericText.length - separatorIndex - 1;
    const looksLikeThousands = decimalDigits === 3 && /^-?\d{1,3}([.,]\d{3})+$/.test(numericText);
    normalized = looksLikeThousands
      ? numericText.split(separator).join('')
      : numericText.replace(separator, '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const excelBoolean = (value: string, fallback = false): boolean => {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'có', 'co', 'x'].includes(removeVietnameseTones(value));
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
  const [excelBusy, setExcelBusy] = useState<boolean>(false);

  // RBAC switch (StoreOwner vs Staff) for BR-SEC-01 verification
  const currentUser = useAuthStore((state) => state.user);
  const isOwnerRole = (role?: string | null) =>
    role === 'STORE_OWNER' || role === 'ADMIN';
  const initialRole: 'StoreOwner' | 'Cashier' =
    isOwnerRole(currentUser?.role) ? 'StoreOwner' : 'Cashier';
  const [userRole, setUserRole] = useState<'StoreOwner' | 'Cashier'>(initialRole);

  // Sync role if auth state changes
  useEffect(() => {
    setUserRole(isOwnerRole(currentUser?.role) ? 'StoreOwner' : 'Cashier');
  }, [currentUser?.role]);

  // Filter state (chip-token — layout giống Sản phẩm theo NCC)
  const [appliedFilters, setAppliedFilters] =
    useState<MasterProductFilterValues>(DEFAULT_PRODUCT_FILTERS);
  /** Nguồn gợi ý filter — toàn bộ SP, không phụ thuộc trang bảng */
  const [suggestionProducts, setSuggestionProducts] = useState<MasterProductSuggestionSource[]>([]);

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

  const fetchSuggestionProducts = useCallback(async () => {
    try {
      const all = await productApi.getAllProducts();
      setSuggestionProducts(
        all.map((p) => ({
          id: p.id,
          productCode: p.productCode || (p as { sku?: string }).sku || p.barcode || '',
          productName: p.name || (p as { productName?: string }).productName || '',
          barcode: p.barcode || '',
        }))
      );
    } catch (err) {
      console.error('Lỗi khi tải danh sách gợi ý filter sản phẩm:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    void fetchSuggestionProducts();
  }, [fetchCategories, fetchSuggestionProducts]);

  // 2. Tải danh sách sản phẩm thực tế từ backend
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await productApi.getProductsPaged({
        pageIndex,
        pageSize,
        skus: appliedFilters.skus.length > 0 ? appliedFilters.skus : undefined,
        names: appliedFilters.names.length > 0 ? appliedFilters.names : undefined,
        barcodes: appliedFilters.barcodes.length > 0 ? appliedFilters.barcodes : undefined,
        categoryId:
          appliedFilters.categoryId !== 'ALL' ? appliedFilters.categoryId : undefined,
        categoryIds:
          appliedFilters.categoryId !== 'ALL' ? [appliedFilters.categoryId] : undefined,
        status:
          appliedFilters.statusFilter !== 'ALL' ? appliedFilters.statusFilter : undefined,
      });
      if (res && res.items) {
        const mapped: ProductItem[] = await Promise.all(
          res.items.map(async (p) => {
            const rawUnitPrices = (p as any).unitPrices as Array<{
              id?: string;
              unitName: string;
              conversionRate: number;
              price: number;
              barcode?: string | null;
              isBaseUnit?: boolean;
              isPurchaseUnit?: boolean;
            }> | undefined;
            let uomConversions: UomConversion[] = (p as any).uomConversions || [];
            let isBaseUnitPurchaseUnit: boolean | undefined = p.isBaseUnitPurchaseUnit;
            let purchaseUnit: string | undefined = p.purchaseUnit ?? undefined;
            if (uomConversions.length === 0 && Array.isArray(rawUnitPrices)) {
              const baseRow = rawUnitPrices.find((u) => u.isBaseUnit);
              const purchaseRow = rawUnitPrices.find((u) => Boolean(u.isPurchaseUnit));
              if (purchaseRow) {
                isBaseUnitPurchaseUnit = Boolean(purchaseRow.isBaseUnit);
                purchaseUnit = purchaseRow.unitName;
              } else if (baseRow) {
                isBaseUnitPurchaseUnit = baseRow.isPurchaseUnit ?? true;
              }
              uomConversions = rawUnitPrices
                .filter((u) => !u.isBaseUnit)
                .map((u) => ({
                  id: u.id,
                  unitName: u.unitName,
                  conversionRate: u.conversionRate,
                  price: u.price,
                  barcode: u.barcode ?? undefined,
                  isPurchaseUnit: Boolean(u.isPurchaseUnit),
                }));
            } else if (uomConversions.length === 0 && !Array.isArray(rawUnitPrices) && p.id) {
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
              minStock: p.minStock ?? 0,
              maxStock: p.maxStock ?? 1000,
              vatRate: p.vatRate ?? 0,
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
              nearExpiryThresholdDays: p.nearExpiryThresholdDays ?? null,
              allowRepack: Boolean((p as { allowRepack?: boolean }).allowRepack),
              sellRawByWeight: p.sellRawByWeight ?? true,
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
          minStock: data.minStock ?? productToEdit.minStock ?? 0,
          maxStock: data.maxStock ?? productToEdit.maxStock ?? 1000,
          vatRate: data.vatRate ?? productToEdit.vatRate ?? 0,
          status: data.status ?? productToEdit.status,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          isFavorite: data.isFavorite ?? productToEdit.isFavorite,
          hasBatches: data.hasBatches !== undefined ? data.hasBatches : Boolean(productToEdit.hasBatches),
          nearExpiryThresholdDays:
            data.nearExpiryThresholdDays !== undefined
              ? data.nearExpiryThresholdDays
              : productToEdit.nearExpiryThresholdDays ?? null,
          allowRepack: data.allowRepack !== undefined ? data.allowRepack : Boolean(productToEdit.allowRepack),
          processedSellingPricePerKg:
            data.processedSellingPricePerKg !== undefined
              ? data.processedSellingPricePerKg
              : productToEdit.processedSellingPricePerKg ?? null,
          eligibleForVatReduction: data.eligibleForVatReduction ?? productToEdit.eligibleForVatReduction ?? false,
          taxCategory: data.taxCategory ?? productToEdit.taxCategory ?? 'STANDARD_1PCT',
          sellRawByWeight: data.sellRawByWeight ?? productToEdit.sellRawByWeight ?? true,
          isBaseUnitPurchaseUnit: data.isBaseUnitPurchaseUnit ?? productToEdit.isBaseUnitPurchaseUnit,
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
          minStock: data.minStock ?? 0,
          maxStock: data.maxStock ?? 1000,
          vatRate: data.vatRate ?? 0,
          imageUrl: data.imageUrl,
          imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
          description: data.description,
          internalNote: data.internalNote,
          isFavorite: data.isFavorite ?? false,
          status: data.status || 'Active',
          hasBatches: data.hasBatches ?? false,
          nearExpiryThresholdDays: data.nearExpiryThresholdDays ?? null,
          allowRepack: data.allowRepack ?? false,
          processedSellingPricePerKg: data.processedSellingPricePerKg ?? null,
          eligibleForVatReduction: data.eligibleForVatReduction ?? false,
          taxCategory: data.taxCategory ?? 'STANDARD_1PCT',
          sellRawByWeight: data.sellRawByWeight ?? true,
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
      await fetchSuggestionProducts();

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
      await fetchSuggestionProducts();
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
      await fetchSuggestionProducts();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xóa hàng hóa đã chọn.';
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (product: ProductItem) => {
    const nextStatus = product.status === 'Active' ? 'Discontinued' : 'Active';
    try {
      await productApi.updateProduct(product.id, {
        name: product.productName,
        categoryId: product.categoryId,
        sellingPrice: product.sellingPrice,
        barcode: product.barcode?.trim() || undefined,
        baseUnit: product.baseUnit || 'Cái',
        costPrice: product.costPrice,
        minStock: product.minStock ?? 0,
        maxStock: product.maxStock ?? 1000,
        vatRate: product.vatRate ?? 0,
        status: nextStatus,
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls,
        description: product.description,
        internalNote: product.internalNote,
        isFavorite: product.isFavorite ?? false,
        hasBatches: product.hasBatches ?? false,
        nearExpiryThresholdDays: product.nearExpiryThresholdDays ?? null,
        allowRepack: product.allowRepack ?? false,
        processedSellingPricePerKg: product.processedSellingPricePerKg ?? null,
        eligibleForVatReduction: product.eligibleForVatReduction ?? false,
        taxCategory: product.taxCategory ?? 'STANDARD_1PCT',
        sellRawByWeight: product.sellRawByWeight ?? true,
        isBaseUnitPurchaseUnit: product.isBaseUnitPurchaseUnit,
      });
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, status: nextStatus } : item))
      );
      if (selectedProduct?.id === product.id) {
        setSelectedProduct({ ...selectedProduct, status: nextStatus });
      }
      showToast(
        `Đã chuyển trạng thái sản phẩm sang: ${nextStatus === 'Active' ? 'Đang bán' : 'Ngừng kinh doanh'}`
      );
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể đổi trạng thái sản phẩm.', 'error');
    }
  };

  const handleToggleHasBatches = async (product: ProductItem, nextVal: boolean) => {
    try {
      await productApi.updateProduct(product.id, {
        name: product.productName,
        categoryId: product.categoryId,
        sellingPrice: product.sellingPrice,
        barcode: product.barcode?.trim() || undefined,
        baseUnit: product.baseUnit?.trim() || 'Cái',
        costPrice: product.costPrice ?? undefined,
        minStock: product.minStock ?? 0,
        maxStock: product.maxStock ?? 1000,
        vatRate: product.vatRate ?? 0,
        status: product.status,
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
        description: product.description,
        internalNote: product.internalNote,
        isFavorite: Boolean(product.isFavorite),
        hasBatches: nextVal,
        nearExpiryThresholdDays: product.nearExpiryThresholdDays ?? null,
        allowRepack: product.allowRepack ?? false,
        processedSellingPricePerKg: product.processedSellingPricePerKg ?? null,
        eligibleForVatReduction: Boolean(product.eligibleForVatReduction),
        taxCategory: product.taxCategory ?? 'STANDARD_1PCT',
        sellRawByWeight: product.sellRawByWeight ?? true,
        isBaseUnitPurchaseUnit: product.isBaseUnitPurchaseUnit,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, hasBatches: nextVal } : p))
      );
      if (selectedProduct && selectedProduct.id === product.id) {
        setSelectedProduct({ ...selectedProduct, hasBatches: nextVal });
      }
      showToast(
        nextVal
          ? `Đã bật quản lý theo lô & HSD cho "${product.productName}"`
          : `Đã tắt quản lý theo lô & HSD cho "${product.productName}"`
      );
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || err?.message || 'Không thể cập nhật trạng thái quản lý theo lô.',
        'error'
      );
    }
  };

  const handleDuplicateProduct = async (product: ProductItem) => {
    try {
      const created = await productApi.createProduct({
        name: `${product.productName} (Bản sao)`,
        categoryId: product.categoryId,
        sellingPrice: product.sellingPrice,
        baseUnit: product.baseUnit || 'Cái',
        costPrice: product.costPrice,
        minStock: product.minStock ?? 0,
        maxStock: product.maxStock ?? 1000,
        vatRate: product.vatRate ?? 0,
        status: product.status,
        imageUrl: product.imageUrl,
        imageUrls: product.imageUrls,
        description: product.description,
        internalNote: product.internalNote,
        isFavorite: product.isFavorite ?? false,
        hasBatches: product.hasBatches ?? false,
        nearExpiryThresholdDays: product.nearExpiryThresholdDays ?? null,
        allowRepack: product.allowRepack ?? false,
        processedSellingPricePerKg: product.processedSellingPricePerKg ?? null,
        eligibleForVatReduction: product.eligibleForVatReduction ?? false,
        taxCategory: product.taxCategory ?? 'STANDARD_1PCT',
        sellRawByWeight: product.sellRawByWeight ?? true,
        isBaseUnitPurchaseUnit: product.isBaseUnitPurchaseUnit ?? true,
      });
      for (const unit of product.uomConversions || []) {
        await productApi.createProductUnit(created.id, {
          unitName: unit.unitName,
          conversionRate: unit.conversionRate,
          price: unit.price,
          barcode: null,
          isBaseUnit: false,
          isPurchaseUnit: unit.isPurchaseUnit ?? false,
        });
      }
      await fetchProducts();
      await fetchSuggestionProducts();
      showToast(`Đã sao chép thành công sản phẩm: ${created.name}`);
      setIsDetailModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể sao chép sản phẩm.', 'error');
    }
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
        const codeCmp = (a.productCode || '').localeCompare(b.productCode || '', undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (codeCmp !== 0) return codeCmp;
        return (a.productName || '').localeCompare(b.productName || '', 'vi', { sensitivity: 'base' });
      });
  }, [products, appliedFilters]);



  const buildExcelApiFilter = () => {
    return {
      skus: appliedFilters.skus.length > 0 ? appliedFilters.skus : undefined,
      names: appliedFilters.names.length > 0 ? appliedFilters.names : undefined,
      barcodes: appliedFilters.barcodes.length > 0 ? appliedFilters.barcodes : undefined,
      categoryId: appliedFilters.categoryId !== 'ALL' ? appliedFilters.categoryId : undefined,
      categoryIds: appliedFilters.categoryId !== 'ALL' ? [appliedFilters.categoryId] : undefined,
      status: appliedFilters.statusFilter !== 'ALL' ? appliedFilters.statusFilter : undefined,
    };
  };

  const handleExport = async () => {
    setExcelBusy(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const exportProducts = await productApi.getAllProducts(buildExcelApiFilter());
      if (exportProducts.length === 0) {
        showToast('Không có sản phẩm phù hợp để xuất Excel.', 'warning');
        return;
      }

      const rows = exportProducts.map((product) => ({
        'Mã hàng': product.productCode,
        'Tên hàng (*)': product.name,
        'Mã nhóm hàng (*)': categories.find((item) => item.id === product.categoryId)?.code || product.categoryId,
        'Tên nhóm hàng': product.categoryName,
        'Mã vạch': product.barcode || '',
        'ĐVT cơ bản': product.baseUnit || 'Cái',
        'Giá bán': product.sellingPrice ?? 0,
        'Giá vốn': product.costPrice ?? '',
        'Tồn tối thiểu': product.minStock ?? 0,
        'Tồn tối đa': product.maxStock ?? 0,
        'Trạng thái': product.status || 'Active',
        'Quản lý lô': product.hasBatches ? 'Có' : 'Không',
        'Cho phép đóng gói lại': product.allowRepack ? 'Có' : 'Không',
        'Giá bán hàng đóng gói/kg': product.processedSellingPricePerKg ?? '',
        'Mô tả': product.description || '',
        'Ghi chú nội bộ': product.internalNote || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 24 }, { wch: 18 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 16 }, { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 32 }, { wch: 32 },
      ];
      const tableRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      const thinBorder = {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      };

      for (let rowIndex = tableRange.s.r; rowIndex <= tableRange.e.r; rowIndex += 1) {
        for (let columnIndex = tableRange.s.c; columnIndex <= tableRange.e.c; columnIndex += 1) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          const cell = worksheet[address];
          if (!cell) continue;

          if (rowIndex === 0) {
            cell.s = {
              font: { name: 'Aptos', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
              fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: thinBorder,
            };
          } else {
            const isEvenRow = rowIndex % 2 === 0;
            cell.s = {
              font: { name: 'Aptos', sz: 10, color: { rgb: '0F172A' } },
              fill: {
                patternType: 'solid',
                fgColor: { rgb: isEvenRow ? 'F0FDFA' : 'FFFFFF' },
              },
              alignment: {
                horizontal: [6, 7, 8, 9, 13].includes(columnIndex) ? 'right' : 'left',
                vertical: 'center',
                wrapText: [1, 3, 14, 15].includes(columnIndex),
              },
              border: thinBorder,
            };

            if ([6, 7, 13].includes(columnIndex) && cell.v !== '') {
              cell.z = '#,##0 [$₫-vi-VN]';
            } else if ([8, 9].includes(columnIndex) && cell.v !== '') {
              cell.z = '#,##0';
            }

            if (columnIndex === 10) {
              const active = String(cell.v).toLowerCase() === 'active';
              cell.s.font = {
                name: 'Aptos',
                sz: 10,
                bold: true,
                color: { rgb: active ? '047857' : 'B91C1C' },
              };
              cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            }
          }
        }
      }

      worksheet['!rows'] = Array.from({ length: rows.length + 1 }, (_, index) => ({
        hpt: index === 0 ? 34 : 24,
      }));
      (worksheet as typeof worksheet & { '!autofilter'?: { ref: string } })['!autofilter'] = {
        ref: XLSX.utils.encode_range(tableRange),
      };
      (worksheet as typeof worksheet & { '!views'?: Array<Record<string, unknown>> })['!views'] = [
        { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' },
      ];
      const workbook = XLSX.utils.book_new();
      workbook.Props = {
        Title: 'Danh mục hàng hóa',
        Subject: 'Danh mục hàng hóa MT-GRMS',
        Author: 'MT-GRMS',
        CreatedDate: new Date(),
      };
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhMucHangHoa');
      XLSX.writeFile(workbook, `DanhMucHangHoa_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`Đã xuất ${exportProducts.length} sản phẩm ra Excel.`, 'success');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể xuất file Excel.';
      showToast(message, 'error');
    } finally {
      setExcelBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    setExcelBusy(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('File Excel không có sheet dữ liệu.');

      const rows = XLSX.utils.sheet_to_json<ExcelRecord>(workbook.Sheets[firstSheetName], {
        defval: '',
        // Giữ giá trị số gốc; raw:false sẽ biến ô có format VNĐ thành chuỗi "12.000 ₫".
        raw: true,
      });
      if (rows.length === 0) throw new Error('File Excel không có dòng sản phẩm nào.');

      const existingProducts = await productApi.getAllProducts();
      const productsByCode = new Map(
        existingProducts.map((product) => [product.productCode.trim().toLowerCase(), product])
      );
      const categoriesByKey = new Map<string, Category>();
      categories.forEach((category) => {
        categoriesByKey.set(category.id.toLowerCase(), category);
        if (category.code) categoriesByKey.set(category.code.trim().toLowerCase(), category);
        categoriesByKey.set(removeVietnameseTones(category.name), category);
      });

      let successCount = 0;
      const failures: string[] = [];

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const excelRow = index + 2;
        const productCode = excelCell(row, 'Mã hàng', 'Ma hang', 'ProductCode');
        const name = excelCell(row, 'Tên hàng (*)', 'Tên hàng', 'Ten hang', 'Name');
        const categoryValue = excelCell(
          row,
          'Mã nhóm hàng (*)',
          'Mã nhóm hàng',
          'Tên nhóm hàng',
          'CategoryCode',
          'Category'
        );
        const category = categoriesByKey.get(categoryValue.toLowerCase())
          || categoriesByKey.get(removeVietnameseTones(categoryValue));

        if (!name) {
          failures.push(`Dòng ${excelRow}: thiếu Tên hàng.`);
          continue;
        }
        if (!category) {
          failures.push(`Dòng ${excelRow}: nhóm hàng "${categoryValue || '(trống)'}" không tồn tại.`);
          continue;
        }

        const existing: ProductResponse | undefined = productCode
          ? productsByCode.get(productCode.toLowerCase())
          : undefined;
        const statusText = excelCell(row, 'Trạng thái', 'Status');
        const status = statusText
          ? (['inactive', 'discontinued', 'ngung kinh doanh'].includes(removeVietnameseTones(statusText))
              ? 'Discontinued'
              : 'Active')
          : (existing?.status || 'Active');

        try {
          const commonPayload = {
            name,
            categoryId: category.id,
            sellingPrice: excelNumber(excelCell(row, 'Giá bán', 'Gia ban', 'SellingPrice'), existing?.sellingPrice ?? 0),
            barcode: excelCell(row, 'Mã vạch', 'Ma vach', 'Barcode') || existing?.barcode || undefined,
            baseUnit: excelCell(row, 'ĐVT cơ bản', 'DVT co ban', 'BaseUnit') || existing?.baseUnit || 'Cái',
            costPrice: excelNumber(excelCell(row, 'Giá vốn', 'Gia von', 'CostPrice'), existing?.costPrice ?? 0),
            minStock: excelNumber(excelCell(row, 'Tồn tối thiểu', 'Ton toi thieu', 'MinStock'), existing?.minStock ?? 0),
            maxStock: excelNumber(excelCell(row, 'Tồn tối đa', 'Ton toi da', 'MaxStock'), existing?.maxStock ?? 1000),
            vatRate: existing?.vatRate ?? 0,
            status,
            description: excelCell(row, 'Mô tả', 'Mo ta', 'Description') || existing?.description || undefined,
            internalNote: excelCell(row, 'Ghi chú nội bộ', 'Ghi chu noi bo', 'InternalNote') || existing?.internalNote || undefined,
            hasBatches: excelBoolean(excelCell(row, 'Quản lý lô', 'Quan ly lo', 'HasBatches'), existing?.hasBatches ?? false),
            nearExpiryThresholdDays: existing?.nearExpiryThresholdDays ?? null,
            allowRepack: excelBoolean(excelCell(row, 'Cho phép đóng gói lại', 'AllowRepack'), existing?.allowRepack ?? false),
            processedSellingPricePerKg: excelNumber(
              excelCell(row, 'Giá bán hàng đóng gói/kg', 'ProcessedSellingPricePerKg'),
              existing?.processedSellingPricePerKg ?? 0
            ) || null,
            // Các field không có cột Excel phải được giữ nguyên khi update,
            // tránh backend gán lại default và làm mất cấu hình hiện tại.
            isFavorite: existing?.isFavorite ?? false,
            eligibleForVatReduction: existing?.eligibleForVatReduction ?? false,
            taxCategory: existing?.taxCategory ?? 'STANDARD_1PCT',
            sellRawByWeight: existing?.sellRawByWeight ?? true,
            isBaseUnitPurchaseUnit: existing?.isBaseUnitPurchaseUnit ?? true,
          };

          if (existing) {
            const updated = await productApi.updateProduct(existing.id, commonPayload);
            productsByCode.set(existing.productCode.toLowerCase(), updated);
          } else {
            const created = await productApi.createProduct({
              ...commonPayload,
              productCode: productCode || undefined,
            });
            productsByCode.set(created.productCode.toLowerCase(), created);
          }
          successCount += 1;
        } catch (rowError: any) {
          const message = rowError?.response?.data?.message || rowError?.message || 'Không thể lưu sản phẩm.';
          failures.push(`Dòng ${excelRow}${productCode ? ` (${productCode})` : ''}: ${message}`);
        }
      }

      await fetchCategories();
      await fetchProducts();
      await fetchSuggestionProducts();

      const summary = `Import hoàn tất: ${successCount}/${rows.length} dòng thành công`;
      setNotificationModal({
        isOpen: true,
        type: failures.length ? 'warning' : 'success',
        title: failures.length ? 'Import Excel có dòng lỗi' : 'Import Excel thành công',
        message: failures.length
          ? `${summary}. ${failures.slice(0, 8).join(' | ')}${failures.length > 8 ? ` | Và ${failures.length - 8} lỗi khác.` : ''}`
          : `${summary}.`,
      });
      showToast(summary, failures.length ? 'warning' : 'success');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Không thể import file Excel.';
      showToast(message, 'error');
      setNotificationModal({
        isOpen: true,
        type: 'error',
        title: 'Import Excel thất bại',
        message,
      });
    } finally {
      setExcelBusy(false);
    }
  };

  return (
    <div
      className="po-matrix-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        flex: 1,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      <div className="so-list-header">
        <div>
          <h1 className="so-list-title">
            <Layers size={22} color="var(--blue-primary, #0f766e)" />
            <span>Hàng hóa</span>
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

      <div style={{ flexShrink: 0, marginBottom: 8, minWidth: 0, maxWidth: '100%' }}>
        <MasterProductFilterBar
          initialValues={appliedFilters}
          products={products}
          suggestionProducts={suggestionProducts}
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
          excelBusy={excelBusy}
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
