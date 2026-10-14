/**
 * Data Transfer Objects (DTO) cho Nghiệp vụ Tra cứu Tồn kho & Lô FEFO và Quản lý Hóa đơn
 * Tương thích trực tiếp với Entity / DTO trong C# .NET Backend
 */

// ==========================================
// 1. TỒN KHO & LÔ HẠN DÙNG FEFO DTOs
// ==========================================

/**
 * C# Entity: BranchStock / StockOnHand
 */
export class BranchStockDTO {
  branchId: string = '';
  branchName: string = '';
  address: string = '';
  physicalStock: number = 0;       // Tồn kho vật lý
  onHoldStock: number = 0;          // Đang giữ đơn / Pre-order
  availableStock: number = 0;       // Tồn khả dụng bán = physicalStock - onHoldStock
  minSafetyThreshold: number = 0;   // Định mức an toàn tối thiểu
  unitName: string = 'Hộp';         // Đơn vị tính
  isCurrentBranch: boolean = false; // Chi nhánh người dùng đang thao tác
  status: 'sufficient' | 'low' | 'abundant' = 'sufficient';

  constructor(init?: Partial<BranchStockDTO>) {
    Object.assign(this, init);
    if (init && init.availableStock === undefined) {
      this.availableStock = Math.max(0, this.physicalStock - this.onHoldStock);
    }
  }
}

/**
 * C# Entity: ProductBatch / BatchExpiration
 * Quản lý lô hàng theo nguyên tắc FEFO (First Expired, First Out)
 */
export class FefoBatchDTO {
  batchId: string = '';             // Mã Lô (LOT2026-09A)
  productId: string = '';
  productName: string = '';
  supplierName: string = '';        // Nhà cung cấp
  mfgDate: string = '';             // Ngày sản xuất (DD/MM/YYYY)
  expDate: string = '';             // Hạn sử dụng (DD/MM/YYYY)
  daysRemaining: number = 0;        // Số ngày còn lại tới date
  availableQty: number = 0;         // Số lượng khả dụng của lô này
  unitName: string = 'Hộp';
  fefoPriorityRank: number = 1;     // Thứ hạng FEFO: 1, 2, 3...
  
  // Cảnh báo date:
  // < 7 ngày: urgent (đỏ)
  // 7 - 14 ngày: near_expiry (cam)
  // 15 - 30 ngày: clearance_priority (vàng)
  // > 30 ngày: safe (xanh lá)
  expiryRiskLevel: 'urgent' | 'near_expiry' | 'clearance_priority' | 'safe' = 'safe';
  
  // Chế độ xả hàng (nếu áp dụng chiết khấu cận date)
  isClearanceDiscountApplied: boolean = false;
  clearanceDiscountPercent: number = 0;

  constructor(init?: Partial<FefoBatchDTO>) {
    Object.assign(this, init);
  }
}

/**
 * C# DTO: ProductUnitPricingDTO
 */
export class ProductUnitPricingDTO {
  unitId: string = '';
  unitName: string = '';
  conversionFactor: number = 1;     // Hệ số quy đổi (Ví dụ: Thùng = 48 Hộp)
  retailPrice: number = 0;          // Giá bán lẻ niêm yết
  isBaseUnit: boolean = false;      // Đơn vị cơ bản (Hộp)

  constructor(init?: Partial<ProductUnitPricingDTO>) {
    Object.assign(this, init);
  }
}

/**
 * C# DTO: ProductStockLookupDTO
 * Tổng hợp thông tin tra cứu sản phẩm tại quầy
 */
export class ProductStockLookupDTO {
  productId: string = '';
  sku: string = '';
  barcode: string = '';
  name: string = '';
  categoryName: string = '';
  categoryCode: string = '';
  totalSystemStock: number = 0;     // Tổng tồn toàn hệ thống
  baseUnit: string = 'Hộp';
  prices: ProductUnitPricingDTO[] = [];
  branchStocks: BranchStockDTO[] = [];
  batches: FefoBatchDTO[] = [];

  constructor(init?: Partial<ProductStockLookupDTO>) {
    Object.assign(this, init);
  }
}

/**
 * C# DTO: StockTransferRequestDTO
 * Yêu cầu điều chuyển kho nội bộ giữa các chi nhánh
 */
export class StockTransferRequestDTO {
  requestId: string = '';
  fromBranchId: string = '';
  fromBranchName: string = '';
  toBranchId: string = '';
  toBranchName: string = '';
  productId: string = '';
  productName: string = '';
  requestedQty: number = 0;
  unitName: string = '';
  requestedBy: string = '';
  notes: string = '';
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' = 'PENDING';
  createdAt: string = '';

