import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../api/httpClient';
import { supplierProductApi } from '../api/supplierProductApi';

vi.mock('../../../api/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('supplier product search and filter contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends every active screen filter to the list API', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({
      data: { success: true, data: { items: [], totalItems: 0 } },
    });

    await supplierProductApi.getSupplierProducts('supplier-1', {
      supplierId: 'supplier-1',
      skus: [' SKU-01 ', 'SKU-02'],
      names: ['Sữa'],
      supplierCodes: ['NCC-01'],
      supplierNames: ['Nhà cung cấp A'],
      categoryFilter: 'Đồ uống',
      statusFilter: 'Inactive',
      pageIndex: 3,
      pageSize: 36,
    });

    expect(httpClient.get).toHaveBeenCalledWith(
      '/suppliers/supplier-1/products',
      expect.objectContaining({
        params: expect.objectContaining({
          Skus: [' SKU-01 ', 'SKU-02'],
          Names: ['Sữa'],
          SupplierCodes: ['NCC-01'],
          SupplierNames: ['Nhà cung cấp A'],
          CategoryName: 'Đồ uống',
          Status: 2,
          PageIndex: 3,
          PageSize: 36,
        }),
      })
    );
  });

  it('maps Master fallback price returned by the API to effectivePrice', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          totalItems: 1,
          items: [{
            id: 'sp-1', supplierId: 'supplier-1', productId: 'product-1',
            sku: 'SKU-01', productName: 'Sản phẩm', deliveryUoM: 'Thùng',
            agreedWholesalePrice: null, effectivePurchasePrice: 32_000,
            minimumOrderQuantity: 1, status: 1,
          }],
        },
      },
    });

    const result = await supplierProductApi.getSupplierProducts('supplier-1', {
      supplierId: 'supplier-1', categoryFilter: 'ALL', statusFilter: 'ALL',
    });

    expect(result.items[0].agreedPrice).toBe(0);
    expect(result.items[0].effectivePrice).toBe(32_000);
  });

  it('builds the same filters for Excel and serializes array values individually', () => {
    const params = supplierProductApi.buildExcelFilterParams({
      supplierId: 'supplier-1',
      skus: ['SKU-01', 'SKU-02'],
      names: ['Sữa'],
      supplierCodes: ['NCC-01'],
      supplierNames: ['Nhà cung cấp A'],
      categoryFilter: 'Đồ uống',
      statusFilter: 'Active',
    });

    expect(params).toEqual({
      SearchTerm: undefined,
      SupplierSearch: undefined,
      Skus: ['SKU-01', 'SKU-02'],
      Names: ['Sữa'],
      SupplierCodes: ['NCC-01'],
      SupplierNames: ['Nhà cung cấp A'],
      CategoryName: 'Đồ uống',
      Status: 1,
    });

    const query = supplierProductApi.serializeExcelParams(params);
    const parsed = new URLSearchParams(query);
    expect(parsed.getAll('Skus')).toEqual(['SKU-01', 'SKU-02']);
    expect(parsed.get('Names')).toBe('Sữa');
    expect(parsed.get('CategoryName')).toBe('Đồ uống');
    expect(parsed.get('Status')).toBe('1');
  });

  it('falls back to legacy free-text search only when token filters are empty', () => {
    expect(supplierProductApi.buildExcelFilterParams({
      supplierId: 'supplier-1', categoryFilter: 'ALL', statusFilter: 'ALL',
      productSearch: 'sữa tươi', supplierSearch: 'NCC A',
    })).toEqual(expect.objectContaining({
      SearchTerm: 'sữa tươi',
      SupplierSearch: 'NCC A',
    }));

    expect(supplierProductApi.buildExcelFilterParams({
      supplierId: 'supplier-1', categoryFilter: 'ALL', statusFilter: 'ALL',
      names: ['Sữa'], productSearch: 'legacy',
      supplierCodes: ['NCC-01'], supplierSearch: 'legacy supplier',
    })).toEqual(expect.objectContaining({
      SearchTerm: undefined,
      SupplierSearch: undefined,
    }));
  });

  it('uploads an imported Excel file as multipart/form-data', async () => {
    vi.mocked(httpClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          summary: { totalRows: 1, successCount: 1, failedCount: 0 },
          rows: [],
        },
      },
    });
    const file = new File(['excel-content'], 'supplier-products.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await supplierProductApi.importPriceMoqExcel('supplier-1', file);

    expect(httpClient.post).toHaveBeenCalledWith(
      '/suppliers/supplier-1/products/import',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    const uploadedForm = vi.mocked(httpClient.post).mock.calls[0][1] as FormData;
    expect(uploadedForm.get('file')).toBe(file);
  });
});
