import type {
  CashAccount,
  LedgerTransaction,
  CashbookFilterParams,
  CreateReceiptDTO,
  CreatePaymentDTO,
  FundTransferDTO,
  CashReconciliationDTO,
  CashbookSummaryKPI,
  CashTransitItem,
} from '../types/cashbook.types';

const INITIAL_ACCOUNTS: CashAccount[] = [
  {
    id: 'ACC-01',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Cửa hàng chính)',
    accountName: 'Két tiền mặt quầy Q1',
    accountType: 'CASH',
    currentBalance: 12500000,
    initialBalance: 10000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  },
  {
    id: 'ACC-02',
    branchId: 'BR-02',
    branchName: 'Chi nhánh Quận 7',
    accountName: 'Két tiền mặt quầy Q7',
    accountType: 'CASH',
    currentBalance: 8200000,
    initialBalance: 5000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: false,
  },
  {
    id: 'ACC-SAFE',
    branchId: 'ALL',
    branchName: 'Toàn hệ thống (Chủ cửa hàng)',
    accountName: 'Két sắt của chủ shop (Safe Deposit)',
    accountType: 'CASH',
    currentBalance: 150000000,
    initialBalance: 120000000,
    isActive: true,
    currency: 'VND',
    isSafeDeposit: true,
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

const INITIAL_TRANSITS: CashTransitItem[] = [
  {
    id: 'TR-001',
    transferCode: 'TRANSIT-20261027-01',
    fromAccountId: 'ACC-01',
    fromAccountName: 'Két tiền mặt quầy Q1',
    toAccountId: 'ACC-SAFE',
    toAccountName: 'Két sắt của chủ shop',
    amount: 10350000,
    senderName: 'Thu ngân Ca sáng (Trần Thị Lan)',
    sentAt: '2026-10-27T04:30:00Z',
    status: 'PENDING',
    note: 'Nộp tiền mặt doanh thu bán hàng ca sáng về két sắt chủ shop',
  },
];

const INITIAL_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'TX-001',
    transactionCode: 'PT-20261014-001',
    accountId: 'ACC-01',
    accountName: 'Két tiền mặt quầy Q1',
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
    accountName: 'Két tiền mặt quầy Q1',
    branchId: 'BR-01',
    transactionType: 'PAYMENT',
    category: 'Chi phí vận hành',
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
    category: 'Thu nợ khách hàng',
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
    amount: 1850000,
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
    accountName: 'Két tiền mặt quầy Q7',
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
  ACCOUNTS: 'mt_grms_cash_accounts_v2',
  TRANSACTIONS: 'mt_grms_cash_transactions_v2',
  TRANSITS: 'mt_grms_cash_transits_v2',
};

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

