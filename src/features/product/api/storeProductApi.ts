import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  StoreProductItem,
  StoreSummary,
  StoreProductFilterValues,
  AssignStoreProductInput,
  EditStoreProductInput,
} from '../types/storeProduct.types';

export const storeProductApi = {
  // Query store products with search, filters and pagination directly from Backend API
  getStoreProducts: async (
    filters: StoreProductFilterValues & { pageIndex: number; pageSize: number }
  ): Promise<{ items: StoreProductItem[]; total: number }> => {
    const isSpecificStore = filters.storeId && filters.storeId !== 'ALL';
    const endpoint = isSpecificStore
      ? `/branches/${filters.storeId}/products`
      : `/branches/products`;

    const skus = filters.skus?.filter(Boolean) ?? [];
    const names = filters.names?.filter(Boolean) ?? [];
    const branchCodes = filters.storeCodes?.filter(Boolean) ?? [];
    const branchNames = filters.storeNames?.filter(Boolean) ?? [];

    const res = await httpClient.get<ApiResponse<PagedResult<any>>>(endpoint, {
      params: {
        SearchTerm: filters.searchTerm || undefined,
        Skus: skus.length ? skus : undefined,
        Names: names.length ? names : undefined,
        BranchCodes: branchCodes.length ? branchCodes : undefined,
        BranchNames: branchNames.length ? branchNames : undefined,
        Status: filters.statusFilter !== 'ALL' ? filters.statusFilter : undefined,
        StockAlertFilter: filters.stockAlertFilter !== 'ALL' ? filters.stockAlertFilter : undefined,
        PageIndex: filters.pageIndex,
        PageSize: filters.pageSize,
      },
      paramsSerializer: (p) => {
        const search = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item !== undefined && item !== null && String(item).trim() !== '') {
                search.append(key, String(item));
              }
            });
            return;
          }
          search.append(key, String(value));
        });
        return search.toString();
      },
    });

    if (res.data?.success && res.data.data) {
      const paged = res.data.data;
      const items: StoreProductItem[] = paged.items.map((x: any) => ({
        id: x.id,
        storeId: x.branchId,
        storeCode: x.branchCode || x.storeCode || '',
        storeName: x.branchName,
        productId: x.productId,
        name: x.name,
        sku: x.sku,
        barcode: x.barcode,
        category: x.category || '',
        unit: x.unit,
        retailPrice: x.retailPrice,
        costPrice: x.costPrice,
        minOrderQuantity: x.minOrderQuantity ?? x.minimumOrderQuantity ?? 10,
        currentStock: x.currentStock,
        minStockLevel: x.minStockLevel,
        primarySupplierName: x.primarySupplierName,
        status: x.status,
        shelfLocation: x.shelfLocation,
        assignedDate: x.assignedDate ? x.assignedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      }));
      return { items, total: paged.totalItems };
    }

    return { items: [], total: 0 };
  },

  // Get Store Summaries from Backend API
  getStoreSummaries: async (): Promise<StoreSummary[]> => {
    const res = await httpClient.get<ApiResponse<any[]>>('/branches/summaries');
    if (res.data?.success && res.data.data && res.data.data.length > 0) {
      return res.data.data.map((b: any) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        address: b.address,
        managerName: b.managerName || 'Quản lý chi nhánh',
        phone: b.phone || '0901 234 567',
        totalProducts: b.totalProducts,
        totalStock: b.totalStock,
        lowStockCount: b.lowStockCount,
      }));
    }
    return [];
  },

  // Get master products from Backend API for assigning
  getMasterProducts: async (): Promise<any[]> => {
    const res = await httpClient.get<ApiResponse<any[]>>('/products');
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return [];
  },

  // Assign Products to Store
  assignProducts: async (input: AssignStoreProductInput): Promise<void> => {
    await httpClient.post(`/branches/${input.storeId}/products`, {
      productIds: input.productIds,
      defaultRetailPrice: input.defaultRetailPrice,
      defaultMinStock: input.defaultMinStock,
    });
  },

  // Update product price & min stock
  updateProduct: async (
    storeId: string,
    productId: string,
    input: EditStoreProductInput
  ): Promise<void> => {
    await httpClient.put(`/branches/${storeId}/products/${productId}`, {
      retailPrice: input.retailPrice,
      minStockLevel: input.minStockLevel,
      minOrderQuantity: input.minOrderQuantity,
      shelfLocation: input.shelfLocation,
    });
  },

  // Toggle status
  toggleStatus: async (
    storeId: string,
    productId: string,
    status: 'Active' | 'Inactive'
  ): Promise<void> => {
    await httpClient.patch(`/branches/${storeId}/products/${productId}/status`, { status });
  },

  // Remove product from store
  removeProduct: async (storeId: string, productId: string): Promise<void> => {
    await httpClient.delete(`/branches/${storeId}/products/${productId}`);
  },
};
