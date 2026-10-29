import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { CategoryDto } from '../types';

export const categoryApi = {
  /**
   * Lấy danh sách toàn bộ danh mục sản phẩm phẳng từ Backend
   * Endpoint: GET /api/categories hoặc GET /api/v1/categories
   */
  async getCategories(): Promise<CategoryDto[]> {
    try {
      const res = await httpClient.get<ApiResponse<CategoryDto[]>>('/categories');
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      return [];
    } catch (err) {
      console.warn('Lỗi khi tải danh mục từ backend, fallback mảng rỗng:', err);
      return [];
    }
  },
};

