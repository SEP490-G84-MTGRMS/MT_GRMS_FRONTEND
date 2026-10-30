import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { ProductResponse, ProductQueryFilter, PagedResult } from '../types';

export interface ProductCreatePayload {
  name: string;
  categoryId: string;
  sellingPrice: number;
  productCode?: string;
  barcode?: string;
  baseUnit?: string;
  costPrice?: number | null;
  minStock?: number;
  maxStock?: number;
  vatRate?: number;
  productType?: string;
  status?: string;
  imageUrl?: string | null;
  description?: string | null;
  internalNote?: string | null;
  hasBatches?: boolean;
  isFavorite?: boolean;
}

export interface ProductUpdatePayload {
  name: string;
  categoryId: string;
  sellingPrice: number;
  barcode?: string;
  baseUnit?: string;
  costPrice?: number | null;
  minStock?: number;
  maxStock?: number;
  vatRate?: number;
  status?: string;
  imageUrl?: string | null;
  description?: string | null;
  internalNote?: string | null;
  hasBatches?: boolean;
  isFavorite?: boolean;
}

export const productApi = {
  /**
   * Lấy danh sách sản phẩm có phân trang, tìm kiếm đa tiêu chí và lọc theo danh mục
   * Endpoint Backend: GET /api/products hoặc GET /api/v1/products
   */
  async getProductsPaged(filter: ProductQueryFilter = {}): Promise<PagedResult<ProductResponse>> {
    const params: Record<string, any> = {
      PageIndex: filter.pageIndex ?? 1,
      PageSize: filter.pageSize ?? 20,
    };

    if (filter.searchTerm && filter.searchTerm.trim() !== '') {
      params.SearchTerm = filter.searchTerm.trim();
    }

    if (filter.categoryIds && filter.categoryIds.length > 0) {
      params.CategoryIds = filter.categoryIds;
    } else if (filter.categoryId && filter.categoryId.trim() !== '' && filter.categoryId !== 'ALL') {
      params.CategoryId = filter.categoryId;
    }

    if (filter.status && filter.status.trim() !== '' && filter.status !== 'all') {
      params.Status = filter.status;
    }

    const res = await httpClient.get<ApiResponse<PagedResult<ProductResponse>>>('/products', {
      params,
    });

    if (res.data?.success && res.data.data) {
      const data = res.data.data;
      const totalCount = data.totalCount ?? (data as any).totalItems ?? (data.items ? data.items.length : 0);
      const pageSize = data.pageSize ?? filter.pageSize ?? 20;
      const pageIndex = data.pageIndex ?? (data as any).page ?? filter.pageIndex ?? 1;
      const totalPages = data.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));

      return {
        items: data.items ?? [],
        pageIndex,
        pageSize,
        totalCount,
        totalPages,
        hasPreviousPage: Boolean(data.hasPreviousPage ?? (pageIndex > 1)),
        hasNextPage: Boolean(data.hasNextPage ?? (pageIndex < totalPages)),
      };
    }

    return {
      items: [],
      pageIndex: 1,
      pageSize: filter.pageSize ?? 20,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  },

  /**
   * Tạo mới một hàng hóa trên Backend
   * Endpoint Backend: POST /api/products hoặc POST /api/v1/products
   */
  async createProduct(payload: ProductCreatePayload): Promise<ProductResponse> {
    const res = await httpClient.post<ApiResponse<ProductResponse>>('/products', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo hàng hóa.');
  },

  /**
   * Cập nhật thông tin hàng hóa trên Backend
   * Endpoint Backend: PUT /api/products/{id}
   */
  async updateProduct(id: string, payload: ProductUpdatePayload): Promise<ProductResponse> {
    const res = await httpClient.put<ApiResponse<ProductResponse>>(`/products/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật hàng hóa.');
  },

  /**
   * Xóa mềm một hàng hóa trên Backend
   * Endpoint Backend: DELETE /api/products/{id}
   */
  async deleteProduct(id: string): Promise<void> {
    const res = await httpClient.delete<ApiResponse<any>>(`/products/${id}`);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Không thể xóa hàng hóa.');
    }
  },
};


export { uploadImageToCloudinary } from '../../../utils/cloudinary';
export type { ImageUploadResponse } from '../../../utils/cloudinary';
