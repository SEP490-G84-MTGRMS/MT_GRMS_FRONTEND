import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productApi } from '../api/productApi';
import { httpClient } from '../../../api/httpClient';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
  },
}));

describe('productApi.getProductsPaged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gửi đúng params mặc định (PageIndex=1, PageSize=20) và unwrap dữ liệu thành công', async () => {
    const mockBackendResponse = {
      data: {
        success: true,
        data: {
          items: [
            {
              id: 'prod-01',
              productCode: 'SP000001',
              barcode: '8938528993998',
              name: 'Nước ngọt Coca Cola 330ml',
              categoryId: 'cat-01',
              categoryName: 'Nước giải khát',
              baseUnit: 'Lon',
              sellingPrice: 10000,
              costPrice: 8000,
              minStock: 10,
              maxStock: 200,
              vatRate: 10,
              productType: 'STANDARD',
              status: 'Active',
              hasBatches: false,
              isFavorite: true,
              createdAt: '2026-10-29T10:00:00Z',
            },
          ],
          pageIndex: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    };

    (httpClient.get as any).mockResolvedValueOnce(mockBackendResponse);

    const result = await productApi.getProductsPaged();

    expect(httpClient.get).toHaveBeenCalledWith('/products', {
      params: {
        PageIndex: 1,
        PageSize: 20,
      },
    });

    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe('Nước ngọt Coca Cola 330ml');
    expect(result.totalCount).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.pageIndex).toBe(1);
  });

  it('truyền đầy đủ searchTerm, categoryId và status trong params', async () => {
    (httpClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [],
          pageIndex: 2,
          pageSize: 10,
          totalCount: 15,
          totalPages: 2,
          hasPreviousPage: true,
          hasNextPage: false,
        },
      },
    });

    const result = await productApi.getProductsPaged({
      searchTerm: 'Lavie',
      categoryId: 'cat-water',
      status: 'Active',
      pageIndex: 2,
      pageSize: 10,
    });

    expect(httpClient.get).toHaveBeenCalledWith('/products', {
      params: {
        SearchTerm: 'Lavie',
        CategoryId: 'cat-water',
        Status: 'Active',
        PageIndex: 2,
        PageSize: 10,
      },
    });

    expect(result.pageIndex).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.totalCount).toBe(15);
    expect(result.hasPreviousPage).toBe(true);
    expect(result.hasNextPage).toBe(false);
  });

  it('gửi CategoryIds khi tìm kiếm theo nhiều danh mục cùng lúc', async () => {
    (httpClient.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          items: [],
          pageIndex: 1,
          pageSize: 20,
          totalCount: 0,
        },
      },
    });

    await productApi.getProductsPaged({
      categoryIds: ['cat-01', 'cat-02'],
      pageIndex: 1,
      pageSize: 20,
    });

    expect(httpClient.get).toHaveBeenCalledWith('/products', {
      params: {
        PageIndex: 1,
        PageSize: 20,
        CategoryIds: ['cat-01', 'cat-02'],
      },
    });
  });

  it('xử lý an toàn khi API trả về rỗng hoặc lỗi', async () => {
    (httpClient.get as any).mockResolvedValueOnce({
      data: {
        success: false,
        data: null,
      },
    });

    const result = await productApi.getProductsPaged({ pageIndex: 1, pageSize: 20 });

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});

