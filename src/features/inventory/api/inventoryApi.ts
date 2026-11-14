import { httpClient } from '../../../api/httpClient';
import type {
  InventoryItem,
  InventoryFilterState,
  InventoryKpiSummary,
} from '../types/inventory.types';

const mapStatus = (status: string | undefined): InventoryItem['status'] => {
  if (status === 'LOW_STOCK') return 'Low';
  if (status === 'OUT_OF_STOCK') return 'Out';
  return 'OK';
};

export type InventoryBatchRow = {
  id: string;
  batchCode: string;
  mfgDate: string | null;
  expiryDate: string | null;
  daysLeft: number;
  availableQty: number;
  status: string;
};

export const inventoryApi = {
  async getProductBatches(productId: string, branchId: string): Promise<InventoryBatchRow[]> {
    const res = await httpClient.get(`/inventory/${productId}/batches`, {
      params: { branchId },
    });
    const rows = res.data?.data;
    if (!Array.isArray(rows)) {
      throw new Error(res.data?.message || 'Không tải được danh sách lô.');
    }
    return rows.map((b: any) => ({
      id: String(b.batchId ?? b.id ?? ''),
      batchCode: b.batchCode || '—',
      mfgDate: b.mfgDate ?? null,
      expiryDate: b.expiryDate ?? null,
      daysLeft: Number(b.daysLeft ?? 0),
      availableQty: Number(b.availableQty ?? 0),
      status: b.status || 'Normal',
    }));
  },

  async getStockSummary(filters: InventoryFilterState): Promise<{
    items: InventoryItem[];
    totalCount: number;
    kpiSummary: InventoryKpiSummary;
  }> {
    const params = new URLSearchParams();
    const keyword = [filters.keyword, filters.sku, filters.productName].filter(Boolean).join(' ').trim();
    if (keyword) params.append('keyword', keyword);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.category) params.append('category', filters.category);
    if (filters.location) params.append('locationShelf', filters.location);
    if (filters.stockStatus) {
      const apiStatus =
        filters.stockStatus === 'Low'
          ? 'LOW_STOCK'
          : filters.stockStatus === 'Out'
            ? 'OUT_OF_STOCK'
            : 'OK';
      params.append('status', apiStatus);
    }
    params.append('pageIndex', String(filters.pageIndex));
    params.append('pageSize', String(filters.pageSize));

    const res = await httpClient.get(`/inventory?${params.toString()}`);
    const d = res.data?.data;
    if (!d) {
      throw new Error(res.data?.message || 'Không tải được tồn kho từ máy chủ.');
    }

    const mappedItems: InventoryItem[] = (d.items || []).map((i: any) => {
      const quarantined = Number(i.quarantinedQty ?? 0);
      const reserved = Number(i.reservedQty ?? 0);
      return {
        id: i.productId || i.id || `${i.sku}-${i.branchId}`,
        productId: i.productId,
        sku: i.sku,
        productName: i.productName,
        category: (i.categoryName || i.category || 'Chung') as any,
        categoryLabel: i.categoryName || i.category || 'Chung',
        branchId: i.branchId,
        branchName: i.branchName,
        location: i.locationShelf || '—',
        unit: i.unit || 'Cái',
        onHand: Number(i.physicalQty ?? 0),
        committed: reserved + quarantined,
        available: Number(i.availableQty ?? 0),
        onOrder: Number(i.onOrderQty ?? 0),
        reorderPoint: Number(i.minStock ?? 0),
        avgCost: Number(i.avgCost ?? 0),
        totalValue: Number(i.totalValue ?? 0),
        status: mapStatus(i.status),
        batchCount: Number(i.batchCount ?? i.batches?.length ?? 0),
        quarantined,
        reserved,
      };
    });

    const uniqueBranches = new Set(mappedItems.map((x) => x.branchId));
    const kpi: InventoryKpiSummary = {
      skuCount: d.kpiSummary?.totalSkus ?? mappedItems.length,
      branchCount: uniqueBranches.size || (filters.branchId ? 1 : 0),
      totalValue: d.kpiSummary?.totalValue ?? 0,
      onOrderUnits: d.kpiSummary?.totalOnOrder ?? 0,
      lowCount: d.kpiSummary?.lowStockCount ?? 0,
      outCount: d.kpiSummary?.outOfStockCount ?? 0,
      expiryBatchCount: d.kpiSummary?.expiryWarningCount ?? 0,
    };

    return {
      items: mappedItems,
      totalCount: d.totalCount ?? mappedItems.length,
      kpiSummary: kpi,
    };
  },
};
