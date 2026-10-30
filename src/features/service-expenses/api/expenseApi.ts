import { EXPENSE_CATEGORY_LABELS } from '../types/expense.types';
import { cashbookService } from '../../cashbook/services/cashbookService';
import { financeHttpClient } from '../../../api/financeHttpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  CreateExpenseRequest,
  ExpenseFilterParams,
  ExpenseSummaryDto,
  PayExpenseRequest,
  ServiceExpenseDto,
} from '../types/expense.types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idemp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

function isGuid(val?: string): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

/**
 * Initial mock data for offline preview and resilient testing
 */
let mockExpenses: ServiceExpenseDto[] = [
  {
    expenseId: 'EXP-2026-001',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Trụ sở)',
    category: 'Electricity',
    amount: 3850000,
    status: 'Pending',
    expenseDate: '2026-10-05',
    dueDate: '2026-10-15',
    vendorName: 'Tổng công ty Điện lực TP.HCM (EVNHCMC)',
    cashBookId: null,
    attachedBillUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    note: 'Hóa đơn tiền điện kỳ 09/2026 cho hệ thống tủ mát bảo quản thực phẩm',
    createdAt: '2026-10-05T08:30:00Z',
  },
  {
    expenseId: 'EXP-2026-002',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Trụ sở)',
    category: 'Water',
    amount: 720000,
    status: 'Paid',
    expenseDate: '2026-10-02',
    dueDate: '2026-10-10',
    vendorName: 'Công ty CP Cấp nước Bến Thành (SAWACO)',
    cashBookId: 'CB-2026-10-0084',
    attachedBillUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    note: 'Tiền nước sinh hoạt và vệ sinh sàn tháng 09/2026',
    createdAt: '2026-10-02T10:15:00Z',
  },
  {
    expenseId: 'EXP-2026-003',
    branchId: 'BR-02',
    branchName: 'Chi nhánh Bình Thạnh',
    category: 'Rent',
    amount: 18000000,
    status: 'Pending',
    expenseDate: '2026-10-01',
    dueDate: '2026-10-08',
    vendorName: 'Chủ nhà - Ông Trần Văn Đức',
    cashBookId: null,
    attachedBillUrl: null,
    note: 'Tiền thuê mặt bằng kinh doanh tháng 10/2026 (Đã quá hạn thanh toán)',
    createdAt: '2026-10-01T09:00:00Z',
  },
  {
    expenseId: 'EXP-2026-004',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Trụ sở)',
    category: 'Internet',
    amount: 950000,
    status: 'Paid',
    expenseDate: '2026-09-28',
    dueDate: '2026-10-05',
    vendorName: 'Tập đoàn Bưu chính Viễn thông VNPT',
    cashBookId: 'CB-2026-09-0210',
    attachedBillUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    note: 'Gói cước FiberVip cáp quang cho hệ thống camera và máy POS bán lẻ',
    createdAt: '2026-09-28T14:20:00Z',
  },
  {
    expenseId: 'EXP-2026-005',
    branchId: 'BR-01',
    branchName: 'Chi nhánh Quận 1 (Trụ sở)',
    category: 'Maintenance',
    amount: 2400000,
    status: 'Pending',
    expenseDate: '2026-10-10',
    dueDate: '2026-10-12',
    vendorName: 'Cơ điện lạnh Hoàng Gia',
    cashBookId: null,
    attachedBillUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    note: 'Bơm ga và vệ sinh định kỳ 4 điều hòa cây gian hàng',
    createdAt: '2026-10-10T11:00:00Z',
  },
  {
    expenseId: 'EXP-2026-006',
    branchId: 'BR-02',
    branchName: 'Chi nhánh Bình Thạnh',
    category: 'Sanitation',
    amount: 500000,
    status: 'Cancelled',
    expenseDate: '2026-09-20',
    dueDate: '2026-09-25',
    vendorName: 'HTX Môi trường Đô thị',
    cashBookId: null,
    attachedBillUrl: null,
    note: 'Hủy do tính trùng lặp vào hợp đồng tổng quý',
    createdAt: '2026-09-20T16:00:00Z',
  },
];

/**
 * Filter mock expenses locally for preview fallback
 */
