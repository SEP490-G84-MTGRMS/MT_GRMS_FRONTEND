import { httpClient } from '../../../api/httpClient';
import type { ApiResponse, PagedResult } from '../../../api/types';
import type { PayslipDetailedRecord } from '../types';

export interface PayslipAllowanceItemDto {
  name: string;
  amount: number;
}

export interface PayslipSummaryDto {
  id: string;
  payslipCode: string;
  periodMonth: string;
  branchId: string;
  branchName: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  salaryType: number | string; // 1: Monthly, 2: Hourly, 3: Shift
  workedDays: number;
  totalWorkHours: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  status: number | string; // 1: Unpaid, 2: Paid
  paidAt?: string | null;
  paymentMethod?: string | null;
  cashbookVoucherCode?: string | null;
}

export interface PayslipResponse {
  id: string;
  payslipCode: string;
  periodMonth: string;
  branchId: string;
  branchName: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  salaryType: number | string;
  baseRate: number;
  standardDays: number;
  standardDayHours: number;
  workedDays: number;
  totalWorkHours: number;
  totalShifts: number;
  otHours: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  baseSalaryEarned: number;
  overtimePay: number;
  totalAllowance: number;
  allowancesDetailJson?: string | null;
  totalEarnings: number;
  advanceDeduction: number;
  remainingDebt: number;
  socialInsurance: number;
  bhxhAmount: number;
  bhytAmount: number;
  bhtnAmount: number;
  totalDeductions: number;
  netSalary: number;
  status: number | string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paidBy?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankAccountHolder?: string | null;
  cashbookTransactionId?: string | null;
  cashbookVoucherCode?: string | null;
  note?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  otWeekday?: string | null;
  otSunday?: string | null;
}

export interface GeneratePayrollBatchRequest {
  periodMonth: string;
  branchId?: string;
  salaryTypeFilter?: number | string;
  note?: string;
}

export interface PayPayslipRequest {
  paymentMethod: string;
  note?: string;
  cashbookAccountId?: string;
}

export interface BatchPayPayslipsRequest {
  payslipIds: string[];
  paymentMethod: string;
  note?: string;
}

export interface BatchPayResultDto {
  totalRequested: number;
  successCount: number;
  failedCount: number;
  paidPayslipCodes: string[];
  errors: string[];
}

export interface PayslipQueryFilter {
  keyword?: string;
  periodMonth?: string;
  branchId?: string;
  status?: string | number; // 'ALL' | 'UNPAID' | 'PAID' or enum 1, 2
  page?: number;
  pageSize?: number;
}

/**
 * Trích xuất message lỗi từ ProblemDetails hoặc Axios Error
 */
export function extractErrorMessage(error: any, fallbackMessage: string): string {
  if (error?.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.detail) return data.detail;
    if (data.title) return data.title;
    if (data.errors && typeof data.errors === 'object') {
      const errorKeys = Object.keys(data.errors);
      if (errorKeys.length > 0) {
        const firstErr = data.errors[errorKeys[0]];
        if (Array.isArray(firstErr) && firstErr.length > 0) return firstErr[0];
        if (typeof firstErr === 'string') return firstErr;
      }
    }
  }
  if (error?.message) return error.message;
  return fallbackMessage;
}

export function normalizeSalaryType(salaryType: number | string | undefined): 'MONTHLY' | 'HOURLY' | 'SHIFT' {
  if (salaryType === 1 || salaryType === '1' || salaryType === 'Monthly' || salaryType === 'MONTHLY') return 'MONTHLY';
  if (salaryType === 2 || salaryType === '2' || salaryType === 'Hourly' || salaryType === 'HOURLY') return 'HOURLY';
  if (salaryType === 3 || salaryType === '3' || salaryType === 'Shift' || salaryType === 'SHIFT') return 'SHIFT';
  return 'MONTHLY';
}

export function normalizePayslipStatus(status: number | string | undefined): 'UNPAID' | 'PAID' {
  if (status === 3 || status === '3' || status === 'Paid' || status === 'PAID' || status === 'paid') return 'PAID';
  return 'UNPAID';
}

