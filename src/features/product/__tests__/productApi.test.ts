import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productApi } from '../api/productApi';
import { httpClient } from '../../../api/httpClient';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

  it('tự động lấy bù đủ 15 sản phẩm khi trang 1 trả về 10 sản phẩm do lệch danh mục tenant', async () => {
    const tenItems = Array.from({ length: 10 }, (_, idx) => ({
      id: `prod-${idx + 1}`,
      productCode: `SP00${idx + 1}`,
      name: `Sản phẩm ${idx + 1}`,
      categoryId: 'cat-01',
      baseUnit: 'Cái',
      sellingPrice: 10000,
      status: 'Active' as const,
      hasBatches: false,
      isFavorite: false,
      createdAt: '2026-11-10T10:00:00Z',
    }));

    const fifteenItems = Array.from({ length: 15 }, (_, idx) => ({
      id: `prod-${idx + 1}`,
      productCode: `SP00${idx + 1}`,
      name: `Sản phẩm ${idx + 1}`,
      categoryId: 'cat-01',
      baseUnit: 'Cái',
      sellingPrice: 10000,
      status: 'Active' as const,
      hasBatches: false,
      isFavorite: false,
      createdAt: '2026-11-10T10:00:00Z',
    }));

    (httpClient.get as any)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            items: tenItems,
            page: 1,
            pageSize: 15,
            totalItems: 139,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            items: fifteenItems,
            page: 1,
            pageSize: 20,
            totalItems: 139,
          },
        },
      });

    const result = await productApi.getProductsPaged({ pageIndex: 1, pageSize: 15 });

    expect(result.items).toHaveLength(15);
    expect(result.pageSize).toBe(15);
    expect(result.totalCount).toBe(134);
  });
});

describe('productApi.createProduct & createProductUnit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gọi POST /products để tạo sản phẩm mới thành công', async () => {
    const mockCreated = {
      id: 'prod-new-1',
      productCode: 'SP000001',
      name: 'Bánh gạo One One',
      categoryId: 'cat-01',
      categoryName: 'Bánh kẹo',
      baseUnit: 'Gói',
      sellingPrice: 25000,
      costPrice: 18000,
      minStock: 5,
      maxStock: 100,
      vatRate: 8,
      status: 'Active',
      hasBatches: false,
      isFavorite: false,
      createdAt: '2026-10-31T12:00:00Z',
    };

    (httpClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockCreated,
      },
    });

    const result = await productApi.createProduct({
      name: 'Bánh gạo One One',
      categoryId: 'cat-01',
      sellingPrice: 25000,
      baseUnit: 'Gói',
      costPrice: 18000,
    });

    expect(httpClient.post).toHaveBeenCalledWith('/products', {
      name: 'Bánh gạo One One',
      categoryId: 'cat-01',
      sellingPrice: 25000,
      baseUnit: 'Gói',
      costPrice: 18000,
    });
    expect(result.id).toBe('prod-new-1');
    expect(result.productCode).toBe('SP000001');
  });

  it('gọi POST /products/{productId}/units để tạo đơn vị quy đổi thành công', async () => {
    const mockCreatedUnit = {
      id: 'unit-1',
      productId: 'prod-new-1',
      unitName: 'Thùng 20 gói',
      conversionRate: 20,
      price: 480000,
      barcode: '89300000020',
      isBaseUnit: false,
      createdAt: '2026-10-31T12:00:00Z',
    };

    (httpClient.post as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockCreatedUnit,
      },
    });

    const result = await productApi.createProductUnit('prod-new-1', {
      unitName: 'Thùng 20 gói',
      conversionRate: 20,
      price: 480000,
      barcode: '89300000020',
      isBaseUnit: false,
    });

    expect(httpClient.post).toHaveBeenCalledWith('/products/prod-new-1/units', {
      unitName: 'Thùng 20 gói',
      conversionRate: 20,
      price: 480000,
      barcode: '89300000020',
      isBaseUnit: false,
    });
    expect(result.id).toBe('unit-1');
    expect(result.conversionRate).toBe(20);
  });

  it('gọi PUT /product-units/{id} để cập nhật đơn vị tính quy đổi thành công (REQ-09)', async () => {
    const mockUpdatedUnit = {
      id: 'unit-guid-1',
      productId: 'prod-1',
      unitName: 'Thùng 24 lon',
      conversionRate: 24,
      price: 240000,
      barcode: '89300000099',
      isBaseUnit: false,
      createdAt: '2026-10-31T12:00:00Z',
    };

    (httpClient.put as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockUpdatedUnit,
      },
    });

    const result = await productApi.updateProductUnit('unit-guid-1', {
      unitName: 'Thùng 24 lon',
      conversionRate: 24,
      price: 240000,
      barcode: '89300000099',
      isBaseUnit: false,
    });

    expect(httpClient.put).toHaveBeenCalledWith('/product-units/unit-guid-1', {
      unitName: 'Thùng 24 lon',
      conversionRate: 24,
      price: 240000,
      barcode: '89300000099',
      isBaseUnit: false,
    });
    expect(result.unitName).toBe('Thùng 24 lon');
    expect(result.price).toBe(240000);
  });
});

