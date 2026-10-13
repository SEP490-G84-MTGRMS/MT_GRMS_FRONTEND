import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CreateReceiptDTO,
  CreatePaymentDTO,
  CashReconciliationDTO,
  CashbookSummaryKPI,
} from '../types/cashbook.types';

const INITIAL_ACCOUNTS: CashAccount[] = [
  {
    id: 'ACC-01',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Cửa hàng chính)',
    accountName: 'Két tiền mặt Q1',
    accountType: 'CASH',
    currentBalance: 12500000,
    initialBalance: 10000000,
    isActive: true,
    currency: 'VND',
  },
  {
    id: 'ACC-02',
    branchId: 'BR-02',
    branchName: 'Chi nhánh Quận 7',
    accountName: 'Két tiền mặt Q7',
    accountType: 'CASH',
    currentBalance: 8200000,
    initialBalance: 5000000,
    isActive: true,
    currency: 'VND',
  },
  {
    id: 'ACC-03',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Vietcombank - TK Thu Bán Hàng',
    accountType: 'BANK',
    bankName: 'Vietcombank (VCB)',
    accountNumber: '0071001234567',
    currentBalance: 145800000,
    initialBalance: 100000000,
    isActive: true,
    currency: 'VND',
  },
  {
    id: 'ACC-04',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống',
    accountName: 'Techcombank - TK Chi Trả NCC',
    accountType: 'BANK',
    bankName: 'Techcombank (TCB)',
    accountNumber: '19036789123011',
    currentBalance: 32450000,
    initialBalance: 50000000,
    isActive: true,
    currency: 'VND',
  },
];

const INITIAL_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TX-001',
    transactionCode: 'PT-20261014-001',
    accountId: 'ACC-01',
    accountName: 'Két tiền mặt Q1',
    branchId: 'BR-01',
    transactionType: 'RECEIPT',
    category: 'Doanh thu bán hàng POS',
    amount: 1450000,
    balanceAfter: 12500000,
    counterpartyType: 'CUSTOMER',
    counterpartyName: 'Khách lẻ POS #8821',
    description: 'Thanh toán tiền mặt hóa đơn POS-8821',
    referenceDocType: 'POS_ORDER',
    referenceDocId: 'ORD-8821',
    isAutomated: true,
    createdBy: 'Thu ngân Ca 1',
    createdAt: '2026-10-14T01:15:00Z',
  },
  {
    id: 'TX-002',
    transactionCode: 'PC-20261013-004',
    accountId: 'ACC-01',
    accountName: 'Két tiền mặt Q1',
    branchId: 'BR-01',
    transactionType: 'PAYMENT',
    category: 'Chi phí vận hành (FE-07)',
    amount: 350000,
    balanceAfter: 11050000,
    counterpartyType: 'SUPPLIER',
    counterpartyName: 'Điện lực EVN',
    description: 'Tiền điện sinh hoạt cửa hàng Q1 tháng 10',
    referenceDocType: 'SERVICE_EXPENSE',
    referenceDocId: 'EXP-1092',
    isAutomated: true,
    createdBy: 'Nguyễn Trường An',
    createdAt: '2026-10-13T14:30:00Z',
  },
  {
    id: 'TX-003',
    transactionCode: 'PT-20261013-003',
    accountId: 'ACC-03',
    accountName: 'Vietcombank - TK Thu Bán Hàng',
    branchId: 'ALL',
    transactionType: 'RECEIPT',
    category: 'Thu nợ khách hàng (FE-08)',
    amount: 15000000,
    balanceAfter: 145800000,
    counterpartyType: 'CUSTOMER',
    counterpartyName: 'Đại lý Minh Phát',
    description: 'Khách hàng thanh toán công nợ đơn buôn',
    referenceDocType: 'MANUAL',
    isAutomated: false,
    createdBy: 'Nguyễn Trường An',
    createdAt: '2026-10-13T10:00:00Z',
  },
  {
    id: 'TX-004',
    transactionCode: 'PC-20261012-002',
    accountId: 'ACC-04',
    accountName: 'Techcombank - TK Chi Trả NCC',
    branchId: 'ALL',
    transactionType: 'PAYMENT',
    category: 'Thanh toán nhập hàng NCC',
    amount: 18500000,
    balanceAfter: 32450000,
    counterpartyType: 'SUPPLIER',
    counterpartyName: 'Công ty Cổ phần Vinamilk',
    description: 'Thanh toán tiền hàng PO-202610-09',
    referenceDocType: 'PURCHASE_ORDER',
    referenceDocId: 'PO-202610-09',
    isAutomated: true,
    createdBy: 'Kế toán trưởng',
    createdAt: '2026-10-12T09:15:00Z',
  },
  {
    id: 'TX-005',
    transactionCode: 'KK-20261011-001',
    accountId: 'ACC-02',
    accountName: 'Két tiền mặt Q7',
    branchId: 'BR-02',
    transactionType: 'ADJUSTMENT',
    category: 'Kiểm kê chênh lệch két',
    amount: -50000,
    balanceAfter: 8200000,
    counterpartyType: 'OTHER',
    counterpartyName: 'Hội đồng kiểm kê Q7',
    description: 'Chênh lệch âm do hoàn tiền thối nhầm ca trưa',
    referenceDocType: 'AUDIT',
    isAutomated: false,
    createdBy: 'Quản lý Q7',
    createdAt: '2026-10-11T21:00:00Z',
  },
];