export function mapBackendSummaryToDetailedRecord(dto: PayslipSummaryDto): PayslipDetailedRecord {
  return {
    id: dto.id,
    payslipCode: dto.payslipCode,
    employeeId: dto.employeeId,
    employeeCode: dto.employeeCode,
    employeeName: dto.employeeName,
    branchName: dto.branchName,
    periodMonth: dto.periodMonth,
    salaryType: normalizeSalaryType(dto.salaryType),
    standardDays: 26,
    workedDays: dto.workedDays,
    totalWorkHours: dto.totalWorkHours,
    contractBaseSalary: dto.totalEarnings,
    baseRate: dto.totalEarnings,
    baseSalaryEarned: dto.totalEarnings,
    overtimePay: 0,
    otHours: 0,
    otRateWeekday: '150%',
    otRateSunday: '200%',
    otRatePercent: '150% (Thường) / 200% (CN)',
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    totalEarnings: dto.totalEarnings,
    lunchAllowance: 0,
    travelAllowance: 0,
    advanceDeduction: 0,
    socialInsurance: 0,
    totalDeductions: dto.totalDeductions,
    netSalary: dto.netSalary,
    status: normalizePayslipStatus(dto.status),
    paidAt: dto.paidAt ? dto.paidAt.replace('T', ' ').substring(0, 16) : undefined,
    paymentMethod: dto.paymentMethod ? (dto.paymentMethod.toUpperCase() as any) : undefined,
    cashbookVoucherCode: dto.cashbookVoucherCode || undefined,
  };
}

export function mapBackendDetailToDetailedRecord(dto: PayslipResponse): PayslipDetailedRecord {
  let parsedAllowances: Array<{ name: string; amount: number }> = [];
  if (dto.allowancesDetailJson) {
    try {
      parsedAllowances = JSON.parse(dto.allowancesDetailJson);
    } catch {
      parsedAllowances = [];
    }
  }

  return {
    id: dto.id,
    payslipCode: dto.payslipCode,
    employeeId: dto.employeeId,
    employeeCode: dto.employeeCode,
    employeeName: dto.employeeName,
    branchName: dto.branchName,
    periodMonth: dto.periodMonth,
    salaryType: normalizeSalaryType(dto.salaryType),
    baseRate: dto.baseRate,
    standardDays: dto.standardDays,
    standardDayHours: dto.standardDayHours,
    workedDays: dto.workedDays,
    totalWorkHours: dto.totalWorkHours,
    totalShifts: dto.totalShifts,
    totalLateMinutes: dto.totalLateMinutes,
    totalEarlyLeaveMinutes: dto.totalEarlyLeaveMinutes,
    paidLeaveDays: dto.paidLeaveDays ?? 0,
    unpaidLeaveDays: dto.unpaidLeaveDays ?? 0,
    otHours: dto.otHours,
    otRateWeekday: dto.otWeekday || '150%',
    otRateSunday: dto.otSunday || '200%',
    otRatePercent: dto.otWeekday ? `${dto.otWeekday} (Thường) / ${dto.otSunday || '200%'} (CN)` : '150% (Thường) / 200% (CN)',
    contractBaseSalary: dto.baseRate,
    baseSalaryEarned: dto.baseSalaryEarned,
    overtimePay: dto.overtimePay,
    totalAllowance: dto.totalAllowance,
    allowancesDetailJson: dto.allowancesDetailJson || undefined,
    allowances: parsedAllowances,
    lunchAllowance: 0,
    travelAllowance: 0,
    totalEarnings: dto.totalEarnings,
    advanceDeduction: dto.advanceDeduction,
    remainingDebt: dto.remainingDebt,
    socialInsurance: dto.socialInsurance,
    bhxh: dto.bhxhAmount,
    bhyt: dto.bhytAmount,
    bhtn: dto.bhtnAmount,
    totalDeductions: dto.totalDeductions,
    netSalary: dto.netSalary,
    status: normalizePayslipStatus(dto.status),
    paidAt: dto.paidAt ? dto.paidAt.replace('T', ' ').substring(0, 16) : undefined,
    paymentMethod: dto.paymentMethod ? (dto.paymentMethod.toUpperCase() as any) : undefined,
    paidBy: dto.paidBy || undefined,
    cashbookVoucherCode: dto.cashbookVoucherCode || undefined,
    approvedBy: dto.approvedBy || undefined,
    note: dto.note || undefined,
    bankName: dto.bankName || undefined,
    bankAccountNumber: dto.bankAccountNumber || undefined,
    bankAccountName: dto.bankAccountHolder || undefined,
  };
}

