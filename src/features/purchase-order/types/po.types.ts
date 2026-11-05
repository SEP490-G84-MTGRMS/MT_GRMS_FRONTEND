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

export interface OrderMatrixSupplierDeliveryConfig {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  isActive: boolean;
  isAssignedToBranch: boolean;
  inactiveReason?: string;
  leadTimeDays: number;
  cutoffTime: string;
  activeDeliveryDays: number[]; // 0: CN, 1: T2, ..., 6: T7
  blackoutDates: string[]; // YYYY-MM-DD
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
  orderMultiple?: number; // Bội số đặt hàng (vd: thùng 6, lốc 4)
  soh: number; // Stock on hand
  sales: number; // Sales per day
  safetyStock?: number; // Tồn kho an toàn

  // Trạng thái nghiệp vụ Active / Inactive
  isProductActive?: boolean;
  productInactiveReason?: string;
  isSupplierActive?: boolean;
  supplierInactiveReason?: string;
  isSupplierProductActive?: boolean;
  supplierProductInactiveReason?: string;
  isSupplierBranchActive?: boolean;
  supplierBranchInactiveReason?: string;
  isBranchProductActive?: boolean;
  branchProductInactiveReason?: string;
  isRowDisabled?: boolean;
  rowDisabledReason?: string;
}

export interface MatrixCellData {
  employeeQty: number; // Số lượng NV chi nhánh đề xuất
  storeQty: number | null; // Số lượng Store Owner ghi đè (null: chưa sửa; 0: chủ động hủy đặt; >0: số lượng mới)
  finalQty: number; // Số lượng chốt cuối cùng (storeQty !== null ? storeQty : employeeQty)
  suggestedQty?: number; // Số lượng hệ thống gợi ý
  isOwnerOverridden?: boolean;
  isOwnerAdjusted?: boolean;
  modifiedBy?: 'employee' | 'store_owner';
  modifiedAt?: string;
}

export type MatrixCellMap = Record<string, Record<string, MatrixCellData>>; // productId -> (dateKey -> MatrixCellData)
export type QtyMatrixMap = Record<string, Record<string, number>>; // productId -> (dateKey -> qty) - backward compatible

export type DayCutoffStatus = 'OPEN' | 'CUTOFF_DUE' | 'LOCKED' | 'PO_GENERATED' | 'SUPPLIER_OFF';

export interface OrderMatrixDayStatus {
  supplierId: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryDateStatus: 'OPEN' | 'CUTOFF_DUE' | 'LOCKED' | 'FINALIZED' | 'SUPPLIER_OFF' | string;
  cutoffDateTime?: string;
  primaryReasonCode?: string;
  poCode?: string;
  poId?: string;
}

export interface DayColInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dowName: string; // T2, T3...
  dateShort: string; // MM/DD
  isOff: boolean;
  isLocked: boolean;
  offReason?: string;
  cutoffHour?: string;
  cutoffTimeStr?: string;
  cutoffStatus: DayCutoffStatus;
  cutoffLabel?: string;
  poCode?: string;
  primaryReasonCode?: string;
}

export interface SplitPoItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  moq: number;
  employeeQty: number;
  storeQty: number | null;
  finalQty: number;
  lineTotal: number;
}

export interface SplitPoPreview {
  id: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  branchName: string;
  deliveryDate: string; // YYYY-MM-DD
  dowName: string;
  dateShort: string;
  cutoffStatus: DayCutoffStatus;
  isCutoffDue: boolean;
  items: SplitPoItem[];
  totalQuantity: number;
  totalAmount: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'PENDING_CREDIT_APPROVAL';
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
  status: 'APPROVED' | 'PENDING_APPROVAL' | string;
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
  productId: string;
  deliveryDate: string; // yyyy-MM-dd
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
  linkedBranchCount?: number;
  branchesWithQty?: number;
  skuCount?: number;
  totalQty?: number;
  totalAmount?: number;
  branches?: DispatchSupplierBranchSummary[];
}

export interface DispatchSupplierBranchSummary {
  branchId: string;
  branchCode: string;
  branchName: string;
  skuCount: number;
  totalQty: number;
  totalAmount: number;
  status: 'draft' | 'dispatched' | 'mixed' | string;
}

export interface DispatchSupplierDetailLine {
  id: string;
  productId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  qty: number;
  deliveryDate: string;
  cutoffSchedule: string;
  dayStatus: string;
}

export interface DispatchSupplierDetailBranch {
  branchId: string;
  branchCode: string;
  branchName: string;
  status: string;
  items: DispatchSupplierDetailLine[];
}

export interface DispatchSupplierDetail {
  supplierId: string;
  code: string;
  name: string;
  email?: string;
  serverNow: string;
  viewFrom: string;
  durationDays: number;
  cutoffTimeStr: string;
  countdownDisplay: string;
  remainingMinutes?: number;
  urgency: CutoffUrgency;
  status: 'draft' | 'dispatched' | string;
  branches: DispatchSupplierDetailBranch[];
}

export type DispatchScope = 'NEAREST' | 'WEEK' | 'ALL';
export type EmailSendMode = 'SEND_NOW' | 'SCHEDULED_SEND';

export interface SupplierDispatchPackage {
  id: string;
  dispatchBatchId: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  emailTo: string;
  emailCc: string[];
  emailSendMode: EmailSendMode | string;
  scheduledSendAtUtc?: string;
  emailStatus: string;
  generationStatus: string;
  fileName?: string;
  fileSize?: number;
  attemptCount: number;
  lastError?: string;
  generatedAtUtc?: string;
  sentAtUtc?: string;
  createdAt: string;
  purchaseOrderCount: number;
  purchaseOrderCodes: string[];
  canDownload: boolean;
  canCancelSchedule: boolean;
  canRetryGeneration: boolean;
  canRetryEmail: boolean;
}

export interface DispatchEmailOptions {
  emailSendMode: EmailSendMode;
  scheduledSendAt?: string;
  ccEmails: string[];
}

export interface SplitGroupLine {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  hasMissingPrice: boolean;
}

export interface SplitGroupResult {
  branchId?: string;
  branchName?: string;
  supplierId: string;
  supplierName: string;
  supplierCode?: string;
  deliveryDate: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ALREADY_FINALIZED';
  purchaseOrderId?: string;
  purchaseOrderCode?: string;
  errorCode?: string;
  errorMessage?: string;
  validLineCount?: number;
  invalidLineCount?: number;
  totalQuantity?: number;
  totalAmount?: number;
  hasMissingPrice?: boolean;
  lines?: SplitGroupLine[];
  warnings?: string[];
}

export interface SplitMatrixBatchResult {
  branchId: string;
  scope?: DispatchScope;
  serverNow?: string;
  totalGroups: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  alreadyFinalizedCount: number;
  results: SplitGroupResult[];
  createdPurchaseOrders: GeneratedPO[];
  dispatchPackage?: SupplierDispatchPackage | null;
}
