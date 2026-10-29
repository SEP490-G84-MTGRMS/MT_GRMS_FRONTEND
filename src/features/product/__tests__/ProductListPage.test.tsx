import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProductListPage } from '../pages/ProductListPage';
import { productApi } from '../api/productApi';
import { categoryApi } from '../api/categoryApi';

vi.mock('../api/productApi', () => ({
  productApi: {
    getProductsPaged: vi.fn(),
  },
}));

vi.mock('../api/categoryApi', () => ({
  categoryApi: {
    getCategories: vi.fn(),
  },
}));

describe('ProductListPage - Task T3 Server-side Table & Pagination Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('render thành công tiêu đề và gọi API lấy danh sách trang đầu tiên', async () => {
    (categoryApi.getCategories as any).mockResolvedValueOnce([
      {
        id: 'cat-1',
        categoryCode: 'CAT-01',
        name: 'Nước uống',
        productCount: 1,
      },
    ]);

    (productApi.getProductsPaged as any).mockResolvedValueOnce({
      items: [
        {
          id: 'p-1',
          productCode: 'SP000001',
          barcode: '8930000000001',
          name: 'Nước suối Aquafina 500ml',
          categoryId: 'cat-1',
          categoryName: 'Nước uống',
          baseUnit: 'Chai',
          sellingPrice: 5000,
          costPrice: 3500,
          minStock: 10,
          maxStock: 100,
          vatRate: 0,
          productType: 'STANDARD',
          status: 'Active',
          hasBatches: false,
          isFavorite: false,
          createdAt: '2026-10-30T00:00:00Z',
        },
      ],
      pageIndex: 1,
      pageSize: 20,
      totalCount: 45,
      totalPages: 3,
      hasPreviousPage: false,
      hasNextPage: true,
    });

    render(<ProductListPage />);

    // Kiểm tra header
    expect(screen.getByRole('heading', { level: 1, name: 'Hàng hóa' })).toBeDefined();

    // Chờ API hoàn thành và hiển thị trên bảng
    await waitFor(() => {
      expect(productApi.getProductsPaged).toHaveBeenCalledWith(
        expect.objectContaining({
          pageIndex: 1,
          pageSize: 20,
        })
      );
    });

    // Kiểm tra TablePagination component được hiển thị
    expect(screen.getByText(/Hiển thị/)).toBeDefined();
    expect(screen.getAllByText(/hàng hóa/).length).toBeGreaterThan(0);
  });
});
