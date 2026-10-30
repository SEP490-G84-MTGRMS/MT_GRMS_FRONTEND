import { httpClient } from '../../../api/httpClient';
import type {
  InventoryItem,
  InventoryFilterState,
  InventoryKpiSummary,
} from '../types/inventory.types';
import { MOCK_INVENTORY_ITEMS } from '../lib/mockInventoryData';

export const inventoryApi = {
  async getStockSummary(filters: InventoryFilterState): Promise<{
    items: InventoryItem[];
    totalCount: number;
    kpiSummary: InventoryKpiSummary;
  }> {
    try {
      const params = new URLSearchParams();
      if (filters.keyword) params.append('keyword', filters.keyword);
      if (filters.branchId) params.append('branchId', filters.branchId);
      if (filters.category) params.append('category', filters.category);
      if (filters.location) params.append('locationShelf', filters.location);
      if (filters.stockStatus) params.append('status', filters.stockStatus);
      params.append('pageIndex', String(filters.pageIndex));
      params.append('pageSize', String(filters.pageSize));

      const res = await httpClient.get(`/inventory?${params.toString()}`);
      if (res.data?.data) {
        const d = res.data.data;
        const mappedItems: InventoryItem[] = (d.items || []).map((i: any) => ({
          id: i.id || `${i.sku}-${i.branchId}`,
          sku: i.sku,
          productName: i.productName,
          category: i.category as any,
          categoryLabel: i.category,
          branchId: i.branchId,
          branchName: i.branchName,
          location: i.locationShelf || 'A-01-01',
          unit: i.unit || 'Cái',
          onHand: i.physicalQty,
          committed: i.pendingReturnQty + i.expiredQty + i.damagedQty,
          available: i.availableQty,
          onOrder: i.onOrderQty,
          reorderPoint: i.minStock,
          avgCost: i.avgCost,
          totalValue: i.totalValue,
          status: i.status === 'LOW_STOCK' ? 'Low' : i.status === 'OUT_OF_STOCK' ? 'Out' : 'OK',
          batchCount: i.batchCount,
        }));

        const kpi: InventoryKpiSummary = {
          skuCount: d.kpiSummary?.totalSkus ?? mappedItems.length,
          branchCount: 2,
          totalValue: d.kpiSummary?.totalValue ?? 0,
          onOrderUnits: d.kpiSummary?.totalOnOrder ?? 0,
          lowCount: d.kpiSummary?.lowStockCount ?? 0,
          outCount: d.kpiSummary?.outOfStockCount ?? 0,
          expiryBatchCount: d.kpiSummary?.expiryWarningCount ?? 0,
        };

        return {
          items: mappedItems,
          totalCount: d.totalCount,
          kpiSummary: kpi,
        };
      }
    } catch {
      // Fallback to local mock data
    }

    let scoped = [...MOCK_INVENTORY_ITEMS];
    if (filters.branchId) scoped = scoped.filter((i) => i.branchId === filters.branchId);
    if (filters.category) scoped = scoped.filter((i) => i.category === filters.category);
    if (filters.location) scoped = scoped.filter((i) => i.location === filters.location);
    if (filters.stockStatus) scoped = scoped.filter((i) => i.status === filters.stockStatus);
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      scoped = scoped.filter(
        (i) => i.sku.toLowerCase().includes(kw) || i.productName.toLowerCase().includes(kw)
      );
    }

    const start = (filters.pageIndex - 1) * filters.pageSize;
    const paged = scoped.slice(start, start + filters.pageSize);

    return {
      items: paged,
      totalCount: scoped.length,
      kpiSummary: {
        skuCount: new Set(scoped.map((s) => s.sku)).size,
        branchCount: new Set(scoped.map((s) => s.branchId)).size,
        totalValue: scoped.reduce((sum, s) => sum + s.totalValue, 0),
        onOrderUnits: scoped.reduce((sum, s) => sum + s.onOrder, 0),
        lowCount: scoped.filter((s) => s.status === 'Low').length,
        outCount: scoped.filter((s) => s.status === 'Out').length,
        expiryBatchCount: 4,
      },
    };
  },
};
