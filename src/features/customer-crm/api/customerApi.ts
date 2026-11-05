import { financeHttpClient } from '../../../api/financeHttpClient';
import type { ApiResponse } from '../../../api/types';
import { cashbookService } from '../../cashbook/services/cashbookService';
import type {
  CustomerDto,
  CreateCustomerInput,
  UpdateCustomerInput,
  CollectDebtInput,
  CustomerKpiSummary,
  VietQrConfig,
  DebtFilterStatus,
  CustomerDebtLedgerDto,
} from '../types/customer.types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

interface BackendCustomerDebtEntry {
  id: string;
  entryCode: string;
  customerId: string;
  entryType: string;
  amount: number;
  balanceAfter: number;
  prepaymentAfter: number;
  referenceCode: string;
  description: string;
  occurredAtUtc: string;
}

/**
 * Customer CRM & Accounts Receivable (FE-08) Live API Service
 * Backed by PostgreSQL Neon DB & EF Core CustomerDebtService (FIFO Debt Clearing)
 */
export const customerApi = {
  /**
   * Fetch customer list with search and filters directly from Backend Neon DB
   */
  async getCustomers(params?: {
    search?: string;
    tier?: string;
    debtStatus?: DebtFilterStatus;
  }): Promise<CustomerDto[]> {
    const res = await financeHttpClient.get<ApiResponse<CustomerDto[]>>('/customers', {
      params: {
        search: params?.search || undefined,
        tier: params?.tier && params.tier !== 'ALL' ? params.tier : undefined,
        debtStatus: params?.debtStatus && params.debtStatus !== 'ALL' ? params.debtStatus : undefined,
      },
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Không thể tải danh sách khách hàng từ máy chủ');
    }

    return res.data.data;
  },

  /**
   * Fetch a single customer by ID including open invoices and repayment history
   */
  async getCustomerById(id: string): Promise<CustomerDto | null> {
    try {
      const res = await financeHttpClient.get<ApiResponse<CustomerDto>>(`/customers/${id}`);
      if (!res.data.success || !res.data.data) {
        return null;
      }
      return res.data.data;
    } catch {
      return null;
    }
  },

  /**
   * Create a new customer in PostgreSQL Neon DB
   */
  async createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
    const res = await financeHttpClient.post<ApiResponse<CustomerDto>>('/customers', {
      phoneNumber: input.phoneNumber.trim(),
      fullName: input.fullName.trim(),
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      debtLimit: Number(input.debtLimit) || 0,
      membershipTier: input.membershipTier || 'Standard',
      allowDebt: (Number(input.debtLimit) || 0) > 0,
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Tạo khách hàng mới thất bại');
    }

    return res.data.data;
  },

  /**
   * Update existing customer information
   */
  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<CustomerDto> {
    const res = await financeHttpClient.put<ApiResponse<CustomerDto>>(`/customers/${id}`, {
      fullName: input.fullName !== undefined ? input.fullName.trim() : undefined,
      email: input.email !== undefined ? input.email.trim() : undefined,
      address: input.address !== undefined ? input.address.trim() : undefined,
      debtLimit: input.debtLimit !== undefined ? Number(input.debtLimit) : undefined,
      membershipTier: input.membershipTier,
      status: input.status,
      allowDebt: input.debtLimit !== undefined ? Number(input.debtLimit) > 0 : undefined,
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Cập nhật khách hàng thất bại');
    }

    return res.data.data;
  },

  /**
   * Execute FIFO debt collection receipt
   * Automatically clears oldest debt invoices first, generates SHA-256 cashbook receipt entry
   */
  async collectDebt(input: CollectDebtInput): Promise<CustomerDto> {
    if (input.amount <= 0) {
      throw new Error('Số tiền thu nợ phải lớn hơn 0 VNĐ');
    }

    const isCash = input.method === 'Cash';
    const paymentSourceType = isCash ? 1 : 3; // 1 = BranchTill, 3 = TenantBank

    let paymentSourceAccountId = input.targetAccountId;
    if (!paymentSourceAccountId) {
      const accounts = await cashbookService.getCashAccounts();
      const matched = accounts.find((a) =>
        isCash ? a.accountType === 'CASH' : a.accountType === 'BANK'
      );
      paymentSourceAccountId = matched?.id;
    }

    const idempotencyKey = generateUUID();

    const res = await financeHttpClient.post<ApiResponse<unknown>>(
      '/customers/debt/repay',
      {
        customerId: input.customerId,
        amount: input.amount,
        paymentSourceType,
        paymentSourceAccountId,
        referenceCode: `REC-${Date.now().toString().slice(-6)}`,
        notes: input.note || `Thu hồi công nợ khách hàng (${input.method})`,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    if (!res.data.success) {
      throw new Error(res.data.message || 'Giao dịch thu nợ không thành công');
    }

    // Refresh and return latest customer state
    const updated = await this.getCustomerById(input.customerId);
    if (!updated) {
      throw new Error('Đã thu nợ thành công nhưng không thể làm mới dữ liệu khách hàng');
    }

    return updated;
  },

  /**
   * Calculate KPI totals directly from Neon Database
   */
  async getKpiSummary(): Promise<CustomerKpiSummary> {
    const res = await financeHttpClient.get<ApiResponse<CustomerKpiSummary>>('/customers/kpi-summary');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Không thể tải thống kê KPI công nợ');
    }
    return res.data.data;
  },

  /**
   * Get detailed debt audit history from CustomerDebtEntries in Neon DB
   */
  async getCustomerDebtLedger(customerId: string): Promise<CustomerDebtLedgerDto[]> {
    try {
      const res = await financeHttpClient.get<ApiResponse<BackendCustomerDebtEntry[]>>(
        `/customers/debt/ledger/${customerId}`
      );

      if (!res.data.success || !res.data.data) {
        return [];
      }

      return res.data.data.map((entry) => ({
        id: entry.id,
        customerId: entry.customerId,
        transactionType:
          entry.entryType === 'DebtRepayment' || entry.entryType === 'GoodsReturnOffset'
            ? 'DEBT_DECREASE'
            : 'DEBT_INCREASE',
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        referenceDocId: entry.referenceCode,
        cashTransactionCode: entry.entryCode,
        note: entry.description,
        createdAt: entry.occurredAtUtc,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Generate VietQR configuration payload for instant QR scanning
   */
  generateVietQr(customer: CustomerDto, amount: number): VietQrConfig {
    const bankId = '970422'; // MB Bank Napas Bin
    const bankName = 'MB Bank (Ngân hàng Quân Đội)';
    const accountNo = '090123456789';
    const accountName = 'NGUYEN TRUONG AN';
    const cleanPhone = customer.phoneNumber.replace(/\D/g, '');
    const description = `THUNO ${cleanPhone}`;
    const safeAmount = Math.max(0, Math.round(amount));

    // Dynamic QR URL using vietqr standard
    const qrDataUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${safeAmount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      bankId,
      bankName,
      accountNo,
      accountName,
      amount: safeAmount,
      description,
      qrDataUrl,
    };
  },
};
