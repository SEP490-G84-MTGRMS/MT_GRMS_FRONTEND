import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { ProductResponse, ProductQueryFilter, PagedResult } from '../types';

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
};

