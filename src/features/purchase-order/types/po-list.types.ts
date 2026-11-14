export type PurchaseOrderStatus =
  | 'PENDING_APPROVAL'     // Chờ duyệt
  | 'APPROVED'             // Đã duyệt
  | 'DISPATCHED'           // Đã gửi NCC
  | 'SENT'                 // Đã gửi NCC
  | 'CONFIRMED'            // NCC đã chốt đơn
  | 'PARTIALLY_RECEIVED'   // Đã nhận một phần
  | 'RECEIVED'             // Đã nhập kho xong
  | 'COMPLETED'            // Đã hoàn tất nhập kho
  | 'REJECTED'             // Đã từ chối
  | 'CANCELLED';           // Đã hủy

export interface PurchaseOrderItemDetail {
  id: string;
  name: string;
  sku: string;
  unit: string;
  orderedQty: number;
  receivedQty?: number;
  price: number;
  total: number;
}

export interface PurchaseOrderListItem {
  id: string;
  poCode: string;              // VD: PO-20261008-001
  storeRefCode: string;        // VD: STR-01, DC-01
  supplierId: string;
  supplierCode: string;        // VD: SUP-001
  supplierName: string;        // VD: CÔNG TY THỰC PHẨM TƯƠI SỐNG HƯƠNG QUÊ
  branchId: string;
  branchCode: string;          // VD: BR-01
  branchName: string;          // VD: BR-01 CH Nguyễn Trãi
  createdSource: string;       // VD: NV. Nguyễn Văn A (Nhập Grid), Chủ cửa hàng (Dispatch Hub)
  lastUpdated: string;         // VD: 08/10/2026 17:15
  expectedDelivery: string;    // VD: 09/10/2026 (hiển thị)
  /** Ngày giao gốc ISO YYYY-MM-DD — dùng gate nhập hàng */
  deliveryDate?: string | null;
  itemCount: number;           // Số mặt hàng (SKU)
  totalAmount: number;         // Tổng tiền đơn hàng (VNĐ)
  status: PurchaseOrderStatus;
  note?: string;
  revisionNumber?: number;
  /** Phiếu GRN DRAFT/COMPLETED gắn PO (nếu có) — dùng điều hướng Nhận hàng */
  activeGoodsReceiptId?: string | null;
  activeGoodsReceiptCode?: string | null;
  activeGoodsReceiptStatus?: string | null;
  /** null/MANUAL_MATRIX = mua thường; SUPPLIER_RETURN = đổi hàng từ phiếu trả */
  sourceType?: string | null;
  sourceSupplierReturnId?: string | null;
  items: PurchaseOrderItemDetail[];
}

export interface PoListFilterState {
  branchId: string;            // 'all' | ID cụ thể
  supplierId: string;          // 'all' | ID cụ thể
  status: 'all' | PurchaseOrderStatus;
  dateFrom: string;            // YYYY-MM-DD
  dateTo: string;              // YYYY-MM-DD
  keyword: string;
  pageIndex: number;
  pageSize: number;
}
