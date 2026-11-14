import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  validateMatrixExcelFile,
  applyMatrixExcelImport,
  resolveExportQty,
} from '../lib/matrixExcelService';
import { productRowKey } from '../lib/matrixRowKey';
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
  const testBaseDate = '2026-11-01'; // Reference date: 04/11 has 3 days lead time >= 1 day

  // Helper to generate a test File
  function createTestExcelFile(rows: any[][], fileName = 'test_matrix.xlsx'): File {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO_Matrix');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new File([u8], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  it('Scenario 1: File đúng chi nhánh A + data hợp lệ -> valid=true, cellsToApply đúng', async () => {
    const wsData = [
      ['HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS - ĐẶT HÀNG NHẬP KHO (PURCHASE ORDER MATRIX)'],
      [`Chi nhánh: ${mockBranch.name} | Mã hệ thống: ${mockBranch.id}`],
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
      [1, 'Sữa tươi', '893123456', 'SP001', 'Sữa tươi Vinamilk 1L', 'Hộp', 10, 1, 32000, 15, 20, 35, 1120000],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentBranchCode: mockBranch.code,
      currentSupplierId: mockSupplier.id,
      currentSupplierCode: mockSupplier.code,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(true);
    expect(result.summary.errorCount).toBe(0);
    expect(result.summary.validCells).toBe(1); // 15 on 04/11 (05/11 is locked and unchanged at 20, ignored)
    expect(result.cellsToApply[0].productCode).toBe('SP001');
    expect(result.cellsToApply[0].quantity).toBe(15);
    expect(result.cellsToApply[0].deliveryDate).toBe('2026-11-04');
    expect(result.scopeStatus.branchMatched).toBe(true);
    expect(result.scopeStatus.supplierMatched).toBe(true);
    expect(result.scopeStatus.periodMatched).toBe(true);
  });

  it('Scenario 2: File chi nhánh B khi UI đang A -> BRANCH_MISMATCH, không Apply', async () => {
    const foreignBranchId = '01a18874-9747-7999-b539-82c2174a9999';
    const wsData = [
      ['HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS'],
      [`Chi nhánh: Chi nhánh Quận 7 | Mã hệ thống: ${foreignBranchId}`],
      [`Nhà cung cấp: ${mockSupplier.name} | Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 15],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentBranchCode: mockBranch.code,
      currentSupplierId: mockSupplier.id,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    expect(result.summary.errorCount).toBeGreaterThan(0);
    const branchErr = result.errors.find((e) => e.code === 'BRANCH_MISMATCH');
    expect(branchErr).toBeDefined();
    expect(result.scopeStatus.branchMatched).toBe(false);
  });

  it('Scenario 3: File NCC khác khi UI filter 1 NCC -> SUPPLIER_MISMATCH', async () => {
    const foreignSupplierId = 'sup-th-true-milk';
    const wsData = [
      ['HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS'],
      [`Chi nhánh: ${mockBranch.name} | Mã hệ thống: ${mockBranch.id}`],
      [`Nhà cung cấp: TH True Milk | Mã NCC: ${foreignSupplierId}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 15],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    expect(result.summary.errorCount).toBeGreaterThan(0);
    const supErr = result.errors.find((e) => e.code === 'SUPPLIER_MISMATCH');
    expect(supErr).toBeDefined();
    expect(result.scopeStatus.supplierMatched).toBe(false);
  });

  it('Scenario 4: Ô ngày hôm nay / quá khứ -> LEAD_TIME_NOT_MET', async () => {
    // If baseDate is 2026-11-04 (same day as delivery date), leadTimeDays = 0 < 1 day!
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 15],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      baseDate: '2026-11-04', // Today is the delivery date!
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const leadErr = result.errors.find((e) => e.code === 'LEAD_TIME_NOT_MET');
    expect(leadErr).toBeDefined();
  });

  it('Scenario 5: Ô LOCKED / PO_GENERATED mà đổi SL -> BLOCKED_CELL_MODIFIED / CUTOFF_PASSED', async () => {
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
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const blockedErr = result.errors.find((e) => e.code === 'BLOCKED_CELL_MODIFIED' || e.code === 'CUTOFF_PASSED');
    expect(blockedErr).toBeDefined();
  });

  it('Scenario 6: SP không thuộc matrix chi nhánh -> PRODUCT_NOT_IN_MATRIX', async () => {
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
      baseDate: testBaseDate,
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

  it('Scenario 7: SL âm hoặc không phải số -> ERROR (NEGATIVE_QUANTITY / INVALID_QUANTITY)', async () => {
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, -5], // Negative!
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    const negErr = result.errors.find((e) => e.code === 'NEGATIVE_QUANTITY');
    expect(negErr).toBeDefined();
  });

  it('Scenario 8: SL < MOQ -> ERROR; không Apply được', async () => {
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa tươi', '893123', 'SP001', 'Sữa tươi 1L', 'Hộp', 10, 1, 32000, 5], // 5 < MOQ (10)
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(false);
    expect(result.summary.errorCount).toBeGreaterThanOrEqual(1);
    const moqErr = result.errors.find((e) => e.code === 'MOQ_NOT_MET');
    expect(moqErr).toBeDefined();
    expect(moqErr?.inputValue).toBe(5);
    expect(result.cellsToApply.length).toBe(0);
  });

  it('Scenario 9: Bội số đặt hàng không khớp -> WARNING (ORDER_MULTIPLE_INVALID)', async () => {
    // SP002 has orderMultiple = 4. 10 is not multiple of 4.
    const wsData = [
      ['Header info'],
      [`Mã CN: ${mockBranch.id}`],
      [`Mã NCC: ${mockSupplier.id}`],
      [],
      ['STT', 'Ngành hàng', 'Mã vạch', 'Mã sản phẩm', 'Tên sản phẩm', 'ĐVT', 'MOQ', 'Bội số', 'Đơn giá', 'T4 04/11 [2026-11-04]'],
      [1, 'Sữa chua', '893456', 'SP002', 'Sữa chua nha đam', 'Lốc', 6, 4, 28000, 10],
    ];

    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentSupplierId: mockSupplier.id,
      baseDate: testBaseDate,
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
    });

    expect(result.valid).toBe(true);
    expect(result.summary.errorCount).toBe(0);
    const mulWarn = result.warnings.find((w) => w.code === 'ORDER_MULTIPLE_INVALID');
    expect(mulWarn).toBeDefined();
    expect(result.summary.validCells).toBe(1);
  });

  it('Scenario 10: Apply import correctly respects Store Owner and Employee role isolation', () => {
    const cellsToApply = [
      {
        row: 6,
        productId: 'prod-001',
        productCode: 'SP001',
        productName: 'Sữa tươi Vinamilk 1L',
        deliveryDate: '2026-11-04',
        dateLabel: 'T4 04/11',
        currentQty: 12,
        quantity: 30,
        note: 'Nạp mới',
      },
    ];

    // Store Owner apply
    const soMap = applyMatrixExcelImport(cellsToApply, mockCellMap, true);
    expect(soMap['prod-001']['2026-11-04'].storeQty).toBe(30);
    expect(soMap['prod-001']['2026-11-04'].finalQty).toBe(30);
    expect(soMap['prod-001']['2026-11-04'].isOwnerAdjusted).toBe(true);
    expect(soMap['prod-001']['2026-11-04'].modifiedBy).toBe('store_owner');

    // Employee apply on owner-adjusted cell -> skipped entirely (không cho NV sửa ô đã chốt)
    const empMap = applyMatrixExcelImport(cellsToApply, soMap, false);
    expect(empMap['prod-001']['2026-11-04'].employeeQty).toBe(10); // giữ đề xuất cũ
    expect(empMap['prod-001']['2026-11-04'].storeQty).toBe(30);
    expect(empMap['prod-001']['2026-11-04'].finalQty).toBe(30);
    expect(empMap['prod-001']['2026-11-04'].isOwnerAdjusted).toBe(true);
  });

  it('resolveExportQty: SO thấy storeQty khi đã chốt; Emp thấy employeeQty', () => {
    const owned = {
      employeeQty: 10,
      storeQty: 12,
      finalQty: 12,
      isOwnerAdjusted: true,
    };
    expect(resolveExportQty(owned, true)).toBe(12);
    expect(resolveExportQty(owned, false)).toBe(12); // owner-adjusted → hiện store/final cho emp (read-only)
    const plain = {
      employeeQty: 8,
      storeQty: null,
      finalQty: 8,
      isOwnerAdjusted: false,
    };
    expect(resolveExportQty(plain, true)).toBe(8);
    expect(resolveExportQty(plain, false)).toBe(8);
  });

  it('applyMatrixExcelImport ghi theo productRowKey khi có supplierId', () => {
    const p = mockProducts[0];
    const rk = productRowKey(p);
    const map = applyMatrixExcelImport(
      [
        {
          productId: p.id,
          supplierId: p.supplierId,
          rowKey: rk,
          deliveryDate: '2026-11-04',
          quantity: 40,
        },
      ],
      {},
      true
    );
    expect(map[rk]['2026-11-04'].storeQty).toBe(40);
    expect(map[rk]['2026-11-04'].finalQty).toBe(40);
  });

  it('Header "Mã sản phẩm (SKU)" vẫn nhận diện được (compat export cũ)', async () => {
    const wsData = [
      ['HỆ THỐNG QUẢN LÝ BÁN LẺ MT-GRMS - ĐẶT HÀNG NHẬP KHO (PURCHASE ORDER MATRIX)'],
      [`Chi nhánh: ${mockBranch.name} | Mã hệ thống: ${mockBranch.id}`],
      [`Nhà cung cấp: ${mockSupplier.name} | Mã NCC: ${mockSupplier.id}`],
      [],
      [
        'STT',
        'Ngành hàng',
        'Mã vạch',
        'Mã sản phẩm (SKU)',
        'Tên sản phẩm',
        'ĐVT',
        'MOQ',
        'Bội số',
        'Đơn giá (VNĐ)',
        'T4 04/11 [2026-11-04]',
        'Tổng SL',
        'Thành tiền (VNĐ)',
      ],
      [1, 'Sữa tươi', '893', 'SP001', 'Sữa', 'Hộp', 10, 1, 32000, 15, 15, 480000],
    ];
    const file = createTestExcelFile(wsData);
    const result = await validateMatrixExcelFile({
      file,
      currentBranchId: mockBranch.id,
      currentBranchCode: mockBranch.code,
      currentBranchName: mockBranch.name,
      currentSupplierId: mockSupplier.id,
      currentSupplierCode: mockSupplier.code,
      currentSupplierName: mockSupplier.name,
      viewFrom: new Date('2026-11-04'),
      viewTo: new Date('2026-11-05'),
      matrixProducts: mockProducts,
      dayColumns: mockDays,
      cellMap: mockCellMap,
      isCellEditable,
      baseDate: testBaseDate,
    });
    expect(result.errors.some((e) => e.code === 'HEADER_MISSING')).toBe(false);
  });
});
