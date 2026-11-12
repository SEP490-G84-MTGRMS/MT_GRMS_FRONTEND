import { httpClient } from '../../../api/httpClient';

// DTO khớp với backend InventoryBatchSummaryDto
export interface InventoryBatchDto {
  batchId: string;
  batchCode: string;
  mfgDate: string | null;
  expiryDate: string | null;
  daysLeft: number | null;
  quantityOnHand: number;
  reservedQty: number;
  availableQty: number;
  status: string; // Expired, Critical, Warning, NoExpiry, Normal
}

// DTO khớp với backend InventoryStockItemDto
export interface InventoryStockItemDto {
  productId: string;
  sku: string;
  barcode: string;
  productName: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  unit: string;
  physicalQty: number;
  availableQty: number;
  pendingReturnQty: number;
  expiredQty: number;
  damagedQty: number;
  minStock: number;
  avgCost: number;
  totalValue: number;
  status: string;
  batches: InventoryBatchDto[];
}

export interface InventoryKpiDto {
  totalSkus: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiryWarningCount: number;
}

export interface InventoryPagedResult {
  items: InventoryStockItemDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  kpiSummary: InventoryKpiDto;
}

export const posInventoryApi = {
  /**
   * Lấy danh sách tồn kho tổng hợp (theo chi nhánh hoặc toàn chuỗi khi bỏ branchId)
   * GET /api/inventory
   */
  getInventorySummary: async (
    params: { branchId?: string; keyword?: string; pageSize?: number } = {},
    signal?: AbortSignal,
  ): Promise<InventoryPagedResult | null> => {
    try {
      const res = await httpClient.get('/inventory', {
        params: {
          ...(params.branchId ? { BranchId: params.branchId } : {}),
          ...(params.keyword ? { Keyword: params.keyword } : {}),
          PageSize: params.pageSize ?? 100,
        },
        signal,
      });
      return res.data?.data ?? res.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết các lô hàng FEFO của một sản phẩm tại chi nhánh
   * GET /api/inventory/{productId}/batches?branchId=xxx
   */
  getProductBatches: async (
    productId: string,
    branchId: string,
    signal?: AbortSignal,
  ): Promise<InventoryBatchDto[]> => {
    const res = await httpClient.get(`/inventory/${productId}/batches`, {
      params: { branchId },
      signal,
    });
    const data = res.data?.data ?? res.data;
    if (!Array.isArray(data)) {
      throw new Error('Dữ liệu lô hàng không hợp lệ.');
    }
    return data;
  },
};
