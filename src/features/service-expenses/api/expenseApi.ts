import { EXPENSE_CATEGORY_LABELS } from '../types/expense.types';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { financeHttpClient } from '../../../api/financeHttpClient';
import { generateUuidV7 } from '../../../utils/uuid';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  CreateExpenseRequest,
  ExpenseFilterParams,
  ExpenseSummaryDto,
  PayExpenseRequest,
  ServiceExpenseDto,
} from '../types/expense.types';

function isGuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

const TAX_BLACKLIST_KEYWORDS = [
  'phạt',
  'vi phạm',
  'cá nhân',
  'từ thiện',
  'phong bì',
  'không hóa đơn',
  'rút vốn',
  'tiếp khách không chứng từ',
];

/**
 * Checks whether an expense item matches the non-deductible tax blacklist
 */
export function isExpenseTaxBlacklisted(
  category?: string,
  vendorName?: string,
  note?: string
): boolean {
  const combined = `${category || ''} ${vendorName || ''} ${note || ''}`.toLowerCase();
  return TAX_BLACKLIST_KEYWORDS.some((kw) => combined.includes(kw));
}

/**
 * Maps Backend ExpenseVoucherResponse to Frontend ServiceExpenseDto
 */
function mapVoucherToExpenseDto(v: any): ServiceExpenseDto {
  const dateStr = v.expenseDate ? String(v.expenseDate).substring(0, 10) : new Date().toISOString().substring(0, 10);
  const statusStr: 'Pending' | 'Paid' | 'Cancelled' =
    v.status === 'Paid'
      ? 'Paid'
      : v.status === 'Cancelled' || v.status === 'Reversed'
      ? 'Cancelled'
      : 'Pending';

  const blacklisted = isExpenseTaxBlacklisted(v.category, v.beneficiaryName, v.note);
  const isTaxDeductible =
    typeof v.isTaxDeductible === 'boolean' ? v.isTaxDeductible && !blacklisted : !blacklisted;

  return {
    expenseId: v.id || v.voucherCode,
    voucherCode: v.voucherCode || v.id,
    branchId: v.branchId || '',
    branchName: v.branchId ? `Chi nhánh ${String(v.branchId).substring(0, 8)}` : 'Toàn hệ thống',
    category: v.category || 'Other',
    amount: Number(v.amount || 0),
    status: statusStr,
    expenseDate: dateStr,
    dueDate: dateStr,
    vendorName: v.beneficiaryName || 'Nhà cung cấp',
    cashBookId: v.paymentSourceAccountId || null,
    attachedBillUrl: v.evidenceAttachmentUrl || null,
    isRecurring: false,
    isTaxDeductible,
    invoiceNumber: v.invoiceNumber || null,
    sellerTaxCode: v.sellerTaxCode || null,
    isFlaggedAsSuspiciousSplit: Boolean(v.isFlaggedAsSuspiciousSplit),
    suspiciousReason: v.suspiciousReason || null,
    note: v.note || null,
    createdAt: v.expenseDate || new Date().toISOString(),
  };
}

/**
 * Fetch paged list of service expenses from live Backend API
 * @param params Filter criteria
 * @returns Promise with paged items
 */
export const getServiceExpenses = async (
  params?: ExpenseFilterParams
): Promise<PagedResult<ServiceExpenseDto>> => {
  const queryParams: Record<string, any> = {
    page: params?.page || 1,
    pageSize: params?.pageSize || 20,
  };
  if (params?.branchId && isGuid(params.branchId)) queryParams.branchId = params.branchId;
  if (params?.fromDate) queryParams.fromDate = `${params.fromDate}T00:00:00Z`;
  if (params?.toDate) queryParams.toDate = `${params.toDate}T23:59:59Z`;

  const res = await financeHttpClient.get<ApiResponse<any[]>>('/expenses', {
    params: queryParams,
  });

  if (res.data?.data && Array.isArray(res.data.data)) {
    let items = res.data.data.map(mapVoucherToExpenseDto);
    if (params?.keyword) {
      const q = params.keyword.trim().toLowerCase();
      items = items.filter(
        (i) =>
          (i.voucherCode && i.voucherCode.toLowerCase().includes(q)) ||
          (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
          i.expenseId.toLowerCase().includes(q) ||
          i.vendorName.toLowerCase().includes(q) ||
          (i.note && i.note.toLowerCase().includes(q))
      );
    }
    if (params?.status) {
      items = items.filter((i) => i.status === params.status);
    }
    return {
      items,
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      totalItems: items.length,
    };
  }

  return {
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
  };
};

/**
 * Fetch monthly KPI summary metrics from live Backend API
 * @param branchId Optional branch filter
 * @param fromDate Optional start date
 * @param toDate Optional end date
 * @returns Promise with summary numbers
 */
export const getExpenseSummary = async (
  branchId?: string,
  fromDate?: string,
  toDate?: string
): Promise<ExpenseSummaryDto> => {
  const queryParams: Record<string, any> = {};
  if (branchId && isGuid(branchId)) queryParams.branchId = branchId;
  if (fromDate) queryParams.fromDate = `${fromDate}T00:00:00Z`;
  if (toDate) queryParams.toDate = `${toDate}T23:59:59Z`;

  try {
    const res = await financeHttpClient.get<ApiResponse<any>>('/expenses/summary', {
      params: queryParams,
    });

    if (res.data?.data) {
      const s = res.data.data;
      return {
        totalExpenseThisMonth: Number(s.totalAmount || 0),
        totalPendingAmount: Number(s.pendingApprovalAmount || 0),
        totalPaidAmount: Number(s.paidAmount || 0),
        overdueCount: Number(s.suspiciousCount || 0),
      };
    }
  } catch {
    // Fallback to zero summary if user role is restricted (e.g. Employee)
  }

  return {
    totalExpenseThisMonth: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
    overdueCount: 0,
  };
};

/**
 * Create a new service expense entry via live Backend API
 * @param data New expense payload
 * @returns Promise with created record
 */
export const createServiceExpense = async (
  data: CreateExpenseRequest
): Promise<ServiceExpenseDto> => {
  const idempotencyKey = typeof generateUuidV7 === 'function' ? generateUuidV7() : ('idemp-' + Date.now());
  const categoryLabel = EXPENSE_CATEGORY_LABELS[data.category] || data.category;
  const blacklisted = isExpenseTaxBlacklisted(categoryLabel, data.vendorName, data.note);
  const isTaxDeductible =
    typeof data.isTaxDeductible === 'boolean' ? data.isTaxDeductible && !blacklisted : !blacklisted;

  const payload = {
    branchId: isGuid(data.branchId) ? data.branchId : null,
    beneficiaryName: data.vendorName,
    category: categoryLabel,
    amount: data.amount,
    paymentSourceType: 1, // FinanceAccountType.Till = 1
    paymentSourceAccountId: null,
    isTaxDeductible,
    invoiceNumber: data.invoiceNumber || null,
    sellerTaxCode: data.sellerTaxCode || null,
    evidenceAttachmentUrl: data.attachedBillUrl || null,
    note: data.note || null,
  };

  const res = await financeHttpClient.post<ApiResponse<any>>('/expenses', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
  });

  if (res.data?.data) {
    return mapVoucherToExpenseDto(res.data.data);
  }

  throw new Error(res.data?.message || 'Không thể tạo phiếu chi phí dịch vụ');
};

