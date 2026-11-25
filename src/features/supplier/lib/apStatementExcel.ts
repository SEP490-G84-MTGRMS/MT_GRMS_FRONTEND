import ExcelJS from 'exceljs';
import type {
  SupplierSummary,
  SupplierApAging,
  APLedgerEntry,
} from '../types/supplier.types';

const DOC_TYPE_VI: Record<string, string> = {
  PurchaseInvoice: 'Nhập kho (GRN)',
  ServiceInvoice: 'Hóa đơn dịch vụ',
  PaymentVoucher: 'Phiếu chi thanh toán',
  ReturnAdjustment: 'Điều chỉnh hoàn trả',
};

const PAYMENT_METHOD_VI: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  OTHER: 'Khác',
};

export interface ExportApStatementInput {
  supplier: SupplierSummary;
  aging: SupplierApAging;
  currentDebt: number;
  ledgers: APLedgerEntry[];
  fromDate?: string;
  toDate?: string;
}

export async function exportSupplierApStatementExcel({
  supplier,
  aging,
  currentDebt,
  ledgers,
  fromDate,
  toDate,
}: ExportApStatementInput): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MT-GRMS';
  wb.created = new Date();

  const ws = wb.addWorksheet('Sao ke cong no', {
    views: [{ state: 'frozen', ySplit: 12 }],
  });

  const numFmt = '#,##0';
  const periodLabel =
    fromDate || toDate
      ? `${fromDate || 'Đầu kỳ'} → ${toDate || 'Hiện tại'}`
      : 'Toàn bộ lịch sử';
  const exportedAt = new Date().toLocaleString('vi-VN');

  // Title
  ws.mergeCells('A1:I1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BẢNG ĐỐI SOÁT & SAO KÊ CÔNG NỢ NHÀ CUNG CẤP (AP)';
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Supplier metadata block
  ws.getCell('A2').value = 'Mã NCC:';
  ws.getCell('B2').value = supplier.code;
  ws.getCell('D2').value = 'Kỳ sao kê:';
  ws.getCell('E2').value = periodLabel;
  ws.getCell('G2').value = 'Ngày xuất:';
  ws.getCell('H2').value = exportedAt;

  ws.getCell('A3').value = 'Tên NCC:';
  ws.mergeCells('B3:C3');
  ws.getCell('B3').value = supplier.name;
  ws.getCell('D3').value = 'Điện thoại:';
  ws.getCell('E3').value = supplier.phone || '—';
  ws.getCell('G3').value = 'Hạn thanh toán:';
  ws.getCell('H3').value = `${supplier.paymentTermDays} ngày`;

  ws.getCell('A4').value = 'Mã số thuế:';
  ws.getCell('B4').value = supplier.taxCode || '—';
  ws.getCell('D4').value = 'Hạn mức nợ:';
  ws.getCell('E4').value = supplier.creditLimit || 0;
  ws.getCell('E4').numFmt = numFmt;
  ws.getCell('G4').value = 'Dư nợ hiện tại:';
  ws.getCell('H4').value = currentDebt;
  ws.getCell('H4').numFmt = numFmt;
  ws.getCell('H4').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFDC2626' } };

  for (const r of [2, 3, 4]) {
    for (const c of ['A', 'D', 'G']) {
      ws.getCell(`${c}${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
    }
  }

  // Aging Snapshot section
  ws.mergeCells('A6:F6');
  const agingTitle = ws.getCell('A6');
  agingTitle.value = '1. PHÂN TÍCH TUỔI NỢ TẠI THỜI ĐIỂM XUẤT (AP AGING SNAPSHOT)';
  agingTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };

  const agingHeaders = [
    'Trong hạn (Current)',
    'Quá hạn 1–30 ngày',
    'Quá hạn 31–60 ngày',
    'Quá hạn 61–90 ngày',
    'Quá hạn > 90 ngày',
    'TỔNG DƯ NỢ',
  ];
  const agingHeaderRow = ws.getRow(7);
  agingHeaders.forEach((h, i) => {
    const cell = agingHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  agingHeaderRow.height = 24;

  const agingValues = [
    aging.current,
    aging.days1To30,
    aging.days31To60,
    aging.days61To90,
    aging.over90Days,
    currentDebt,
  ];
  const agingValRow = ws.getRow(8);
  agingValues.forEach((v, i) => {
    const cell = agingValRow.getCell(i + 1);
    cell.value = v;
    cell.numFmt = numFmt;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: i === 5 || v > 0,
      color: { argb: i === 5 ? 'FF1D4ED8' : i > 0 && v > 0 ? 'FFDC2626' : 'FF0F172A' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  agingValRow.height = 22;

  // Ledger Transactions section
  ws.mergeCells('A10:I10');
  const ledgerTitle = ws.getCell('A10');
  ledgerTitle.value = '2. CHI TIẾT BIẾN ĐỘNG SỔ CÁI CÔNG NỢ (AP LEDGER)';
  ledgerTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };

  const headers = [
    'STT',
    'Mã chứng từ',
    'Loại chứng từ',
    'Ngày GD',
    'Phương thức / Tham chiếu',
    'Nội dung diễn giải',
    'Phát sinh tăng (+)',
    'Phát sinh giảm (-)',
    'Dư nợ sau GD',
  ];
  const headerRow = ws.getRow(11);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = {
      horizontal: i >= 6 ? 'right' : i === 0 ? 'center' : 'left',
      vertical: 'middle',
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
  headerRow.height = 24;

  let totalIncrease = 0;
  let totalDecrease = 0;

  ledgers.forEach((entry, idx) => {
    const inc = entry.direction === 1 ? entry.amount : 0;
    const dec = entry.direction === -1 ? entry.amount : 0;
    totalIncrease += inc;
    totalDecrease += dec;

    const methodLabel = entry.paymentMethod
      ? PAYMENT_METHOD_VI[entry.paymentMethod] || entry.paymentMethod
      : '';
    const refText = [methodLabel, entry.referenceNo].filter(Boolean).join(' · ') || '—';

    const row = ws.addRow([
      idx + 1,
      entry.docNo,
      DOC_TYPE_VI[entry.docType] || entry.docTypeName || entry.docType,
      new Date(entry.transactionDate).toLocaleDateString('vi-VN'),
      refText,
      entry.description || '',
      inc,
      dec,
      entry.balanceAfter,
    ]);
    row.height = 21;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber >= 7) {
        cell.numFmt = numFmt;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: colNumber === 6 };
      }
    });
  });

  // Closing Balance Summary Row
  const sumRow = ws.addRow([
    '',
    '',
    '',
    '',
    '',
    'TỔNG PHÁT SINH & DƯ NỢ CUỐI KỲ',
    totalIncrease,
    totalDecrease,
    currentDebt,
  ]);
  sumRow.height = 24;
  sumRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    if (colNumber >= 7) {
      cell.numFmt = numFmt;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });

  ws.columns = [
    { width: 8 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 26 },
    { width: 42 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const todayStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeCode = (supplier.code || 'NCC').replace(/[^A-Za-z0-9_-]/g, '_');
  link.href = url;
  link.download = `SaoKeCongNo_${safeCode}_${todayStamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

