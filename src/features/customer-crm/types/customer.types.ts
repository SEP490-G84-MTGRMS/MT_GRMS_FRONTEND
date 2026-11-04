/**
 * Membership tier for loyalty program
 */
export type MembershipTier = 'Standard' | 'Silver' | 'Gold' | 'VIP';

/**
 * Filter status for accounts receivable
 */
export type DebtFilterStatus = 'ALL' | 'NO_DEBT' | 'IN_LIMIT' | 'OVER_LIMIT';

/**
 * Summary of an invoice linked to a customer
 */
export interface CustomerInvoiceSummary {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
}

/**
 * Summary of a debt collection payment receipt
 */
export interface CustomerDebtPaymentSummary {
  id: string;
  date: string;
  amount: number;
  method: 'Cash' | 'VietQR';
  staffName?: string;
  note?: string;
}

/**
 * Customer profile entity DTO matching database schema and API contract
 */
export interface CustomerDto {
  id: string;
  tenantId: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  address?: string;
  taxCode?: string;
  companyName?: string;
  loyaltyPoints: number;
  membershipTier: MembershipTier;
  currentDebtAR: number;
  debtLimit: number;
  totalSpending: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  invoices?: CustomerInvoiceSummary[];
  payments?: CustomerDebtPaymentSummary[];
}

/**
 * Payload to create a new customer
 */
export interface CreateCustomerInput {
  phoneNumber: string;
  fullName: string;
  email?: string;
  address?: string;
  taxCode?: string;
  debtLimit: number;
  membershipTier?: MembershipTier;
}

/**
 * Payload to update customer information
 */
export interface UpdateCustomerInput {
  fullName?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  debtLimit?: number;
  membershipTier?: MembershipTier;
  status?: 'Active' | 'Inactive';
}

/**
 * Payload to execute a debt collection receipt
 */
export interface CollectDebtInput {
  customerId: string;
  amount: number;
  method: 'Cash' | 'VietQR';
  targetAccountId?: string;
  note?: string;
}

export interface CustomerDebtLedgerDto {
  id: string;
  customerId: string;
  transactionType: 'DEBT_INCREASE' | 'DEBT_DECREASE';
  amount: number;
  balanceAfter: number;
  referenceDocId?: string;
  paymentMethod?: 'Cash' | 'VietQR';
  cashTransactionCode?: string;
  note?: string;
  createdAt: string;
}

/**
 * VietQR payload structure for instant bank transfer
 */
export interface VietQrConfig {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  amount: number;
  description: string;
  qrDataUrl: string;
}

/**
 * High-level KPI summary for Customer CRM dashboard
 */
export interface CustomerKpiSummary {
  totalCustomers: number;
  totalDebtAR: number;
  overLimitCount: number;
  totalLoyaltyPoints: number;
}