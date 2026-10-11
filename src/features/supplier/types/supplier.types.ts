export type SupplierType = 'Goods' | 'Service' | 'Both';

export type SupplierCategory = 'FRESH' | 'AMBIENT' | 'FROZEN' | 'UTILITIES' | 'RENT' | 'LOGISTICS';

export type SupplierStatus = 'Active' | 'Inactive';

export interface SupplierSummary {
  id: string;
  code: string;
  name: string;
  tradeName?: string;
  supplierType: SupplierType;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  paymentTermDays: number;
  creditLimit: number;
  currentDebt: number;
  overdueDebt: number;
  rating: number;
  status: SupplierStatus;
  linkedCustomerId?: string;
  taxCode?: string;
  companyName?: string;
  invoiceAddress?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  note?: string;
  createdAt: string;
}

export interface APLedgerEntry {
  id: string;
  supplierId: string;
  transactionDate: string;
  docType: 'PurchaseInvoice' | 'ServiceInvoice' | 'PaymentVoucher' | 'ReturnAdjustment';
  docNo: string;
  description: string;
  amount: number;
  direction: 1 | -1;
  balanceAfter: number;
  createdByName: string;
  idempotencyKey?: string;
}

export interface SupplierStats {
  totalDebt: number;
  overdueDebt: number;
  dueSoon7Days: number;
  totalActive: number;
}

export interface SupplierFilterState {
  searchTerm: string;
  supplierType: string;
  category: string;
  debtStatus: string;
  ratingFilter: string;
  status: string;
  pageIndex: number;
  pageSize: number;
}

export interface CreateSupplierInput {
  code?: string;
  name: string;
  tradeName?: string;
  supplierType: SupplierType;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  paymentTermDays: number;
  creditLimit: number;
  taxCode?: string;
  companyName?: string;
  invoiceAddress?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  note?: string;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput> & { id: string };

export interface HolidayDateRange {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface SupplierDeliveryConfig {
  leadTimeDays: number;
  leadTimeUnit: 'BUSINESS_DAYS' | 'CALENDAR_DAYS';
  activeDeliveryDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  cutoffTime: string; // e.g. "14:00" or "16:00"
  allowStoreEdit: boolean;
  editWindowType: 'BEFORE_CUTOFF' | 'HOURS_BEFORE_DELIVERY' | 'HOURS_AFTER_ORDER';
  hoursBeforeDelivery?: number;
  hoursAfterOrder?: number;
  holidays: HolidayDateRange[];
}

export interface SupplierProductItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  importPrice: number;
  moq: number;
  effectiveDate: string;
  status: 'Active' | 'PendingReview' | 'Discontinued';
}

export interface PurchaseOrderItem {
  id: string;
  code: string;
  orderDate: string;
  deliveryDate?: string;
  branchName: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
}