  constructor(init?: Partial<StockTransferRequestDTO>) {
    Object.assign(this, init);
  }
}

// ==========================================
// 2. QUẢN LÝ HÓA ĐƠN & ĐƠN ĐẶT TRƯỚC DTOs
// ==========================================

/**
 * C# Entity: InvoiceItem / OrderDetail
 */
export class InvoiceItemDTO {
  itemId: string = '';
  productId: string = '';
  productName: string = '';
  sku: string = '';
  batchId?: string = '';
  unitName: string = 'Hộp';
  quantity: number = 1;
  unitPrice: number = 0;
  discountAmount: number = 0;
  totalAmount: number = 0;          // = quantity * unitPrice - discountAmount

  constructor(init?: Partial<InvoiceItemDTO>) {
    Object.assign(this, init);
    if (init && init.totalAmount === undefined) {
      this.totalAmount = Math.max(0, this.quantity * this.unitPrice - this.discountAmount);
    }
  }
}

/**
 * C# Entity: Invoice / RetailOrder
 * Hóa đơn bán lẻ tại quầy POS (100% thanh toán, không công nợ, không ship)
 */
export class InvoiceDTO {
  invoiceId: string = '';           // HD000041
  createdAt: string = '';           // DD/MM/YYYY HH:mm
  branchId: string = '';
  branchName: string = '';
  cashierId: string = '';
  cashierName: string = '';
  customerId?: string = '';
  customerName: string = 'Khách lẻ';
  customerPhone?: string = '';
  
  // Tổng tiền
  totalMerchandiseAmount: number = 0;  // Tổng tiền hàng
  totalDiscount: number = 0;           // Tổng giảm giá
  finalPaidAmount: number = 0;         // Khách đã trả (100%)
  
  // Phương thức thanh toán
  paymentMethod: 'VIETQR' | 'CASH' | 'MIXED' = 'VIETQR';
  paymentMethodLabel: string = 'VietQR (MBBank)';
  referenceCode?: string = '';         // Mã tham chiếu giao dịch ngân hàng
  
  // Trạng thái hóa đơn
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED' = 'COMPLETED';
  statusLabel: string = 'Hoàn thành';
  
  // Danh sách dòng hàng
  items: InvoiceItemDTO[] = [];

  constructor(init?: Partial<InvoiceDTO>) {
    Object.assign(this, init);
  }
}

/**
 * C# Entity: PreOrder / ReservationOrder
 * Đơn đặt trước và giữ kho tại quầy (Store pickup)
 */
export class PreOrderDTO {
  preOrderId: string = '';          // PRE-2026-008
  createdAt: string = '';           // Ngày tạo
  pickupAppointment: string = '';   // Thời gian hẹn đến quầy lấy hàng
  customerName: string = '';
  customerPhone: string = '';
  
  // Tiền đặt cọc & Thanh toán
  totalOrderAmount: number = 0;
  depositAmount: number = 0;        // Tiền cọc trước
  remainingAmount: number = 0;      // Tiền còn phải thu khi nhận
  
  // Trạng thái giữ hàng & Đơn
  stockAllocated: boolean = true;   // Đã trích xuất & giữ kho lô FEFO
  status: 'RESERVED' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED' = 'RESERVED';
  statusLabel: string = 'Đang giữ hàng tại quầy';
  
  items: InvoiceItemDTO[] = [];

  constructor(init?: Partial<PreOrderDTO>) {
    Object.assign(this, init);
    if (init && init.remainingAmount === undefined) {
      this.remainingAmount = Math.max(0, this.totalOrderAmount - this.depositAmount);
    }
  }
}

/**
 * Filter State cho Màn hình Quản lý Hóa đơn
 */
export class InvoiceFilterStateDTO {
  branchName: string = 'Chi nhánh trung tâm';
  timePreset: 'today' | 'yesterday' | 'week' | 'month' | 'custom' = 'today';
  customDateStart?: string = '';
  customDateEnd?: string = '';
  status: 'ALL' | 'COMPLETED' | 'CANCELLED' = 'ALL';
  paymentMethod: 'ALL' | 'VIETQR' | 'CASH' = 'ALL';
  searchQuery: string = '';

  constructor(init?: Partial<InvoiceFilterStateDTO>) {
    Object.assign(this, init);
  }
}
