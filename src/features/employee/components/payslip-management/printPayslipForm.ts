import type { PayslipDetailedRecord } from '../../types';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (num?: number | null): string =>
  Math.round(num || 0).toLocaleString('en-US');

const formatDecimal = (num?: number | null): string =>
  Number(num || 0).toFixed(2);

const formatPeriodMonth = (periodMonth?: string): string => {
  if (!periodMonth) return '';
  const parts = periodMonth.split('-');
  if (parts.length === 2) {
    return `${parts[1]}/${parts[0]}`;
  }
  return periodMonth;
};

export interface PrintPayslipOptions {
  paidAmount?: number;
}

export const buildPayslipPrintHtml = (
  payslip: PayslipDetailedRecord,
  options?: PrintPayslipOptions
): string => {
  const periodLabel = formatPeriodMonth(payslip.periodMonth);
  const salaryRate = payslip.baseRate ?? payslip.contractBaseSalary ?? 0;
  const allowanceTotal =
    payslip.totalAllowance ??
    (payslip.lunchAllowance || 0) + (payslip.travelAllowance || 0);

  const paidAmount =
    options?.paidAmount !== undefined
      ? options.paidAmount
      : payslip.status === 'PAID'
        ? payslip.netSalary
        : 0;
  const remainingAmount = Math.max(0, (payslip.netSalary || 0) - paidAmount);

  const subDeductions: Array<{ idx: string; label: string; amount: number }> = [];
  if ((payslip.socialInsurance || 0) > 0) {
    subDeductions.push({
      idx: String(subDeductions.length + 1),
      label: 'Bảo hiểm (BHXH, BHYT, BHTN)',
      amount: payslip.socialInsurance || 0,
    });
  }
  if ((payslip.advanceDeduction || 0) > 0) {
    subDeductions.push({
      idx: String(subDeductions.length + 1),
      label: 'Trừ tạm ứng',
      amount: payslip.advanceDeduction || 0,
    });
  }
  if ((payslip.violationDeduction || 0) > 0) {
    subDeductions.push({
      idx: String(subDeductions.length + 1),
      label: 'Giảm trừ vi phạm',
      amount: payslip.violationDeduction || 0,
    });
  }

  const subDeductionRows = subDeductions
    .map(
      (d) => `
      <tr>
        <td class="col-stt">${d.idx}</td>
        <td class="col-label">${escapeHtml(d.label)}</td>
        <td class="col-amount">${formatCurrency(d.amount)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <title>Phiếu lương - ${escapeHtml(payslip.employeeName)} (${escapeHtml(periodLabel)})</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 14mm 16mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        color: #111827;
        margin: 0;
        padding: 16px 24px;
        background: #ffffff;
        line-height: 1.45;
      }
      .print-sheet {
        max-width: 760px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        margin-bottom: 16px;
      }
      .header h1 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .header .sub-period {
        margin-top: 4px;
        font-size: 12px;
        font-weight: 700;
      }
      .header .sub-branch {
        margin-top: 2px;
        font-size: 11px;
        font-weight: 700;
      }
      .info-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      .info-table td {
        padding: 3px 0;
        vertical-align: top;
      }
      .info-table td.info-label {
        width: 140px;
        color: #111827;
      }
      .info-table td.info-value {
        font-weight: 500;
      }
      .info-table td.info-value.bold {
        font-weight: 700;
      }
      .main-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 14px;
      }
      .main-table td {
        border: 1px solid #cbd5e1;
        padding: 7px 10px;
      }
      .main-table tr.section-row td {
        font-weight: 700;
        font-size: 13px;
        background: #ffffff;
      }
      .main-table td.col-stt {
        width: 90px;
        text-align: center;
        font-weight: 700;
      }
      .main-table td.col-label {
        text-align: left;
      }
      .main-table td.col-label.bold-item {
        font-weight: 700;
      }
      .main-table td.col-amount {
        width: 160px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .main-table tr.section-row td.col-amount {
        font-weight: 700;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      .summary-table td {
        padding: 3px 0;
        font-size: 12px;
      }
      .summary-table td.sum-label {
        width: 185px;
      }
      .summary-table td.sum-value {
        font-variant-numeric: tabular-nums;
      }
      .note-block {
        margin: 10px 0 22px;
        font-size: 12px;
      }
      .note-block .note-title {
        font-weight: 700;
        font-style: italic;
      }
      .date-line {
        text-align: right;
        font-style: italic;
        font-size: 12px;
        margin-bottom: 12px;
        padding-right: 16px;
      }
      .signature-grid {
        display: flex;
        justify-content: space-between;
        padding: 0 40px;
        text-align: center;
      }
      .signature-col {
        width: 200px;
      }
      .signature-col .sig-role {
        font-weight: 700;
        font-style: italic;
        font-size: 13px;
      }
      .signature-col .sig-hint {
        font-style: italic;
        font-size: 12px;
        margin-top: 2px;
      }
      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-sheet">
      <div class="header">
        <h1>PHIẾU LƯƠNG NHÂN VIÊN</h1>
        <div class="sub-period">Bảng lương tháng ${escapeHtml(periodLabel)}</div>
        <div class="sub-branch">Chi nhánh trả lương: ${escapeHtml(payslip.branchName || '—')}</div>
      </div>

      <table class="info-table">
        <tr>
          <td class="info-label">${escapeHtml(payslip.employeeCode || 'NV')}:</td>
          <td class="info-value bold">${escapeHtml(payslip.employeeName || '')}</td>
        </tr>
        <tr>
          <td class="info-label">Mã phiếu lương:</td>
          <td class="info-value">${escapeHtml(payslip.payslipCode || payslip.id || '-')}</td>
        </tr>
        <tr>
          <td class="info-label">Mức lương:</td>
          <td class="info-value">${formatCurrency(salaryRate)}</td>
        </tr>
      </table>

      <table class="main-table">
        <tr class="section-row">
          <td class="col-stt">I</td>
          <td class="col-label">Các khoản thu nhập</td>
          <td class="col-amount">${formatCurrency(payslip.totalEarnings)}</td>
        </tr>
        <tr>
          <td class="col-stt">1</td>
          <td class="col-label bold-item">Lương chính</td>
          <td class="col-amount">${formatCurrency(payslip.baseSalaryEarned)}</td>
        </tr>
        <tr>
          <td class="col-stt">2</td>
          <td class="col-label bold-item">Lương làm thêm giờ</td>
          <td class="col-amount">${formatCurrency(payslip.overtimePay)}</td>
        </tr>
        <tr>
          <td class="col-stt">3</td>
          <td class="col-label bold-item">Phụ cấp</td>
          <td class="col-amount">${formatCurrency(allowanceTotal)}</td>
        </tr>
        <tr class="section-row">
          <td class="col-stt">II</td>
          <td class="col-label">Các khoản giảm trừ</td>
          <td class="col-amount">${formatCurrency(payslip.totalDeductions)}</td>
        </tr>
        ${subDeductionRows}
        <tr class="section-row">
          <td class="col-stt">III</td>
          <td class="col-label">Tổng lương (I) - (II)</td>
          <td class="col-amount">${formatCurrency(payslip.netSalary)}</td>
        </tr>
        <tr class="section-row">
          <td class="col-stt">IV</td>
          <td class="col-label">Thanh toán lương</td>
          <td class="col-amount"></td>
        </tr>
        <tr>
          <td class="col-stt">1</td>
          <td class="col-label">Đã trả nhân viên</td>
          <td class="col-amount">${formatCurrency(paidAmount)}</td>
        </tr>
        <tr>
          <td class="col-stt">2</td>
          <td class="col-label">Còn cần trả</td>
          <td class="col-amount">${formatCurrency(remainingAmount)}</td>
        </tr>
      </table>

      <table class="summary-table">
        <tr>
          <td class="sum-label">Ngày công chuẩn:</td>
          <td class="sum-value">${formatDecimal(payslip.standardDays)}</td>
        </tr>
        <tr>
          <td class="sum-label">Số ngày chấm công:</td>
          <td class="sum-value">${formatDecimal(payslip.workedDays)}</td>
        </tr>
        <tr>
          <td class="sum-label">Số giờ làm việc:</td>
          <td class="sum-value">${formatDecimal(payslip.totalWorkHours)}</td>
        </tr>
        <tr>
          <td class="sum-label">Số giờ tăng ca:</td>
          <td class="sum-value">${formatDecimal(payslip.otHours)}</td>
        </tr>
        <tr>
          <td class="sum-label">Ngày nghỉ phép hưởng lương:</td>
          <td class="sum-value">${formatDecimal(payslip.paidLeaveDays)}</td>
        </tr>
        <tr>
          <td class="sum-label">Ngày nghỉ không lương:</td>
          <td class="sum-value">${formatDecimal(payslip.unpaidLeaveDays)}</td>
        </tr>
        <tr>
          <td class="sum-label">Số ngày tính lương:</td>
          <td class="sum-value">${formatDecimal(payslip.workedDays)}</td>
        </tr>
      </table>

      <div class="date-line" style="margin-top: 22px;">..............., Ngày .... Tháng .... Năm ......</div>

      <div class="signature-grid">
        <div class="signature-col">
          <div class="sig-role">Nhân viên</div>
          <div class="sig-hint">(Ký, họ tên)</div>
        </div>
        <div class="signature-col">
          <div class="sig-role">Người lập phiếu</div>
          <div class="sig-hint">(Ký, họ tên)</div>
        </div>
      </div>
    </div>
    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`;
};

export const printPayslipForm = (
  payslip: PayslipDetailedRecord,
  options?: PrintPayslipOptions
): void => {
  const html = buildPayslipPrintHtml(payslip, options);
  const printWindow = window.open('', '_blank', 'width=860,height=920');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return;
  }
  window.print();
};
