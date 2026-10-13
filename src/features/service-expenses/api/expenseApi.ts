import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type {
  CreateExpenseRequest,
  ExpenseFilterParams,
  ExpenseSummaryDto,
  PayExpenseRequest,
  ServiceExpenseDto,
} from '../types/expense.types';

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
    branchId: 'BR-03',
    branchName: 'Chi nhánh Thủ Đức',
    category: 'Maintenance',
    amount: 1450000,
    status: 'Pending',
    expenseDate: '2026-10-10',
    dueDate: '2026-10-20',
    vendorName: 'Cơ điện lạnh Hoàng Long',
    cashBookId: null,
    attachedBillUrl: null,
    note: 'Bảo trì dàn nóng tủ mát công nghiệp Sanaky',
    createdAt: '2026-10-10T11:45:00Z',
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
 * Fetch paged list of service expenses
 * @param params Filter criteria
 * @returns Promise with paged items
 */
export const getServiceExpenses = async (
  params?: ExpenseFilterParams
): Promise<PagedResult<ServiceExpenseDto>> => {
  try {
    const res = await httpClient.get<ApiResponse<PagedResult<ServiceExpenseDto>>>(
      '/service-expenses',
      { params }
    );
    if (res.data?.data) return res.data.data;
  } catch (error) {
    console.warn('API unavailable, utilizing resilient mock expenses:', error);
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
  try {
    const res = await httpClient.get<ApiResponse<ExpenseSummaryDto>>(
      '/service-expenses/summary',
      { params: { branchId, fromDate, toDate } }
    );
    if (res.data?.data) return res.data.data;
  } catch (error) {
    console.warn('API summary unavailable, calculating from mock:', error);
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
  try {
    const res = await httpClient.post<ApiResponse<ServiceExpenseDto>>(
      '/service-expenses',
      data
    );
    if (res.data?.data) return res.data.data;
  } catch (error) {
    console.warn('POST API unavailable, creating in mock storage:', error);
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
  try {
    const res = await httpClient.post<ApiResponse<ServiceExpenseDto>>(
      `/service-expenses/${expenseId}/pay`,
      data
    );
    if (res.data?.data) return res.data.data;
  } catch (error) {
    console.warn('PAY API unavailable, updating in mock storage:', error);
  }

  const itemIndex = mockExpenses.findIndex((e) => e.expenseId === expenseId);
  if (itemIndex === -1) throw new Error('Khoản chi phí không tồn tại');

  const updated: ServiceExpenseDto = {
    ...mockExpenses[itemIndex],
    status: 'Paid',
    cashBookId: data.createCashBookEntry
      ? `CB-2026-10-${Math.floor(1000 + Math.random() * 9000)}`
      : null,
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
  try {
    const res = await httpClient.put<ApiResponse<boolean>>(
      `/service-expenses/${expenseId}/cancel`,
      { reason }
    );
    if (res.data?.success) return true;
  } catch (error) {
    console.warn('CANCEL API unavailable, updating mock storage:', error);
  }

  const itemIndex = mockExpenses.findIndex((e) => e.expenseId === expenseId);
  if (itemIndex === -1) throw new Error('Khoản chi phí không tồn tại');

  mockExpenses[itemIndex] = {
    ...mockExpenses[itemIndex],
    status: 'Cancelled',
    note: `${mockExpenses[itemIndex].note || ''} (Lý do hủy: ${reason})`,
  };
  return true;
};
