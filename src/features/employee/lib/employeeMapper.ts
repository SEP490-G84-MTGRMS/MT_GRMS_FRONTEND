import type { Employee, SalaryConfig } from '../types';

export interface EmployeeBackendSummaryDto {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  address?: string;
  startDate?: string;
  note?: string;
  branchId: string;
  branchName: string;
  status: string;
  salaryType: string;
  baseRate: number;
  otWeekday?: string;
  otSunday?: string;
  debtAmount?: number;
  userId?: string;
  userName?: string;
  createdAt: string;
  hasFaceId?: boolean;
}

export interface EmployeeBackendDetailDto {
  id: string;
  employeeCode: string;
  fullName: string;
  citizenId: string;
  dateOfBirth?: string;
  gender?: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  faceDescriptor?: string | null;
  faceImageUrls?: string | null;
  address?: string;
  startDate?: string;
  note?: string;
  otWeekday?: string;
  otSunday?: string;
  branchId: string;
  branchName: string;
  userId?: string;
  userName?: string;
  role?: string;
  salaryType: string;
  baseRate: number;
  allowances?: Array<{ id?: string; name: string; amount: number }>;
  debtAmount: number;
  status: string;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountHolder?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateEmployeePayload {
  employeeCode?: string;
  fullName: string;
  citizenId: string;
  phone: string;
  branchId: string;
  email?: string;
  address?: string;
  startDate?: string;
  note?: string;
  otWeekday?: string;
  otSunday?: string;
  dateOfBirth?: string;
  gender?: string;
  salaryType: string;
  baseRate: number;
  allowances?: Array<{ id?: string; name: string; amount: number }>;
  bankAccountNumber?: string;
  bankName?: string;
  bankAccountHolder?: string;
  avatarUrl?: string;
  faceDescriptor?: string | null;
  faceImageUrls?: string | null;
  userId?: string;
  userName?: string;
  password?: string;
  role?: string;
}

export interface UpdateEmployeePayload extends CreateEmployeePayload {}

export interface CreateIdentityAccountPayload {
  username: string;
  password: string;
  role?: string;
  displayName?: string;
}

export interface EmployeeQueryFilterParams {
  keyword?: string;
  branchId?: string;
  branchIds?: string[];
  status?: string;
  salaryType?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Chuyển đổi từ EmployeeBackendSummaryDto sang Employee model của Frontend
 */
export const mapBackendSummaryToEmployee = (dto: EmployeeBackendSummaryDto): Employee => {
  const salaryType = (dto.salaryType?.toLowerCase() || 'monthly') as 'monthly' | 'hourly' | 'shift';
  const salaryConfig: SalaryConfig = {
    salaryType,
    baseSalary: dto.baseRate || 0,
    otWeekday: dto.otWeekday || '150%',
    otSunday: dto.otSunday || '200%',
    otDayOff: '200%',
    otHoliday: '300%',
    allowances: [],
  };

  return {
    id: dto.id,
    employeeCode: dto.employeeCode,
    fullName: dto.fullName,
    phone: dto.phone,
    email: dto.email || '',
    avatarUrl: dto.avatarUrl || '',
    gender: 'male',
    dateOfBirth: '',
    citizenId: '',
    address: dto.address,
    startDate: dto.startDate ? dto.startDate.split('T')[0] : '',
    note: dto.note,
    salaryBranchId: dto.branchId,
    salaryBranchName: dto.branchName || 'Chưa gán',
    workingBranchIds: dto.branchId ? [dto.branchId] : [],
    workingBranchNames: dto.branchName ? [dto.branchName] : ['Chưa gán'],
    userId: dto.userId,
    userName: dto.userName,
    status: dto.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    debtAmount: dto.debtAmount || 0,
    hasFaceId: dto.hasFaceId ?? false,
    salaryConfig,
  };
};

/**
 * Chuyển đổi từ EmployeeBackendDetailDto sang Employee model chi tiết
 */
export const mapBackendDetailToEmployee = (dto: EmployeeBackendDetailDto): Employee => {
  const salaryType = (dto.salaryType?.toLowerCase() || 'monthly') as 'monthly' | 'hourly' | 'shift';
  const allowances: Array<{ id: string; name: string; type: string; amount: number; enabled: boolean }> = [];
  if (dto.allowances && dto.allowances.length > 0) {
    dto.allowances.forEach((a, idx) => {
      allowances.push({
        id: a.id || `al-${idx}`,
        name: a.name,
        type: 'monthly',
        amount: a.amount,
        enabled: true,
      });
    });
  }

  const salaryConfig: SalaryConfig = {
    salaryType,
    baseSalary: dto.baseRate || 0,
    otWeekday: dto.otWeekday || '150%',
    otSunday: dto.otSunday || '200%',
    otDayOff: '200%',
    otHoliday: '300%',
    allowances,
  };

  const genderVal = dto.gender?.toLowerCase() === 'female' ? 'female' : 'male';

  return {
    id: dto.id,
    employeeCode: dto.employeeCode,
    fullName: dto.fullName,
    phone: dto.phone,
    email: dto.email || '',
    avatarUrl: dto.avatarUrl || '',
    gender: genderVal,
    dateOfBirth: dto.dateOfBirth ? dto.dateOfBirth.split('T')[0] : '',
    citizenId: dto.citizenId,
    address: dto.address,
    startDate: dto.startDate ? dto.startDate.split('T')[0] : '',
    note: dto.note,
    salaryBranchId: dto.branchId,
    salaryBranchName: dto.branchName || 'Chưa gán',
    workingBranchIds: dto.branchId ? [dto.branchId] : [],
    workingBranchNames: dto.branchName ? [dto.branchName] : ['Chưa gán'],
    userId: dto.userId,
    userName: dto.userName,
    status: dto.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active',
    debtAmount: dto.debtAmount || 0,
    bankAccountNumber: dto.bankAccountNumber,
    bankName: dto.bankName,
    bankAccountHolder: dto.bankAccountHolder,
    faceDescriptor: dto.faceDescriptor,
    faceImageUrls: dto.faceImageUrls,
    hasFaceId: !!dto.faceDescriptor,
    salaryConfig,
  };
};

/**
 * Chuyển đổi từ dữ liệu form sang CreateEmployeePayload gửi lên Backend
 */
export const mapFormToCreatePayload = (
  emp: Partial<Employee> & { password?: string; role?: string },
  salaryConfig?: SalaryConfig,
  branchId?: string
): CreateEmployeePayload => {
  const targetBranchId =
    branchId ||
    emp.salaryBranchId ||
    (emp.workingBranchIds && emp.workingBranchIds[0]) ||
    '';

  const activeAllowances = (salaryConfig?.allowances || [])
    .filter((a) => a.enabled && a.amount > 0)
    .map((a) => {
      const isRealGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(a.id);
      return {
        id: isRealGuid ? a.id : undefined,
        name: a.name.trim(),
        amount: a.amount,
      };
    });

  return {
    employeeCode: emp.employeeCode?.trim().toUpperCase() || undefined,
    fullName: (emp.fullName || '').trim(),
    citizenId: (emp.citizenId || '').trim(),
    phone: (emp.phone || '').trim(),
    branchId: targetBranchId,
    email: emp.email?.trim() || undefined,
    address: emp.address?.trim() || undefined,
    startDate: emp.startDate
      ? emp.startDate.includes('T')
        ? emp.startDate
        : `${emp.startDate}T00:00:00Z`
      : undefined,
    note: emp.note?.trim() || undefined,
    otWeekday: salaryConfig?.otWeekday || undefined,
    otSunday: salaryConfig?.otSunday || undefined,
    dateOfBirth: emp.dateOfBirth
      ? emp.dateOfBirth.includes('T')
        ? emp.dateOfBirth
        : `${emp.dateOfBirth}T00:00:00Z`
      : undefined,
    gender: emp.gender || 'male',
    salaryType: salaryConfig?.salaryType || 'monthly',
    baseRate: salaryConfig?.baseSalary || 0,
    allowances: activeAllowances,
    bankAccountNumber: emp.bankAccountNumber?.trim() || undefined,
    bankName: emp.bankName?.trim() || undefined,
    bankAccountHolder: emp.bankAccountHolder?.trim().toUpperCase() || undefined,
    avatarUrl: emp.avatarUrl?.trim() || undefined,
    faceDescriptor: emp.faceDescriptor ?? undefined,
    faceImageUrls: typeof emp.faceImageUrls === 'string' ? emp.faceImageUrls : Array.isArray(emp.faceImageUrls) ? JSON.stringify(emp.faceImageUrls) : undefined,
    userId: emp.userId?.trim() || undefined,
    userName: emp.userName?.trim() || undefined,
    password: emp.password?.trim() || undefined,
    role: emp.role?.trim() || undefined,
  };
};
