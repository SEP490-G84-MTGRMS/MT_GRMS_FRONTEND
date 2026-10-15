export type GrnStatus = 'TODAY' | 'DRAFT' | 'CONFIRMED' | 'MISMATCH' | 'CANCELED';

export type GrnType = 'TODAY_DELIVERY' | 'FROM_PO' | 'DIRECT';

export interface GrnItemDetail {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  orderedQty: number; // Số lượng đặt theo PO (0 nếu là nhập trực tiếp)
  receivedQty: number; // Số lượng thực nhận kiểm đếm
  differenceQty: number; // receivedQty - orderedQty
  unitPrice: number;
  lineTotal: number;
  batchCode?: string; // Mã lô hàng FEFO (vd: B26-1008)
  expiryDate?: string; // Hạn sử dụng (vd: 2027-10-08)
  note?: string; // Ghi chú hoặc lý do lệch hàng
}

export interface GoodsReceiptListItem {
  id: string;
  code: string; // GRN-20261008-01 hoặc PO-20261009-001
  type: GrnType;
  typeLabel: string; // 'Lịch hôm nay' | 'Từ PO' | 'Trực tiếp'
  receiveDate: string; // Chuỗi hiển thị: 09/10/2026 (Hôm nay 08:00)
  rawDate: string; // YYYY-MM-DD để lọc theo ngày
  branchId: string; // BR-01, BR-02, DC-01
  branchName: string; // BR-01 (CH Nguyễn Trãi)
  supplierId: string;
  supplierName: string; // TươiSạch (SUP-001)
  supplierCode: string; // SUP-001
  poReference: string; // PO-20261009-001 hoặc '-'
  lineCount: number;
  totalAmount: number; // VNĐ
  status: GrnStatus;
  receiverName: string; // Phân công: NV. Văn A, Đức.DM...
  items: GrnItemDetail[];
  notes?: string;
}

export type GrnFilterTab = 'ALL' | 'TODAY' | 'DRAFT' | 'MISMATCH';

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
