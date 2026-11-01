import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryApi } from '../api/categoryApi';
import { httpClient } from '../../../api/httpClient';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('categoryApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCategories', () => {
    it('gọi GET /categories và trả về danh sách CategoryDto thành công', async () => {
      const mockCategories = [
        {
          id: 'cat-01',
          categoryCode: 'CAT-001',
          name: 'Đồ uống',
          description: 'Các loại nước ngọt, bia, sữa',
          displayOrder: 1,
          productCount: 12,
        },
        {
          id: 'cat-02',
          categoryCode: 'CAT-002',
          name: 'Bánh kẹo',
          description: 'Bánh ngọt, kẹo socola',
          displayOrder: 2,
          productCount: 5,
        },
      ];

      (httpClient.get as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockCategories,
        },
      });

      const result = await categoryApi.getCategories();

      expect(httpClient.get).toHaveBeenCalledWith('/categories');
      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Đồ uống');
      expect(result[1].categoryCode).toBe('CAT-002');
    });

    it('xử lý an toàn khi API trả về lỗi hoặc data không phải mảng', async () => {
      (httpClient.get as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await categoryApi.getCategories();

      expect(result).toEqual([]);
    });
  });

  describe('createCategory', () => {
    it('gọi POST /categories và trả về CategoryDto mới tạo', async () => {
      const payload = {
        name: 'Rau củ quả sạch',
        code: 'VEG',
        description: 'Rau củ quả tươi sạch tiêu chuẩn VietGAP',
      };

      const mockCreated = {
        id: 'cat-new-01',
        categoryCode: 'VEG',
        name: 'Rau củ quả sạch',
        description: 'Rau củ quả tươi sạch tiêu chuẩn VietGAP',
        displayOrder: 0,
        productCount: 0,
      };

      (httpClient.post as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockCreated,
          message: 'Tạo nhóm hàng thành công.',
        },
      });

      const result = await categoryApi.createCategory(payload);

      expect(httpClient.post).toHaveBeenCalledWith('/categories', payload);
      expect(result.id).toBe('cat-new-01');
      expect(result.name).toBe('Rau củ quả sạch');
    });
  });

  describe('updateCategory', () => {
    it('gọi PUT /categories/:id và cập nhật thành công', async () => {
      const payload = {
        name: 'Rau Củ Tươi',
        description: 'Đã cập nhật',
      };

      (httpClient.put as any).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'cat-01',
            categoryCode: 'CAT-01',
            name: 'Rau Củ Tươi',
            description: 'Đã cập nhật',
            displayOrder: 0,
            productCount: 5,
          },
        },
      });

      const result = await categoryApi.updateCategory('cat-01', payload);

      expect(httpClient.put).toHaveBeenCalledWith('/categories/cat-01', payload);
      expect(result.name).toBe('Rau Củ Tươi');
    });
  });

  describe('deleteCategory', () => {
    it('ném lỗi khi cập nhật thất bại', async () => {
      (httpClient.put as any).mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Tên nhóm hàng đã tồn tại.',
        },
      });

      await expect(
        categoryApi.updateCategory('cat-01', { name: 'Trùng tên' })
      ).rejects.toThrow('Tên nhóm hàng đã tồn tại.');
    });
  });

  describe('deleteCategory', () => {
    it('gọi DELETE /categories/:id thành công', async () => {
      (httpClient.delete as any).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Xóa nhóm hàng thành công.',
        },
      });

      await expect(categoryApi.deleteCategory('cat-01')).resolves.not.toThrow();
      expect(httpClient.delete).toHaveBeenCalledWith('/categories/cat-01');
    });

    it('ném lỗi khi xóa nhóm hàng thất bại (ví dụ còn sản phẩm liên kết)', async () => {
      (httpClient.delete as any).mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Không thể xóa nhóm hàng vì đang chứa sản phẩm liên kết.',
        },
      });

      await expect(categoryApi.deleteCategory('cat-01')).rejects.toThrow(
        'Không thể xóa nhóm hàng vì đang chứa sản phẩm liên kết.'
      );
    });
  });
});
