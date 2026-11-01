import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  StoreProductItem,
  StoreSummary,
  StoreProductFilterValues,
  AssignStoreProductInput,
  EditStoreProductInput,
} from '../types/storeProduct.types';
import { MOCK_BRANCHES } from '../../purchase-order/lib/mockData';
import { MASTER_PRODUCTS } from '../../supplier/lib/mockData';

// Generate mock store products for branches as fallback
const generateInitialStoreProducts = (): StoreProductItem[] => {
  const items: StoreProductItem[] = [];

  const branches = [
    { id: 'DC1', name: 'Kho tổng DC1' },
    { id: 'BR-01', name: 'BR-01 CH Nguyễn Trãi' },
    { id: 'BR-02', name: 'BR-02 Kho Thủ Đức' },
    { id: 'BR-03', name: 'BR-03 CH Quận 7' },
  ];

  branches.forEach((b) => {
    MASTER_PRODUCTS.slice(0, 16).forEach((mp, idx) => {
      const baseCost = mp.defaultWholesalePrice || 25000;
      const retailPrice = Math.round((baseCost * 1.3) / 1000) * 1000;
      const minStockLevel = 10 + (idx % 4) * 5;

      let currentStock = 15 + (idx % 6) * 8;
      if (idx === 2) currentStock = 0; // Out of stock sample
      if (idx === 5) currentStock = 4; // Low stock sample

      items.push({
        id: `SP-${b.id}-${mp.id}`,
        storeId: b.id,
        storeName: b.name,
        productId: mp.id,
        name: mp.name,
        sku: mp.sku,
        barcode: mp.barcode || `893${idx.toString().padStart(9, '0')}`,
        category: mp.categoryName || 'Khác',
        unit: mp.baseUoM || 'Gói',
        costPrice: baseCost,
        retailPrice,
        minOrderQuantity: (idx % 4 + 1) * 5,
        currentStock,
        minStockLevel,
        primarySupplierName: idx % 2 === 0 ? 'Nông Sản Tươi Sạch Khải Anh' : 'Bánh Kẹo SnackVN',
        status: idx === 7 ? 'Inactive' : 'Active',
        shelfLocation: `Kệ ${String.fromCharCode(65 + (idx % 5))}-${(idx % 4) + 1}`,
        assignedDate: '2026-10-15',
      });
    });
  });

  return items;
};

let inMemoryStoreProducts = generateInitialStoreProducts();

