import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CreateReceiptDTO,
  CreatePaymentDTO,
  FundTransferDTO,
  CashbookSummaryKPI,
  TriageItem,
  ResolveTriageDTO,
} from '../types/cashbook.types';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { generateUuidV7 } from '../../../utils/uuid';

export interface BackendCashbookEntryResponse {
  id: string;
  entryCode: string;
  accountId: string;
  accountType: string;
  branchId?: string | null;
  entryType: string;
  amount: number;
  balanceAfter: number;
  sourceType: string;
  sourceId?: string | null;
  referenceCode: string;
  auditHash: string;
  isVoided?: boolean;
  description: string;
  occurredAtUtc: string;
  categoryCode?: string;
  financialNature?: string;
  taxTreatment?: LedgerTransaction['taxTreatment'];
  taxTreatmentReason?: string | null;
}

export interface BackendCashAccountResponse {
  id: string;
  branchId?: string | null;
  branchName: string;
  accountName: string;
  accountType: 'CASH' | 'BANK';
  bankName?: string;
  bankCode?: string;
  accountHolderName?: string;
  isDefaultForVietQr?: boolean;
  accountNumber?: string;
  currentBalance: number;
  initialBalance: number;
  isActive: boolean;
  currency: string;
  isSafeDeposit: boolean;
}

export interface BackendCashbookSummaryResponse {
  totalOpeningBalance: number;
  totalReceipts: number;
  totalPayments: number;
  totalClosingBalance: number;
  totalCashInDrawers: number;
  totalBankDeposits: number;
  totalSafeDepositBalance: number;
}

function mapBackendEntryToLedgerTransaction(
  entry: BackendCashbookEntryResponse,
  accountNameLookup?: string
): LedgerTransaction {
  const isReceipt = entry.entryType.toUpperCase() === 'RECEIPT';
  const isAdjustment = entry.sourceType === 'ADJUSTMENT';
  const isCompensating = entry.sourceType === 'COMPENSATING';
  const isExpense = entry.sourceType === 'EXPENSE' || entry.sourceType === 'EXPENSE_REVERSAL';
  const isDebt =
    entry.sourceType === 'DEBT' ||
    entry.sourceType === 'DEBT_REPAYMENT' ||
    Boolean(entry.description?.includes('Thu nợ'));
  const isPos = entry.sourceType === 'POS' || entry.sourceType === 'POS_SALE';
  const isTaxPayment = entry.sourceType === 'TAX_PAYMENT';
  const isInternalTransfer =
    entry.sourceType === 'CASH_DROP' ||
    entry.sourceType === 'BANK_DEPOSIT' ||
    entry.sourceType === 'INTERNAL_TRANSFER';

  const categoryLabels: Record<string, string> = {
    OWNER_DEPOSIT: 'Chủ nạp thêm vốn',
    OFF_POS_SALE: 'Thu bán hàng ngoài POS',
    INTERNAL_REIMBURSEMENT: 'Hoàn ứng nội bộ',
    BANK_INTEREST: 'Thu lãi tiền gửi ngân hàng',
    OTHER_INCOME: 'Thu nhập khác',
    OWNER_DRAW: 'Rút vốn chủ',
    TAX_PAYMENT: 'Nộp thuế nhà nước',
    ASSET_PURCHASE: 'Mua sắm trang thiết bị / Tài sản',
    OTHER_PAYMENT: 'Chi khác ngoài hóa đơn',
  };
  const defaultCategory =
    (entry.categoryCode && categoryLabels[entry.categoryCode]) ||
    (isPos
      ? 'Doanh thu bán hàng POS'
      : isExpense
      ? 'Chi phí vận hành'
      : isDebt
      ? 'Thu nợ khách hàng'
      : entry.sourceType === 'CASH_DROP'
      ? 'Bàn giao tiền sang két sắt'
      : entry.sourceType === 'BANK_DEPOSIT'
      ? 'Nộp tiền vào ngân hàng'
      : isAdjustment
      ? 'Kiểm kê chênh lệch két'
      : isCompensating
      ? 'Bút toán đảo hủy giao dịch'
      : 'Giao dịch thu chi');

  const counterpartyType =
    isPos || isDebt
      ? 'CUSTOMER'
      : isExpense
      ? 'SUPPLIER'
      : 'INTERNAL';

  const accountLabel =
    accountNameLookup ||
    (entry.accountType === 'Till'
      ? 'Két thu ngân'
      : entry.accountType === 'Safe'
      ? 'Két sắt chủ shop'
      : 'Tài khoản ngân hàng');

  const sourceModuleName: LedgerTransaction['sourceModuleName'] = isPos
    ? 'POS_RETAIL'
    : isExpense
    ? 'SERVICE_OPEX'
    : isDebt
    ? 'CRM_DEBT'
    : isTaxPayment
    ? 'TAX_SNAPSHOT'
    : isInternalTransfer
    ? 'INTERNAL_TRANSFER'
    : 'MANUAL';

  const referenceDocType: LedgerTransaction['referenceDocType'] = isPos
    ? 'POS_ORDER'
    : isExpense
    ? 'SERVICE_EXPENSE'
    : isDebt
    ? 'DEBT_PAYMENT'
    : isTaxPayment
    ? 'TAX_PAYMENT'
    : isInternalTransfer
    ? 'INTERNAL_TRANSFER'
    : isAdjustment
    ? 'AUDIT'
    : 'MANUAL';

  return {
    id: entry.id,
    transactionCode: entry.entryCode,
    accountId: entry.accountId,
    accountName: accountLabel,
    branchId: entry.branchId || 'ALL',
    transactionType: isAdjustment ? 'ADJUSTMENT' : isReceipt ? 'RECEIPT' : 'PAYMENT',
    category: defaultCategory,
    amount: Number(entry.amount),
    balanceAfter: Number(entry.balanceAfter),
    counterpartyType: counterpartyType,
    counterpartyName: entry.referenceCode || entry.sourceType,
    description: entry.description || '',
    referenceDocType,
    referenceDocId: entry.referenceCode || entry.sourceId || undefined,
    sourceId: entry.sourceId,
    sourceModuleName,
    sourceType: entry.sourceType,
    categoryCode: entry.categoryCode,
    financialNature: entry.financialNature,
    taxTreatment: entry.taxTreatment,
    taxTreatmentReason: entry.taxTreatmentReason || undefined,
    isAutomated: entry.sourceType !== 'MANUAL',
    isVoided: entry.isVoided,
    isCompensating,
    originalEntryId: isCompensating ? entry.sourceId || undefined : undefined,
    linkedTransactionId: isCompensating || isInternalTransfer ? entry.sourceId || undefined : undefined,
    createdBy: 'Hệ thống',
    createdAt: entry.occurredAtUtc,
  };
}

