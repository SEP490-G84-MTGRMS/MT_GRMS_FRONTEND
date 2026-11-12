import * as XLSX from 'xlsx-js-style';
import type { SupplierSummary } from '../types/supplier.types';
import dayjs from 'dayjs';

/** Styles khớp file mẫu `Danh_Sach_Nha_Cung_Cap_Formatted.xlsx` */
const FONT_DISPLAY = 'Aptos Display';
const FONT_BODY = 'Aptos';

const COL_COUNT = 18;
const LAST_COL = COL_COUNT - 1;

const COL_WIDTHS = [7, 22, 28, 14, 17, 18, 17, 30, 15, 21, 20, 22, 32, 28, 16, 14, 12, 16];

const HEADER_LABELS = [
  'STT',
  'Mã NCC',
  'Tên nhà cung cấp',
  'Phân loại',
  'Mã số thuế',
  'Người liên hệ',
  'Số điện thoại',
  'Email',
  'Hạn nợ (ngày)',
  'Hạn mức nợ (VNĐ)',
  'Ngân hàng',
  'Số tài khoản',
  'Địa chỉ',
  'Ngày giao hàng',
  'Cutoff (ngày trước)',
  'Giờ chốt đơn',
  'MOQ',
  'Trạng thái',
];

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_ABBREV: Record<string, string> = {
  Mon: 'T2',
  Tue: 'T3',
  Wed: 'T4',
  Thu: 'T5',
  Fri: 'T6',
  Sat: 'T7',
  Sun: 'CN',
};

/** Thông tin giao hàng / cutoff gắn theo từng NCC khi xuất Excel. */
export type SupplierExportDeliveryInfo = {
  deliveryDays?: string[];
  deliveryDaysDisplay?: string;
  cutoffDayOffset?: number | null;
  cutoffTime?: string | null;
  minOrderQuantity?: number | null;
};

export function formatDeliveryDaysForExcel(days?: string[] | null): string {
  if (!days?.length) return '';
  return DAY_ORDER.filter((d) => days.some((x) => x?.toLowerCase() === d.toLowerCase()))
    .map((d) => DAY_ABBREV[d])
    .join(', ');
}

type CellStyle = Record<string, unknown>;

const borderHeader = {
  top: { style: 'medium', color: { rgb: '1F4E78' } },
  bottom: { style: 'medium', color: { rgb: '1F4E78' } },
  left: { style: 'thin', color: { rgb: '1F4E78' } },
  right: { style: 'thin', color: { rgb: '1F4E78' } },
};

const borderDataBottom = {
  bottom: { style: 'thin', color: { rgb: 'D6E0EA' } },
};

const borderFooterTop = {
  top: { style: 'medium', color: { rgb: '1F4E78' } },
};

export type ExportSuppliersExcelOptions = {
  storeName?: string;
  exportedBy?: string;
  /** Map supplierId → cấu hình giao hàng / cutoff */
  deliveryBySupplierId?: Record<string, SupplierExportDeliveryInfo>;
};