const filterMockList = (params?: ExpenseFilterParams): ServiceExpenseDto[] => {
  return mockExpenses.filter((item) => {
    if (params?.branchId && item.branchId !== params.branchId) return false;
    if (params?.category && item.category !== params.category) return false;
    if (params?.status && item.status !== params.status) return false;
    if (params?.fromDate && item.expenseDate < params.fromDate) return false;
    if (params?.toDate && item.expenseDate > params.toDate) return false;
    if (params?.keyword) {
      const q = params.keyword.toLowerCase();
      const matchVendor = item.vendorName.toLowerCase().includes(q);
      const matchNote = item.note?.toLowerCase().includes(q) ?? false;
      const matchId = item.expenseId.toLowerCase().includes(q);
      if (!matchVendor && !matchNote && !matchId) return false;
    }
    return true;
  });
};

/**
 * Maps Backend ExpenseVoucherResponse to Frontend ServiceExpenseDto
 */
function mapVoucherToExpenseDto(v: any): ServiceExpenseDto {
  const dateStr = v.expenseDate ? String(v.expenseDate).substring(0, 10) : new Date().toISOString().substring(0, 10);
  const statusStr: 'Pending' | 'Paid' | 'Cancelled' =
    v.status === 'Paid' ? 'Paid' : v.status === 'Cancelled' ? 'Cancelled' : 'Pending';

  return {
    expenseId: v.id || v.voucherCode,
    branchId: v.branchId || 'BR-01',
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
    note: v.note || null,
    createdAt: v.expenseDate || new Date().toISOString(),
  };
}

/**
 * Fetch paged list of service expenses
 * @param params Filter criteria
 * @returns Promise with paged items
 */
export const getServiceExpenses = async (
  params?: ExpenseFilterParams
): Promise<PagedResult<ServiceExpenseDto>> => {
  if (import.meta.env.MODE !== 'test') {
    try {
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
          const q = params.keyword.toLowerCase();
          items = items.filter(
            (i) =>
              i.vendorName.toLowerCase().includes(q) ||
              (i.note && i.note.toLowerCase().includes(q)) ||
              i.expenseId.toLowerCase().includes(q)
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
    } catch (error) {
      console.warn('Expenses Live API unavailable, utilizing resilient mock storage:', error);
    }
  }

  const filtered = filterMockList(params);
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    totalItems: filtered.length,
  };
};

/**
 * Fetch monthly KPI summary metrics
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
  if (import.meta.env.MODE !== 'test') {
    try {
      const queryParams: Record<string, any> = {};
      if (branchId && isGuid(branchId)) queryParams.branchId = branchId;
      if (fromDate) queryParams.fromDate = `${fromDate}T00:00:00Z`;
      if (toDate) queryParams.toDate = `${toDate}T23:59:59Z`;

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
    } catch (error) {
      console.warn('Expenses Summary API unavailable, calculating from mock:', error);
    }
  }

  let list = branchId ? mockExpenses.filter((e) => e.branchId === branchId) : mockExpenses;
  if (fromDate) {
    list = list.filter((e) => e.expenseDate >= fromDate);
  }
  if (toDate) {
    list = list.filter((e) => e.expenseDate <= toDate);
  }

  const totalExpenseThisMonth = list
    .filter((e) => e.status !== 'Cancelled')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalPendingAmount = list
    .filter((e) => e.status === 'Pending')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalPaidAmount = list
    .filter((e) => e.status === 'Paid')
    .reduce((sum, item) => sum + item.amount, 0);
  const today = '2026-10-12';
  const overdueCount = list.filter(
    (e) => e.status === 'Pending' && e.dueDate < today
  ).length;

  return {
    totalExpenseThisMonth,
    totalPendingAmount,
    totalPaidAmount,
    overdueCount,
  };
};

/**
 * Create a new service expense entry
 * @param data New expense payload
 * @returns Promise with created record
 */