export const payslipApi = {
  /**
   * Lấy danh sách phiếu lương có phân trang và bộ lọc (kỳ tháng, chi nhánh, trạng thái, từ khóa)
   * GET /api/v1/payslips
   */
  async getPayslipsPaged(filter: PayslipQueryFilter = {}): Promise<PagedResult<PayslipSummaryDto>> {
    const params: Record<string, any> = {
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 50,
    };

    if (filter.keyword && filter.keyword.trim() !== '') {
      params.keyword = filter.keyword.trim();
    }

    if (filter.periodMonth && filter.periodMonth.trim() !== '') {
      params.periodMonth = filter.periodMonth.trim();
    }

    if (filter.branchId && filter.branchId !== 'ALL' && filter.branchId !== 'all') {
      params.branchId = filter.branchId;
    }

    if (filter.status && filter.status !== 'ALL' && filter.status !== 'all') {
      // Backend enum: 1 = Unpaid, 2 = Partial, 3 = Paid
      if (filter.status === 'UNPAID' || filter.status === 1 || filter.status === '1') {
        params.status = 1;
      } else if (filter.status === 'PAID' || filter.status === 3 || filter.status === '3') {
        params.status = 3;
      }
    }

    const res = await httpClient.get<ApiResponse<PagedResult<PayslipSummaryDto>>>('/payslips', {
      params,
    });

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Không thể tải danh sách phiếu lương.');
  },

  /**
   * Xem chi tiết phiếu lương theo ID
   * GET /api/v1/payslips/{id}
   */
  async getPayslipById(id: string): Promise<PayslipResponse> {
    const res = await httpClient.get<ApiResponse<PayslipResponse>>(`/payslips/${id}`);

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || `Không thể tải chi tiết phiếu lương #${id}.`);
  },

  /**
   * Tính toán và khởi tạo bảng lương hàng loạt cho kỳ tháng
   * POST /api/v1/payslips/generate-batch
   */
  async generateMonthlyPayroll(data: GeneratePayrollBatchRequest): Promise<PayslipResponse[]> {
    const payload: Record<string, any> = {
      periodMonth: data.periodMonth,
    };

    if (data.branchId && data.branchId !== 'ALL' && data.branchId !== 'all') {
      payload.branchId = data.branchId;
    }

    if (data.salaryTypeFilter && data.salaryTypeFilter !== 'ALL') {
      payload.salaryTypeFilter = data.salaryTypeFilter;
    }

    if (data.note) {
      payload.note = data.note;
    }

    const res = await httpClient.post<ApiResponse<PayslipResponse[]>>(
      '/payslips/generate-batch',
      payload
    );

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Không thể khởi tạo bảng tính lương.');
  },

  /**
   * Chi trả một phiếu lương đơn lẻ
   * POST /api/v1/payslips/{id}/pay
   */
  async payPayslip(id: string, data: PayPayslipRequest): Promise<PayslipResponse> {
    const res = await httpClient.post<ApiResponse<PayslipResponse>>(`/payslips/${id}/pay`, data);

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || `Không thể chi trả phiếu lương #${id}.`);
  },

  /**
   * Tính toán lại bảng lương cho kỳ tháng (bảo lưu các phiếu đã chi trả, chỉ tính lại các phiếu chưa thanh toán)
   * POST /api/v1/payslips/recalculate
   */
  async recalculatePayroll(data: GeneratePayrollBatchRequest): Promise<PayslipResponse[]> {
    const payload: Record<string, any> = {
      periodMonth: data.periodMonth,
    };

    if (data.branchId && data.branchId !== 'ALL' && data.branchId !== 'all') {
      payload.branchId = data.branchId;
    }

    if (data.salaryTypeFilter && data.salaryTypeFilter !== 'ALL') {
      payload.salaryTypeFilter = data.salaryTypeFilter;
    }

    if (data.note) {
      payload.note = data.note;
    }

    const res = await httpClient.post<ApiResponse<PayslipResponse[]>>(
      '/payslips/recalculate',
      payload
    );

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Không thể tính toán lại bảng lương.');
  },

  /**
   * Chi trả đồng loạt nhiều phiếu lương (Batch pay)
   * POST /api/v1/payslips/batch-pay
   */
  async batchPayPayslips(data: BatchPayPayslipsRequest): Promise<BatchPayResultDto> {
    const res = await httpClient.post<ApiResponse<BatchPayResultDto>>('/payslips/batch-pay', data);

    if (res.data?.success && res.data.data) {
      return res.data.data;
    }

    throw new Error(res.data?.message || 'Không thể thực hiện chi trả hàng loạt.');
  },
};
