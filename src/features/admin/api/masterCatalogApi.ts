import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  MasterProductItem,
  MasterProductDetail,
  MasterCatalogKpis,
  MasterCatalogFilterParams,
  CreateMasterProductInput,
  UpdateMasterProductInput,
  MasterProductExcelImportResult,
  MasterProductSuggestion,
} from '../types/masterCatalog.types';

export const masterCatalogApi = {
  /**
   * Lấy danh sách hàng mẫu toàn cầu có phân trang và bộ lọc
   */
  async getMasterProducts(params?: MasterCatalogFilterParams): Promise<PagedResult<MasterProductItem>> {
    const res = await httpClient.get<ApiResponse<PagedResult<MasterProductItem>>>('/admin/master-catalog', {
      params: {
        keyword: params?.keyword || undefined,
        brand: params?.brand || undefined,
        categoryName: params?.categoryName || undefined,
        pageIndex: params?.pageIndex || 1,
        pageSize: params?.pageSize || 15,
      },
    });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return {
      items: [],
      page: 1,
      pageSize: 15,
      totalItems: 0,
    };
  },

  /**
   * Lấy 4 chỉ số KPI tổng quan
   */
  async getKpis(): Promise<MasterCatalogKpis> {
    const res = await httpClient.get<ApiResponse<MasterCatalogKpis>>('/admin/master-catalog/kpis');
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return {
      totalProducts: 0,
      totalBrands: 0,
      totalUsage: 0,
      imageCoveragePercent: 0,
    };
  },

  /**
   * Lấy danh sách thương hiệu
   */
  async getBrands(): Promise<string[]> {
    const res = await httpClient.get<ApiResponse<string[]>>('/admin/master-catalog/brands');
    return res.data?.data || [];
  },

  /**
   * Lấy danh sách ngành hàng
   */
  async getCategories(): Promise<string[]> {
    const res = await httpClient.get<ApiResponse<string[]>>('/admin/master-catalog/categories');
    return res.data?.data || [];
  },

  /**
   * Xem chi tiết 1 sản phẩm mẫu
   */
  async getById(id: string): Promise<MasterProductDetail> {
    const res = await httpClient.get<ApiResponse<MasterProductDetail>>(`/admin/master-catalog/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không tìm thấy sản phẩm mẫu.');
  },

  /**
   * Tạo mới sản phẩm mẫu
   */
  async create(payload: CreateMasterProductInput): Promise<MasterProductDetail> {
    const res = await httpClient.post<ApiResponse<MasterProductDetail>>('/admin/master-catalog', payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể tạo sản phẩm mẫu.');
  },

  /**
   * Cập nhật sản phẩm mẫu
   */
  async update(id: string, payload: UpdateMasterProductInput): Promise<MasterProductDetail> {
    const res = await httpClient.put<ApiResponse<MasterProductDetail>>(`/admin/master-catalog/${id}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Không thể cập nhật sản phẩm mẫu.');
  },

  /**
   * Xóa mềm sản phẩm mẫu
   */
  async delete(id: string): Promise<boolean> {
    const res = await httpClient.delete<ApiResponse<boolean>>(`/admin/master-catalog/${id}`);
    return Boolean(res.data?.success);
  },

  /**
   * Tải tệp Excel template chuẩn hóa
   */
  async downloadTemplate(): Promise<void> {
    const res = await httpClient.get('/admin/master-catalog/export-template', {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Master_Catalog_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Import danh mục từ file Excel
   */
  async importExcel(file: File, upsert: boolean = true): Promise<MasterProductExcelImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await httpClient.post<ApiResponse<MasterProductExcelImportResult>>(
      `/admin/master-catalog/import-excel?upsert=${upsert}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Import Excel thất bại.');
  },

  /**
   * Tenant Lookup barcode từ Master Catalog
   */
  async lookupByBarcode(barcode: string): Promise<MasterProductSuggestion | null> {
    if (!barcode || barcode.trim().length === 0) return null;
    const res = await httpClient.get<ApiResponse<MasterProductSuggestion | null>>('/products/lookup-master', {
      params: { barcode: barcode.trim() },
    });
    return res.data?.data || null;
  },
};
