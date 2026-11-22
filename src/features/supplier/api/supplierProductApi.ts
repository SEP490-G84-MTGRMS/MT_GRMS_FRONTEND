import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  SupplierProductItem,
  AssignProductInput,
  EditSupplierProductInput,
} from '../types/supplier.types';

export interface SupplierProductFilterParams {
  searchTerm?: string;
  productSearch?: string;
  supplierSearch?: string;
  skus?: string[];
  names?: string[];
  supplierCodes?: string[];
  supplierNames?: string[];
  supplierId?: string;
  categoryFilter?: string;
  statusFilter?: string;
  pageIndex?: number;
  pageSize?: number;
  suppliers?: Array<{ id: string; code: string; name: string }>;
}

export interface BatchAssignProductItemInput {
  productId: string;
  agreedPrice: number;
  moq: number;
  allowedShortageQty?: number;
}

export interface SupplierAssignedProductInfo {
  productId: string;
  agreedPrice: number;
  moq: number;
  allowedShortageQty: number;
}

export interface BatchAssignProductInput {
  supplierId: string;
  productIds: string[];
  agreedPrice?: number;
  moq?: number;
  allowedShortageQty?: number;
  items?: BatchAssignProductItemInput[];
}

export const supplierProductApi = {
  /**
   * Lấy danh sách sản phẩm theo NCC có phân trang và bộ lọc (REQ-SP05, REQ-SP06)
   */
  async getSupplierProducts(
    supplierId: string,
    filter: SupplierProductFilterParams
  ): Promise<{ items: SupplierProductItem[]; total: number }> {
    const isSpecificSupplier = supplierId && supplierId !== 'ALL';
    const endpoint = isSpecificSupplier
      ? `/suppliers/${supplierId}/products`
      : `/suppliers/products`;

    const skus = filter.skus?.filter(Boolean) ?? [];
    const names = filter.names?.filter(Boolean) ?? [];
    const supplierCodes = filter.supplierCodes?.filter(Boolean) ?? [];
    const supplierNames = filter.supplierNames?.filter(Boolean) ?? [];
    const legacyName = filter.productSearch?.trim() || filter.searchTerm?.trim() || '';
    const legacySupplier = filter.supplierSearch?.trim() || '';

    const res = await httpClient.get<ApiResponse<PagedResult<any>>>(endpoint, {
      params: {
        SupplierId: isSpecificSupplier ? undefined : filter.supplierId !== 'ALL' ? filter.supplierId : undefined,
        SearchTerm: !names.length && legacyName ? legacyName : undefined,
        SupplierSearch: !supplierCodes.length && !supplierNames.length && legacySupplier ? legacySupplier : undefined,
        Skus: skus.length ? skus : undefined,
        Names: names.length ? names : undefined,
        SupplierCodes: supplierCodes.length ? supplierCodes : undefined,
        SupplierNames: supplierNames.length ? supplierNames : undefined,
        CategoryName:
          filter.categoryFilter && filter.categoryFilter !== 'ALL' ? filter.categoryFilter : undefined,
        Status:
          filter.statusFilter === 'Active'
            ? 1
            : filter.statusFilter === 'Inactive'
            ? 2
            : undefined,
        PageIndex: filter.pageIndex || 1,
        PageSize: filter.pageSize || 20,
      },
      paramsSerializer: (p) => {
        const search = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') return;
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item !== undefined && item !== null && String(item).trim() !== '') {
                search.append(key, String(item));
              }
            });
            return;
          }
          search.append(key, String(value));
        });
        return search.toString();
      },
    });

    if (res.data?.success && res.data.data) {
      const paged = res.data.data;
      const items: SupplierProductItem[] = paged.items.map((item: any) => ({
        id: item.id,
        supplierId: item.supplierId,
        supplierCode: item.supplierCode || '',
        supplierName: item.supplierName || '',
        productId: item.productId,
        barcode: item.barcode || '',
        sku: item.sku || '',
        name: item.productName || item.name || '',
        categoryName: item.categoryName || 'Chung',
        // Đơn vị nhập = DeliveryUoM (lúc gán/purchase); không ưu tiên BaseUoM/tồn
        deliveryUoM: item.deliveryUoM || item.baseUoM || 'Cái',
        baseUoM: item.deliveryUoM || item.baseUoM || 'Cái',
        agreedPrice: Number(item.agreedWholesalePrice ?? item.agreedPrice ?? 0) || 0,
        costPrice: item.costPrice,
        effectivePrice: item.effectivePurchasePrice ?? item.effectivePrice,
        moq: item.minimumOrderQuantity ?? item.moq ?? 1,
        allowedShortageQty: item.allowedShortageQuantity ?? item.allowedShortageQty ?? 0,
        imageUrl: item.imageUrl || undefined,
        isPrimary: Boolean(item.isPrimarySupplier ?? item.isPrimary),
        supplierProductCode: item.supplierProductCode || undefined,
        effectiveDate: item.createdAt ? item.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        status: item.status === 'Active' || item.status === 1 ? 'Active' : 'Inactive',
        masterProductStatus: item.masterProductStatus || 'Active',
        isMasterProductActive:
          item.isMasterProductActive !== false &&
          item.masterProductStatus !== 'Inactive' &&
          item.masterProductStatus !== 2,
      }));

      return { items, total: paged.totalItems };
    }

    return { items: [], total: 0 };
  },

  /**
   * Lấy danh sách Master Products từ Backend Catalog API để gán cho NCC
   */
  async getMasterProducts(): Promise<any[]> {
    // Không lọc Status=Active: SP Ngừng KD vẫn hiện trong gợi ý filter / dòng NCC–SP đã gán.
    const res = await httpClient.get<ApiResponse<PagedResult<any> | any[]>>('/products', {
      params: { PageIndex: 1, PageSize: 500 },
    });

    if (!res.data?.success || !res.data.data) {
      return [];
    }

    const raw = res.data.data;
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];

    return list.map((p: any) => {
      // ĐVT nhập = ProductUnit.IsPurchaseUnit (API: purchaseUnit), không dùng baseUnit/tồn
      const purchaseUom =
        (typeof p.purchaseUnit === 'string' && p.purchaseUnit.trim()) ||
        (typeof p.PurchaseUnit === 'string' && p.PurchaseUnit.trim()) ||
        '';
      const baseUom =
        (typeof p.baseUnit === 'string' && p.baseUnit.trim()) ||
        (typeof p.unitName === 'string' && p.unitName.trim()) ||
        'Cái';
      const deliveryUom = purchaseUom || baseUom;

      // costPrice trên Master là theo ĐVT cơ bản — không được fallback sang basePrice (= sellingPrice)
      const baseCost = Number(p.costPrice ?? 0);
      const unitPrices: any[] = Array.isArray(p.unitPrices)
        ? p.unitPrices
        : Array.isArray(p.UnitPrices)
        ? p.UnitPrices
        : [];
      const purchaseUnitRow =
        unitPrices.find((u) => Boolean(u?.isPurchaseUnit ?? u?.IsPurchaseUnit)) ||
        unitPrices.find((u) => {
          const name = String(u?.unitName || u?.UnitName || '').trim().toLowerCase();
          return name === deliveryUom.toLowerCase();
        });
      const purchaseIsBase =
        Boolean(purchaseUnitRow?.isBaseUnit ?? purchaseUnitRow?.IsBaseUnit) ||
        deliveryUom.toLowerCase() === baseUom.toLowerCase() ||
        p.isBaseUnitPurchaseUnit === true;
      const purchaseRate = purchaseIsBase
        ? 1
        : Number(purchaseUnitRow?.conversionRate ?? purchaseUnitRow?.ConversionRate ?? 1) || 1;
      const importPrice = baseCost > 0 ? baseCost * purchaseRate : 0;
      const rawStatus = String(p.status ?? p.Status ?? 'Active');
      const status =
        rawStatus === 'Inactive' || rawStatus === 'Discontinued' || rawStatus === '2'
          ? 'Inactive'
          : 'Active';

      return {
        id: p.id,
        sku: p.sku || p.productCode || '',
        barcode: p.barcode || '',
        name: p.productName || p.name || '',
        categoryName: p.categoryName || 'Chung',
        baseUoM: deliveryUom,
        defaultWholesalePrice: importPrice,
        defaultMoq: 1,
        imageUrl: p.imageUrl || (Array.isArray(p.imageUrls) ? p.imageUrls[0] : undefined) || undefined,
        status,
        isActive: status === 'Active',
      };
    });
  },

  /**
   * Gán sản phẩm mới cho Nhà cung cấp (REQ-SP01)
   */
  async assignProduct(input: AssignProductInput): Promise<any> {
    try {
      const res = await httpClient.post<ApiResponse<any>>(
        `/suppliers/${input.supplierId}/products`,
        {
          productId: input.productId,
          deliveryUoM: input.deliveryUoM,
          agreedWholesalePrice: input.agreedPrice,
          minimumOrderQuantity: input.moq,
          allowedShortageQuantity: input.allowedShortageQty ?? 0,
          isPrimarySupplier: input.isPrimary ?? false,
          supplierProductCode: input.supplierProductCode,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        throw new Error('Sản phẩm này đã được gán cho nhà cung cấp.');
      }
      throw new Error(err.response?.data?.message || err.message || 'Không thể gán sản phẩm.');
    }
  },

  /**
   * Gán hàng loạt sản phẩm cho Nhà cung cấp kèm tự động phân bổ chi nhánh
   */
  async assignBatchProducts(input: BatchAssignProductInput): Promise<{
    assignedCount: number;
    syncedBranchesCount: number;
    items: any[];
  }> {
    try {
      const res = await httpClient.post<ApiResponse<any>>(
        `/suppliers/${input.supplierId}/products/batch`,
        {
          productIds: input.productIds,
          agreedWholesalePrice: input.agreedPrice,
          minimumOrderQuantity: input.moq ?? 1,
          allowedShortageQuantity: input.allowedShortageQty ?? 0,
          items: input.items?.map((item) => ({
            productId: item.productId,
            agreedWholesalePrice: item.agreedPrice,
            minimumOrderQuantity: item.moq,
            allowedShortageQuantity: item.allowedShortageQty ?? 0,
          })),
        }
      );
      if (res.data?.success && res.data.data) {
        return res.data.data;
      }
      throw new Error(res.data?.message || 'Không thể gán sản phẩm.');
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể gán sản phẩm.');
    }
  },

  /**
   * Cập nhật giá thỏa thuận & MOQ (REQ-SP02)
   */
  async updateProduct(
    supplierId: string,
    productId: string,
    input: EditSupplierProductInput
  ): Promise<any> {
    try {
      const res = await httpClient.put<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}`,
        {
          deliveryUoM: input.deliveryUoM,
          agreedWholesalePrice: input.agreedPrice,
          minimumOrderQuantity: input.moq,
          allowedShortageQuantity: input.allowedShortageQty ?? 0,
          isPrimarySupplier: input.isPrimary ?? false,
          supplierProductCode: input.supplierProductCode,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể cập nhật sản phẩm.');
    }
  },

  /**
   * Chuyển đổi trạng thái Active / Inactive (REQ-SP03)
   */
  async toggleStatus(
    supplierId: string,
    productId: string,
    status: 'Active' | 'Inactive'
  ): Promise<any> {
    try {
      const res = await httpClient.patch<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}/status`,
        {
          status: status === 'Active' ? 1 : 2,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể đổi trạng thái sản phẩm.');
    }
  },

  /**
   * Đặt Nhà cung cấp chính (REQ-SP04)
   */
  async setPrimarySupplier(
    supplierId: string,
    productId: string,
    isPrimary: boolean
  ): Promise<any> {
    try {
      const res = await httpClient.patch<ApiResponse<any>>(
        `/suppliers/${supplierId}/products/${productId}/primary`,
        {
          isPrimarySupplier: isPrimary,
        }
      );
      if (res.data?.success) {
        return res.data.data;
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Không thể cập nhật NCC chính.');
    }
  },

  /**
   * Lấy danh sách chi nhánh đang được liên kết với nhà cung cấp
   */
  async getSupplierLinkedBranches(supplierId: string): Promise<any[]> {
    try {
      const res = await httpClient.get<ApiResponse<any[]>>(`/suppliers/${supplierId}/branches`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
    } catch {
      // ignore
    }
    return [];
  },

  /**
   * Lấy danh sách ID các sản phẩm đã được gán cho nhà cung cấp
   */
  async getSupplierAssignedProducts(supplierId: string): Promise<SupplierAssignedProductInfo[]> {
    try {
      const res = await httpClient.get<ApiResponse<PagedResult<any>>>(
        `/suppliers/${supplierId}/products`,
        {
          params: { PageIndex: 1, PageSize: 500 },
        }
      );
      if (res.data?.success && res.data.data?.items) {
        return res.data.data.items.map((x: any) => ({
          productId: String(x.productId),
          agreedPrice: Number(x.agreedWholesalePrice ?? x.agreedPrice ?? 0),
          moq: Number(x.minimumOrderQuantity ?? x.moq ?? 1),
          allowedShortageQty: Number(x.allowedShortageQuantity ?? x.allowedShortageQty ?? 0),
        }));
      }
    } catch {
      // ignore
    }
    return [];
  },

  async getSupplierAssignedProductIds(supplierId: string): Promise<string[]> {
    const assigned = await supplierProductApi.getSupplierAssignedProducts(supplierId);
    return assigned.map((x) => x.productId);
  },

  /**
   * Query params Excel — cùng bộ lọc màn hình với danh sách SP theo NCC.
   */
  buildExcelFilterParams(filter?: SupplierProductFilterParams): Record<string, unknown> {
    if (!filter) return {};
    const skus = filter.skus?.filter(Boolean) ?? [];
    const names = filter.names?.filter(Boolean) ?? [];
    const supplierCodes = filter.supplierCodes?.filter(Boolean) ?? [];
    const supplierNames = filter.supplierNames?.filter(Boolean) ?? [];
    const legacyName = filter.productSearch?.trim() || filter.searchTerm?.trim() || '';
    const legacySupplier = filter.supplierSearch?.trim() || '';

    return {
      SearchTerm: !names.length && legacyName ? legacyName : undefined,
      SupplierSearch:
        !supplierCodes.length && !supplierNames.length && legacySupplier ? legacySupplier : undefined,
      Skus: skus.length ? skus : undefined,
      Names: names.length ? names : undefined,
      SupplierCodes: supplierCodes.length ? supplierCodes : undefined,
      SupplierNames: supplierNames.length ? supplierNames : undefined,
      CategoryName:
        filter.categoryFilter && filter.categoryFilter !== 'ALL' ? filter.categoryFilter : undefined,
      Status:
        filter.statusFilter === 'Active'
          ? 1
          : filter.statusFilter === 'Inactive'
            ? 2
            : undefined,
    };
  },

  serializeExcelParams(params: Record<string, unknown>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null && String(item).trim() !== '') {
            search.append(key, String(item));
          }
        });
        return;
      }
      search.append(key, String(value));
    });
    return search.toString();
  },

  /**
   * Xuất Excel SP đã gán NCC theo bộ lọc màn hình (giá nhập sỉ + MOQ).
   */
  async exportPriceMoqExcel(
    supplierId: string,
    filter?: SupplierProductFilterParams
  ): Promise<void> {
    try {
      const params = supplierProductApi.buildExcelFilterParams(filter);
      const res = await httpClient.get(`/suppliers/${supplierId}/products/export`, {
        responseType: 'blob',
        params,
        paramsSerializer: (p) => supplierProductApi.serializeExcelParams(p as Record<string, unknown>),
      });
      const contentType = String(res.headers?.['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await (res.data as Blob).text();
        const parsed = JSON.parse(text);
        throw new Error(parsed?.message || 'Không thể xuất Excel.');
      }

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const disposition = String(res.headers?.['content-disposition'] || '');
      const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
      const fileName = match
        ? decodeURIComponent(match[1].replace(/"/g, ''))
        : `NCC_GiaNhap_MOQ_${supplierId}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          const msg =
            parsed?.detail ||
            parsed?.message ||
            parsed?.title ||
            err.message ||
            'Không thể xuất Excel.';
          if (String(parsed?.code || parsed?.errorCode || '').toUpperCase() === 'SUBSCRIPTION_REQUIRED') {
            window.dispatchEvent(
              new CustomEvent('subscription-required', {
                detail: { code: 'SUBSCRIPTION_REQUIRED', message: msg },
              })
            );
          }
          throw new Error(msg);
        } catch (inner: any) {
          if (inner?.message) throw inner;
        }
      }
      const data = err?.response?.data;
      throw new Error(
        data?.detail || data?.message || err?.message || 'Không thể xuất Excel.'
      );
    }
  },

  /**
   * Import Excel — BE validate theo bộ lọc màn hình + override giá nhập sỉ & MOQ.
   */
  async importPriceMoqExcel(
    supplierId: string,
    file: File,
    filter?: SupplierProductFilterParams
  ): Promise<SupplierProductExcelImportResult> {
    const form = new FormData();
    form.append('file', file);
    const params = supplierProductApi.buildExcelFilterParams(filter);
    const res = await httpClient.post<ApiResponse<SupplierProductExcelImportResult>>(
      `/suppliers/${supplierId}/products/import`,
      form,
      {
        params,
        // httpClient defaults to application/json. Override it for file uploads so
        // Axios can serialize FormData with the required multipart boundary.
        headers: { 'Content-Type': 'multipart/form-data' },
        paramsSerializer: (p) => supplierProductApi.serializeExcelParams(p as Record<string, unknown>),
      }
    );
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    throw new Error(res.data?.message || 'Import Excel thất bại.');
  },
};

export interface SupplierProductExcelImportRow {
  row: number;
  productId?: string;
  sku: string;
  productName: string;
  agreedWholesalePrice?: number | null;
  moq?: number | null;
  status: 'OK' | 'ERROR' | string;
  message: string;
}

export interface SupplierProductExcelImportResult {
  fileName: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  summary: {
    totalRows: number;
    successCount: number;
    failedCount: number;
  };
  rows: SupplierProductExcelImportRow[];
}
