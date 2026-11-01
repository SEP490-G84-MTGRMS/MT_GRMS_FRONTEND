export type GrnStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED' | 'TODAY' | 'CONFIRMED' | 'MISMATCH' | 'CANCELED';

export type GrnType = 'FROM_PO' | 'TODAY_DELIVERY';

export type RejectionReason =
  | 'DAMAGE'
  | 'EXPIRED'
  | 'NEAR_EXPIRY'
  | 'WRONG_SPEC'
  | 'WRONG_ITEM'
  | 'QUALITY_ISSUE'
  | 'OTHER';

export const REJECTION_REASON_LABELS: Record<RejectionReason, string> = {
  DAMAGE: 'Hàng hư hỏng / móp méo',
  EXPIRED: 'Hàng đã hết hạn sử dụng',
  NEAR_EXPIRY: 'Hàng cận hạn không đạt chuẩn',
  WRONG_SPEC: 'Sai quy cách đóng gói',
  WRONG_ITEM: 'Giao sai sản phẩm',
  QUALITY_ISSUE: 'Chất lượng không đạt',
  OTHER: 'Lý do khác (ghi chú)',
};

export interface GrnBatchDetail {
  id: string;
  batchCode: string;
  manufactureDate?: string;
  expiryDate: string;
  acceptedQty: number;
  daysLeft?: number;
  isNearExpiry?: boolean;
}

export interface GrnItemDetail {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  orderedQty: number; // Số lượng đặt theo PO
  receivedQty: number; // Số lượng thực nhận kiểm đếm từ NCC
  acceptedQty?: number; // Số lượng chấp nhận nhập kho
  rejectedQty?: number; // Số lượng bị từ chối = receivedQty - acceptedQty
  shortageQty?: number; // Số lượng giao thiếu = Math.max(0, orderedQty - receivedQty)
  differenceQty: number; // Chênh lệch thực tế nhập vs đặt = acceptedQty - orderedQty
  rejectionReason?: RejectionReason; // Lý do từ chối nếu có hàng hỏng
  rejectionNote?: string; // Ghi chú lý do từ chối nếu là OTHER
  hasBatches?: boolean; // Sản phẩm có quản lý HSD hay không
  batches?: GrnBatchDetail[]; // Danh sách nhiều lô cho 1 sản phẩm
  unitPrice: number;
  lineTotal: number;
  batchCode?: string; // Mã lô hàng FEFO (vd: B26-1008)
  manufactureDate?: string; // Ngày sản xuất
  expiryDate?: string; // Hạn sử dụng (vd: 2027-10-08)
  note?: string; // Ghi chú
}

export type GrnRemainingOption = 'cancel' | 'backorder';
export type PoStatusPreview = 'COMPLETED' | 'PARTIALLY_RECEIVED';

export interface GoodsReceiptListItem {
  id: string;
  code: string; // GRN-20261008-01 hoặc PO-20261009-001
  type: GrnType;
  typeLabel: string; // 'Từ PO' | 'Lịch hôm nay'
  receiveDate: string; // Chuỗi hiển thị: 09/10/2026 (Hôm nay 08:00)
  rawDate: string; // YYYY-MM-DD để lọc theo ngày
  branchId: string; // BR-01, BR-02, DC-01
  branchName: string; // BR-01 (CH Nguyễn Trãi)
  supplierId: string;
  supplierName: string; // TươiSạch (SUP-001)
  supplierCode: string; // SUP-001
  poReference: string; // PO-20261009-001
  lineCount: number;
  totalAmount: number; // VNĐ
  status: GrnStatus;
  receiverName: string; // Phân công: NV. Văn A, Đức.DM...
  items: GrnItemDetail[];
  notes?: string;
  cancelledReason?: string;
}

export type GrnFilterTab = 'ALL' | 'TODAY' | 'DRAFT' | 'COMPLETED' | 'MISMATCH' | 'CANCELLED';

export interface GrnFilterState {
  keyword: string;
  branchId: string; // 'ALL' hoặc 'BR-01' | 'BR-02' | 'DC-01'
  supplierId: string; // 'ALL' hoặc tên/mã NCC
  status: string; // 'ALL' hoặc GrnStatus
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  tab: GrnFilterTab;
  pageIndex: number;
  pageSize: number;
}

export type UserRole = 'store_owner' | 'employee';

export type PaymentTerm =
  | '0'
  | '15'
  | '30'
  | 'CREDIT_15'
  | 'CREDIT_30'
  | 'CREDIT_45'
  | 'CASH_ON_DELIVERY'
  | 'ADVANCE_PAID';

export type PaymentMethod = 'Credit' | 'Cash' | 'Bank';

export interface PoLookupOption {
  poCode: string;
  branchId: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: GrnItemDetail[];
  notes?: string;
}

export interface GrnCostSummary {
  goodsTotal: number;
  landedCost: number;
  discountAmount: number;
  vatPercent: number;
  vatAmount: number;
  grandTotal: number;
}

export interface GrnFormData {
  id?: string;
  grnNo: string;
  branchId: string;
  branchName: string;
  poReference: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  receiptTime: string;
  invoiceNo: string;
  createdBy: string;
  paymentTerm: PaymentTerm;
  paymentMethod: PaymentMethod;
  notes: string;
  items: GrnItemDetail[];
  costs: GrnCostSummary;
  status: GrnStatus;
}

export interface GrnDetailItem extends GrnItemDetail {
  landedCostPerUnit?: number;
  newUnitCost?: number;
  retailPrice?: number;
  marginPercent?: number;
  isCatchWeight?: boolean;
  isGift?: boolean;
  remainingOption?: GrnRemainingOption;
}

export interface GrnPostSettings {
  createApInvoice: boolean;
  printShelfLabels: boolean;
  attachmentName?: string;
  attachmentSize?: string;
}
