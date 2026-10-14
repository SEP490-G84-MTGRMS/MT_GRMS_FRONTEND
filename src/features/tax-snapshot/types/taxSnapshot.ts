/**
 * Tax Snapshot Status Lifecycle
 */
export type TaxSnapshotStatus = 'Draft' | 'Finalized' | 'Submitted' | 'Paid';

/**
 * Core Tax Snapshot Entity
 */
export interface TaxSnapshot {
  id: string;
  tenantId: string;
  year: number;
  quarter: number; // 1, 2, 3, 4
  taxableRevenue: number;
  vatRate: number; // 1.00%
  vatAmount: number;
  pitRate: number; // 0.50%
  pitAmount: number;
  totalTaxAmount: number;
  status: TaxSnapshotStatus;
  note?: string;
  ordersCount: number;
  generatedAt: string;
  submittedAt?: string;
  paidAt?: string;
}

/**
 * Breakdown of POS Orders contributing to Taxable Revenue
 */
export interface TaxOrderSummaryItem {
  orderId: string;
  orderCode: string;
  orderDate: string;
  customerName?: string;
  finalAmount: number;
  paymentMethod: string;
}

/**
 * Detailed Tax Snapshot with Associated Order Records
 */
export interface TaxSnapshotDetail extends TaxSnapshot {
  orders: TaxOrderSummaryItem[];
}

/**
 * Request payload for Preview Calculation
 */
export interface TaxPreviewRequest {
  year: number;
  quarter: number;
}

/**
 * Preview Response for Tax Calculation
 */
export interface TaxPreviewResponse {
  year: number;
  quarter: number;
  taxableRevenue: number;
  vatRate: number;
  vatAmount: number;
  pitRate: number;
  pitAmount: number;
  totalTaxAmount: number;
  ordersCount: number;
  orders: TaxOrderSummaryItem[];
  canCreate: boolean;
  warningMessage?: string;
}

/**
 * Filter Parameters for Tax Snapshots List
 */
export interface TaxSnapshotFilterParams {
  year?: number;
  quarter?: number;
  status?: TaxSnapshotStatus | 'ALL';
  keyword?: string;
}

/**
 * Summary KPIs for the Dashboard
 */
export interface TaxSnapshotKPIs {
  totalTaxableRevenueYear: number;
  totalVatAmountYear: number;
  totalPitAmountYear: number;
  totalTaxLiabilityYear: number;
  totalTaxPaidYear: number;
  remainingTaxPayable: number;
}
