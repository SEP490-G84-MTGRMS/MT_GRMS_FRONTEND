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
