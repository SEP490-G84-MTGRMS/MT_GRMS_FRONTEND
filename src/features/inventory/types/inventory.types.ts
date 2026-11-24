export type InventoryStockStatus = 'OK' | 'Low' | 'Out' | 'NearExpiry';

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
  /** Product GUID từ API — dùng load lô */
  productId?: string;
  sku: string;
  productName: string;
  category: InventoryCategory;
  categoryLabel: string;
  branchId: string;
  branchName: string;
  /** Mã chi nhánh (nếu API có) — dùng filter chip */
  branchCode?: string;
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
  /** RULE-01: cách ly (không bán) */
  quarantined?: number;
  /** RULE-01: giữ chỗ */
  reserved?: number;
  /** Hàng đã hết hạn (không tính vào khả dụng) */
  expiredQty?: number;
}

/** Chip filter — OR trong field, AND giữa các field (giống SP theo NCC). */
export interface InventoryFilterState {
  skus: string[];
  names: string[];
  branchCodes: string[];
  branchNames: string[];
  /** Chi nhánh đã resolve (locked employee / unique match). */
  branchId: string;
  category: string;
  location: string;
  stockStatus: '' | InventoryStockStatus;
  pageIndex: number;
  pageSize: number;
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFilterState = {
  skus: [],
  names: [],
  branchCodes: [],
  branchNames: [],
  branchId: '',
  category: '',
  location: '',
  stockStatus: '',
  pageIndex: 1,
  pageSize: 10,
};

export interface InventoryKpiSummary {
  skuCount: number;
  branchCount: number;
  totalValue: number;
  onOrderUnits: number;
  lowCount: number;
  outCount: number;
  expiryBatchCount: number;
}
