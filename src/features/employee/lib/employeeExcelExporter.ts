import ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import type { Employee, PayslipDetailedRecord } from '../types';

const formatDateVN = (iso?: string | null): string => {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY') : '';
};

const formatDateTimeVN = (iso?: string | null): string => {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '';
};

const formatPeriodLabel = (periodMonth?: string): string => {
  if (!periodMonth) return '';
  const parts = periodMonth.split('-');
  if (parts.length === 2) return `Tháng ${parts[1]}/${parts[0]}`;
  return periodMonth;
};

const formatGenderVN = (gender?: string): string => {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nữ';
  return '';
};

const formatSalaryTypeVN = (salaryType?: string): string => {
  switch ((salaryType || '').toUpperCase()) {
    case 'MONTHLY':
      return 'Lương tháng';
    case 'HOURLY':
      return 'Lương giờ';
    case 'SHIFT':
      return 'Lương ca';
    default:
      return salaryType || '';
  }
};

const formatActualWorkSummary = (p: PayslipDetailedRecord): string => {
  const type = (p.salaryType || '').toUpperCase();
  if (type === 'HOURLY') {
    return `${Number(p.totalWorkHours || 0)} giờ`;
  }
  if (type === 'SHIFT') {
    const shifts = p.totalShifts ?? p.workedDays ?? 0;
    return `${shifts} ca (${p.workedDays} công)`;
  }
  return `${p.workedDays} công (${Number(p.totalWorkHours || 0)} giờ)`;
};

const triggerWorkbookDownload = async (workbook: ExcelJS.Workbook, fileName: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
};

const headerFill: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F766E' },
};

const headerFont: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

export interface ExportEmployeesOptions {
  branchName?: string;
  statusLabel?: string;
}

