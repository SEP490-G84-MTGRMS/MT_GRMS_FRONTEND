/**
 * Cashbook & Cash Flow Management Types
 * Corresponding to Capability: cashbook
 */

export type CashAccountType = 'CASH' | 'BANK';

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'ADJUSTMENT';

export type CounterpartyType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'TAX_AUTHORITY' | 'INTERNAL' | 'OTHER';

export type ReferenceDocType =
  | 'POS_ORDER'
  | 'SERVICE_EXPENSE'
  | 'PURCHASE_ORDER'
  | 'DEBT_PAYMENT'
  | 'TAX_PAYMENT'
  | 'INTERNAL_TRANSFER'
  | 'MANUAL'
  | 'AUDIT'
  | 'CASH_TRANSIT'
  | 'COMPENSATING';

export type SourceModuleName =
  | 'POS'
  | 'POS_RETAIL'
  | 'CRM_DEBT'
  | 'SERVICE_OPEX'
  | 'TAX_SNAPSHOT'
  | 'INTERNAL_TRANSFER'
  | 'SUPPLIER_PO'
  | 'PAYROLL'
  | 'MANUAL'
  | 'CASHBOOK_MANUAL';

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
  isSafeDeposit?: boolean; // True for store owner's safe box
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
  sourceModuleName?: SourceModuleName;
  linkedTransactionId?: string;
  isAutomated: boolean;
  createdBy: string;
  createdAt: string; // ISO string

  // Immutable Ledger Poka-yoke attributes
  isVoided?: boolean;
  isCompensating?: boolean;
  originalEntryId?: string;
  voidReason?: string;
}

export interface CashTransitItem {
  id: string;
  transferCode: string;
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  senderName: string;
  sentAt: string;
  status: 'PENDING' | 'RECEIVED' | 'DISCREPANCY';
  note?: string;
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
  referenceDocType?: ReferenceDocType;
  referenceDocId?: string;
  sourceModuleName?: SourceModuleName;
  isAutomated?: boolean;
}

export interface CreatePaymentDTO {
  accountId: string;
  amount: number;
  category: string;
  counterpartyType: CounterpartyType;
  counterpartyName: string;
  description: string;
  referenceDocType?: ReferenceDocType;
  referenceDocId?: string;
  sourceModuleName?: SourceModuleName;
  isAutomated?: boolean;
  branchId?: string;
}

export interface FundTransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferFee?: number;
  note?: string;
  performedBy?: string;
}

export interface CashReconciliationDTO {
  accountId: string;
  systemBalance: number;
  actualCountedBalance: number;
  differenceAmount: number;
  reason: string;
  auditedBy: string;
  breakdown?: Record<number, number>; // Denomination counts
}

export interface CashbookSummaryKPI {
  totalOpeningBalance: number;
  totalReceipts: number;
  totalPayments: number;
  totalClosingBalance: number;
  totalCashInDrawers: number;
  totalBankDeposits: number;
  totalSafeDepositBalance?: number;
}
