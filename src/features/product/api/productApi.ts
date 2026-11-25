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
  ProductPriceHistoryQuery,
  ProductPriceHistoryPagedResult,
} from '../types';

/** BE enum ProductStatus = Active | Inactive. FE UI dùng Discontinued = Inactive. */
function toBackendProductStatus(status?: string | null): string | undefined {
  if (status == null || String(status).trim() === '') return undefined;
  const s = String(status).trim();
  if (s === 'Discontinued' || s === 'Inactive') return 'Inactive';
  if (s === 'Active') return 'Active';
  return s;
}

export const productApi = {
  /**
   * Lấy danh sách sản phẩm có phân trang, tìm kiếm đa tiêu chí và lọc theo danh mục
   * Endpoint Backend: GET /api/products
   */
  async getProductsPaged(filter: ProductQueryFilter = {}): Promise<PagedResult<ProductResponse>> {
    const params: Record<string, any> = {
      PageIndex: filter.pageIndex ?? 1,
      PageSize: filter.pageSize ?? 20,
    };

    if (filter.searchTerm && filter.searchTerm.trim() !== '') {
      params.SearchTerm = filter.searchTerm.trim();
    }
    if (filter.skus && filter.skus.length > 0) {
      params.Skus = filter.skus;
    }
    if (filter.names && filter.names.length > 0) {
      params.Names = filter.names;
    }
    if (filter.barcodes && filter.barcodes.length > 0) {
      params.Barcodes = filter.barcodes;
    }

    if (filter.categoryIds && filter.categoryIds.length > 0) {
      params.CategoryIds = filter.categoryIds;
    } else if (filter.categoryId && filter.categoryId.trim() !== '' && filter.categoryId !== 'ALL') {
      params.CategoryId = filter.categoryId;
    }

    if (filter.status && filter.status.trim() !== '' && filter.status !== 'all') {
      params.Status = toBackendProductStatus(filter.status) ?? filter.status;
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

  /** Lấy toàn bộ danh mục theo filter, dùng cho xuất/đối chiếu Excel. */
  async getAllProducts(filter: ProductQueryFilter = {}): Promise<ProductResponse[]> {
    const pageSize = 200;
    const firstPage = await this.getProductsPaged({ ...filter, pageIndex: 1, pageSize });
    const items = [...firstPage.items];

    for (let pageIndex = 2; pageIndex <= firstPage.totalPages; pageIndex += 1) {
      const page = await this.getProductsPaged({ ...filter, pageIndex, pageSize });
      items.push(...page.items);
    }

    return items;
  },

  /**
   * Tạo mới một hàng hóa trên Backend
   * Endpoint Backend: POST /api/products
   */
  async createProduct(payload: ProductCreatePayload): Promise<ProductResponse> {
    const body = {
      ...payload,
      status: toBackendProductStatus(payload.status) ?? payload.status ?? 'Active',
    };
    const res = await httpClient.post<ApiResponse<ProductResponse>>('/products', body);
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
    const body = {
      ...payload,
      status: toBackendProductStatus(payload.status) ?? payload.status,
    };
    const res = await httpClient.put<ApiResponse<ProductResponse>>(`/products/${id}`, body);
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
   * Endpoint Backend: GET /api/products/{productId}/units
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
   * Endpoint Backend: POST /api/products/{productId}/units
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
   * Endpoint Backend: PUT /api/product-units/{id}
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
   * Endpoint Backend: DELETE /api/product-units/{id}
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
  async getPriceHistory(
    productId: string,
    branchId?: string,
    query: ProductPriceHistoryQuery = {}
  ): Promise<ProductPriceHistoryPagedResult> {
    const params: Record<string, any> = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 15,
    };
    if (branchId) {
      params.branchId = branchId;
    }
    if (query.productUnitId) params.productUnitId = query.productUnitId;
    if (query.priceScope) params.priceScope = query.priceScope;
    if (query.fromDate) params.fromDate = query.fromDate;
    if (query.toDate) params.toDate = query.toDate;
    if (query.searchTerm) params.searchTerm = query.searchTerm;

    const res = await httpClient.get<ApiResponse<ProductPriceHistoryPagedResult>>(`/products/${productId}/price-history`, {
      params,
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return { items: [], page: params.page, pageSize: params.pageSize, totalItems: 0 };
  },
};

export type { ProductUnitUpdatePayload };