export async function buildEmployeesWorkbook(
  employees: Employee[],
  options?: ExportEmployeesOptions
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MT_GRMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Danh sách nhân viên');

  // Title
  sheet.mergeCells('A1:K1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DANH SÁCH NHÂN VIÊN';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Subtitle
  sheet.mergeCells('A2:K2');
  const subCell = sheet.getCell('A2');
  const branchText = options?.branchName || 'Tất cả chi nhánh';
  const statusText = options?.statusLabel || 'Tất cả trạng thái';
  subCell.value = `Chi nhánh: ${branchText} | Trạng thái: ${statusText} | Ngày xuất: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  const headers = [
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
  ];

  const headerRow = sheet.getRow(4);
  headerRow.height = 24;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: idx === 0 ? 'center' : 'left', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  employees.forEach((emp, index) => {
    const row = sheet.getRow(5 + index);
    row.height = 20;
    const branchNames =
      emp.workingBranchNames && emp.workingBranchNames.length > 0
        ? emp.workingBranchNames.join(', ')
        : emp.salaryBranchName || '';
    const values = [
      index + 1,
      emp.employeeCode || '',
      emp.fullName || '',
      emp.phone || '',
      emp.citizenId || '',
      formatDateVN(emp.dateOfBirth),
      formatGenderVN(emp.gender),
      branchNames,
      formatDateVN(emp.startDate),
      emp.userName || emp.email || '',
      emp.address || '',
    ];

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
      cell.alignment = {
        horizontal: colIdx === 0 || colIdx === 5 || colIdx === 6 || colIdx === 8 ? 'center' : 'left',
        vertical: 'middle',
      };
      cell.border = thinBorder;
    });
  });

  const widths = [7, 16, 26, 16, 18, 14, 12, 28, 20, 24, 34];
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  return workbook;
}

export async function exportEmployeesToExcel(
  employees: Employee[],
  options?: ExportEmployeesOptions
): Promise<void> {
  const workbook = await buildEmployeesWorkbook(employees, options);
  const fileName = `Danh_sach_nhan_vien_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  await triggerWorkbookDownload(workbook, fileName);
}

export interface ExportPayslipsOptions {
  periodMonth: string;
  branchName?: string;
}

export async function buildPayslipsWorkbook(
  payslips: PayslipDetailedRecord[],
  options: ExportPayslipsOptions
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MT_GRMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Bảng lương');

  // Title
  sheet.mergeCells('A1:T1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `BẢNG LƯƠNG NHÂN VIÊN — ${formatPeriodLabel(options.periodMonth).toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  // Subtitle
  sheet.mergeCells('A2:T2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Kỳ lương: ${formatPeriodLabel(options.periodMonth)} | Chi nhánh: ${options.branchName || 'Tất cả chi nhánh'} | Ngày xuất báo cáo: ${dayjs().format('DD/MM/YYYY HH:mm')}`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 20;

  // Detail table starts at row 10 (header = row 9, summary block = rows 4..7)
  const HEADER_ROW = 9;
  const DATA_START_ROW = 10;
  const DATA_END_ROW = payslips.length > 0 ? DATA_START_ROW + payslips.length - 1 : DATA_START_ROW;

  const totalNet = payslips.reduce((acc, p) => acc + (p.netSalary || 0), 0);
  const totalPaid = payslips
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.netSalary || 0), 0);
  const totalUnpaid = payslips
    .filter((p) => p.status !== 'PAID')
    .reduce((acc, p) => acc + (p.netSalary || 0), 0);
  const paidCount = payslips.filter((p) => p.status === 'PAID').length;
  const unpaidCount = payslips.filter((p) => p.status !== 'PAID').length;

  // Khối thống kê tổng hợp (Rows 4..7) — dùng công thức Excel SUM, SUMIF, COUNTIF, COUNTA
  const summaryRows: Array<{
    label: string;
    value: ExcelJS.CellValue;
    numFmt?: string;
    extraLabel?: string;
    extraValue?: ExcelJS.CellValue;
  }> = [
    {
      label: 'Tổng số nhân viên (phiếu lương):',
      value: payslips.length > 0 ? { formula: `COUNTA(B${DATA_START_ROW}:B${DATA_END_ROW})`, result: payslips.length } : 0,
      numFmt: '#,##0',
    },
    {
      label: 'Tổng quỹ lương phải trả (NetSalary):',
      value: payslips.length > 0 ? { formula: `SUM(Q${DATA_START_ROW}:Q${DATA_END_ROW})`, result: totalNet } : 0,
      numFmt: '#,##0',
    },
    {
      label: 'Tổng tiền đã thanh toán:',
      value:
        payslips.length > 0
          ? { formula: `SUMIF(R${DATA_START_ROW}:R${DATA_END_ROW},"Đã thanh toán",Q${DATA_START_ROW}:Q${DATA_END_ROW})`, result: totalPaid }
          : 0,
      numFmt: '#,##0',
      extraLabel: 'Số phiếu đã thanh toán:',
      extraValue:
        payslips.length > 0
          ? { formula: `COUNTIF(R${DATA_START_ROW}:R${DATA_END_ROW},"Đã thanh toán")`, result: paidCount }
          : 0,
    },
    {
      label: 'Tổng tiền chưa thanh toán:',
      value:
        payslips.length > 0
          ? { formula: `SUMIF(R${DATA_START_ROW}:R${DATA_END_ROW},"Chưa thanh toán",Q${DATA_START_ROW}:Q${DATA_END_ROW})`, result: totalUnpaid }
          : 0,
      numFmt: '#,##0',
      extraLabel: 'Số phiếu chưa thanh toán:',
      extraValue:
        payslips.length > 0
          ? { formula: `COUNTIF(R${DATA_START_ROW}:R${DATA_END_ROW},"Chưa thanh toán")`, result: unpaidCount }
          : 0,
    },
  ];

  summaryRows.forEach((sr, idx) => {
    const r = sheet.getRow(4 + idx);
    r.height = 20;
    sheet.mergeCells(`B${4 + idx}:C${4 + idx}`);
    const labelCell = r.getCell(2);
    labelCell.value = sr.label;
    labelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    labelCell.border = thinBorder;
    r.getCell(3).border = thinBorder;

    const valCell = r.getCell(4);
    valCell.value = sr.value;
    valCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F766E' } };
    valCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (sr.numFmt) valCell.numFmt = sr.numFmt;
    valCell.border = thinBorder;

    if (sr.extraLabel !== undefined) {
      sheet.mergeCells(`F${4 + idx}:G${4 + idx}`);
      const exLabel = r.getCell(6);
      exLabel.value = sr.extraLabel;
      exLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      exLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      exLabel.border = thinBorder;
      r.getCell(7).border = thinBorder;

      const exVal = r.getCell(8);
      exVal.value = sr.extraValue;
      exVal.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      exVal.alignment = { horizontal: 'right', vertical: 'middle' };
      exVal.numFmt = '#,##0';
      exVal.border = thinBorder;
    }
  });

  const headers = [
    'STT',
    'Mã NV',
    'Họ và tên',
    'Chi nhánh',
    'Loại lương',
    'Ngày công chuẩn',
    'Công thực tế / Số ca / Giờ làm',
    'Nghỉ phép có lương',
    'Đi muộn (phút)',
    'Về sớm (phút)',
    'Lương cơ bản thực nhận',
    'Lương OT',
    'Tổng phụ cấp',
    'Tổng thu nhập',
    'BHXH (10.5%)',
    'Khấu trừ tạm ứng',
    'Thực nhận',
    'Trạng thái thanh toán',
    'Phương thức thanh toán',
    'Ngày thanh toán',
  ];

  const headerRow = sheet.getRow(HEADER_ROW);
  headerRow.height = 28;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  payslips.forEach((p, index) => {
    const row = sheet.getRow(DATA_START_ROW + index);
    row.height = 20;
    const allowanceTotal =
      p.totalAllowance ?? (p.lunchAllowance || 0) + (p.travelAllowance || 0);

    const rowValues: ExcelJS.CellValue[] = [
      index + 1,
      p.employeeCode || '',
      p.employeeName || '',
      p.branchName || '',
      formatSalaryTypeVN(p.salaryType),
      Number(p.standardDays || 0),
      formatActualWorkSummary(p),
      Number(p.paidLeaveDays || 0),
      Number(p.totalLateMinutes || 0),
      Number(p.totalEarlyLeaveMinutes || 0),
      Math.round(p.baseSalaryEarned || 0),
      Math.round(p.overtimePay || 0),
      Math.round(allowanceTotal),
      Math.round(p.totalEarnings || 0),
      Math.round(p.socialInsurance || 0),
      Math.round(p.advanceDeduction || 0),
      Math.round(p.netSalary || 0),
      p.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
      p.paymentMethod || '',
      formatDateTimeVN(p.paidAt),
    ];

    rowValues.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
      cell.border = thinBorder;
      if (colIdx >= 10 && colIdx <= 16) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else if (colIdx === 5 || colIdx === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.00';
      } else if (colIdx === 8 || colIdx === 9) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else if (colIdx === 0 || colIdx === 17 || colIdx === 18 || colIdx === 19) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Footer total row with SUM formulas
  if (payslips.length > 0) {
    const totalRowIndex = DATA_END_ROW + 1;
    const totalRow = sheet.getRow(totalRowIndex);
    totalRow.height = 24;
    sheet.mergeCells(`A${totalRowIndex}:J${totalRowIndex}`);
    const totalLabel = totalRow.getCell(1);
    totalLabel.value = 'TỔNG CỘNG';
    totalLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    for (let c = 1; c <= 20; c++) {
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      totalRow.getCell(c).border = thinBorder;
    }

    const colLetters = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
    const sums = [
      payslips.reduce((a, p) => a + Math.round(p.baseSalaryEarned || 0), 0),
      payslips.reduce((a, p) => a + Math.round(p.overtimePay || 0), 0),
      payslips.reduce((a, p) => a + Math.round(p.totalAllowance ?? ((p.lunchAllowance || 0) + (p.travelAllowance || 0))), 0),
      payslips.reduce((a, p) => a + Math.round(p.totalEarnings || 0), 0),
      payslips.reduce((a, p) => a + Math.round(p.socialInsurance || 0), 0),
      payslips.reduce((a, p) => a + Math.round(p.advanceDeduction || 0), 0),
      payslips.reduce((a, p) => a + Math.round(p.netSalary || 0), 0),
    ];

    colLetters.forEach((letter, i) => {
      const cell = totalRow.getCell(11 + i);
      cell.value = { formula: `SUM(${letter}${DATA_START_ROW}:${letter}${DATA_END_ROW})`, result: sums[i] };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    });
  }

  const widths = [6, 14, 24, 22, 14, 16, 26, 18, 15, 15, 22, 16, 16, 18, 16, 18, 18, 20, 22, 18];
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  return workbook;
}

export async function exportPayslipsToExcel(
  payslips: PayslipDetailedRecord[],
  options: ExportPayslipsOptions
): Promise<void> {
  const workbook = await buildPayslipsWorkbook(payslips, options);
  const fileName = `Bang_luong_${options.periodMonth || dayjs().format('YYYY-MM')}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
  await triggerWorkbookDownload(workbook, fileName);
}
