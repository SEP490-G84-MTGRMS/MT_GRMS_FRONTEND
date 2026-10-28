import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../types/supplier.types';
import { MOCK_SUPPLIER_PRODUCTS } from '../lib/mockData';

export interface SupplierProductFilterParams {
  searchTerm?: string;
  productSearch?: string;
  supplierSearch?: string;
  supplierId?: string;
  categoryFilter?: string;
  statusFilter?: string;
  pageIndex?: number;
  pageSize?: number;
  suppliers?: Array<{ id: string; code: string; name: string }>;
}

export const supplierProductApi = {
  /**
   * Lấy danh sách sản phẩm theo NCC có phân trang và bộ lọc (REQ-SP05, REQ-SP06)
   */
  async getSupplierProducts(
    supplierId: string,
    filter: SupplierProductFilterParams
  ): Promise<{ items: SupplierProductItem[]; total: number }> {
    try {
      if (supplierId && supplierId !== 'ALL') {
        const res = await httpClient.get<ApiResponse<PagedResult<any>>>(
          `/suppliers/${supplierId}/products`,
          {
            params: {
              SearchTerm: filter.productSearch || filter.searchTerm || undefined,
              Status:
                filter.statusFilter === 'Active'
                  ? 1
                  : filter.statusFilter === 'Inactive'
                  ? 2
                  : undefined,
              PageIndex: filter.pageIndex || 1,
              PageSize: filter.pageSize || 10,
            },
          }
        );

        if (res.data?.success && res.data.data) {
          const paged = res.data.data;
          const items: SupplierProductItem[] = paged.items.map((item: any) => ({
            id: item.id,
            supplierId: item.supplierId,
            productId: item.productId,
            barcode: item.barcode || '',
            sku: item.sku || '',
            name: item.productName || item.name || '',
            categoryName: item.categoryName || 'Chung',
            deliveryUoM: item.deliveryUoM || 'Cái',
            baseUoM: item.baseUoM || 'Cái',
            agreedPrice: item.agreedWholesalePrice ?? item.agreedPrice ?? 0,
            moq: item.minimumOrderQuantity ?? item.moq ?? 1,
            isPrimary: Boolean(item.isPrimarySupplier ?? item.isPrimary),
            supplierProductCode: item.supplierProductCode || undefined,
            effectiveDate: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
            status: item.status === 'Active' || item.status === 1 ? 'Active' : 'Inactive',
          }));

          return { items, total: paged.totalItems };
        }
      }
    } catch {
      // Backend request fallback to mock data
    }

    // In-memory filter & paging fallback
    const allItems: SupplierProductItem[] =
      supplierId && supplierId !== 'ALL'
        ? MOCK_SUPPLIER_PRODUCTS[supplierId] || []
        : Object.values(MOCK_SUPPLIER_PRODUCTS).flat();

    const filtered = allItems.filter((p) => {
      // 1. Lọc theo Tên sản phẩm, Barcode, SKU
      const productQuery = (filter.productSearch || filter.searchTerm || '').trim().toLowerCase();
      if (productQuery) {
        const matchName = p.name.toLowerCase().includes(productQuery);
        const matchBarcode = p.barcode.toLowerCase().includes(productQuery);
        const matchSku = p.sku.toLowerCase().includes(productQuery);
        const matchCode = p.supplierProductCode?.toLowerCase().includes(productQuery) ?? false;
        if (!matchName && !matchBarcode && !matchSku && !matchCode) return false;
      }

      // 2. Lọc theo Nhà cung cấp (mã NCC hoặc tên NCC)
      const supplierQuery = (filter.supplierSearch || '').trim().toLowerCase();
      if (supplierQuery) {
        const supp = filter.suppliers?.find((s) => s.id === p.supplierId);
        const suppCode = (supp?.code || p.supplierId || '').toLowerCase();
        const suppName = (supp?.name || '').toLowerCase();
        if (!suppCode.includes(supplierQuery) && !suppName.includes(supplierQuery)) {
          return false;
        }
      }

      if (filter.supplierId && filter.supplierId !== 'ALL' && p.supplierId !== filter.supplierId) {
        return false;
      }
      if (filter.categoryFilter && filter.categoryFilter !== 'ALL' && p.categoryName !== filter.categoryFilter) {
        return false;
      }
      if (filter.statusFilter && filter.statusFilter !== 'ALL' && p.status !== filter.statusFilter) {
        return false;
      }
      return true;
    });

    const page = filter.pageIndex || 1;
    const size = filter.pageSize || 10;
    const start = (page - 1) * size;
    const pagedItems = filtered.slice(start, start + size);

    return { items: pagedItems, total: filtered.length };
  },

  /**
   * Gán sản phẩm mới cho Nhà cung cấp (REQ-SP01)
   */
  async assignProduct(input: AssignProductInput): Promise<any> {
    try {
      const res = await httpClient.post<ApiResponse<any>>(
        `/suppliers/${input.supplierId}/products`,
        {
          productId: input.productId,
          deliveryUoM: input.deliveryUoM,
          agreedWholesalePrice: input.agreedPrice,
          minimumOrderQuantity: input.moq,
          isPrimarySupplier: input.isPrimary ?? false,
          supplierProductCode: input.supplierProductCode,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        throw new Error('Sản phẩm này đã được gán cho nhà cung cấp.');
      }
      throw new Error(err.response?.data?.message || err.message || 'Không thể gán sản phẩm.');
    }
  },

  /**
   * Cập nhật giá thỏa thuận & MOQ (REQ-SP02)
   */
  async updateProduct(
    supplierId: string,
    productId: string,
    input: EditSupplierProductInput
  ): Promise<any> {
    try {
      const res = await httpClient.put<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}`,
        {
          deliveryUoM: input.deliveryUoM,
          agreedWholesalePrice: input.agreedPrice,
          minimumOrderQuantity: input.moq,
          isPrimarySupplier: input.isPrimary ?? false,
          supplierProductCode: input.supplierProductCode,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể cập nhật sản phẩm.');
    }
  },

  /**
   * Chuyển đổi trạng thái Active / Inactive (REQ-SP03)
   */
  async toggleStatus(
    supplierId: string,
    productId: string,
    status: 'Active' | 'Inactive'
  ): Promise<any> {
    try {
      const res = await httpClient.patch<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}/status`,
        {
          status: status === 'Active' ? 1 : 2,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể đổi trạng thái sản phẩm.');
    }
  },

  /**
   * Đặt Nhà cung cấp chính (REQ-SP04)
   */
  async setPrimarySupplier(
    supplierId: string,
    productId: string,
    isPrimary: boolean
  ): Promise<any> {
    try {
      const res = await httpClient.patch<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}/primary`,
        {
          isPrimarySupplier: isPrimary,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể cập nhật NCC chính.');
    }
  },
};
