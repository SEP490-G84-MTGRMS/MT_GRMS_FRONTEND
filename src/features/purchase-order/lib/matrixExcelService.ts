import * as XLSX from 'xlsx-js-style';
import dayjs from 'dayjs';
import type {
  OrderMatrixProduct,
  DayColInfo,
  MatrixCellMap,
  MatrixCellData,
  OrderMatrixSupplierDeliveryConfig,
  SupplierDeliveryConfig,
  BranchOption,
  SupplierOption,
} from '../types/po.types';
import { productRowKey } from './matrixRowKey';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type ExcelValidationCode =
  // File & Structure
  | 'FILE_REQUIRED'
  | 'FILE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'BRANCH_MISMATCH'
  | 'SUPPLIER_MISMATCH'
  | 'INVALID_PERIOD'
  | 'FORMAT_INVALID'
  | 'SHEET_NOT_FOUND'
  | 'HEADER_MISSING'
  | 'INVALID_DATE_HEADER'
  | 'DUPLICATE_DATE'
  | 'NO_DELIVERY_DATE'
  | 'DUPLICATE_PRODUCT'
  // Product & Business
  | 'PRODUCT_NOT_IN_MATRIX'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'BRANCH_PRODUCT_NOT_FOUND'
  | 'BRANCH_PRODUCT_INACTIVE'
  | 'SUPPLIER_PRODUCT_NOT_FOUND'
  | 'SUPPLIER_PRODUCT_INACTIVE'
  | 'SUPPLIER_INACTIVE'
  | 'SUPPLIER_BRANCH_INACTIVE'
  // Delivery Date & Cutoff
  | 'INVALID_DELIVERY_DAY'
  | 'DELIVERY_DISABLED'
  | 'LEAD_TIME_NOT_MET'
  | 'CUTOFF_PASSED'
  | 'DATE_ALREADY_FINALIZED'
  | 'DATE_OUT_OF_PERIOD'
  // Quantity & MOQ
  | 'INVALID_QUANTITY'
  | 'NEGATIVE_QUANTITY'
  | 'DECIMAL_QUANTITY_NOT_ALLOWED'
  | 'MOQ_NOT_MET'
  | 'ORDER_MULTIPLE_INVALID'
  | 'ORDER_UNIT_INVALID'
  | 'QUANTITY_TOO_LARGE'
  // Cell State (Disabled / Blocked)
  | 'BLOCKED_CELL_MODIFIED'
  | 'QUANTITY_REVIEW'
  | 'PRODUCT_OUT_OF_FILTER'
  | 'PRODUCT_AMBIGUOUS'
  | 'OWNER_LOCKED_SKIPPED';

export interface ExcelValidationErrorItem {
  type: 'ERROR' | 'WARNING';
  row: number;
  productCode: string;
  productName: string;
  deliveryDate: string;
  dateLabel: string;
  inputValue: string | number;
  code: ExcelValidationCode;
  message: string;
}

export interface ExcelCellToApply {
  row: number;
  rowKey?: string;
  productId: string;
  supplierId?: string;
  productCode: string;
  productName: string;
  supplierName?: string;
  deliveryDate: string;
  dateLabel: string;
  currentQty: number;
  quantity: number;
  note?: string;
}

export interface ExcelScopeStatus {
  branchMatched: boolean;
  branchExpected: string;
  branchActual?: string;
  supplierMatched: boolean;
  supplierExpected: string;
  supplierActual?: string;
  periodMatched: boolean;
  periodExpected: string;
}

export interface ExcelValidationSummary {
  totalCells: number;
  validCells: number;
  errorCount: number;
  warningCount: number;
  ignoredCells: number;
  skippedOwnerLocked?: number;
  outOfFilterCount?: number;
  productsInFilterCount?: number;
}

export interface ExcelValidationResult {
  valid: boolean;
  fileName: string;
  fileSize: number;
  scopeStatus: ExcelScopeStatus;
  summary: ExcelValidationSummary;
  errors: ExcelValidationErrorItem[];
  warnings: ExcelValidationErrorItem[];
  cellsToApply: ExcelCellToApply[];
}

export interface ExportMatrixExcelOptions {
  branch?: BranchOption;
  supplier?: SupplierOption;
  supplierId: string;
  viewFrom: Date;
  viewTo: Date;
  exportedBy?: string;
  isStoreOwner?: boolean;
  /** Khi true: để trống các ô editable (file mẫu). */
  blankQty?: boolean;
  /** Map supplierId → mã NCC hiển thị trên cột Mã NCC */
  supplierCodeById?: Record<string, string>;
  isCellEditable: (d: DayColInfo, product?: OrderMatrixProduct) => boolean;
}

const FIXED_COL_COUNT = 10; // STT..Đơn giá (đã gồm Mã NCC)

/** Qty hiển thị trên Excel — khớp OrderMatrixTable theo role. */
export function resolveExportQty(
  cell: MatrixCellData | undefined,
  isStoreOwner: boolean
): number {
  if (!cell) return 0;
  if (isStoreOwner) {
    if (cell.isOwnerAdjusted || cell.storeQty !== null) {
      return cell.storeQty ?? cell.finalQty ?? 0;
    }
    return cell.employeeQty > 0 ? cell.employeeQty : cell.finalQty || 0;
  }
  if (cell.isOwnerAdjusted || (cell.storeQty !== null && cell.storeQty !== undefined)) {
    return cell.storeQty ?? cell.finalQty ?? 0;
  }
  return cell.employeeQty > 0 ? cell.employeeQty : 0;
}

