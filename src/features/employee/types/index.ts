export type EmployeeStatus = 'active' | 'inactive';

export type SalaryType = 'monthly' | 'hourly' | 'shift';

export type ApprovalRequestType = 'profile' | 'attendance';

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Department {
  id: string;
  name: string;
  employeeCount?: number;
}

export interface JobTitle {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
  isMain?: boolean;
}

export interface AllowanceItem {
  id: string;
  name: string;
  type: string;
  amount: number;
  enabled: boolean;
}

export interface SalaryConfig {
  salaryType: SalaryType;
  baseSalary: number; // Mức lương chính (tháng hoặc giờ)
  otWeekday: string;  // e.g. "150%"
  otSunday: string;   // e.g. "200%"
  otDayOff: string;   // e.g. "200%"
  otHoliday: string;  // e.g. "300%"
  allowances: AllowanceItem[];
}

export interface WorkShift {
  id: string;
  shiftName: string; // Sáng (06:00 - 14:00), Chiều (14:00 - 22:00), Hành chính (08:00 - 17:00)
  dayOfWeek: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  dateStr: string;
  branchName: string;
  note?: string;
}

export interface PayslipItem {
  id: string;
  period: string; // Tháng 09/2026
  baseSalary: number;
  otSalary: number;
  allowanceTotal: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  paidAmount: number;
  remainingDebt: number;
  status: 'paid' | 'partial' | 'unpaid';
  createdDate: string;
}

export interface DebtTransaction {
  id: string;
  date: string;
  code: string; // PC00001
  type: 'salary_payment' | 'advance_payment'; // Thanh toán lương / Tạm ứng
  amount: number;
  method: 'cash' | 'transfer';
  accountNumber?: string;
  note?: string;
  remainingDebtAfter: number;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType; // profile | attendance
  employeeId: string;
  employeeName: string;
  avatarUrl?: string;
  branchName: string;
  title: string;
  description: string;
  createdAt: string;
  status: ApprovalRequestStatus;
  detailPayload?: Record<string, any>;
}

export interface Employee {
  id: string;
  employeeCode: string;
  attendanceCode?: string;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: string;
  citizenId?: string;
  address?: string;
  city?: string;
  
  // Work info
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleName?: string;
  startDate?: string;
  salaryBranchId: string;
  salaryBranchName: string;
  workingBranchIds: string[];
  workingBranchNames: string[];
  userId?: string;
  userName?: string;
  note?: string;
  hasWarning?: boolean;

  // Bank info
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountHolder?: string;

  // Status & Financial summary
  status: EmployeeStatus;
  debtAmount: number; // Nợ và tạm ứng (Dương = shop còn nợ NV; Âm = NV đang tạm ứng)

  // Sub-modules
  salaryConfig?: SalaryConfig;
  workSchedule?: WorkShift[];
  payslips?: PayslipItem[];
  debtHistory?: DebtTransaction[];
}

export interface EmployeeFilterState {
  keyword: string;
  status: 'all' | 'active' | 'inactive';
  workingBranchId: string;
  salaryBranchId: string;
  departmentId?: string;
  jobTitleId?: string;
}

export interface WorkShiftDefinition {
  id: string;
  name: string; // Ca sáng, Ca chiều, Ca tối, Ca hành chính
  startTime: string; // 07:00
  endTime: string; // 12:30
  totalHours: number; // 5.5
  checkInAllowance: string; // Trước 30p - Sau 15p
  breakTime?: string; // 30 phút
  color: string; // #3B82F6, #10B981, #F59E0B, #8B5CF6
  status: 'active' | 'inactive';
  branchId?: string;
  branchName?: string;
}

export interface ScheduleAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  shiftId: string;
  shiftName: string;
  shiftTime: string;
  shiftColor: string;
  dayOfWeek: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  dateStr: string;
  branchName: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  avatarUrl?: string;
  shiftId: string;
  shiftName: string;
  dayOfWeek: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
  dateStr: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'ontime' | 'late' | 'early' | 'not_checked' | 'absent';
  lateMinutes?: number;
  workHours?: number;
  gpsLocation?: string;
  deviceInfo?: string;
}

export interface PayslipDetailedRecord {
  id: string; // PL004173
  employeeId: string;
  employeeCode: string; // NV001
  employeeName: string; // Dung Phạm
  jobTitle: string; // Thu ngân trưởng
  branchName: string; // Chi nhánh trung tâm
  periodMonth: string; // 2026-10
  
  // Thông số công
  standardDays: number; // 26
  workedDays: number; // 24.5
  otHours: number; // 8.5
  contractBaseSalary: number; // 8,000,000
  
  // Thu nhập (Earnings)
  baseSalaryEarned: number; // Lương ngày công
  overtimePay: number; // Lương tăng ca
  lunchAllowance: number; // Phụ cấp ăn trưa
  travelAllowance: number; // Phụ cấp đi lại
  bonus: number; // Thưởng doanh số / chuyên cần
  totalEarnings: number; // Tổng thu nhập trước trừ

  // Khấu trừ (Deductions)
  advanceDeduction: number; // Trừ tạm ứng
  socialInsurance: number; // BHXH (10.5%)
  violationDeduction: number; // Giảm trừ vi phạm
  totalDeductions: number; // Tổng giảm trừ

  // Thực lĩnh & Thanh toán
  netSalary: number; // Thực nhận = Earnings - Deductions
  status: 'UNPAID' | 'PAID';
  paidAt?: string; // Ngày trả
  paymentMethod?: 'VIETQR' | 'CASH';
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface PayrollFilterState {
  periodMonth: string;
  status: 'ALL' | 'UNPAID' | 'PAID';
  searchKeyword: string;
}


