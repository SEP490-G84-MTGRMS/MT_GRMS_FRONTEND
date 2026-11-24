import { financeHttpClient } from '../../../api/financeHttpClient';
import type { ApiResponse } from '../../../api/types';
import type {
  CustomerDto,
  CreateCustomerInput,
  UpdateCustomerInput,
  CollectDebtInput,
  CustomerKpiSummary,
  DebtFilterStatus,
  CustomerDebtLedgerDto,
} from '../types/customer.types';

interface DebtRepaymentResult {
  remainingDebt: number;
}

interface BackendCustomerDebtLedgerItem {
  id: string;
  entryCode: string;
  customerId: string;
  entryType: string;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  referenceCode: string;
  description: string;
  occurredAtUtc: string;
}

/**
 * Customer CRM & Accounts Receivable (FE-08) Live API Service
 * Backed by PostgreSQL Neon DB & customer-level debt balance.
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
        debtStatus:
          params?.debtStatus && params.debtStatus !== 'ALL'
            ? params.debtStatus
            : undefined,
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
      membershipTier: input.membershipTier || 'Standard',
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
      membershipTier: input.membershipTier,
      status: input.status,
    });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Cập nhật khách hàng thất bại');
    }

    return res.data.data;
  },

  /**
   * Collect against the customer's total debt and generate a cashbook receipt.
   */
  async collectDebt(input: CollectDebtInput, getIdempotencyKey: (payload: object) => string): Promise<DebtRepaymentResult> {
    if (input.amount <= 0) {
      throw new Error('Số tiền thu nợ phải lớn hơn 0 VNĐ');
    }

    const isCash = input.method === 'Cash';
    const paymentSourceType = isCash ? 1 : 3; // 1 = BranchTill, 3 = TenantBank
    const paymentSourceAccountId = input.targetAccountId;
    if (!paymentSourceAccountId) {
      throw new Error('Vui lòng chọn tài khoản nhận tiền đang hoạt động.');
    }
    const payload = {
      customerId: input.customerId,
      amount: input.amount,
      paymentSourceType,
      paymentSourceAccountId,
      notes: input.note || `Thu hồi công nợ khách hàng (${input.method})`,
      referenceCode: input.transactionRef?.trim() || undefined,
    };
    const idempotencyKey = getIdempotencyKey(payload);

    const res = await financeHttpClient.post<ApiResponse<DebtRepaymentResult>>(
      '/customers/debt/repay',
      {
        ...payload,
        referenceCode: payload.referenceCode || `REC-${idempotencyKey}`,
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Giao dịch thu nợ không thành công');
    }

    return res.data.data;
  },

  /**
   * Calculate KPI totals directly from Neon Database
   */
  async getKpiSummary(): Promise<CustomerKpiSummary> {
    const res = await financeHttpClient.get<ApiResponse<CustomerKpiSummary>>('/customers/debts/summary');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Không thể tải thống kê KPI công nợ');
    }
    return res.data.data;
  },

  /**
   * Get detailed debt audit history
   */
  async getCustomerDebtLedger(customerId: string): Promise<CustomerDebtLedgerDto[]> {
    try {
      const res = await financeHttpClient.get<ApiResponse<BackendCustomerDebtLedgerItem[]>>(
        `/customers/debt/ledger/${customerId}`
      );

      if (!res.data.success || !res.data.data) {
        return [];
      }

      return res.data.data.map((entry) => {
        const isDecrease =
          entry.entryType === 'DebtRepayment' || entry.entryType === 'GoodsReturnOffset';
        const isBankMethod =
          Boolean(entry.description?.includes('Bank')) ||
          Boolean(entry.description?.includes('VietQR'));

        return {
          id: entry.id,
          customerId: entry.customerId,
          transactionType: isDecrease ? 'DEBT_DECREASE' : 'DEBT_INCREASE',
          amount: entry.amount,
          referenceDocId: entry.referenceCode,
          paymentMethod:
            entry.entryType === 'DebtRepayment' ? (isBankMethod ? 'VietQR' : 'Cash') : undefined,
          cashTransactionCode:
            entry.entryType === 'DebtRepayment'
              ? entry.referenceCode || entry.entryCode
              : entry.entryCode,
          note: entry.description,
          createdAt: entry.occurredAtUtc,
        };
      });
    } catch {
      return [];
    }
  },

};
