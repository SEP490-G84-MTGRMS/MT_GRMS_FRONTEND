import { z } from 'zod';

/**
 * Expense payment status type
 */
export type ExpenseStatus = 'Pending' | 'Paid' | 'Cancelled';

/**
 * Service expense operational category
 */
export type ExpenseCategory =
  | 'Electricity'
  | 'Water'
  | 'Rent'
  | 'Internet'
  | 'Maintenance'
  | 'Sanitation'
  | 'Other';

/**
 * Label mapping for operational expense categories
 */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Electricity: 'Tiền điện',
  Water: 'Tiền nước',
  Rent: 'Thuê mặt bằng',
  Internet: 'Internet & Phần mềm',
  Maintenance: 'Sửa chữa & Bảo dưỡng',
  Sanitation: 'Vệ sinh môi trường',
  Other: 'Chi phí khác',
};

/**
 * DTO representing a service expense item
 */
export interface ServiceExpenseDto {
  expenseId: string;
  branchId: string;
  branchName?: string;
  category: ExpenseCategory;
  amount: number;
  status: ExpenseStatus;
  expenseDate: string;
  dueDate: string;
  vendorName: string;
  cashBookId?: string | null;
  attachedBillUrl?: string | null;
  note?: string | null;
  createdAt: string;
}

/**
 * DTO for monthly KPI metrics summary
 */
export interface ExpenseSummaryDto {
  totalExpenseThisMonth: number;
  totalPendingAmount: number;
  totalPaidAmount: number;
  overdueCount: number;
}

/**
 * Filter query parameters for querying service expenses
 */
export interface ExpenseFilterParams {
  page?: number;
  pageSize?: number;
  branchId?: string;
  category?: ExpenseCategory | '';
  status?: ExpenseStatus | '';
  fromDate?: string;
  toDate?: string;
  keyword?: string;
}

/**
 * Zod validation schema for creating a service expense
 */
export const createExpenseSchema = z.object({
  branchId: z.string().min(1, 'Vui lòng chọn chi nhánh áp dụng'),
  category: z.enum(
    [
      'Electricity',
      'Water',
      'Rent',
      'Internet',
      'Maintenance',
      'Sanitation',
      'Other',
    ] as const,
    { message: 'Vui lòng chọn danh mục chi phí' }
  ),
  amount: z
    .number({ message: 'Vui lòng nhập số tiền hợp lệ' })
    .positive('Số tiền chi phí phải lớn hơn 0'),
  expenseDate: z.string().min(1, 'Vui lòng chọn ngày phát sinh chi phí'),
  dueDate: z.string().min(1, 'Vui lòng chọn hạn thanh toán'),
  vendorName: z.string().trim().min(2, 'Tên nhà cung cấp tối thiểu 2 ký tự'),
  attachedBillUrl: z.string().url('Đường dẫn ảnh hóa đơn không hợp lệ').optional().or(z.literal('')),
  note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
});

export type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

/**
 * Request payload for creating a service expense
 */
export interface CreateExpenseRequest {
  branchId: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  dueDate: string;
  vendorName: string;
  attachedBillUrl?: string;
  note?: string;
}

/**
 * Zod validation schema for paying an expense
 */
export const payExpenseSchema = z.object({
  paymentMethod: z.enum(['Cash', 'BankTransfer'] as const, {
    message: 'Vui lòng chọn hình thức thanh toán',
  }),
  createCashBookEntry: z.boolean().default(true),
  paymentDate: z.string().min(1, 'Vui lòng chọn ngày thanh toán'),
  note: z.string().max(300, 'Ghi chú tối đa 300 ký tự').optional(),
});

export type PayExpenseFormValues = z.infer<typeof payExpenseSchema>;

/**
 * Request payload for paying an expense
 */
export interface PayExpenseRequest {
  paymentMethod: 'Cash' | 'BankTransfer';
  createCashBookEntry: boolean;
  paymentDate: string;
  note?: string;
}