/** Tạo workbook danh sách NCC theo format mẫu Formatted (dùng chung cho download / test). */
export function buildSuppliersWorkbook(
  suppliers: SupplierSummary[],
  options?: ExportSuppliersExcelOptions
): XLSX.WorkBook {
  const storeName = (options?.storeName || 'HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS').toUpperCase();
  const exportTime = dayjs().format('DD/MM/YYYY HH:mm:ss');
  const exportedBy = options?.exportedBy || 'Quản lý cửa hàng (Store Owner)';
  const deliveryById = options?.deliveryBySupplierId ?? {};

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];
  const rows: { hpt: number }[] = [];

  const setCell = (
    r: number,
    c: number,
    val: string | number,
    type: 's' | 'n',
    style: CellStyle,
    z?: string
  ) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const cell: XLSX.CellObject = { v: val, t: type, s: style };
    if (z) cell.z = z;
    ws[ref] = cell;
  };

  const fillMergedBanner = (r: number, text: string, style: CellStyle, heightPt: number) => {
    for (let c = 0; c <= LAST_COL; c++) {
      setCell(r, c, c === 0 ? text : '', 's', style);
    }
    merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } });
    rows[r] = { hpt: heightPt };
  };

  // Row 1 — brand banner
  fillMergedBanner(
    0,
    storeName,
    {
      font: { name: FONT_DISPLAY, sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '17365D' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
    24
  );

  // Row 2 — report title
  fillMergedBanner(
    1,
    'BÁO CÁO DANH SÁCH NHÀ CUNG CẤP',
    {
      font: { name: FONT_DISPLAY, sz: 18, bold: true, color: { rgb: '17365D' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    },
    34
  );

  // Row 3 — metadata
  fillMergedBanner(
    2,
    `Thời gian xuất: ${exportTime}   |   Người lập: ${exportedBy}   |   Tổng số: ${suppliers.length} đối tác`,
    {
      font: { name: FONT_BODY, sz: 9, italic: true, color: { rgb: '64748B' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'EEF5FB' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    },
    25
  );

  // Row 4 — spacer
  for (let c = 0; c <= LAST_COL; c++) {
    setCell(3, c, '', 's', {});
  }
  rows[3] = { hpt: 9 };

  // Row 5 — column headers
  const headerRow = 4;
  rows[headerRow] = { hpt: 34 };
  HEADER_LABELS.forEach((label, c) => {
    setCell(headerRow, c, label, 's', {
      font: { name: FONT_BODY, sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1F4E78' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderHeader,
    });
  });

  const dataBaseStyle = (extra: CellStyle = {}): CellStyle => ({
    font: { name: FONT_BODY, sz: 10, color: { rgb: '243447' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
    border: borderDataBottom,
    ...extra,
  });

  // Data rows (Excel row 6+)
  suppliers.forEach((s, idx) => {
    const r = 5 + idx;
    rows[r] = { hpt: 30 };

    const typeLabel =
      s.supplierType === 'Goods' ? 'Hàng hóa' : s.supplierType === 'Service' ? 'Dịch vụ' : 'Cả hai';
    const statusLabel = s.status === 'Active' ? 'Hoạt động' : 'Tạm ngưng';

    setCell(r, 0, idx + 1, 'n', dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } }));
    setCell(
      r,
      1,
      s.code ? String(s.code) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      2,
      s.name ? String(s.name) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center', wrapText: true } })
    );
    setCell(
      r,
      3,
      typeLabel,
      's',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } })
    );
    setCell(
      r,
      4,
      s.taxCode ? String(s.taxCode) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      5,
      s.contactPerson ? String(s.contactPerson) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } })
    );
    setCell(
      r,
      6,
      s.phone ? String(s.phone) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      7,
      s.email ? String(s.email) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      8,
      s.paymentTermDays ?? 0,
      'n',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } }),
      '0'
    );
    setCell(
      r,
      9,
      Number(s.creditLimit ?? 0),
      'n',
      dataBaseStyle({ alignment: { horizontal: 'right', vertical: 'center' } }),
      '#,##0;[Red](#,##0);-'
    );
    setCell(
      r,
      10,
      s.bankName ? String(s.bankName) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } })
    );
    setCell(
      r,
      11,
      s.bankAccount ? String(s.bankAccount) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      12,
      s.address ? String(s.address) : '',
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center', wrapText: true } })
    );

    const delivery = deliveryById[s.id];
    const deliveryDaysLabel =
      delivery?.deliveryDaysDisplay ||
      formatDeliveryDaysForExcel(delivery?.deliveryDays) ||
      '';
    const cutoffOffset =
      delivery?.cutoffDayOffset === null || delivery?.cutoffDayOffset === undefined
        ? ''
        : Number(delivery.cutoffDayOffset);
    const cutoffTime = delivery?.cutoffTime ? String(delivery.cutoffTime) : '';
    const moq =
      delivery?.minOrderQuantity === null || delivery?.minOrderQuantity === undefined
        ? ''
        : Number(delivery.minOrderQuantity);

    setCell(
      r,
      13,
      deliveryDaysLabel,
      's',
      dataBaseStyle({ alignment: { horizontal: 'left', vertical: 'center', wrapText: true } })
    );
    setCell(
      r,
      14,
      cutoffOffset === '' ? '' : cutoffOffset,
      cutoffOffset === '' ? 's' : 'n',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } }),
      cutoffOffset === '' ? undefined : '0'
    );
    setCell(
      r,
      15,
      cutoffTime,
      's',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } }),
      '@'
    );
    setCell(
      r,
      16,
      moq === '' ? '' : moq,
      moq === '' ? 's' : 'n',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } }),
      moq === '' ? undefined : '0'
    );
    setCell(
      r,
      17,
      statusLabel,
      's',
      dataBaseStyle({ alignment: { horizontal: 'center', vertical: 'center' } })
    );
  });

  const lastDataRow = 4 + suppliers.length; // 0-based header is 4; last data = 4 + n
  const spacerRow = lastDataRow + 1;
  const footerRow = lastDataRow + 2;

  for (let c = 0; c <= LAST_COL; c++) {
    setCell(spacerRow, c, '', 's', {});
  }
  rows[spacerRow] = { hpt: 12 };

  const footerStyle: CellStyle = {
    font: { name: FONT_BODY, sz: 10, bold: true, color: { rgb: '17365D' } },
    fill: { patternType: 'solid', fgColor: { rgb: 'D9EAF7' } },
    border: borderFooterTop,
    alignment: { vertical: 'center' },
  };

  for (let c = 0; c <= LAST_COL; c++) {
    let val: string = '';
    let align: CellStyle = { alignment: { horizontal: 'left', vertical: 'center' } };
    if (c === 1) {
      val = 'TỔNG CỘNG';
      align = { alignment: { horizontal: 'center', vertical: 'center' } };
    } else if (c === 2) {
      val = `${suppliers.length} nhà cung cấp`;
      align = { alignment: { horizontal: 'left', vertical: 'center' } };
    }
    setCell(footerRow, c, val, 's', { ...footerStyle, ...align });
  }
  rows[footerRow] = { hpt: 27 };

  ws['!merges'] = merges;
  ws['!cols'] = COL_WIDTHS.map((wch) => ({ wch }));
  ws['!rows'] = rows;
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: footerRow, c: LAST_COL },
  });
  // Freeze dưới hàng tiêu đề cột (A6) — khớp mẫu Formatted
  (ws as XLSX.WorkSheet & { '!views'?: Array<Record<string, unknown>> })['!views'] = [
    { state: 'frozen', xSplit: 0, ySplit: 5, topLeftCell: 'A6', activePane: 'bottomLeft' },
  ];
  (ws as XLSX.WorkSheet & { '!autofilter'?: { ref: string } })['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRow, c: 0 },
      e: { r: Math.max(headerRow, lastDataRow), c: LAST_COL },
    }),
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_NCC');
  return wb;
}

/**
 * Xuất danh sách Nhà cung cấp ra tệp Excel (.xlsx) theo format mẫu Formatted:
 * banner hệ thống, tiêu đề báo cáo, metadata, header navy, data text-safe, dòng TỔNG CỘNG.
 */
export const exportSuppliersToExcel = (
  suppliers: SupplierSummary[],
  options?: ExportSuppliersExcelOptions
) => {
  const wb = buildSuppliersWorkbook(suppliers, options);
  const fileName = `Danh_Sach_Nha_Cung_Cap_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
