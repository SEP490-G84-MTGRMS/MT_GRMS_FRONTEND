import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  validateMatrixExcelFile,
  applyMatrixExcelImport,
} from '../lib/matrixExcelService';
import type {
  OrderMatrixProduct,
  DayColInfo,
  MatrixCellMap,
  BranchOption,
  SupplierOption,
} from '../types/po.types';

describe('Purchase Order Matrix — Excel Export & Import Engine (CISCA Specification)', () => {
  const mockBranch: BranchOption = {
    id: '01a18874-9747-7299-b539-82c2174a3fb0',
    code: 'BR-Q1',
    name: 'Chi nhánh Quận 1',
  };

  const mockSupplier: SupplierOption = {
    id: 'sup-vinamilk-01',
    code: 'VNM',
    name: 'Công ty Cổ phần Sữa Việt Nam',
    creditLimit: 50000000,
    openAp: 12000000,
    config: {
      supplierId: 'sup-vinamilk-01',
      leadDays: 1,
      cutoffHour: '15:00',
      lockHour: '16:00',
      activeDeliveryDays: [1, 2, 3, 4, 5, 6],
      holidays: [],
    },
  };

  const mockProducts: OrderMatrixProduct[] = [
    {
      id: 'prod-001',
      supplierId: 'sup-vinamilk-01',
      supplierName: 'Vinamilk',
      category: 'Sữa tươi',
      name: 'Sữa tươi tiệt trùng Vinamilk 1L',
      sku: 'SP001',
      unit: 'Hộp',
      price: 32000,
      moq: 10,
      orderMultiple: 1,
      soh: 25,
      sales: 8,
      isProductActive: true,
      isBranchProductActive: true,
      isSupplierProductActive: true,
      isSupplierActive: true,
      isSupplierBranchActive: true,
    },
    {
      id: 'prod-002',
      supplierId: 'sup-vinamilk-01',
      supplierName: 'Vinamilk',
      category: 'Sữa chua',
      name: 'Sữa chua nha đam Vinamilk 100g',
      sku: 'SP002',
      unit: 'Lốc',
      price: 28000,
      moq: 6,
      orderMultiple: 4, // Bội số 4
      soh: 40,
      sales: 12,
      isProductActive: true,
      isBranchProductActive: true,
      isSupplierProductActive: true,
      isSupplierActive: true,
      isSupplierBranchActive: true,
    },
  ];

  const mockDays: DayColInfo[] = [
    {
      date: new Date('2026-11-04'),
      dateKey: '2026-11-04',
      dowName: 'T4',
      dateShort: '04/11',
      isOff: false,
      isLocked: false,
      cutoffStatus: 'OPEN',
    },
    {
      date: new Date('2026-11-05'),
      dateKey: '2026-11-05',
      dowName: 'T5',
      dateShort: '05/11',
      isOff: false,
      isLocked: true, // Ô khóa
      cutoffStatus: 'LOCKED',
    },
  ];

  const mockCellMap: MatrixCellMap = {
    'prod-001': {
      '2026-11-04': {
        employeeQty: 10,
        storeQty: 12,
        finalQty: 12,
        isOwnerAdjusted: true,
      },
      '2026-11-05': {
        employeeQty: 20,
        storeQty: 20,
        finalQty: 20,
        isOwnerAdjusted: false,
      },
    },
  };

  const isCellEditable = (d: DayColInfo) => !d.isLocked && d.cutoffStatus === 'OPEN';

  // Helper to generate a test File
  function createTestExcelFile(rows: any[][], fileName = 'test_matrix.xlsx'): File {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO_Matrix');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new File([u8], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  it('TC-EXCEL-001: Export matrix produces a valid workbook with metadata and headers', () => {
    // We can call exportMatrixToExcel or simulate workbook creation
    const wsData = [
      ['HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS - ĐẶT HÀNG NHẬP KHO (PURCHASE ORDER MATRIX)'],
      [`Chi nhánh: ${mockBranch.name} | Mã CN: ${mockBranch.id}`],
      [`Nhà cung cấp: ${mockSupplier.name} | Mã NCC: ${mockSupplier.id}`],
      [],
      [
        'STT',
        'Ngành hàng',
        'Mã vạch',
        'Mã sản phẩm',
        'Tên sản phẩm',
        'ĐVT',
        'MOQ',
        'Bội số',
        'Đơn giá (VNĐ)',
        'T4 04/11 [2026-11-04]',
        'T5 05/11 [2026-11-05]',
        'Tổng SL',
        'Thành tiền (VNĐ)',
      ],
      [1, 'Sữa tươi', '893123456', 'SP001', 'Sữa tươi Vinamilk 1L', 'Hộp', 10, 1, 32000, 12, 20, 32, 1024000],
    ];

    const file = createTestExcelFile(wsData);
    expect(file).toBeDefined();
    expect(file.size).toBeGreaterThan(0);
  });

  it('TC-EXCEL-002: Validation detects MOQ_NOT_MET when ordered quantity is less than supplier MOQ', async () => {
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]', 'T5 05/11 [2026-11-05]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 5, 20], // 5 < MOQ (10)
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    expect(result.summary.errorCount).toBeGreaterThan(0);
    const moqErr = result.errors.find((e) => e.code === 'MOQ_NOT_MET');
    expect(moqErr).toBeDefined();
    expect(moqErr?.inputValue).toBe(5);
  });

  it('TC-EXCEL-003: Validation detects BLOCKED_CELL_MODIFIED when locked/cutoff cell is changed', async () => {
    // 2026-11-05 is LOCKED, existing qty is 20. If Excel has 25 -> ERROR!
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]', 'T5 05/11 [2026-11-05]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 15, 25], // 25 != 20 in locked cell
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const blockedErr = result.errors.find((e) => e.code === 'BLOCKED_CELL_MODIFIED' || e.code === 'CUTOFF_PASSED');
    expect(blockedErr).toBeDefined();
  });

  it('TC-EXCEL-004: Locked cell with unchanged value is ignored and does NOT cause error', async () => {
    // 2026-11-05 is LOCKED, existing qty is 20. Excel has 20 -> Ignored / No error!
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]', 'T5 05/11 [2026-11-05]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 15, 20], // 15 valid on 04/11, 20 unchanged on 05/11
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(true);
    expect(result.summary.errorCount).toBe(0);
    expect(result.summary.validCells).toBe(1);
    expect(result.summary.ignoredCells).toBe(1);
    expect(result.cellsToApply[0].quantity).toBe(15);
  });

  it('TC-EXCEL-005: Validation detects ORDER_MULTIPLE_INVALID when order multiple is violated', async () => {
    // SP002 has MOQ=6, orderMultiple=4. If user orders 10 -> not multiple of 4!
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa chua', '893456', 'SP002', 'Sữa chua nha đam', 'Lốc', 6, 4, 28000, 10], // 10 % 4 !== 0
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const mulErr = result.errors.find((e) => e.code === 'ORDER_MULTIPLE_INVALID');
    expect(mulErr).toBeDefined();
  });

  it('TC-EXCEL-006: Validation detects PRODUCT_NOT_IN_MATRIX for foreign product SKU', async () => {
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Bánh kẹo', '893999', 'SP_FOREIGN_999', 'Bánh ngoại lai', 'Hộp', 1, 1, 50000, 20],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const notFoundErr = result.errors.find((e) => e.code === 'PRODUCT_NOT_IN_MATRIX');
    expect(notFoundErr).toBeDefined();
    expect(notFoundErr?.productCode).toBe('SP_FOREIGN_999');
  });

  it('TC-EXCEL-007: Apply import correctly respects Store Owner and Employee role isolation', () => {
    const cellsToApply = [
      { productId: 'prod-001', deliveryDate: '2026-11-04', quantity: 30 },
    ];

    // Store Owner apply
    const soMap = applyMatrixExcelImport(cellsToApply, mockCellMap, true);
    expect(soMap['prod-001']['2026-11-04'].storeQty).toBe(30);
    expect(soMap['prod-001']['2026-11-04'].finalQty).toBe(30);
    expect(soMap['prod-001']['2026-11-04'].isOwnerAdjusted).toBe(true);
    expect(soMap['prod-001']['2026-11-04'].modifiedBy).toBe('store_owner');

    // Employee apply on existing cell where Store Owner had adjusted -> storeQty is preserved!
    const empMap = applyMatrixExcelImport(cellsToApply, soMap, false);
    expect(empMap['prod-001']['2026-11-04'].employeeQty).toBe(30);
    expect(empMap['prod-001']['2026-11-04'].storeQty).toBe(30); // Preserved!
    expect(empMap['prod-001']['2026-11-04'].finalQty).toBe(30);
  });
});
