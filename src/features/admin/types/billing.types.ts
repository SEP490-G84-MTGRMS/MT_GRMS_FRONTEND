export type BillingType = 'PURCHASE_PLAN' | 'TOPUP' | 'PURCHASE_ADDON' | 'REFUND';
export type BillingStatus = 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED';
export type PaymentChannel = 'VietQR' | 'WALLET' | 'BANK_TRANSFER' | 'CREDIT_CARD';

export interface BillingTransaction {
  id: string;
  transactionCode: string; // e.g. WAL-20261115-8931, SUB-20261110-4421, ADD-20261108-1120
  invoiceCode: string; // e.g. INV-2026-00481
  tenantId: string;
  tenantName: string;
  tenantSubdomain: string;
  taxCode?: string;
  address?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  type: BillingType;
  title: string; // e.g. "Gói Chuyên Nghiệp (Pro) - 12 tháng"
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  paymentMethod: PaymentChannel;
  bankName?: string;
  bankAccount?: string;
  referenceCode?: string; // SePay / Napas transfer memo
  status: BillingStatus;
  createdAt: string;
  completedAt?: string;
  note?: string;
  reconciledBy?: string;
  reconciledAt?: string;
}

export interface BillingKpiSummary {
  totalRevenue: number;
  revenueThisMonth: number;
  totalTransactions: number;
  successRate: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface BillingFilterParams {
  keyword?: string;
  type?: 'ALL' | BillingType;
  status?: 'ALL' | BillingStatus;
  dateRange?: 'all' | 'today' | '7days' | 'month' | 'quarter';
  paymentMethod?: 'ALL' | PaymentChannel;
}
