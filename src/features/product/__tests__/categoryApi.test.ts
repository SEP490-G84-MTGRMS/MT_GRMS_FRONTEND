import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryApi } from '../api/categoryApi';
import { httpClient } from '../../../api/httpClient';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

describe('categoryApi.getCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