/**
 * Confirm payment for a service expense via live Backend API
 * @param expenseId Target ID
 * @param data Payment payload
 * @returns Promise with updated record
 */
export const payServiceExpense = async (
  expenseId: string,
  data: PayExpenseRequest
): Promise<ServiceExpenseDto> => {
  const idempotencyKey = typeof generateUuidV7 === 'function' ? generateUuidV7() : ('idemp-' + Date.now());

  // Tự động approve nếu đang chờ duyệt
  await financeHttpClient
    .post(`/expenses/${expenseId}/approve`, {
      expenseId,
      note: 'Duyệt tự động trước khi xuất quỹ chi tiền',
    })
    .catch(() => null);

  // Xác định PaymentSourceType chuẩn enum Backend FinanceAccountType (Till = 1, Safe = 2, Bank = 3)
  let paymentSourceType = data.paymentMethod === 'Cash' ? 1 : 3;
  let paymentSourceAccountId = data.paidFromAccountId;

  if (paymentSourceAccountId) {
    const accounts = await cashbookService.getCashAccounts();
    const matched = accounts.find((a) => a.id === paymentSourceAccountId);
    if (matched) {
      if (matched.isSafeDeposit) {
        paymentSourceType = 2; // FinanceAccountType.Safe = 2
      } else if (matched.accountType === 'BANK') {
        paymentSourceType = 3; // FinanceAccountType.Bank = 3
      } else {
        paymentSourceType = 1; // FinanceAccountType.Till = 1
      }
    }
  } else {
    // Tự động gán tài khoản hợp lệ nếu chưa chọn
    const accounts = await cashbookService.getCashAccounts();
    const fallback = accounts.find((a) =>
      data.paymentMethod === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'
    );
    if (fallback) {
      paymentSourceAccountId = fallback.id;
      paymentSourceType = fallback.isSafeDeposit ? 2 : fallback.accountType === 'BANK' ? 3 : 1;
    }
  }

  // Disburse xuất quỹ chi tiền trên Backend (tự động cập nhật Cashbook)
  const res = await financeHttpClient.post<ApiResponse<any>>(
    `/expenses/${expenseId}/disburse`,
    {
      expenseId,
      paymentSourceType,
      paymentSourceAccountId,
      note: data.note || 'Xuất quỹ chi tiền qua hệ thống',
    },
    {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    }
  );

  if (res.data?.data) {
    return mapVoucherToExpenseDto(res.data.data);
  }

  throw new Error(res.data?.message || 'Lỗi khi xuất quỹ thanh toán chi phí');
};

/**
 * Cancel a pending service expense via live Backend API
 * @param expenseId Target ID
 * @param reason Cancellation note
 * @returns Promise with boolean confirmation
 */
export const cancelServiceExpense = async (
  expenseId: string,
  reason: string
): Promise<boolean> => {
  const res = await financeHttpClient.post<ApiResponse<any>>(`/expenses/${expenseId}/cancel`, {
    expenseId,
    reason,
  });
  return !!res.data?.success;
};

/**
 * Reject a pending service expense approval via live Backend API
 * @param expenseId Target ID
 * @param reason Rejection note
 * @returns Promise with boolean confirmation
 */
export const rejectServiceExpense = async (
  expenseId: string,
  reason: string
): Promise<boolean> => {
  const res = await financeHttpClient.post<ApiResponse<any>>(`/expenses/${expenseId}/reject`, {
    expenseId,
    reason,
  });
  return !!res.data?.success;
};