function getCellForExport(cellMap: MatrixCellMap, p: OrderMatrixProduct, dateKey: string) {
  const rk = productRowKey(p);
  return cellMap[rk]?.[dateKey] ?? cellMap[p.id]?.[dateKey];
}

// ============================================================================
// 1. EXPORT TO EXCEL (.XLSX) — Chuẩn CISCA / MT-GRMS
// ============================================================================

export function exportMatrixToExcel(
  products: OrderMatrixProduct[],
  dayColumns: DayColInfo[],
  cellMap: MatrixCellMap,
  options: ExportMatrixExcelOptions
): void {
  const branchName = options.branch ? `${options.branch.name} (${options.branch.code})` : 'Tất cả chi nhánh';
  const branchId = options.branch ? options.branch.id : '';
  const supplierName = options.supplier
    ? `${options.supplier.name} (${options.supplier.code})`
    : options.supplierId === 'ALL'
    ? 'Tất cả nhà cung cấp'
    : options.supplierId;
  const supplierId = options.supplier ? options.supplier.id : options.supplierId;
  const isStoreOwner = options.isStoreOwner !== false;
  const blankQty = Boolean(options.blankQty);
  const codeById = options.supplierCodeById ?? {};

  const exportTime = dayjs().format('DD/MM/YYYY HH:mm:ss');
  const periodStr = `${dayjs(options.viewFrom).format('DD/MM/YYYY')} - ${dayjs(options.viewTo).format('DD/MM/YYYY')}`;
  const exportedBy = options.exportedBy || 'Store Owner';

  const relevantProducts =
    options.supplierId === 'ALL'
      ? products
      : products.filter((p) => p.supplierId === options.supplierId);

  const totalCols = FIXED_COL_COUNT + dayColumns.length + 2;
  const lastColIdx = totalCols - 1;
  const dayColStart = FIXED_COL_COUNT;

  const borderThin = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const borderHeader = {
    top: { style: 'thin', color: { rgb: '60A5FA' } },
    bottom: { style: 'medium', color: { rgb: '1E293B' } },
    left: { style: 'thin', color: { rgb: '60A5FA' } },
    right: { style: 'thin', color: { rgb: '60A5FA' } },
  };

  const borderDoubleBottom = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'double', color: { rgb: '0F172A' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const fontBase = 'Segoe UI';
  const ws: any = {};
  const merges: any[] = [];
  const rowHeights: any[] = [];

  const setCell = (r: number, c: number, val: any, type: 's' | 'n', style?: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = { v: val, t: type, s: style };
  };

  const setBannerRow = (r: number, text: string, style: any, heightPt: number) => {
    for (let c = 0; c <= lastColIdx; c++) {
      setCell(r, c, c === 0 ? text : '', 's', style);
    }
    merges.push({ s: { r, c: 0 }, e: { r, c: lastColIdx } });
    rowHeights[r] = { hpt: heightPt };
  };

  setBannerRow(
    0,
    'HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS — ĐẶT HÀNG NHẬP KHO (PURCHASE ORDER MATRIX)',
    {
      font: { name: fontBase, sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A8A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    },
    36
  );

  setBannerRow(
    1,
    `Chi nhánh: ${branchName}   |   Mã hệ thống: ${branchId}`,
    {
      font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
      fill: { fgColor: { rgb: 'F0F9FF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin', color: { rgb: 'BAE6FD' } } },
    },
    22
  );

  setBannerRow(
    2,
    `Nhà cung cấp: ${supplierName}   |   Mã NCC: ${supplierId}   |   Kỳ đặt hàng: ${periodStr}`,
    {
      font: { name: fontBase, sz: 10, color: { rgb: '334155' } },
      fill: { fgColor: { rgb: 'F0F9FF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin', color: { rgb: 'BAE6FD' } } },
    },
    22
  );

  setBannerRow(
    3,
    `Thời gian xuất: ${exportTime}   |   Người lập: ${exportedBy}   |   Tổng số: ${relevantProducts.length} mặt hàng`,
    {
      font: { name: fontBase, sz: 9.5, italic: true, color: { rgb: '64748B' } },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } },
    },
    20
  );

  for (let c = 0; c <= lastColIdx; c++) {
    setCell(4, c, '', 's', {});
  }
  rowHeights[4] = { hpt: 10 };

  const headerRowIdx = 5;
  rowHeights[headerRowIdx] = { hpt: 32 };

  const fixedHeaders = [
    { text: 'STT', wch: 6 },
    { text: 'Ngành hàng', wch: 15 },
    { text: 'Mã vạch', wch: 16 },
    { text: 'Mã sản phẩm', wch: 18 },
    { text: 'Mã NCC', wch: 14 },
    { text: 'Tên sản phẩm', wch: 34 },
    { text: 'ĐVT', wch: 9 },
    { text: 'MOQ', wch: 8 },
    { text: 'Bội số', wch: 8 },
    { text: 'Đơn giá (VNĐ)', wch: 14 },
  ];

  fixedHeaders.forEach((h, c) => {
    setCell(headerRowIdx, c, h.text, 's', {
      font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderHeader,
    });
  });

  dayColumns.forEach((d, i) => {
    const colIdx = dayColStart + i;
    const isLocked =
      d.isLocked ||
      d.isOff ||
      d.cutoffStatus === 'PO_GENERATED' ||
      d.cutoffStatus === 'LOCKED' ||
      d.cutoffStatus === 'SUPPLIER_OFF';
    setCell(headerRowIdx, colIdx, `${d.dowName} ${d.dateShort}\n[${d.dateKey}]`, 's', {
      font: { name: fontBase, sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: isLocked ? '475569' : '2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: borderHeader,
    });
  });

  setCell(headerRowIdx, dayColStart + dayColumns.length, 'Tổng SL', 's', {
    font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderHeader,
  });

  setCell(headerRowIdx, dayColStart + dayColumns.length + 1, 'Thành tiền (VNĐ)', 's', {
    font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderHeader,
  });

  let currentRowIdx = 6;
  const dayTotals: number[] = new Array(dayColumns.length).fill(0);
  let grandTotalQty = 0;
  let grandTotalAmt = 0;

  relevantProducts.forEach((p, idx) => {
    rowHeights[currentRowIdx] = { hpt: 22 };
    const isOdd = idx % 2 === 1;
    const bgRowColor = isOdd ? 'F8FAFC' : 'FFFFFF';
    let rowQty = 0;
    const nccCode = codeById[p.supplierId] || p.supplierName || p.supplierId || '';

    const baseStyle = (extra: any = {}) => ({
      font: { name: fontBase, sz: 10, color: { rgb: '334155' } },
      fill: { fgColor: { rgb: bgRowColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
      ...extra,
    });

    setCell(currentRowIdx, 0, idx + 1, 'n', baseStyle({ font: { name: fontBase, sz: 9.5, color: { rgb: '64748B' } } }));
    setCell(currentRowIdx, 1, p.category || 'Tạp hóa', 's', baseStyle());
    const barcodeStr = (p as any).barcode ? String((p as any).barcode) : '';
    setCell(currentRowIdx, 2, barcodeStr, 's', baseStyle({ font: { name: 'Consolas', sz: 9.5, color: { rgb: '475569' } } }));
    setCell(
      currentRowIdx,
      3,
      p.sku || '',
      's',
      baseStyle({ font: { name: 'Consolas', sz: 10, bold: true, color: { rgb: '0F766E' } } })
    );
    setCell(currentRowIdx, 4, nccCode, 's', baseStyle({ font: { name: 'Consolas', sz: 9.5, bold: true, color: { rgb: '1E40AF' } } }));
    setCell(
      currentRowIdx,
      5,
      p.name || '',
      's',
      baseStyle({
        font: { name: fontBase, sz: 10, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      })
    );
    setCell(currentRowIdx, 6, p.unit || 'Cái', 's', baseStyle());
    setCell(currentRowIdx, 7, p.moq || 1, 'n', {
      ...baseStyle({ font: { name: fontBase, sz: 10, bold: true, color: { rgb: 'D97706' } } }),
      numFmt: '#,##0',
    });
    setCell(currentRowIdx, 8, p.orderMultiple || 1, 'n', { ...baseStyle(), numFmt: '#,##0' });
    setCell(currentRowIdx, 9, p.price || 0, 'n', {
      ...baseStyle({ alignment: { horizontal: 'right', vertical: 'center' } }),
      numFmt: '#,##0',
    });

    dayColumns.forEach((d, dayIdx) => {
      const colIdx = dayColStart + dayIdx;
      const isEditable = options.isCellEditable(d, p);
      const currentCell = getCellForExport(cellMap, p, d.dateKey);
      const q = blankQty && isEditable ? 0 : resolveExportQty(currentCell, isStoreOwner);

      if (!isEditable) {
        const displayVal = q > 0 ? q : '—';
        setCell(currentRowIdx, colIdx, displayVal, typeof displayVal === 'number' ? 'n' : 's', {
          font: {
            name: fontBase,
            sz: 10,
            italic: displayVal === '—',
            bold: displayVal !== '—',
            color: { rgb: displayVal === '—' ? '94A3B8' : '64748B' },
          },
          fill: { fgColor: { rgb: 'F1F5F9' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin,
          numFmt: typeof displayVal === 'number' ? '#,##0' : undefined,
        });
        if (q > 0) {
          rowQty += q;
          dayTotals[dayIdx] += q;
        }
      } else if (q > 0) {
        rowQty += q;
        dayTotals[dayIdx] += q;
        setCell(currentRowIdx, colIdx, q, 'n', {
          font: { name: fontBase, sz: 11, bold: true, color: { rgb: '1D4ED8' } },
          fill: { fgColor: { rgb: 'EFF6FF' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin,
          numFmt: '#,##0',
        });
      } else {
        setCell(currentRowIdx, colIdx, '', 's', {
          fill: { fgColor: { rgb: bgRowColor } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: borderThin,
        });
      }
    });

    const rowAmt = rowQty * (p.price || 0);
    grandTotalQty += rowQty;
    grandTotalAmt += rowAmt;

    setCell(currentRowIdx, dayColStart + dayColumns.length, rowQty, 'n', {
      font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: '047857' } },
      fill: { fgColor: { rgb: 'F0FDF4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderThin,
      numFmt: '#,##0',
    });
    setCell(currentRowIdx, dayColStart + dayColumns.length + 1, rowAmt, 'n', {
      font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: '047857' } },
      fill: { fgColor: { rgb: 'F0FDF4' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: borderThin,
      numFmt: '#,##0',
    });

    currentRowIdx++;
  });

  rowHeights[currentRowIdx] = { hpt: 26 };
  for (let c = 0; c < FIXED_COL_COUNT; c++) {
    setCell(currentRowIdx, c, c === 0 ? 'TỔNG CỘNG HÀNG NGÀY' : '', 's', {
      font: { name: fontBase, sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderDoubleBottom,
    });
  }
  merges.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx, c: FIXED_COL_COUNT - 1 } });

  dayColumns.forEach((_, dayIdx) => {
    setCell(currentRowIdx, dayColStart + dayIdx, dayTotals[dayIdx], 'n', {
      font: { name: fontBase, sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderDoubleBottom,
      numFmt: '#,##0',
    });
  });

  setCell(currentRowIdx, dayColStart + dayColumns.length, grandTotalQty, 'n', {
    font: { name: fontBase, sz: 11.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderDoubleBottom,
    numFmt: '#,##0',
  });
  setCell(currentRowIdx, dayColStart + dayColumns.length + 1, grandTotalAmt, 'n', {
    font: { name: fontBase, sz: 11.5, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '065F46' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: borderDoubleBottom,
    numFmt: '#,##0',
  });

  const colWidths = [
    { wch: 6 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 36 },
    { wch: 10 },
    { wch: 9 },
    { wch: 9 },
    { wch: 15 },
    ...dayColumns.map(() => ({ wch: 18 })),
    { wch: 14 },
    { wch: 20 },
  ];

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: currentRowIdx, c: lastColIdx },
  });
  ws['!merges'] = merges;
  ws['!rows'] = rowHeights;
  ws['!cols'] = colWidths;
  ws['!freeze'] = { xSplit: 6, ySplit: 6 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PO_Matrix');
  const cleanSup = options.supplier ? options.supplier.code : options.supplierId;
  const fileName = `PO_Matrix_${cleanSup}_${dayjs(options.viewFrom).format('YYYYMMDD')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}


// ============================================================================
// 2. PARSE & VALIDATE EXCEL (.XLSX / .CSV) — 3 Giai đoạn (Validate → Preview → Apply)
// ============================================================================

export interface ValidateMatrixExcelContext {
  file: File;
  currentBranchId: string;
  currentBranchCode?: string;
  currentBranchName?: string;
  currentSupplierId: string;
  currentSupplierCode?: string;
  currentSupplierName?: string;
  viewFrom?: Date;
  viewTo?: Date;
  baseDate?: Date | string;
  matrixProducts: OrderMatrixProduct[];
  dayColumns: DayColInfo[];
  cellMap?: MatrixCellMap;
  qtyMap?: Record<string, Record<string, number>>;
  supplierConfigs?: Array<OrderMatrixSupplierDeliveryConfig | SupplierDeliveryConfig>;
  isCellEditable: (d: DayColInfo, product?: OrderMatrixProduct) => boolean;
}

export async function validateMatrixExcelFile(
  context: ValidateMatrixExcelContext
): Promise<ExcelValidationResult> {
  const {
    file,
    currentBranchId,
    currentBranchCode,
    currentBranchName,
    currentSupplierId,
    currentSupplierCode,
    currentSupplierName,
    viewFrom,
    viewTo,
    baseDate,
    matrixProducts,
    dayColumns,
    cellMap,
    qtyMap,
    supplierConfigs,
    isCellEditable,
  } = context;

  const isGuidLike = (v?: string) =>
    !!v &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());

  const branchExpectStr = currentBranchName
    ? currentBranchCode && !isGuidLike(currentBranchCode)
      ? `${currentBranchName} (${currentBranchCode})`
      : currentBranchName
    : currentBranchCode && !isGuidLike(currentBranchCode)
      ? currentBranchCode
      : '-';

  const supplierExpectStr =
    currentSupplierId === 'ALL'
      ? 'Tất cả nhà cung cấp'
      : currentSupplierName
        ? currentSupplierCode && !isGuidLike(currentSupplierCode)
          ? `${currentSupplierName} (${currentSupplierCode})`
          : currentSupplierName
        : currentSupplierCode && !isGuidLike(currentSupplierCode)
          ? currentSupplierCode
          : '-';

  const periodExpectStr =
    viewFrom && viewTo
      ? `${dayjs(viewFrom).format('DD/MM/YYYY')} - ${dayjs(viewTo).format('DD/MM/YYYY')}`
      : dayColumns.length > 0
      ? `${dayColumns[0].dateShort} - ${dayColumns[dayColumns.length - 1].dateShort}`
      : '-';

  const result: ExcelValidationResult = {
    valid: false,
    fileName: file?.name || 'unknown.xlsx',
    fileSize: file?.size || 0,
    scopeStatus: {
      branchMatched: true,
      branchExpected: branchExpectStr,
      supplierMatched: true,
      supplierExpected: supplierExpectStr,
      periodMatched: true,
      periodExpected: periodExpectStr,
    },
    summary: {
      totalCells: 0,
      validCells: 0,
      errorCount: 0,
      warningCount: 0,
      ignoredCells: 0,
    },
    errors: [],
    warnings: [],
    cellsToApply: [],
  };

  // 1. Validate File Request (Tier 2)
  if (!file) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'FILE_REQUIRED',
      message: 'Chưa chọn file Excel để nạp dữ liệu.',
    });
    result.summary.errorCount++;
    return result;
  }

  // File Extension Check
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: file.name,
      code: 'FILE_INVALID',
      message: 'Định dạng file không được hỗ trợ. Vui lòng tải lên file định dạng .xlsx, .xls hoặc .csv.',
    });
    result.summary.errorCount++;
    return result;
  }

  // File Size Check (5 MB limit)
  if (file.size > 5 * 1024 * 1024) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      code: 'FILE_TOO_LARGE',
      message: 'Dung lượng file vượt quá giới hạn 5 MB cho phép.',
    });
    result.summary.errorCount++;
    return result;
  }

  // 2. Parse Workbook (Tier 3)
  let workbook: XLSX.WorkBook;
  try {
    const arrayBuffer = await file.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
  } catch (err: any) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'FORMAT_INVALID',
      message: `Không thể đọc nội dung workbook Excel: ${err?.message || 'File lỗi hoặc bị hỏng'}.`,
    });
    result.summary.errorCount++;
    return result;
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'SHEET_NOT_FOUND',
      message: 'File Excel không có trang tính (Sheet) hợp lệ.',
    });
    result.summary.errorCount++;
    return result;
  }

  const sheetName = workbook.Sheets['PO_Matrix'] ? 'PO_Matrix' : workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: sheetName,
      code: 'SHEET_NOT_FOUND',
      message: `Không tìm thấy trang tính "${sheetName}" trong file Excel.`,
    });
    result.summary.errorCount++;
    return result;
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    result.errors.push({
      type: 'ERROR',
      row: 0,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'HEADER_MISSING',
      message: 'Nội dung file quá ngắn hoặc không tìm thấy dòng tiêu đề dữ liệu.',
    });
    result.summary.errorCount++;
    return result;
  }

  // 3. Locate Header Row & Identify Columns
  let headerRowIndex = -1;
  let skuColIdx = -1;
  let nameColIdx = -1;

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toLowerCase();
      if (
        val === 'mã sản phẩm' ||
        val === 'mã sku' ||
        val === 'msコード' ||
        val === 'sku' ||
        val === 'product code' ||
        val.includes('mã sản phẩm')
      ) {
        headerRowIndex = r;
        skuColIdx = c;
      }
      if (val === 'tên sản phẩm' || val === '商品名' || val === 'product name') {
        nameColIdx = c;
      }
    }
    if (headerRowIndex !== -1 && skuColIdx !== -1) break;
  }

  if (headerRowIndex === -1 || skuColIdx === -1) {
    result.errors.push({
      type: 'ERROR',
      row: 1,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'HEADER_MISSING',
      message:
        'Không tìm thấy cột định danh "Mã sản phẩm" (hoặc "Mã SKU", "MSコード") trong 15 dòng đầu tiên của file.',
    });
    result.summary.errorCount++;
    return result;
  }

  // Scope Validation: Check metadata for Branch & Supplier in banner rows
  for (let r = 0; r < headerRowIndex; r++) {
    const rowStr = rows[r].map((cell) => String(cell || '').trim()).join('   ');

    // Branch match
    const sysBranchMatch = rowStr.match(/Mã hệ thống:\s*([^\s|]+)/i);
    const codeBranchMatch = rowStr.match(/Mã CN:\s*([^\s|]+)/i);
    const extractedBranch = sysBranchMatch?.[1] || codeBranchMatch?.[1];

    if (extractedBranch && currentBranchId) {
      const isBranchMatched =
        extractedBranch.toLowerCase() === currentBranchId.toLowerCase() ||
        (Boolean(currentBranchCode) && extractedBranch.toLowerCase() === currentBranchCode?.toLowerCase());

      if (!isBranchMatched) {
        result.scopeStatus.branchMatched = false;
        result.scopeStatus.branchActual = extractedBranch;
        result.errors.push({
          type: 'ERROR',
          row: r + 1,
          productCode: '-',
          productName: '-',
          deliveryDate: '-',
          dateLabel: '-',
          inputValue: extractedBranch,
          code: 'BRANCH_MISMATCH',
          message: `File Excel thuộc Chi nhánh "${extractedBranch}", không khớp với Chi nhánh đang mở trên màn hình (${branchExpectStr}).`,
        });
        result.summary.errorCount++;
      } else {
        result.scopeStatus.branchActual = extractedBranch;
      }
    }

    // Supplier match
    const supMatch = rowStr.match(/Mã NCC:\s*([^\s|]+)/i);
    const extractedSupplier = supMatch?.[1];

    if (extractedSupplier && currentSupplierId && currentSupplierId !== 'ALL') {
      const isSupplierMatched =
        extractedSupplier.toLowerCase() === currentSupplierId.toLowerCase() ||
        (Boolean(currentSupplierCode) && extractedSupplier.toLowerCase() === currentSupplierCode?.toLowerCase());

      if (!isSupplierMatched) {
        result.scopeStatus.supplierMatched = false;
        result.scopeStatus.supplierActual = extractedSupplier;
        result.errors.push({
          type: 'ERROR',
          row: r + 1,
          productCode: '-',
          productName: '-',
          deliveryDate: '-',
          dateLabel: '-',
          inputValue: extractedSupplier,
          code: 'SUPPLIER_MISMATCH',
          message: `File Excel thuộc Nhà cung cấp "${extractedSupplier}", không khớp với Nhà cung cấp đang chọn (${supplierExpectStr}).`,
        });
        result.summary.errorCount++;
      } else {
        result.scopeStatus.supplierActual = extractedSupplier;
      }
    }
  }

  // 4. Identify Delivery Date Columns
  const headerRow = rows[headerRowIndex];
  const dateColMap: Array<{ colIdx: number; dayCol: DayColInfo; headerText: string }> = [];
  const seenDateKeys = new Set<string>();

  for (let c = 0; c < headerRow.length; c++) {
    const rawHeader = String(headerRow[c] || '').trim();
    if (!rawHeader) continue;

    // Pattern 1: `[YYYY-MM-DD]` embedded in header
    const keyMatch = rawHeader.match(/\[(\d{4}-\d{2}-\d{2})\]/);
    let matchedDay: DayColInfo | undefined;
    let parsedKey: string | null = null;

    if (keyMatch && keyMatch[1]) {
      parsedKey = keyMatch[1];
      matchedDay = dayColumns.find((d) => d.dateKey === parsedKey);
    } else {
      // Pattern 2: `YYYY/MM/DD` or `YYYY-MM-DD`
      const ymdMatch = rawHeader.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
      if (ymdMatch) {
        parsedKey = `${ymdMatch[1]}-${String(ymdMatch[2]).padStart(2, '0')}-${String(ymdMatch[3]).padStart(2, '0')}`;
        matchedDay = dayColumns.find((d) => d.dateKey === parsedKey);
      } else {
        // Pattern 3: `DD/MM` or `MM/DD` matched with dateShort
        const mdMatch = rawHeader.match(/(\d{1,2})[/-](\d{1,2})/);
        if (mdMatch) {
          const short1 = `${String(mdMatch[1]).padStart(2, '0')}/${String(mdMatch[2]).padStart(2, '0')}`;
          const short2 = `${String(mdMatch[2]).padStart(2, '0')}/${String(mdMatch[1]).padStart(2, '0')}`;
          matchedDay = dayColumns.find((d) => d.dateShort === short1 || d.dateShort === short2);
          if (matchedDay) parsedKey = matchedDay.dateKey;
        }
      }
    }

    if (parsedKey || matchedDay) {
      if (!matchedDay) {
        // Date found in header, but not in dayColumns period!
        result.scopeStatus.periodMatched = false;
        result.errors.push({
          type: 'ERROR',
          row: headerRowIndex + 1,
          productCode: '-',
          productName: '-',
          deliveryDate: parsedKey || rawHeader,
          dateLabel: rawHeader,
          inputValue: rawHeader,
          code: 'DATE_OUT_OF_PERIOD',
          message: `Cột ngày "${rawHeader}" nằm ngoài khoảng thời gian kỳ ma trận đang xem (${periodExpectStr}).`,
        });
        result.summary.errorCount++;
      } else {
        if (seenDateKeys.has(matchedDay.dateKey)) {
          result.errors.push({
            type: 'ERROR',
            row: headerRowIndex + 1,
            productCode: '-',
            productName: '-',
            deliveryDate: matchedDay.dateKey,
            dateLabel: `${matchedDay.dowName} ${matchedDay.dateShort}`,
            inputValue: rawHeader,
            code: 'DUPLICATE_DATE',
            message: `Cột ngày "${rawHeader}" (${matchedDay.dateKey}) bị trùng lặp trong tiêu đề file Excel.`,
          });
          result.summary.errorCount++;
        } else {
          seenDateKeys.add(matchedDay.dateKey);
          dateColMap.push({ colIdx: c, dayCol: matchedDay, headerText: rawHeader });
        }
      }
    }
  }

  if (dateColMap.length === 0) {
    result.scopeStatus.periodMatched = false;
    result.errors.push({
      type: 'ERROR',
      row: headerRowIndex + 1,
      productCode: '-',
      productName: '-',
      deliveryDate: '-',
      dateLabel: '-',
      inputValue: '-',
      code: 'NO_DELIVERY_DATE',
      message:
        'Không tìm thấy cột ngày giao hàng nào khớp với khoảng thời gian của ma trận đặt hàng hiện tại.',
    });
    result.summary.errorCount++;
    return result;
  }

  // 5. Scan Data Rows & Validate Cells
  const seenSkus = new Set<string>();

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawSku = String(row[skuColIdx] || '').trim();
    if (!rawSku || rawSku.toLowerCase() === 'tổng cộng' || rawSku.toLowerCase() === 'total') {
      continue;
    }

    const rowNum = r + 1;
    const rawProdName = nameColIdx !== -1 ? String(row[nameColIdx] || '').trim() : '';

    // Check duplicate Product Code in same file
    if (seenSkus.has(rawSku)) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: rawSku,
        productName: rawProdName,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'DUPLICATE_PRODUCT',
        message: `Mã sản phẩm "${rawSku}" bị lặp lại nhiều lần trong file Excel.`,
      });
      result.summary.errorCount++;
      continue;
    }
    seenSkus.add(rawSku);

    // Validate Product existence & Orderable status in current Matrix
    const targetProduct = matrixProducts.find((p) => p.sku === rawSku || p.id === rawSku);

    if (!targetProduct) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: rawSku,
        productName: rawProdName,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'PRODUCT_NOT_IN_MATRIX',
        message: `Mã sản phẩm "${rawSku}" không thuộc danh mục ma trận đặt hàng đang mở.`,
      });
      result.summary.errorCount++;
      continue;
    }

    // Check inactive relationships
    if (targetProduct.isProductActive === false) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'PRODUCT_INACTIVE',
        message: `Sản phẩm "${targetProduct.name}" đã ngừng hoạt động trên danh mục Master.`,
      });
      result.summary.errorCount++;
      continue;
    }

    if (targetProduct.isBranchProductActive === false) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'BRANCH_PRODUCT_INACTIVE',
        message: `Sản phẩm "${targetProduct.name}" chưa được gán hoặc đang ngừng kinh doanh tại chi nhánh này.`,
      });
      result.summary.errorCount++;
      continue;
    }

    if (targetProduct.isSupplierProductActive === false) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'SUPPLIER_PRODUCT_INACTIVE',
        message: `Nhà cung cấp không còn cung ứng sản phẩm "${targetProduct.name}".`,
      });
      result.summary.errorCount++;
      continue;
    }

    if (targetProduct.isSupplierActive === false) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'SUPPLIER_INACTIVE',
        message: `Nhà cung cấp của sản phẩm "${targetProduct.name}" đang tạm ngừng hoạt động.`,
      });
      result.summary.errorCount++;
      continue;
    }

    if (targetProduct.isSupplierBranchActive === false) {
      result.errors.push({
        type: 'ERROR',
        row: rowNum,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        deliveryDate: '-',
        dateLabel: '-',
        inputValue: rawSku,
        code: 'SUPPLIER_BRANCH_INACTIVE',
        message: `Nhà cung cấp chưa được liên kết hoạt động với chi nhánh này.`,
      });
      result.summary.errorCount++;
      continue;
    }

    // Validate each Delivery Date Cell
    dateColMap.forEach(({ colIdx, dayCol }) => {
      result.summary.totalCells++;
      const rawCellVal = row[colIdx];

      // Empty cell handling: ô trống, '-' hoặc '—' -> coi như không có nhu cầu nhập mới
      if (
        rawCellVal === undefined ||
        rawCellVal === null ||
        String(rawCellVal).trim() === '' ||
        String(rawCellVal).trim() === '-' ||
        String(rawCellVal).trim() === '—'
      ) {
        result.summary.ignoredCells++;
        return;
      }

      const strVal = String(rawCellVal).trim();
      let numVal = Number(strVal);

      // Check numeric format
      if (isNaN(numVal)) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: strVal,
          code: 'INVALID_QUANTITY',
          message: `Số lượng "${strVal}" không phải là số hợp lệ.`,
        });
        result.summary.errorCount++;
        return;
      }

      if (numVal < 0) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'NEGATIVE_QUANTITY',
          message: `Số lượng đặt hàng (${numVal}) không được nhỏ hơn 0.`,
        });
        result.summary.errorCount++;
        return;
      }

      const isKgUnit = String(targetProduct.unit || '').trim().toLowerCase() === 'kg';
      if (!Number.isInteger(numVal) && !isKgUnit) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'DECIMAL_QUANTITY_NOT_ALLOWED',
          message: `Đơn vị "${targetProduct.unit}" yêu cầu số nguyên, không được nhập số thập phân (${numVal}).`,
        });
        result.summary.errorCount++;
        return;
      }
      if (isKgUnit && !Number.isInteger(numVal)) {
        // Làm tròn 3 chữ số thập phân cho SP cân kg
        numVal = Math.round(numVal * 1000) / 1000;
      }

      if (numVal > 1_000_000) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'QUANTITY_TOO_LARGE',
          message: `Số lượng đặt hàng (${numVal.toLocaleString('vi-VN')}) vượt quá giới hạn hệ thống.`,
        });
        result.summary.errorCount++;
        return;
      }

      // Check Matrix Cell State & Lock / Cutoff
      const isEditable = isCellEditable(dayCol, targetProduct);
      const currentCell = cellMap?.[targetProduct.id]?.[dayCol.dateKey];
      const currentFinalQty =
        currentCell?.finalQty ?? qtyMap?.[targetProduct.id]?.[dayCol.dateKey] ?? 0;

      // NẾU Ô BỊ KHÓA / DISABLED:
      if (!isEditable) {
        if (numVal === currentFinalQty) {
          // Khớp dữ liệu cũ -> Bỏ qua không báo lỗi
          result.summary.ignoredCells++;
          return;
        }

        // Khác dữ liệu cũ -> Báo lỗi BLOCKED_CELL_MODIFIED
        let lockReason = 'Ngày giao hàng này đã bị khóa hoặc không hỗ trợ đặt hàng.';
        let errCode: ExcelValidationCode = 'BLOCKED_CELL_MODIFIED';

        if (dayCol.cutoffStatus === 'PO_GENERATED') {
          lockReason = 'Ngày giao hàng này đã được Store Owner chốt đơn (Finalized) phát hành PO.';
          errCode = 'DATE_ALREADY_FINALIZED';
        } else if (dayCol.cutoffStatus === 'LOCKED' || dayCol.cutoffStatus === 'CUTOFF_DUE') {
          lockReason = 'Đã quá giờ chốt đơn (Cutoff Time) của ngày giao hàng này.';
          errCode = 'CUTOFF_PASSED';
        } else if (dayCol.isOff || dayCol.cutoffStatus === 'SUPPLIER_OFF') {
          lockReason = 'Không phải ngày giao hàng hoạt động của Nhà cung cấp.';
          errCode = 'INVALID_DELIVERY_DAY';
        }

        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: errCode,
          message: `${lockReason} Không thể thay đổi số lượng thành ${numVal}.`,
        });
        result.summary.errorCount++;
        return;
      }

      // NẾU Ô ĐƯỢC PHÉP CHỈNH SỬA:
      if (numVal === 0) {
        if (currentFinalQty === 0) {
          result.summary.ignoredCells++;
          return;
        }
        // Người dùng muốn đặt 0 (xóa nhu cầu)
        result.cellsToApply.push({
          row: rowNum,
          productId: targetProduct.id,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          supplierName: targetProduct.supplierName,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          currentQty: currentFinalQty,
          quantity: 0,
          note: 'Hủy đặt (SL = 0)',
        });
        result.summary.validCells++;
        return;
      }

      // Lead time validation: minimum lead time >= 1 day (không cho giao hôm nay / quá khứ)
      const base = baseDate ? dayjs(baseDate).startOf('day') : dayjs().startOf('day');
      const cellDeliveryDate = dayjs(dayCol.dateKey).startOf('day');
      const leadTimeDays = cellDeliveryDate.diff(base, 'day');
      const supConfig = supplierConfigs?.find((sc) => sc.supplierId === targetProduct.supplierId);
      const configuredLeadDays =
        supConfig && 'leadDays' in supConfig ? Number(supConfig.leadDays) || 1 : 1;
      const minLead = Math.max(1, configuredLeadDays);

      if (leadTimeDays < minLead) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'LEAD_TIME_NOT_MET',
          message:
            leadTimeDays <= 0
              ? `Ngày giao hàng ${dayCol.dateKey} là ngày hôm nay hoặc trong quá khứ. Quy định đặt hàng yêu cầu lead time tối thiểu 1 ngày.`
              : `Ngày giao hàng ${dayCol.dateKey} chỉ cách ${leadTimeDays} ngày, không đủ lead time tối thiểu (${minLead} ngày) của nhà cung cấp.`,
        });
        result.summary.errorCount++;
        return;
      }

      let cellNote = currentFinalQty > 0 ? `Cập nhật (${currentFinalQty} → ${numVal})` : 'Nạp mới';
      let hasWarning = false;

      // Validate MOQ per Delivery Date (ERROR — không cho lưu/apply bản thảo)
      const moq = targetProduct.moq || 1;
      if (numVal > 0 && numVal < moq) {
        result.errors.push({
          type: 'ERROR',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'MOQ_NOT_MET',
          message: `Số lượng đặt (${numVal}) nhỏ hơn MOQ = ${moq}. Không được lưu bản thảo.`,
        });
        result.summary.errorCount++;
        return;
      }

      // Validate Order Multiple (WARNING)
      if (targetProduct.orderMultiple && targetProduct.orderMultiple > 1) {
        if (numVal % targetProduct.orderMultiple !== 0) {
          result.warnings.push({
            type: 'WARNING',
            row: rowNum,
            productCode: targetProduct.sku,
            productName: targetProduct.name,
            deliveryDate: dayCol.dateKey,
            dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
            inputValue: numVal,
            code: 'ORDER_MULTIPLE_INVALID',
            message: `Số lượng đặt (${numVal}) phải là bội số của ${targetProduct.orderMultiple} (ví dụ: quy cách đóng gói).`,
          });
          result.summary.warningCount++;
          cellNote += ` • ⚠️ Sai bội số (${targetProduct.orderMultiple})`;
          hasWarning = true;
        }
      }

      // Quantity Review Warning (Số lượng đột biến)
      const baselineSales = targetProduct.sales || 5;
      if (numVal > baselineSales * 15 && numVal > 50) {
        result.warnings.push({
          type: 'WARNING',
          row: rowNum,
          productCode: targetProduct.sku,
          productName: targetProduct.name,
          deliveryDate: dayCol.dateKey,
          dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
          inputValue: numVal,
          code: 'QUANTITY_REVIEW',
          message: `Số lượng đặt (${numVal}) cao hơn gấp 15 lần mức tiêu thụ trung bình hàng ngày (${baselineSales}/ngày).`,
        });
        result.summary.warningCount++;
        cellNote += ` • ⚠️ SL cao đột biến`;
        hasWarning = true;
      }

      // Nếu số lượng bằng đúng số lượng hiện tại và không có warning mới -> coi như không đổi, bỏ qua
      if (numVal === currentFinalQty && !hasWarning) {
        result.summary.ignoredCells++;
        return;
      }

      // Valid Cell -> Sẵn sàng áp dụng
      result.cellsToApply.push({
        row: rowNum,
        productId: targetProduct.id,
        productCode: targetProduct.sku,
        productName: targetProduct.name,
        supplierName: targetProduct.supplierName,
        deliveryDate: dayCol.dateKey,
        dateLabel: `${dayCol.dowName} ${dayCol.dateShort}`,
        currentQty: currentFinalQty,
        quantity: numVal,
        note: cellNote,
      });
      result.summary.validCells++;
    });
  }

  // 6. Final Verdict
  result.valid = result.summary.errorCount === 0;

  return result;
}

// ============================================================================
// 3. APPLY IMPORT DATA — Tuân thủ phân quyền Employee / Store Owner
// ============================================================================

export function applyMatrixExcelImport(
  cellsToApply: Array<{
    productId: string;
    supplierId?: string;
    rowKey?: string;
    deliveryDate: string;
    quantity: number;
  }>,
  currentCellMap: MatrixCellMap,
  isStoreOwner: boolean
): MatrixCellMap {
  const newMap: MatrixCellMap = { ...currentCellMap };

  cellsToApply.forEach((cell) => {
    const { productId, deliveryDate, quantity } = cell;
    const key =
      cell.rowKey ||
      (cell.supplierId ? productRowKey({ id: productId, supplierId: cell.supplierId }) : productId);

    if (!newMap[key]) {
      newMap[key] = {};
    }

    const currentCell = newMap[key][deliveryDate] || newMap[productId]?.[deliveryDate] || {
      employeeQty: 0,
      storeQty: null,
      finalQty: 0,
      isOwnerAdjusted: false,
      isOwnerOverridden: false,
    };

    if (isStoreOwner) {
      newMap[key][deliveryDate] = {
        ...currentCell,
        storeQty: quantity,
        isOwnerAdjusted: true,
        isOwnerOverridden: true,
        finalQty: quantity,
        modifiedBy: 'store_owner',
        modifiedAt: new Date().toISOString(),
      };
    } else {
      const hasOwnerOverride = currentCell.storeQty !== null || currentCell.isOwnerAdjusted;
      if (hasOwnerOverride) {
        return;
      }
      newMap[key][deliveryDate] = {
        ...currentCell,
        employeeQty: quantity,
        finalQty: quantity,
        modifiedBy: 'employee',
        modifiedAt: new Date().toISOString(),
      };
    }
  });

  return newMap;
}
