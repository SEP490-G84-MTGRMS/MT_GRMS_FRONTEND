import { describe, it, expect } from 'vitest';
import {
  buildEmployeesWorkbook,
  buildPayslipsWorkbook,
} from '../lib/employeeExcelExporter';
import type { Employee, PayslipDetailedRecord } from '../types';

describe('employeeExcelExporter', () => {
  it('builds Employees workbook with required 11 columns and formatted values', async () => {
    const employees: Employee[] = [
      {
        id: 'emp-1',
        employeeCode: 'NV001',
        fullName: 'Nguyễn Văn An',
        phone: '0987654321',
        citizenId: '001099012345',
        dateOfBirth: '1999-05-15',
        gender: 'male',
        workingBranchIds: ['br-1'],
        workingBranchNames: ['Chi nhánh Trung tâm'],
        startDate: '2026-01-10',
        userName: 'an.nv',
        address: '123 Cầu Giấy, Hà Nội',
        status: 'active',
        debtAmount: 0,
      } as unknown as Employee,
    ];

    const workbook = await buildEmployeesWorkbook(employees, {
      branchName: 'Chi nhánh Trung tâm',
      statusLabel: 'Đang làm việc',
    });

    const sheet = workbook.getWorksheet('Danh sách nhân viên');
    expect(sheet).toBeDefined();

    const headerValues = [];
    for (let c = 1; c <= 11; c++) {
      headerValues.push(sheet!.getRow(4).getCell(c).value);
    }
    expect(headerValues).toEqual([
      'STT',
      'Mã nhân viên',
      'Tên nhân viên',
      'Số điện thoại',
      'Số CMND/CCCD',
      'Ngày sinh',
      'Giới tính',
      'Chi nhánh làm việc',
      'Ngày bắt đầu làm việc',
      'Tài khoản đăng nhập',
      'Địa chỉ',
    ]);

    const row1 = sheet!.getRow(5);
    expect(row1.getCell(1).value).toBe(1);
    expect(row1.getCell(2).value).toBe('NV001');
    expect(row1.getCell(3).value).toBe('Nguyễn Văn An');
    expect(row1.getCell(4).value).toBe('0987654321');
    expect(row1.getCell(5).value).toBe('001099012345');
    expect(row1.getCell(6).value).toBe('15/05/1999');
    expect(row1.getCell(7).value).toBe('Nam');
    expect(row1.getCell(8).value).toBe('Chi nhánh Trung tâm');
    expect(row1.getCell(9).value).toBe('10/01/2026');
    expect(row1.getCell(10).value).toBe('an.nv');
    expect(row1.getCell(11).value).toBe('123 Cầu Giấy, Hà Nội');
  });

  it('builds Payslips workbook with 20 columns and Excel SUM/SUMIF/COUNTIF summary formulas', async () => {
    const payslips: PayslipDetailedRecord[] = [
      {
        id: 'ps-1',
        employeeId: 'emp-1',
        employeeCode: 'NV001',
        employeeName: 'Nguyễn Văn An',
        branchName: 'Chi nhánh Trung tâm',
        periodMonth: '2026-11',
        salaryType: 'MONTHLY',
        standardDays: 26,
        workedDays: 25,
        totalWorkHours: 200,
        paidLeaveDays: 1,
        totalLateMinutes: 10,
        totalEarlyLeaveMinutes: 0,
        otHours: 4,
        contractBaseSalary: 10_000_000,
        baseSalaryEarned: 9_615_385,
        overtimePay: 400_000,
        lunchAllowance: 500_000,
        travelAllowance: 200_000,
        totalAllowance: 700_000,
        totalEarnings: 10_715_385,
        socialInsurance: 1_050_000,
        advanceDeduction: 1_000_000,
        totalDeductions: 2_050_000,
        netSalary: 8_665_385,
        status: 'PAID',
        paymentMethod: 'BANK_TRANSFER',
        paidAt: '2026-11-24T10:00:00Z',
      },
      {
        id: 'ps-2',
        employeeId: 'emp-2',
        employeeCode: 'NV002',
        employeeName: 'Trần Thị Bình',
        branchName: 'Chi nhánh Trung tâm',
        periodMonth: '2026-11',
        salaryType: 'HOURLY',
        standardDays: 26,
        workedDays: 15,
        totalWorkHours: 120,
        paidLeaveDays: 0,
        totalLateMinutes: 0,
        totalEarlyLeaveMinutes: 5,
        otHours: 0,
        contractBaseSalary: 30_000,
        baseSalaryEarned: 3_600_000,
        overtimePay: 0,
        lunchAllowance: 0,
        travelAllowance: 0,
        totalAllowance: 0,
        totalEarnings: 3_600_000,
        socialInsurance: 0,
        advanceDeduction: 0,
        totalDeductions: 0,
        netSalary: 3_600_000,
        status: 'UNPAID',
      },
    ];

    const workbook = await buildPayslipsWorkbook(payslips, {
      periodMonth: '2026-11',
      branchName: 'Chi nhánh Trung tâm',
    });

    const sheet = workbook.getWorksheet('Bảng lương');
    expect(sheet).toBeDefined();

    // Summary block formulas (Rows 4..7)
    expect(sheet!.getRow(4).getCell(4).value).toEqual({ formula: 'COUNTA(B10:B11)', result: 2 });
    expect(sheet!.getRow(5).getCell(4).value).toEqual({ formula: 'SUM(Q10:Q11)', result: 12265385 });
    expect(sheet!.getRow(6).getCell(4).value).toEqual({
      formula: 'SUMIF(R10:R11,"Đã thanh toán",Q10:Q11)',
      result: 8665385,
    });
    expect(sheet!.getRow(6).getCell(8).value).toEqual({
      formula: 'COUNTIF(R10:R11,"Đã thanh toán")',
      result: 1,
    });
    expect(sheet!.getRow(7).getCell(4).value).toEqual({
      formula: 'SUMIF(R10:R11,"Chưa thanh toán",Q10:Q11)',
      result: 3600000,
    });

    // Header row (row 9) has 20 columns
    expect(sheet!.getRow(9).getCell(1).value).toBe('STT');
    expect(sheet!.getRow(9).getCell(17).value).toBe('Thực nhận');
    expect(sheet!.getRow(9).getCell(20).value).toBe('Ngày thanh toán');

    // Footer SUM row (row 12)
    expect(sheet!.getRow(12).getCell(17).value).toEqual({
      formula: 'SUM(Q10:Q11)',
      result: 12265385,
    });
  });
});
