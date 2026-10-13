/**
 * Cashbook & Cash Flow Management Types
 * Corresponding to Capability: cashbook (FE-17)
 */

export type CashAccountType = 'CASH' | 'BANK';

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';

export type CounterpartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';

export type ReferenceDocType = 'POS_ORDER' | 'SERVICE_EXPENSE' | 'PURCHASE_ORDER' | 'MANUAL' | 'AUDIT';

export interface CashAccount {
  id: string;
  branchId: string;
  branchName: string;
  accountName: string;
  accountType: CashAccountType;
  bankName?: string;
  accountNumber?: string;
  currentBalance: number;
  initialBalance: number;
  isActive: boolean;
  currency: string;
}

export interface LedgerTransaction {
  id: string;
  transactionCode: string;
  accountId: string;
  accountName: string;
  branchId: string;
  transactionType: TransactionType;
  category: string;
  amount: number;
  balanceAfter: number;
  counterpartyType: CounterpartyType;
  counterpartyName: string;
  description: string;
  referenceDocType: ReferenceDocType;
  referenceDocId?: string;
  isAutomated: boolean;
  createdBy: string;
  createdAt: string; // ISO string
}

export interface CashbookFilterParams {
  branchId?: string;
  accountId?: string;
  transactionType?: TransactionType | 'ALL';
  datePeriod?: 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'custom';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface CreateReceiptDTO {
  accountId: string;
  amount: number;
  category: string;
  counterpartyType: CounterpartyType;
  counterpartyName: string;
  description: string;
  referenceDocId?: string;
}

export interface CreatePaymentDTO {
  accountId: string;
  amount: number;
  category: string;
  counterpartyType: CounterpartyType;
  counterpartyName: string;
  description: string;
  referenceDocId?: string;
}

export interface CashReconciliationDTO {
  accountId: string;
  systemBalance: number;
  actualCountedBalance: number;
  differenceAmount: number;
  reason: string;
  auditedBy: string;
}

export interface CashbookSummaryKPI {
  totalOpeningBalance: number;
  totalReceipts: number;
  totalPayments: number;
  totalClosingBalance: number;
  totalCashInDrawers: number;
  totalBankDeposits: number;
}