export const cashbookService = {
  /**
   * Retrieves all cash, safe, and bank accounts from Backend
   */
  async getCashAccounts(branchId?: string): Promise<CashAccount[]> {
    const params = branchId && branchId !== "ALL" ? { branchId } : {};
    const res = await financeHttpClient.get<{ data: BackendCashAccountResponse[] }>("/cashbook/accounts", { params });
    const backendAccounts = res.data.data;

    return backendAccounts
      .filter((b) => b.isActive)
      .map((b) => ({
        id: b.id,
        branchId: b.branchId || "ALL",
        branchName: b.branchName,
        accountName: b.accountName,
        accountType: b.accountType,
        bankName: b.bankName,
        bankCode: b.bankCode,
        accountHolderName: b.accountHolderName,
        accountNumber: b.accountNumber,
        currentBalance: Number(b.currentBalance),
        initialBalance: Number(b.initialBalance),
        isActive: b.isActive,
        currency: b.currency || "VND",
        isSafeDeposit: b.isSafeDeposit,
        isDefault: b.isDefaultForVietQr === true,
      }));
  },

  /**
   * Retrieves account details by ID
   */
  async getCashAccountById(id: string): Promise<CashAccount | undefined> {
    const accounts = await this.getCashAccounts();
    return accounts.find((acc) => acc.id === id);
  },

  /**
   * Retrieves paginated transactions with flexible filtering from Backend
   */
  async getTransactions(
    params: CashbookFilterParams = {},
    page = 1,
    pageSize = 10
  ): Promise<{ items: LedgerTransaction[]; totalItems: number }> {
    const queryParams: Record<string, unknown> = { page, pageSize };
    if (params.accountId && params.accountId !== 'ALL') queryParams.accountId = params.accountId;
    if (params.branchId && params.branchId !== 'ALL') queryParams.branchId = params.branchId;
    if (params.startDate) queryParams.fromDate = params.startDate + 'T00:00:00+07:00';
    if (params.endDate) queryParams.toDate = params.endDate + 'T23:59:59.999999+07:00';
    if (params.sourceType) queryParams.sourceType = params.sourceType;
    else if (params.transactionType === 'ADJUSTMENT') queryParams.sourceType = 'ADJUSTMENT';
    else if (params.transactionType && params.transactionType !== 'ALL') queryParams.entryType = params.transactionType;
    if (params.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params.searchQuery?.trim()) queryParams.keyword = params.searchQuery.trim();
    if (params.counterpartyQuery?.trim()) queryParams.counterparty = params.counterpartyQuery.trim();

    const res = await financeHttpClient.get<{ data: BackendCashbookEntryResponse[]; totalItems?: number }>(
      '/cashbook/entries', { params: queryParams }
    );
    const entries = res.data.data;
    const accounts = entries.length ? await this.getCashAccounts() : [];
    const accountMap = new Map(accounts.map((account) => [account.id, account.accountName]));
    return {
      items: entries.map((entry) => mapBackendEntryToLedgerTransaction(entry, accountMap.get(entry.accountId))),
      totalItems: res.data.totalItems ?? entries.length,
    };
  },

  /**
   * Records a manual cash/bank receipt (Phiếu Thu)
   */
  async createReceipt(dto: CreateReceiptDTO, idempotencyKey = generateUuidV7()): Promise<LedgerTransaction> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền thu phải lớn hơn 0');
    }

    const res = await financeHttpClient.post<{ data: BackendCashbookEntryResponse }>(
      '/cashbook/receipts',
      {
        accountId: dto.accountId,
        amount: dto.amount,
        category: dto.category,
        categoryCode: dto.categoryCode,
        taxTreatment: dto.taxTreatment,
        taxTreatmentReason: dto.taxTreatmentReason,
        description: dto.description,
        referenceCode: dto.referenceDocId,
      },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      }
    );
    return mapBackendEntryToLedgerTransaction(res.data.data);
  },

  /**
   * Records a cash/bank payment (Phiếu Chi) with strict GBR-CSH-03 zero-overdraft check
   */
  async createPayment(dto: CreatePaymentDTO, idempotencyKey = generateUuidV7()): Promise<LedgerTransaction> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền chi phải lớn hơn 0');
    }

    if (dto.categoryCode === 'TAX_PAYMENT') {
      if (!dto.referenceDocId?.trim()) {
        throw new Error('Nộp thuế bắt buộc có số giấy nộp tiền hoặc mã giao dịch ngân hàng');
      }
      const taxRes = await financeHttpClient.post<{ data: { entry: BackendCashbookEntryResponse } }>(
        '/cashbook/tax-payments',
        {
          sourceAccountId: dto.accountId,
          amount: dto.amount,
          beneficiaryName: dto.counterpartyName,
          paymentReference: dto.referenceDocId.trim(),
          evidenceAttachmentUrl: null,
          householdTaxSnapshotId: null,
          note: dto.description,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } }
      );
      return mapBackendEntryToLedgerTransaction(taxRes.data.data.entry);
    }
    const res = await financeHttpClient.post<{ data: BackendCashbookEntryResponse }>(
      '/cashbook/payments',
      {
        accountId: dto.accountId,
        amount: dto.amount,
        category: dto.category,
        categoryCode: dto.categoryCode,
        taxTreatment: dto.taxTreatment,
        taxTreatmentReason: dto.taxTreatmentReason,
        description: dto.description,
        referenceCode: dto.referenceDocId,
      },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      }
    );
    return mapBackendEntryToLedgerTransaction(res.data.data);
  },

  /**
   * Voids an existing ledger entry by creating an opposite Compensating Entry
   */
  async voidTransaction(transactionId: string, reason: string): Promise<LedgerTransaction> {
    const idempotencyKey = generateUuidV7();
    const res = await financeHttpClient.post<{ data: BackendCashbookEntryResponse }>(
      `/cashbook/entries/${transactionId}/void`,
      { reason: reason.trim() },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      }
    );
    return mapBackendEntryToLedgerTransaction(res.data.data);
  },

  /**
   * Transfers funds between two cash/bank accounts (Chuyển tiền nội bộ)
   */
  async transferFunds(dto: FundTransferDTO, idempotencyKey = generateUuidV7()): Promise<{ payment: LedgerTransaction; receipt: LedgerTransaction }> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền chuyển quỹ phải lớn hơn 0');
    }
    if (dto.fromAccountId === dto.toAccountId) {
      throw new Error('Tài khoản nguồn và tài khoản đích không được trùng nhau');
    }

    const res = await financeHttpClient.post<{
      data: { payment: BackendCashbookEntryResponse; receipt: BackendCashbookEntryResponse };
    }>(
      '/cashbook/transfers',
      {
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        note: dto.note,
      },
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      }
    );
    return {
      payment: mapBackendEntryToLedgerTransaction(res.data.data.payment),
      receipt: mapBackendEntryToLedgerTransaction(res.data.data.receipt),
    };
  },

  async getSummaryKPI(branchId?: string): Promise<CashbookSummaryKPI> {
    const params = branchId && branchId !== 'ALL' ? { branchId } : {};
    const res = await financeHttpClient.get<{ data: BackendCashbookSummaryResponse }>('/cashbook/summary', { params });
    const summary = res.data.data;
    return {
      totalOpeningBalance: Number(summary.totalOpeningBalance),
      totalReceipts: Number(summary.totalReceipts),
      totalPayments: Number(summary.totalPayments),
      totalClosingBalance: Number(summary.totalClosingBalance),
      totalCashInDrawers: Number(summary.totalCashInDrawers),
      totalBankDeposits: Number(summary.totalBankDeposits),
      totalSafeDepositBalance: Number(summary.totalSafeDepositBalance),
    };
  },

  /**
   * Generates UTF-8 BOM CSV text for Excel export
   */
  exportCashbookToCSV(transactions: LedgerTransaction[]): string {
    const headers = [
      'Mã giao dịch',
      'Thời gian',
      'Tài khoản quỹ',
      'Loại bút toán',
      'Danh mục',
      'Đối tượng',
      'Thu (VNĐ)',
      'Chi (VNĐ)',
      'Số dư sau GD (VNĐ)',
      'Diễn giải',
      'Trạng thái',
      'Nguồn giao dịch',
    ];

    const rows = transactions.map((tx) => {
      const isReceipt = tx.transactionType === 'RECEIPT';
      const isPayment = tx.transactionType === 'PAYMENT';
      const isAdj = tx.transactionType === 'ADJUSTMENT';

      const thuAmount = isReceipt || (isAdj && tx.amount > 0) ? Math.abs(tx.amount) : 0;
      const chiAmount = isPayment || (isAdj && tx.amount < 0) ? Math.abs(tx.amount) : 0;

      return [
        `"${tx.transactionCode}"`,
        `"${new Date(tx.createdAt).toLocaleString('vi-VN')}"`,
        `"${tx.accountName}"`,
        `"${tx.transactionType}"`,
        `"${tx.category}"`,
        `"${tx.counterpartyName}"`,
        thuAmount,
        chiAmount,
        tx.balanceAfter,
        `"${tx.description.replace(/"/g, '""')}"`,
        `"${tx.isVoided ? 'Đã gạch bỏ' : tx.isCompensating ? 'Phiếu bù trừ' : 'Hợp lệ'}"`,
        `"${tx.sourceModuleName || 'MANUAL'}"`,
      ].join(',');
    });

    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  },

  // --- Phân hệ Triage Inbox & Xử lý mục không rõ ---
  async getPendingTriage(branchId?: string): Promise<TriageItem[]> {
    const params = branchId && branchId !== 'ALL' ? { branchId } : {};
    const res = await financeHttpClient.get<{ data: TriageItem[] }>('/cashbook/triage/pending', { params });
    return res.data.data;
  },

  async resolveTriage(voucherId: string, data: ResolveTriageDTO): Promise<void> {
    const normalizedPayload = {
      ...data,
      // Normalize legacy 0 -> 1 (FinancialNature.OperatingExpense) and 4 -> 5 (FinancialNature.OwnerDraw)
      nature: data.nature === 0 ? 1 : data.nature === 4 ? 5 : data.nature,
    };
    const idempotencyKey = generateUuidV7();
    await financeHttpClient.post(
      `/cashbook/triage/${voucherId}/resolve`,
      normalizedPayload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
  },
};
