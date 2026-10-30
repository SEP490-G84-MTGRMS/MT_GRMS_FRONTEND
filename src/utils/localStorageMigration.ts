/**
 * Tiện ích kiểm tra, sao lưu và dọn dẹp an toàn dữ liệu tài chính lưu trong LocalStorage
 * Phòng ngừa mất dữ liệu sổ quỹ và công nợ phát sinh ngoại tuyến của người dùng.
 */

export interface OfflineFinancialDataSummary {
  hasData: boolean;
  cashAccountsCount: number;
  cashTransactionsCount: number;
  cashTransitsCount: number;
  debtLedgersCount: number;
  customersCount: number;
  keysFound: string[];
}

export const FINANCIAL_STORAGE_KEYS = {
  CASH_ACCOUNTS: 'mt_grms_cash_accounts_v2',
  CASH_TRANSACTIONS: 'mt_grms_cash_transactions_v2',
  CASH_TRANSITS: 'mt_grms_cash_transits_v2',
  DEBT_LEDGERS: 'MT_GRMS_DEBT_LEDGERS_CACHE',
  CUSTOMERS: 'MT_GRMS_CUSTOMERS_CACHE',
} as const;

/**
 * Kiểm tra xem trình duyệt có dữ liệu sổ quỹ hoặc công nợ cũ chưa đồng bộ lên Backend không
 */
export function checkPendingOfflineData(): OfflineFinancialDataSummary {
  const summary: OfflineFinancialDataSummary = {
    hasData: false,
    cashAccountsCount: 0,
    cashTransactionsCount: 0,
    cashTransitsCount: 0,
    debtLedgersCount: 0,
    customersCount: 0,
    keysFound: [],
  };

  try {
    const rawAccounts = localStorage.getItem(FINANCIAL_STORAGE_KEYS.CASH_ACCOUNTS);
    if (rawAccounts) {
      const parsed = JSON.parse(rawAccounts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        summary.cashAccountsCount = parsed.length;
        summary.keysFound.push(FINANCIAL_STORAGE_KEYS.CASH_ACCOUNTS);
      }
    }

    const rawTx = localStorage.getItem(FINANCIAL_STORAGE_KEYS.CASH_TRANSACTIONS);
    if (rawTx) {
      const parsed = JSON.parse(rawTx);
      if (Array.isArray(parsed) && parsed.length > 0) {
        summary.cashTransactionsCount = parsed.length;
        summary.keysFound.push(FINANCIAL_STORAGE_KEYS.CASH_TRANSACTIONS);
      }
    }

    const rawTransits = localStorage.getItem(FINANCIAL_STORAGE_KEYS.CASH_TRANSITS);
    if (rawTransits) {
      const parsed = JSON.parse(rawTransits);
      if (Array.isArray(parsed) && parsed.length > 0) {
        summary.cashTransitsCount = parsed.length;
        summary.keysFound.push(FINANCIAL_STORAGE_KEYS.CASH_TRANSITS);
      }
    }

    const rawDebt = localStorage.getItem(FINANCIAL_STORAGE_KEYS.DEBT_LEDGERS);
    if (rawDebt) {
      const parsed = JSON.parse(rawDebt);
      if (Array.isArray(parsed) && parsed.length > 0) {
        summary.debtLedgersCount = parsed.length;
        summary.keysFound.push(FINANCIAL_STORAGE_KEYS.DEBT_LEDGERS);
      }
    }

    const rawCustomers = localStorage.getItem(FINANCIAL_STORAGE_KEYS.CUSTOMERS);
    if (rawCustomers) {
      const parsed = JSON.parse(rawCustomers);
      if (Array.isArray(parsed) && parsed.length > 0) {
        summary.customersCount = parsed.length;
        summary.keysFound.push(FINANCIAL_STORAGE_KEYS.CUSTOMERS);
      }
    }

    summary.hasData = summary.keysFound.length > 0;
  } catch (error) {
    console.error('Lỗi khi kiểm tra dữ liệu tài chính trong localStorage:', error);
  }

  return summary;
}

/**
 * Đóng gói toàn bộ dữ liệu tài chính cũ thành file JSON và kích hoạt tải về máy
 */
export function exportLocalStorageBackup(): boolean {
  try {
    const backupPayload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      appVersion: 'MT-GRMS-Pre-Migration',
      data: {},
    };

    const dataObj: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(FINANCIAL_STORAGE_KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          dataObj[name] = JSON.parse(raw);
        } catch {
          dataObj[name] = raw;
        }
      }
    }

    backupPayload.data = dataObj;

    const jsonStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `mt_grms_financial_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Xuất file backup localStorage thất bại:', error);
    return false;
  }
}

/**
 * Dọn dẹp an toàn các key tài chính sau khi người dùng đã sao lưu hoặc xác nhận
 */
export function safeClearFinancialLocalStorage(confirmed: boolean = false): boolean {
  if (!confirmed) {
    console.warn('safeClearFinancialLocalStorage: Thao tác bị từ chối do chưa có cờ xác nhận confirmed=true.');
    return false;
  }

  try {
    for (const key of Object.values(FINANCIAL_STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
    console.info('Đã dọn dẹp các cache tài chính cũ trong localStorage an toàn.');
    return true;
  } catch (error) {
    console.error('Lỗi khi dọn dẹp localStorage:', error);
    return false;
  }
}
