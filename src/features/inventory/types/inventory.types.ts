export type InventoryStockStatus = 'OK' | 'Low' | 'Out';

export type InventoryCategory =
  | 'Dairy'
  | 'Beverage'
  | 'Fresh'
  | 'Frozen'
  | 'RTE'
  | 'Snack'
  | 'Personal Care';

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category: InventoryCategory;
  categoryLabel: string;
  branchId: string;
  branchName: string;
  location: string;
  unit: string;
  onHand: number;
  committed: number;
  available: number;
  onOrder: number;
  reorderPoint: number;
  avgCost: number;
  totalValue: number;
  status: InventoryStockStatus;
  batchCount: number;
}

export interface InventoryFilterState {
  keyword: string;
  branchId: string;
  category: string;
  location: string;
  stockStatus: '' | InventoryStockStatus;
  pageIndex: number;
  pageSize: number;
}

export interface InventoryKpiSummary {
  skuCount: number;
  branchCount: number;
  totalValue: number;
  onOrderUnits: number;
  lowCount: number;
  outCount: number;
  expiryBatchCount: number;
}
