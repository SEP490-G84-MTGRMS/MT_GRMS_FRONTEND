import { httpClient } from '../../../api/httpClient';
import type { ApiResponse } from '../../../api/types';
import type { CategoryDto } from '../types';

export interface CategoryCreatePayload {
  name: string;
  code?: string;
  description?: string;
}

export interface CategoryUpdatePayload {
  name: string;
  description?: string;
}

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

  /**
   * Tạo mới một nhóm hàng trên Backend
   * Endpoint: POST /api/categories hoặc POST /api/v1/categories
   */
  async createCategory(payload: CategoryCreatePayload): Promise<CategoryDto> {
    const res = await httpClient.post<ApiResponse<CategoryDto>>('/categories', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo nhóm hàng.');
  },

  /**
   * Cập nhật thông tin một nhóm hàng trên Backend
   * Endpoint: PUT /api/categories/{id}
   */
  async updateCategory(id: string, payload: CategoryUpdatePayload): Promise<CategoryDto> {
    const res = await httpClient.put<ApiResponse<CategoryDto>>(`/categories/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật nhóm hàng.');
  },

  /**
   * Xóa mềm một nhóm hàng trên Backend
   * Endpoint: DELETE /api/categories/{id}
   */
  async deleteCategory(id: string): Promise<void> {
    const res = await httpClient.delete<ApiResponse<any>>(`/categories/${id}`);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Không thể xóa nhóm hàng.');
    }
  },
};