function saveState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving state for ${key}:`, error);
  }
}

export const cashbookService = {
  /**
   * Retrieves all cash, safe, and bank accounts, optional filtering by branch
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
   * Retrieves Cash Transit transfers (Tiền đang chuyển về két sắt)
   */
  async getCashTransits(): Promise<CashTransitItem[]> {
    return loadState<CashTransitItem[]>(STORAGE_KEYS.TRANSITS, INITIAL_TRANSITS);
  },

  /**
   * Confirms a Cash Transit has been received into the Safe Deposit
   */
  async confirmTransitReceived(transitId: string, performedBy = 'Chủ shop'): Promise<void> {
    const transits = await this.getCashTransits();
    const tIndex = transits.findIndex((t) => t.id === transitId);
    if (tIndex === -1) throw new Error('Không tìm thấy khoản chuyển tiền');

    const transit = transits[tIndex];
    transit.status = 'RECEIVED';
    transits[tIndex] = transit;
    saveState(STORAGE_KEYS.TRANSITS, transits);

    // Record receipt into Safe Deposit
    await this.createReceipt({
      accountId: transit.toAccountId,
      amount: transit.amount,
      category: 'Tiền mặt chuyển về két sắt',
      counterpartyType: 'INTERNAL',
      counterpartyName: transit.fromAccountName,
      description: `[ĐÃ NHẬN ĐỦ KÉT SẮT] Bởi ${performedBy} từ ${transit.fromAccountName} (Mã chuyển: ${transit.transferCode})`,
      referenceDocType: 'CASH_TRANSIT',
      referenceDocId: transit.id,
      sourceModuleName: 'INTERNAL_TRANSFER',
      isAutomated: true,
    });
  },

  /**
   * Reports a discrepancy in cash transit
   */
  async reportTransitDiscrepancy(transitId: string, note: string): Promise<void> {
    const transits = await this.getCashTransits();
    const tIndex = transits.findIndex((t) => t.id === transitId);
    if (tIndex === -1) throw new Error('Không tìm thấy khoản chuyển tiền');

    transits[tIndex].status = 'DISCREPANCY';
    transits[tIndex].note = note;
    saveState(STORAGE_KEYS.TRANSITS, transits);
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
      referenceDocType: dto.referenceDocType || 'MANUAL',
      referenceDocId: dto.referenceDocId,
      sourceModuleName: dto.sourceModuleName || 'MANUAL',
      isAutomated: dto.isAutomated ?? false,
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
        `Số tiền chi (${dto.amount.toLocaleString('vi-VN')} đ) vượt quá số dư két hiện có (${targetAccount.currentBalance.toLocaleString('vi-VN')} đ). Quy tắc Poka-yoke GBR-CSH-03 không cho phép âm két tiền mặt.`
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
      referenceDocType: dto.referenceDocType || 'MANUAL',
      referenceDocId: dto.referenceDocId,
      sourceModuleName: dto.sourceModuleName || 'MANUAL',
      isAutomated: dto.isAutomated ?? false,
      createdBy: 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    transactions.unshift(newTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return newTx;
  },

  /**
   * Voids an existing ledger entry by creating an opposite Compensating Entry
   * Adheres strictly to Immutable Ledger Principle (No DB UPDATE/DELETE)
   */
  async voidTransaction(
    transactionId: string,
    reason: string,
    performedBy = 'Nguyễn Trường An'
  ): Promise<LedgerTransaction> {
    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    const origIndex = transactions.findIndex((tx) => tx.id === transactionId);

    if (origIndex === -1) {
      throw new Error('Không tìm thấy bút toán cần hủy');
    }

    const origTx = transactions[origIndex];
    if (origTx.isVoided) {
      throw new Error('Bút toán này đã được gạch bỏ trước đó');
    }

    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const accIndex = accounts.findIndex((a) => a.id === origTx.accountId);
    if (accIndex === -1) {
      throw new Error('Tài khoản sổ cái liên kết không tồn tại');
    }

    const targetAccount = accounts[accIndex];

    // Determine reverse amount impact on account balance
    let balanceDelta = 0;
    let compType: LedgerTransaction['transactionType'] = 'PAYMENT';

    if (origTx.transactionType === 'PAYMENT') {
      // Reversing a payment adds money back
      balanceDelta = origTx.amount;
      compType = 'RECEIPT';
    } else if (origTx.transactionType === 'RECEIPT') {
      // Reversing a receipt subtracts money
      if (targetAccount.accountType === 'CASH' && targetAccount.currentBalance < origTx.amount) {
        throw new Error('Không thể hủy phiếu thu: Số dư hiện tại không đủ để hoàn lại!');
      }
      balanceDelta = -origTx.amount;
      compType = 'PAYMENT';
    } else {
      balanceDelta = -origTx.amount;
      compType = 'ADJUSTMENT';
    }

    targetAccount.currentBalance += balanceDelta;
    accounts[accIndex] = targetAccount;
    saveState(STORAGE_KEYS.ACCOUNTS, accounts);

    // Mark original as voided
    origTx.isVoided = true;
    origTx.voidReason = reason;
    transactions[origIndex] = origTx;

    // Create Compensating Entry
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);

    const compTx: LedgerTransaction = {
      id: `TX-COMP-${Date.now()}`,
      transactionCode: `GB-${dateStr}-${randCode}`,
      accountId: targetAccount.id,
      accountName: targetAccount.accountName,
      branchId: targetAccount.branchId,
      transactionType: compType,
      category: `Gạch bỏ [${origTx.transactionCode}]`,
      amount: origTx.amount,
      balanceAfter: targetAccount.currentBalance,
      counterpartyType: origTx.counterpartyType,
      counterpartyName: origTx.counterpartyName,
      description: `[BÚT TOÁN GẠCH BỎ] Lý do: ${reason}. Bù trừ cho phiếu gốc ${origTx.transactionCode}`,
      referenceDocType: 'COMPENSATING',
      referenceDocId: origTx.id,
      sourceModuleName: origTx.sourceModuleName,
      linkedTransactionId: origTx.id,
      isAutomated: false,
      isCompensating: true,
      originalEntryId: origTx.id,
      createdBy: performedBy,
      createdAt: now.toISOString(),
    };

    transactions.unshift(compTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return compTx;
  },

  /**
   * Transfers funds between two cash/bank accounts (Chuyển tiền nội bộ)
   */
  async transferFunds(dto: FundTransferDTO): Promise<{ payment: LedgerTransaction; receipt: LedgerTransaction }> {
    if (dto.amount <= 0) {
      throw new Error('Số tiền chuyển quỹ phải lớn hơn 0');
    }
    if (dto.fromAccountId === dto.toAccountId) {
      throw new Error('Tài khoản nguồn và tài khoản đích không được trùng nhau');
    }

    const accounts = loadState<CashAccount[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const fromIndex = accounts.findIndex((a) => a.id === dto.fromAccountId);
    const toIndex = accounts.findIndex((a) => a.id === dto.toAccountId);

    if (fromIndex === -1) throw new Error('Tài khoản chuyển tiền không tồn tại');
    if (toIndex === -1) throw new Error('Tài khoản nhận tiền không tồn tại');

    const fromAcc = accounts[fromIndex];
    const toAcc = accounts[toIndex];

    if (fromAcc.accountType === 'CASH' && dto.amount > fromAcc.currentBalance) {
      throw new Error(
        `Số tiền chuyển (${dto.amount.toLocaleString('vi-VN')} đ) vượt quá số dư hiện có (${fromAcc.currentBalance.toLocaleString('vi-VN')} đ).`
      );
    }

    fromAcc.currentBalance -= dto.amount;
    toAcc.currentBalance += dto.amount;
    accounts[fromIndex] = fromAcc;
    accounts[toIndex] = toAcc;
    saveState(STORAGE_KEYS.ACCOUNTS, accounts);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const payTxId = `TX-PAY-${Date.now()}`;
    const recTxId = `TX-REC-${Date.now() + 1}`;

    const noteText = dto.note || `Chuyển tiền từ ${fromAcc.accountName} sang ${toAcc.accountName}`;

    const payTx: LedgerTransaction = {
      id: payTxId,
      transactionCode: `PC-TRF-${dateStr}-${randCode}`,
      accountId: fromAcc.id,
      accountName: fromAcc.accountName,
      branchId: fromAcc.branchId,
      transactionType: 'PAYMENT',
      category: 'Chuyển quỹ nội bộ',
      amount: dto.amount,
      balanceAfter: fromAcc.currentBalance,
      counterpartyType: 'INTERNAL',
      counterpartyName: toAcc.accountName,
      description: noteText,
      referenceDocType: 'INTERNAL_TRANSFER',
      referenceDocId: recTxId,
      sourceModuleName: 'INTERNAL_TRANSFER',
      linkedTransactionId: recTxId,
      isAutomated: true,
      createdBy: dto.performedBy || 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const recTx: LedgerTransaction = {
      id: recTxId,
      transactionCode: `PT-TRF-${dateStr}-${randCode}`,
      accountId: toAcc.id,
      accountName: toAcc.accountName,
      branchId: toAcc.branchId,
      transactionType: 'RECEIPT',
      category: 'Chuyển quỹ nội bộ',
      amount: dto.amount,
      balanceAfter: toAcc.currentBalance,
      counterpartyType: 'INTERNAL',
      counterpartyName: fromAcc.accountName,
      description: noteText,
      referenceDocType: 'INTERNAL_TRANSFER',
      referenceDocId: payTxId,
      sourceModuleName: 'INTERNAL_TRANSFER',
      linkedTransactionId: payTxId,
      isAutomated: true,
      createdBy: dto.performedBy || 'Nguyễn Trường An',
      createdAt: now.toISOString(),
    };

    const transactions = loadState<LedgerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
    transactions.unshift(recTx);
    transactions.unshift(payTx);
    saveState(STORAGE_KEYS.TRANSACTIONS, transactions);

    return { payment: payTx, receipt: recTx };
  },

  /**
   * Reconciles cash drawer against physical count (Blind Cash Count - Kiểm quỹ mù 3 bước)
   */
  async reconcileCashAccount(dto: CashReconciliationDTO): Promise<LedgerTransaction | null> {
    const diff = dto.actualCountedBalance - dto.systemBalance;

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
      description: `Điều chỉnh kiểm kê kết ca: ${dto.reason.trim()} (Chênh lệch: ${diff > 0 ? '+' : ''}${diff.toLocaleString('vi-VN')} đ)`,
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
    let totalSafeDepositBalance = 0;

    accounts.forEach((acc) => {
      if (acc.isSafeDeposit) {
        totalSafeDepositBalance += acc.currentBalance;
      } else if (acc.accountType === 'CASH') {
        totalCashInDrawers += acc.currentBalance;
      } else {
        totalBankDeposits += acc.currentBalance;
      }
    });

    let totalReceipts = 0;
    let totalPayments = 0;

    transactions.forEach((tx) => {
      if (tx.isVoided) return; // Skip voided entries in active cash flow
      if (tx.transactionType === 'RECEIPT') {
        totalReceipts += tx.amount;
      } else if (tx.transactionType === 'PAYMENT') {
        totalPayments += tx.amount;
      }
    });

    const totalClosingBalance = totalCashInDrawers + totalBankDeposits + totalSafeDepositBalance;
    const totalOpeningBalance = totalClosingBalance - totalReceipts + totalPayments;

    return {
      totalOpeningBalance,
      totalReceipts,
      totalPayments,
      totalClosingBalance,
      totalCashInDrawers,
      totalBankDeposits,
      totalSafeDepositBalance,
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
};
