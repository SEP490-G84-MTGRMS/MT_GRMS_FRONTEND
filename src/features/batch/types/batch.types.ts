export type BatchStatus = 'Expired' | 'Critical' | 'Warning' | 'Normal';

export type BatchMovementType = 'RECEIPT' | 'POS_SALE' | 'TRANSFER' | 'WRITE_OFF' | 'FEFO_LOCK';

export interface BatchMovement {
  id: string;
  timestamp: string; // vd: '18/09/2026 08:30'
  type: BatchMovementType;
  typeLabel: string; // 'Nhập kho (GRN)' | 'Bán lẻ FEFO (POS)' | 'Điều chuyển kho' | 'Xuất hủy' | 'Cảnh báo FEFO'
  quantity: number; // +60 hoặc -48
  documentCode: string; // 'GRN-2026-0801', 'POS-INV-20260922-004'
  actor: string; // 'Thủ kho 01', 'Thu ngân 02', 'System Job'
  notes?: string;
}

export interface BatchItem {
  id: string;
  batchCode: string; // Mã lô hàng FEFO (vd: BAT-202609-01, B26-1008)
  productId: string;
  sku: string; // Mã SKU hàng hóa (vd: DY-SC-02, DY-SUA-01)
  productName: string;
  categoryName: string;
  branchId: string; // 'BR-01' | 'BR-02'
  branchName: string; // 'BR-01 Main Store' | 'BR-02 Thu Duc Hub'
  supplierId: string;
  supplierName: string;
  mfgDate: string; // Ngày sản xuất (DD/MM/YYYY)
  expiryDate: string; // Hạn sử dụng (DD/MM/YYYY)
  rawExpiryDate: string; // YYYY-MM-DD để tính toán chính xác
  daysLeft: number; // Âm: Quá hạn, 0-3: Khẩn cấp, 4-30: Cảnh báo, >30: An toàn
  qtyInitial: number; // Số lượng nhập ban đầu
  qtyCurrent: number; // Số lượng tồn thực tế của lô
  qtyReserved?: number; // Số lượng đang giữ chỗ trả NCC
  qtyQuarantined?: number; // Số lượng đang cách ly chờ duyệt kiểm kê
  qtyAvailable?: number; // Số lượng khả dụng (qtyCurrent - qtyReserved - qtyQuarantined)
  /** Đơn vị nhập (purchase) */
  unit: string; // Thùng, Hộp, Kg...
  /** Đơn vị tồn / gốc — số tồn đang tính theo đơn vị này */
  stockUnit?: string; // Chai, Cái, Kg...
  /** 1 đơn vị nhập = bao nhiêu đơn vị tồn */
  purchaseToStockRate?: number;
  costPrice: number; // Đơn giá vốn nhập kho (VNĐ)
  totalValuation: number; // qtyCurrent * costPrice
  status: BatchStatus;
  zoneArea: string; // 'Cold Storage (Kho mát)' | 'Freezer Zone (Tủ đông)' | 'Fresh Display (Kệ rau tươi)' | 'Ambient (Kệ thường)'
  shelfLocation: string; // 'C-B-01', 'Z-F-01', 'F-A-02'...
  originalGrnNo: string; // Mã phiếu nhập gốc (vd: GRN-2026-0801, GRN-20261008-01)
  originalGrnId?: string; // ID phiếu nhập gốc
  discountPercent?: number; // % giảm giá FEFO đã áp dụng
  movements: BatchMovement[];
  /** SP đơn vị nhập/gốc là kg */
  isWeightProduct?: boolean;
  allowRepack?: boolean;
  packagedQty?: number;
  packageCount?: number;
  rawSellableQty?: number;
}

export interface BatchFilterState {
  keyword: string;
  productName: string;
  sku: string;
  batchCode: string;
  supplierName: string;
  branchId: string; // 'ALL' | 'BR-01' | 'BR-02'
  status: 'ALL' | BatchStatus;
  pageIndex: number;
  pageSize: number;
}

export interface BatchKpiSummary {
  totalBatches: number;
  expiredCount: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  expiredValue: number;
  criticalValue: number;
  warningValue: number;
}

export interface BatchBranchOption {
  id: string;
  name: string;
  code: string;
}

export type UserRole = 'store_owner' | 'employee';
