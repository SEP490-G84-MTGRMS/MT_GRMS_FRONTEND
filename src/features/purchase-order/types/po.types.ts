export interface SupplierDeliveryConfig {
  supplierId: string;
  leadDays: number;
  cutoffHour: string;
  lockHour: string;
  activeDeliveryDays: number[]; // 0: CN, 1: T2, ..., 6: T7
  holidays: string[]; // YYYY-MM-DD
  deliveryNote?: string;
}

export interface StoreOption {
  id: string;
  code: string;
  name: string;
}

export interface BranchOption {
  id: string;
  code: string;
  name: string;
}

export interface SupplierOption {
  id: string;
  code: string;
  name: string;
  creditLimit: number;
  openAp: number;
  config: SupplierDeliveryConfig;
}

export interface OrderMatrixProduct {
  id: string;
  supplierId: string;
  supplierName?: string;
  category: 'Fresh' | 'Meat' | 'Dairy' | 'Snack' | string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  moq: number;
  soh: number; // Stock on hand
  sales: number; // Sales per day
}

export type QtyMatrixMap = Record<string, Record<string, number>>; // productId -> (dateKey -> qty)

export interface DayColInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dowName: string; // T2, T3...
  dateShort: string; // MM/DD
  isOff: boolean;
  isLocked: boolean;
}

export interface MatrixCalculationResult {
  keys: string[];
  grandQty: number;
  grandAmt: number;
  dayQty: number[];
  dayAmt: number[];
  moqFails: string[];
  totalAp: number;
  creditExceed: boolean;
}

export interface GeneratedPO {
  id: string;
  orderCode: string;
  supplierId: string;
  branchId: string;
  deliveryDate: string;
  totalQuantity: number;
  totalAmount: number;
  status: 'APPROVED' | 'PENDING_APPROVAL';
  itemCount: number;
}

export type BranchInventoryStatus = 'stable' | 'need_replenish' | 'no_data';

export interface BranchListItem {
  id: string;
  code: string;
  name: string;
  address: string;
  managerName: string;
  managerPhone: string;
  managerEmail?: string;
  stockQty: number; // Số lượng tồn kho thực tế
  orderQty: number; // Số lượng đặt hàng hiện tại của chi nhánh
  inventoryStatus?: BranchInventoryStatus;
  inventoryNote?: string;
  orderSummary: string;
  draftCount: number;
  pendingCount: number;
  status: 'active' | 'inactive';
  lastUpdated: string;
  region?: string;
}

export interface BranchFilterState {
  keyword: string;
  branchCode: string;
  status: 'all' | 'active' | 'inactive';
  dateFrom: string;
  dateTo: string;
  pageIndex: number;
  pageSize: number;
}

/* ─── Supplier Order Dispatch & Cutoff Hub Types ─── */
export type CutoffUrgency = 'critical' | 'today' | 'later' | 'completed';

export interface DispatchItemSku {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  qty: number;
  cutoffSchedule: string;
  groupType?: 'daily' | 'weekly';
}

export interface SupplierDispatchGroup {
  id: string;
  code: string;
  name: string;
  categoryTags: string[];
  cutoffTimeStr: string;
  countdownDisplay: string;
  remainingMinutes?: number;
  urgency: CutoffUrgency;
  expectedDelivery: string;
  minOrderValue: number;
  items: DispatchItemSku[];
  note: string;
  status: 'draft' | 'dispatched';
  poCode?: string;
  dispatchedAt?: string;
}