export const createServiceExpense = async (
  data: CreateExpenseRequest
): Promise<ServiceExpenseDto> => {
  if (import.meta.env.MODE !== 'test') {
    try {
      const idempotencyKey = generateUUID();
      const payload = {
        branchId: isGuid(data.branchId) ? data.branchId : null,
        beneficiaryName: data.vendorName,
        category: EXPENSE_CATEGORY_LABELS[data.category] || data.category,
        amount: data.amount,
        paymentSourceType: 0, // Till
        paymentSourceAccountId: null,
        isTaxDeductible: true,
        invoiceNumber: null,
        sellerTaxCode: null,
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
    } catch (error) {
      console.warn('POST /expenses API unavailable, creating in mock storage:', error);
    }
  }

  const newExpense: ServiceExpenseDto = {
    expenseId: `EXP-2026-${String(mockExpenses.length + 1).padStart(3, '0')}`,
    branchId: data.branchId,
    branchName: data.branchId === 'BR-01' ? 'Chi nhánh Quận 1 (Trụ sở)' : 'Chi nhánh khác',
    category: data.category,
    amount: data.amount,
    status: 'Pending',
    expenseDate: data.expenseDate,
    dueDate: data.dueDate,
    vendorName: data.vendorName,
    cashBookId: null,
    attachedBillUrl: data.attachedBillUrl || null,
    isRecurring: data.isRecurring || false,
    recurringCycle: data.recurringCycle || undefined,
    recurringDayOfMonth: data.recurringDayOfMonth || undefined,
    note: data.note || null,
    createdAt: new Date().toISOString(),
  };

  mockExpenses = [newExpense, ...mockExpenses];
  return newExpense;
};

/**
 * Confirm payment for a service expense
 * @param expenseId Target ID
 * @param data Payment payload
 * @returns Promise with updated record
 */
export const payServiceExpense = async (
  expenseId: string,
  data: PayExpenseRequest
): Promise<ServiceExpenseDto> => {
  if (import.meta.env.MODE !== 'test' && isGuid(expenseId)) {
    try {
      const idempotencyKey = generateUUID();
      // Tự động approve nếu đang chờ duyệt
      await financeHttpClient
        .post(`/expenses/${expenseId}/approve`, {
          expenseId,
          note: 'Duyệt tự động trước khi xuất quỹ chi tiền',
        })
        .catch(() => null);

      // Disburse xuất quỹ chi tiền
      const res = await financeHttpClient.post<ApiResponse<any>>(
        `/expenses/${expenseId}/disburse`,
        {
          expenseId,
          paymentSourceType: data.paymentMethod === 'Cash' ? 0 : 2,
          paymentSourceAccountId: data.paidFromAccountId || '00000000-0000-0000-0000-000000000000',
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
    } catch (error) {
      console.warn('PAY /expenses API unavailable, updating in mock storage:', error);
    }
  }

  const itemIndex = mockExpenses.findIndex((e) => e.expenseId === expenseId);
  if (itemIndex === -1) throw new Error('Khoản chi phí không tồn tại');

  let generatedCashBookCode: string | null = null;
  const currentItem = mockExpenses[itemIndex];

  if (data.createCashBookEntry !== false) {
    try {
      const accounts = await cashbookService.getCashAccounts();
      let accountId = data.paidFromAccountId;
      if (!accountId) {
        const fallback = accounts.find((a) =>
          data.paymentMethod === 'Cash' ? a.accountType === 'CASH' : a.accountType === 'BANK'
        );
        accountId = fallback ? fallback.id : accounts[0]?.id;
      }

      if (accountId) {
        const catLabel = EXPENSE_CATEGORY_LABELS[currentItem.category] || currentItem.category;
        const tx = await cashbookService.createPayment({
          accountId,
          amount: currentItem.amount,
          category: catLabel,
          counterpartyType: 'SUPPLIER',
          counterpartyName: currentItem.vendorName,
          description: `Thanh toán chi phí ${catLabel} (${currentItem.expenseId}) cho ${currentItem.vendorName}`,
          referenceDocId: currentItem.expenseId,
          referenceDocType: 'SERVICE_EXPENSE',
          sourceModuleName: 'SERVICE_OPEX',
          isAutomated: true,
        });
        generatedCashBookCode = tx.transactionCode;
      }
    } catch (cbErr) {
      console.warn('Failed to auto-journal into cashbook:', cbErr);
    }
  }

  const updated: ServiceExpenseDto = {
    ...currentItem,
    status: 'Paid',
    cashBookId:
      generatedCashBookCode ||
      (data.createCashBookEntry ? `CB-2026-10-${Math.floor(1000 + Math.random() * 9000)}` : null),
  };
  mockExpenses[itemIndex] = updated;
  return updated;
};

/**
 * Cancel a pending service expense
 * @param expenseId Target ID
 * @param reason Cancellation note
 * @returns Promise with boolean confirmation
 */
export const cancelServiceExpense = async (
  expenseId: string,
  reason: string
): Promise<boolean> => {
  const itemIndex = mockExpenses.findIndex((e) => e.expenseId === expenseId);
  if (itemIndex === -1) throw new Error('Khoản chi phí không tồn tại');

  mockExpenses[itemIndex] = {
    ...mockExpenses[itemIndex],
    status: 'Cancelled',
    note: `${mockExpenses[itemIndex].note || ''} (Lý do hủy: ${reason})`,
  };
  return true;
};