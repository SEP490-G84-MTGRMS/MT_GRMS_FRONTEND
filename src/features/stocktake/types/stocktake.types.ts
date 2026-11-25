export type StocktakeStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_RECOUNT';

export type StocktakeScopeType =
  | 'FULL_BRANCH'
  | 'BY_CATEGORY'
  | 'BY_SHELF'
  | 'SELECTED_ITEMS';

export type DefectiveReasonCode =
  | 'MANUFACTURING_DEFECT'
  | 'PACKAGING_DEFECT'
  | 'QUALITY_MISMATCH'
  | 'RECALL'
  | 'OTHER';

export type NearExpiryAction =
  | 'DISCOUNT_SALE'
  | 'RETURN_SUPPLIER'
  | 'HOLD_MONITOR';

/** Hướng xử lý hàng hư hỏng / hết hạn khi Owner duyệt. */
export type StockDispositionAction = 'WRITE_OFF' | 'RETURN_SUPPLIER';

export interface StocktakeCountUnitOption {
  name: string;
  /** 1 đơn vị này = bao nhiêu đơn vị tồn (base). */
  toStockRate: number;
}

export interface StocktakeLine {
  id: string;
  branchStockId?: string | null;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  batchCode?: string | null;
  expiryDate?: string | null;
  shelfLocation?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  goodsReceiptId?: string | null;
  goodsReceiptNo?: string | null;
  goodsReceiptLineId?: string | null;
  unitCost: number;
  systemQty: number;
  goodQty: number;
  defectiveQty: number;
  damagedQty: number;
  nearExpiryQty: number;
  expiredQty: number;
  actualQty: number;
  varianceQty: number;
  defectiveReasonCode?: DefectiveReasonCode | string | null;
  defectiveReasonDetail?: string | null;
  nearExpiryAction?: NearExpiryAction | string | null;
  /** WRITE_OFF (mặc định) | RETURN_SUPPLIER */
  damagedAction?: StockDispositionAction | string | null;
  /** WRITE_OFF (mặc định) | RETURN_SUPPLIER */
  expiredAction?: StockDispositionAction | string | null;
  discountPercent?: number | null;
  returnedQty: number;
  returnableQty: number;
  evidenceUrl?: string | null;
  note?: string | null;
}

export interface StocktakeListItem {
  id: string;
  code: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  scopeType: StocktakeScopeType | string;
  scopeReference?: string | null;
  status: StocktakeStatus;
  createdByName: string;
  createdAt: string;
  submittedAt?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  lineCount: number;
  abnormalLineCount: number;
  returnEligibleLines?: number;
  totalDefectiveQty: number;
  totalDamagedAndExpiredQty: number;
  totalVarianceQty: number;
}

export interface LinkedSupplierReturnSummary {
  id: string;
  code: string;
  supplierName: string;
  status: string;
  totalRequestedQty: number;
  totalEstimatedAmount: number;
  createdAt: string;
}

export interface StocktakeDetail extends StocktakeListItem {
  note?: string | null;
  rejectionReason?: string | null;
  lines: StocktakeLine[];
  linkedSupplierReturns: LinkedSupplierReturnSummary[];
}

export interface StocktakeFilterState {
  keyword: string;
  branchId: string;
  status: '' | StocktakeStatus;
  pageIndex: number;
  pageSize: number;
}

export interface UpsertStocktakeLineInput {
  branchStockId?: string | null;
  productId: string;
  sku: string;
  productName: string;
  /** Nhãn ĐVT đang chọn để nhập (có thể là thùng / chai…). */
  unit: string;
  /** ĐVT tồn kho (base) — luôn lưu số liệu theo đơn vị này khi gửi BE. */
  stockUnit?: string;
  purchaseUnit?: string;
  purchaseToStockRate?: number;
  /** ĐVT đang dùng để nhập số trên form. */
  countUnit?: string;
  countToStockRate?: number;
  countUnitOptions?: StocktakeCountUnitOption[];
  batchCode?: string | null;
  expiryDate?: string | null;
  shelfLocation?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  goodsReceiptId?: string | null;
  goodsReceiptNo?: string | null;
  goodsReceiptLineId?: string | null;
  unitCost: number;
  systemQty: number;
  goodQty: number;
  defectiveQty: number;
  damagedQty: number;
  nearExpiryQty: number;
  expiredQty: number;
  defectiveReasonCode?: string | null;
  defectiveReasonDetail?: string | null;
  nearExpiryAction?: string | null;
  damagedAction?: StockDispositionAction | string | null;
  expiredAction?: StockDispositionAction | string | null;
  discountPercent?: number | null;
  evidenceUrl?: string | null;
  note?: string | null;
}

export interface CreateStocktakePayload {
  branchId: string;
  scopeType: string;
  scopeReference?: string | null;
  note?: string | null;
  submitImmediately: boolean;
  createdByName?: string | null;
  lines: UpsertStocktakeLineInput[];
}

export interface ReviewStocktakePayload {
  action: 'APPROVE' | 'REJECT' | 'NEEDS_RECOUNT';
  note?: string | null;
  /** RULE-03: bắt buộc khi có hàng thừa (variance &gt; 0) */
  confirmSurplusFound?: boolean;
  /** Quyết định xử lý hư hỏng / hết hạn theo từng dòng trước khi duyệt. */
  lineActions?: Array<{
    stocktakeLineId: string;
    damagedAction?: StockDispositionAction | string | null;
    expiredAction?: StockDispositionAction | string | null;
  }>;
}

export interface CreateReturnFromStocktakePayload {
  goodsReceiptId?: string | null;
  resolutionType: 'DEDUCT_INVOICE' | 'REFUND' | 'REPLACE_GOODS' | 'SUPPLIER_CREDIT';
  note?: string | null;
  submitImmediately: boolean;
  lines: {
    stocktakeLineId: string;
    goodsReceiptId?: string | null;
    goodsReceiptLineId?: string | null;
    requestedQty: number;
    note?: string | null;
  }[];
}

export const DEFECTIVE_REASON_OPTIONS: { value: DefectiveReasonCode; label: string }[] = [
  { value: 'MANUFACTURING_DEFECT', label: 'Lỗi sản xuất (NCC)' },
  { value: 'PACKAGING_DEFECT', label: 'Bao bì lỗi từ nguồn nhập' },
  { value: 'QUALITY_MISMATCH', label: 'Biến chất / Không đạt chất lượng' },
  { value: 'RECALL', label: 'Thu hồi từ NCC / NSX' },
  { value: 'OTHER', label: 'Lý do khác (bắt buộc mô tả)' },
];

export const NEAR_EXPIRY_ACTION_OPTIONS: { value: NearExpiryAction; label: string }[] = [
  { value: 'DISCOUNT_SALE', label: 'Giảm giá bán nhanh (FEFO)' },
  { value: 'RETURN_SUPPLIER', label: 'Đề nghị trả NCC (theo chính sách)' },
  { value: 'HOLD_MONITOR', label: 'Giữ theo dõi thêm' },
];

export const SCOPE_TYPE_LABELS: Record<string, string> = {
  FULL_BRANCH: 'Toàn bộ chi nhánh',
  ALL: 'Toàn bộ chi nhánh',
  BY_CATEGORY: 'Theo ngành hàng',
  CATEGORY: 'Theo ngành hàng',
  BY_SHELF: 'Theo vị trí kệ',
  SELECTED_ITEMS: 'Theo lô / sản phẩm chọn',
  LOT: 'Theo lô / sản phẩm chọn',
  PRODUCT: 'Theo sản phẩm',
};