const STORAGE_KEYS = {
  ACCOUNTS: 'mt_grms_cash_accounts_v1',
  TRANSACTIONS: 'mt_grms_cash_transactions_v1',
};

/**
 * Helper to get state from localStorage or fallback
 */
function loadState<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Error loading state for ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Helper to save state into localStorage
 */
function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving state for ${key}:`, error);
  }
}

/**
 * Cashbook Service implementation adhering to MT-GRMS architecture
 */
export const cashbookService = {
  /**
   * Retrieves all cash and bank accounts, optional filtering by branch
   */
  async getCashAccounts(branchId?: string): Promise<CashAccount[]> {
    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    if (!branchId || branchId === 'ALL') {
      return accounts;
    }
    return accounts.filter((acc) => acc.branchId === branchId || acc.branchId === 'ALL');
  },

  /**
   * Retrieves account details by ID
   */
  async getCashAccountById(id: string): Promise<CashAccount | undefined> {
    const accounts = await this.getCashAccounts();
    return accounts.find((acc) => acc.id === id);
  },

  /**
   * Retrieves paginated transactions with flexible filtering
   */
  async getTransactions(
    params: CashbookFilterParams = {},
    page = 1,
    pageSize = 10
  ): Promise<{ items: LedgerTransaction[]; totalItems: number }> {
    const all = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);

    let filtered = [...all];

    if (params.branchId && params.branchId !== 'ALL') {
      filtered = filtered.filter((tx) => tx.branchId === params.branchId || tx.branchId === 'ALL');
    }

    if (params.accountId && params.accountId !== 'ALL') {
      filtered = filtered.filter((tx) => tx.accountId === params.accountId);
    }

    if (params.transactionType && params.transactionType !== 'ALL') {
      filtered = filtered.filter((tx) => tx.transactionType === params.transactionType);
    }

    if (params.searchQuery && params.searchQuery.trim()) {
      const q = params.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.transactionCode.toLowerCase().includes(q) ||
          tx.counterpartyName.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q)
      );
    }

    // Sort descending by created date
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalItems = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const items = filtered.slice(startIndex, startIndex + pageSize);

    return { items, totalItems };
  },

  /**
   * Records a manual cash/bank receipt (Phiếu Thu)
   */
  async createReceipt(dto: CreateReceiptDTO): Promise<LedgerTransaction> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền thu phải lớn hơn 0');
    }

    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const targetAccountIndex = accounts.findIndex((a) => a.id === dto.accountId);

    if (targetAccountIndex === -1) {
      throw new Error('Tài khoản thụ hưởng không tồn tại');
    }

    const targetAccount = accounts[targetAccountIndex];
    const newBalance = targetAccount.currentBalance + dto.amount;
    targetAccount.currentBalance = newBalance;
    accounts[targetAccountIndex] = targetAccount;
    saveState(STORAGE_KEYS.ACCOUNTS, accounts);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);

    const newTx: LedgerTransaction = {
      id: `TX-${Date.now()}`,
      transactionCode: `PT-${dateStr}-${randCode}`,
      accountId: targetAccount.id,
      accountName: targetAccount.accountName,
      branchId: targetAccount.branchId,
      transactionType: 'RECEIPT',
      category: dto.category,
      amount: dto.amount,
      balanceAfter: newBalance,
      counterpartyType: dto.counterpartyType,
      counterpartyName: dto.counterpartyName,
      description: dto.description,
      referenceDocType: 'MANUAL',
      referenceDocId: dto.referenceDocId,
      isAutomated: false,
      createdBy: 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    transactions.unshift(newTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return newTx;
  },

  /**
   * Records a cash/bank payment (Phiếu Chi) with strict GBR-CSH-03 zero-overdraft check
   */
  async createPayment(dto: CreatePaymentDTO): Promise<LedgerTransaction> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền chi phải lớn hơn 0');
    }

    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const targetAccountIndex = accounts.findIndex((a) => a.id === dto.accountId);

    if (targetAccountIndex === -1) {
      throw new Error('Tài khoản xuất tiền không tồn tại');
    }

    const targetAccount = accounts[targetAccountIndex];

    // Business Rule GBR-CSH-03: Chặn âm quỹ két tiền mặt
    if (targetAccount.accountType === 'CASH' && dto.amount > targetAccount.currentBalance) {
      throw new Error(
        `Số tiền chi (${dto.amount.toLocaleString('vi-VN')} đ) vượt quá số dư két hiện có (${targetAccount.currentBalance.toLocaleString('vi-VN')} đ). Quy tắc GBR-CSH-03 không cho phép âm két tiền mặt.`
      );
    }

    const newBalance = targetAccount.currentBalance - dto.amount;
    targetAccount.currentBalance = newBalance;
    accounts[targetAccountIndex] = targetAccount;
    saveState(STORAGE_KEYS.ACCOUNTS, accounts);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);

    const newTx: LedgerTransaction = {
      id: `TX-${Date.now()}`,
      transactionCode: `PC-${dateStr}-${randCode}`,
      accountId: targetAccount.id,
      accountName: targetAccount.accountName,
      branchId: targetAccount.branchId,
      transactionType: 'PAYMENT',
      category: dto.category,
      amount: dto.amount,
      balanceAfter: newBalance,
      counterpartyType: dto.counterpartyType,
      counterpartyName: dto.counterpartyName,
      description: dto.description,
      referenceDocType: 'MANUAL',
      referenceDocId: dto.referenceDocId,
      isAutomated: false,
      createdBy: 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    transactions.unshift(newTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return newTx;
  },

  /**
   * Reconciles cash drawer against physical count (UC-17.4 & Rule GBR-CSH-04)
   */
  async reconcileCashAccount(dto: CashReconciliationDTO): Promise<LedgerTransaction | null> {
    const diff = dto.actualCountedBalance - dto.systemBalance;

    // Business Rule GBR-CSH-04: Bắt buộc giải trình nếu có chênh lệch
    if (diff !== 0 && (!dto.reason || !dto.reason.trim())) {
      throw new Error('Chênh lệch kiểm kê bắt buộc phải có lý do giải trình cụ thể theo quy tắc GBR-CSH-04');
    }

    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const targetAccountIndex = accounts.findIndex((a) => a.id === dto.accountId);

    if (targetAccountIndex === -1) {
      throw new Error('Tài khoản kiểm kê không tồn tại');
    }

    const targetAccount = accounts[targetAccountIndex];
    targetAccount.currentBalance = dto.actualCountedBalance;
    accounts[targetAccountIndex] = targetAccount;
    saveState(STORAGE_KEYS.ACCOUNTS, accounts);

    if (diff === 0) {
      // Khớp hoàn toàn, không cần bút toán điều chỉnh
      return null;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);

    const adjTx: LedgerTransaction = {
      id: `TX-${Date.now()}`,
      transactionCode: `KK-${dateStr}-${randCode}`,
      accountId: targetAccount.id,
      accountName: targetAccount.accountName,
      branchId: targetAccount.branchId,
      transactionType: 'ADJUSTMENT',
      category: 'Kiểm kê đối soát két tiền',
      amount: diff,
      balanceAfter: dto.actualCountedBalance,
      counterpartyType: 'OTHER',
      counterpartyName: 'Hội đồng kiểm kê',
      description: `Điều chỉnh kiểm kê: ${dto.reason.trim()} (Chênh lệch: ${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} đ)`,
      referenceDocType: 'AUDIT',
      isAutomated: false,
      createdBy: dto.auditedBy || 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    transactions.unshift(adjTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return adjTx;
  },

  /**
   * Computes overall KPI summary for Cashbook
   */
  async getSummaryKPI(branchId?: string): Promise<CashbookSummaryKPI> {
    const accounts = await this.getCashAccounts(branchId);
    const { items: transactions } = await this.getTransactions({ branchId }, 1, 1000);

    let totalCashInDrawers = 0;
    let totalBankDeposits = 0;

    accounts.forEach((acc) => {
      if (acc.accountType === 'CASH') {
        totalCashInDrawers += acc.currentBalance;
      } else {
        totalBankDeposits += acc.currentBalance;
      }
    });

    let totalReceipts = 0;
    let totalPayments = 0;

    transactions.forEach((tx) => {
      if (tx.transactionType === 'RECEIPT') {
        totalReceipts += tx.amount;
      } else if (tx.transactionType === 'PAYMENT') {
        totalPayments += tx.amount;
      }
    });

    const totalClosingBalance = totalCashInDrawers + totalBankDeposits;
    const totalOpeningBalance = totalClosingBalance - totalReceipts + totalPayments;

    return {
      totalOpeningBalance,
      totalReceipts,
      totalPayments,
      totalClosingBalance,
      totalCashInDrawers,
      totalBankDeposits,
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
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        `"${tx.isAutomated ? 'Tự động từ hệ thống' : 'Thủ công'}"`,
      ].join(',');
    });

    // Thêm UTF-8 BOM \uFEFF chống vỡ font tiếng Việt
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  },
};
