import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  ProductResponse,
  ProductQueryFilter,
  PagedResult,
  ProductUnitResponse,
  ProductUnitCreatePayload,
  ProductUnitUpdatePayload,
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductPriceHistoryDto,
} from '../types';

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

  /**
   * Lấy danh sách đơn vị tính quy đổi của sản phẩm
   * Endpoint Backend: GET /api/v1/products/{productId}/units
   */
  async getProductUnits(productId: string): Promise<ProductUnitResponse[]> {
    try {
      const res = await httpClient.get<ApiResponse<ProductUnitResponse[]>>(`/products/${productId}/units`);
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Thêm mới đơn vị tính quy đổi cho một sản phẩm
   * Endpoint Backend: POST /api/v1/products/{productId}/units
   */
  async createProductUnit(productId: string, payload: ProductUnitCreatePayload): Promise<ProductUnitResponse> {
    const res = await httpClient.post<ApiResponse<ProductUnitResponse>>(`/products/${productId}/units`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo đơn vị tính.');
  },

  /**
   * Cập nhật thông tin đơn vị tính quy đổi
   * Endpoint Backend: PUT /api/v1/product-units/{id}
   */
  async updateProductUnit(id: string, payload: ProductUnitUpdatePayload): Promise<ProductUnitResponse> {
    const res = await httpClient.put<ApiResponse<ProductUnitResponse>>(`/product-units/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật đơn vị tính.');
  },

  /**
   * Xóa một đơn vị tính quy đổi
   * Endpoint Backend: DELETE /api/v1/product-units/{id}
   */
  async deleteProductUnit(id: string): Promise<void> {
    const res = await httpClient.delete<ApiResponse<any>>(`/product-units/${id}`);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Không thể xóa đơn vị tính.');
    }
  },

  /**
   * Lấy lịch sử biến động giá bán sản phẩm (FE-03.2 Price Change History Tracking)
   * Endpoint Backend: GET /api/products/{id}/price-history
   */
  async getPriceHistory(productId: string, branchId?: string): Promise<ProductPriceHistoryDto[]> {
    const params: Record<string, any> = {};
    if (branchId) {
      params.branchId = branchId;
    }
    const res = await httpClient.get<ApiResponse<ProductPriceHistoryDto[]>>(`/products/${productId}/price-history`, {
      params,
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return [];
  },
};

export type { ProductUnitUpdatePayload };
export { uploadImageToCloudinary } from '../../../utils/cloudinary';
export type { ImageUploadResponse } from '../../../utils/cloudinary';