export const storeProductApi = {
  // Query store products with search, filters and pagination (connecting to Backend API with fallback)
  getStoreProducts: async (
    filters: StoreProductFilterValues & { pageIndex: number; pageSize: number }
  ): Promise<{ items: StoreProductItem[]; total: number }> => {
    try {
      if (filters.storeId && filters.storeId !== 'ALL') {
        const res = await httpClient.get<ApiResponse<PagedResult<any>>>(
          `/branches/${filters.storeId}/products`,
          {
            params: {
              SearchTerm: filters.searchTerm || undefined,
              Category: filters.categoryFilter !== 'ALL' ? filters.categoryFilter : undefined,
              Status: filters.statusFilter !== 'ALL' ? filters.statusFilter : undefined,
              StockAlertFilter: filters.stockAlertFilter !== 'ALL' ? filters.stockAlertFilter : undefined,
              PageIndex: filters.pageIndex,
              PageSize: filters.pageSize,
            },
          }
        );

        if (res.data?.success && res.data.data) {
          const paged = res.data.data;
          const items: StoreProductItem[] = paged.items.map((x: any) => ({
            id: x.id,
            storeId: x.branchId,
            storeName: x.branchName,
            productId: x.productId,
            name: x.name,
            sku: x.sku,
            barcode: x.barcode,
            category: x.category,
            unit: x.unit,
            retailPrice: x.retailPrice,
            costPrice: x.costPrice,
            minOrderQuantity: x.minOrderQuantity ?? x.minimumOrderQuantity ?? 10,
            currentStock: x.currentStock,
            minStockLevel: x.minStockLevel,
            primarySupplierName: x.primarySupplierName,
            status: x.status,
            shelfLocation: x.shelfLocation,
            assignedDate: x.assignedDate ? x.assignedDate.slice(0, 10) : '2026-10-15',
          }));
          return { items, total: paged.totalItems };
        }
      }
    } catch {
      // Graceful fallback to mock data
    }

    await new Promise((r) => setTimeout(r, 80));

    let filtered = [...inMemoryStoreProducts];

    // Filter by store ID
    if (filters.storeId && filters.storeId !== 'ALL') {
      filtered = filtered.filter((p) => p.storeId === filters.storeId);
    }

    // Multi-token filter by SKU
    if (filters.skus && filters.skus.length > 0) {
      const tokens = filters.skus.map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (tokens.length > 0) {
        filtered = filtered.filter((p) =>
          tokens.some((t) => p.sku.toLowerCase().includes(t))
        );
      }
    }

    // Multi-token filter by Product Name
    if (filters.names && filters.names.length > 0) {
      const tokens = filters.names.map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (tokens.length > 0) {
        filtered = filtered.filter((p) =>
          tokens.some((t) => p.name.toLowerCase().includes(t))
        );
      }
    }

    // Multi-token filter by Store Name
    if (filters.storeNames && filters.storeNames.length > 0) {
      const tokens = filters.storeNames.map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (tokens.length > 0) {
        filtered = filtered.filter((p) =>
          tokens.some((t) => p.storeName.toLowerCase().includes(t))
        );
      }
    }

    // Multi-token filter by Category
    if (filters.categories && filters.categories.length > 0) {
      const tokens = filters.categories.map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (tokens.length > 0) {
        filtered = filtered.filter((p) =>
          tokens.some((t) => p.category.toLowerCase().includes(t))
        );
      }
    }

    // Filter by keyword (backward compatibility)
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const kw = filters.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.sku.toLowerCase().includes(kw) ||
          p.barcode.toLowerCase().includes(kw)
      );
    }

    // Filter by category
    if (filters.categoryFilter && filters.categoryFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.category === filters.categoryFilter);
    }

    // Filter by status
    if (filters.statusFilter && filters.statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.status === filters.statusFilter);
    }

    // Filter by stock alert
    if (filters.stockAlertFilter && filters.stockAlertFilter !== 'ALL') {
      if (filters.stockAlertFilter === 'OUT_OF_STOCK') {
        filtered = filtered.filter((p) => p.currentStock === 0);
      } else if (filters.stockAlertFilter === 'LOW') {
        filtered = filtered.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel);
      } else if (filters.stockAlertFilter === 'NORMAL') {
        filtered = filtered.filter((p) => p.currentStock > p.minStockLevel);
      }
    }

    const total = filtered.length;
    const startIndex = (filters.pageIndex - 1) * filters.pageSize;
    const items = filtered.slice(startIndex, startIndex + filters.pageSize);

    return { items, total };
  },

  // Get Store Summaries
  getStoreSummaries: async (): Promise<StoreSummary[]> => {
    try {
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
    } catch {
      // Fallback to mock
    }

    return MOCK_BRANCHES.map((b) => {
      const branchProds = inMemoryStoreProducts.filter((p) => p.storeId === b.id);
      const totalStock = branchProds.reduce((sum, p) => sum + p.currentStock, 0);
      const lowStockCount = branchProds.filter((p) => p.currentStock <= p.minStockLevel).length;

      return {
        id: b.id,
        code: b.code,
        name: b.name,
        address: 'Hồ Chí Minh, Việt Nam',
        managerName: 'Quản lý chi nhánh',
        phone: '0901 234 567',
        totalProducts: branchProds.length,
        totalStock,
        lowStockCount,
      };
    });
  },

  // Assign Products to Store
  assignProducts: async (input: AssignStoreProductInput): Promise<void> => {
    try {
      await httpClient.post(`/branches/${input.storeId}/products`, {
        productIds: input.productIds,
        defaultRetailPrice: input.defaultRetailPrice,
        defaultMinStock: input.defaultMinStock,
      });
    } catch {
      // In-memory fallback
    }

    const store = MOCK_BRANCHES.find((b) => b.id === input.storeId) || {
      id: input.storeId,
      name: `Chi nhánh ${input.storeId}`,
    };

    input.productIds.forEach((pid) => {
      const mp = MASTER_PRODUCTS.find((p) => p.id === pid);
      if (!mp) return;

      const baseCost = mp.defaultWholesalePrice || 25000;
      const retailPrice = input.defaultRetailPrice || Math.round((baseCost * 1.3) / 1000) * 1000;
      const minStockLevel = input.defaultMinStock || 10;

      const exists = inMemoryStoreProducts.some(
        (p) => p.storeId === input.storeId && p.productId === pid
      );
      if (!exists) {
        inMemoryStoreProducts.unshift({
          id: `SP-${input.storeId}-${pid}`,
          storeId: input.storeId,
          storeName: store.name,
          productId: pid,
          name: mp.name,
          sku: mp.sku,
          barcode: mp.barcode || `893${Date.now().toString().slice(-9)}`,
          category: mp.categoryName || 'Khác',
          unit: mp.baseUoM || 'Gói',
          costPrice: baseCost,
          retailPrice,
          minOrderQuantity: input.defaultMinOrderQuantity || 10,
          currentStock: 0,
          minStockLevel,
          primarySupplierName: 'Nông Sản Tươi Sạch Khải Anh',
          status: 'Active',
          shelfLocation: 'Kệ mới',
          assignedDate: new Date().toISOString().slice(0, 10),
        });
      }
    });
  },

  // Update product price & min stock
  updateProduct: async (
    storeId: string,
    productId: string,
    input: EditStoreProductInput
  ): Promise<void> => {
    try {
      await httpClient.put(`/branches/${storeId}/products/${productId}`, {
        retailPrice: input.retailPrice,
        minStockLevel: input.minStockLevel,
        minOrderQuantity: input.minOrderQuantity,
        shelfLocation: input.shelfLocation,
      });
    } catch {
      // Fallback
    }

    inMemoryStoreProducts = inMemoryStoreProducts.map((p) => {
      if (p.storeId === storeId && p.productId === productId) {
        return {
          ...p,
          retailPrice: input.retailPrice,
          minStockLevel: input.minStockLevel ?? p.minStockLevel,
          minOrderQuantity: input.minOrderQuantity ?? p.minOrderQuantity,
          status: input.status ?? p.status,
          shelfLocation: input.shelfLocation || p.shelfLocation,
        };
      }
      return p;
    });
  },

  // Toggle status
  toggleStatus: async (
    storeId: string,
    productId: string,
    status: 'Active' | 'Inactive'
  ): Promise<void> => {
    try {
      await httpClient.patch(`/branches/${storeId}/products/${productId}/status`, { status });
    } catch {
      // Fallback
    }

    inMemoryStoreProducts = inMemoryStoreProducts.map((p) => {
      if (p.storeId === storeId && p.productId === productId) {
        return { ...p, status };
      }
      return p;
    });
  },

  // Remove product from store
  removeProduct: async (storeId: string, productId: string): Promise<void> => {
    try {
      await httpClient.delete(`/branches/${storeId}/products/${productId}`);
    } catch {
      // Fallback
    }

    inMemoryStoreProducts = inMemoryStoreProducts.filter(
      (p) => !(p.storeId === storeId && p.productId === productId)
    );
  },
};
