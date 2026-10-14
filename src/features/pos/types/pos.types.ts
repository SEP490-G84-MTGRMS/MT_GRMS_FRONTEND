/**
 * Data Transfer Objects (DTOs) for POS System
 * Designed for seamless mapping to C# / .NET backend (MT_GRMS_BACKEND)
 */

// ============================================================================
// Core POS Models & DTOs
// ============================================================================

/**
 * Product DTO in POS Catalog / Barcode scanner
 * C# Equivalent: PosProductDto / ProductDto
 */
export class ProductDTO {
  id: string = '';
  sku: string = '';
  barcode: string = '';
  name: string = '';
  imageUrl?: string;
  spec?: string;
  category: string = '';
  baseUnit: string = '';
  basePrice: number = 0;
  costPrice: number = 0;
  quantityOnHand: number = 0;
  allocatedQty?: number;
  batchCode?: string;
  expiryDate?: string;

  constructor(init?: Partial<ProductDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Cart Line Item DTO
 * C# Equivalent: PosCartItemDto / OrderItemDto
 */
export class CartItemDTO {
  id: string = '';
  product: ProductDTO = new ProductDTO();
  unit: string = '';
  quantity: number = 1;
  unitPrice: number = 0;
  discountPerItem: number = 0;
  discountType: 'vnd' | 'percent' = 'vnd';
  actualPrice: number = 0;
  totalAmount: number = 0;
  isBelowCostApproved?: boolean;

  constructor(init?: Partial<CartItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Customer Profile DTO
 * C# Equivalent: PosCustomerDto / CustomerDto
 */
export class CustomerDTO {
  id: string = '';
  code: string = '';
  name: string = '';
  phone: string = '';
  email?: string;
  address?: string;
  area?: string;
  ward?: string;
  dob?: string;
  gender?: 'Nam' | 'Nữ';
  group?: string;
  loyaltyPoints: number = 0;
  membershipTier: 'Standard' | 'Silver' | 'Gold' | 'VIP' = 'Standard';
  note?: string;

  constructor(init?: Partial<CustomerDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Multi-Order Working Tab DTO
 * C# Equivalent: PosOrderTabDto / WorkingOrderDto
 */
export class OrderTabDTO {
  id: number = 1;
  name: string = 'Đơn 1';
  cart: CartItemDTO[] = [];
  customer: CustomerDTO | null = null;
  orderDiscountPercent: number = 0;
  couponCode: string = '';
  couponDiscount: number = 0;
  usePoints: boolean = false;
  note: string = '';
  paymentMethod: 'cash' | 'vietqr' = 'cash';
  cashTendered: number = 0;
  createdAt: string = '';

  constructor(init?: Partial<OrderTabDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Product Category DTO
 * C# Equivalent: PosCategoryDto / CategoryDto
 */
export class CategoryDTO {
  id: string = '';
  name: string = '';
  count: number = 0;

  constructor(init?: Partial<CategoryDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Receipt Item DTO (Line item on printed thermal receipt)
 * C# Equivalent: ReceiptItemDto / OrderReceiptItemDto
 */
export class ReceiptItemDTO {
  stt: number = 1;
  name: string = '';
  unitPrice: number = 0;
  batchCode?: string;
  quantity: number = 1;
  totalAmount: number = 0;

  constructor(init?: Partial<ReceiptItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Receipt Customer Info DTO
 * C# Equivalent: ReceiptCustomerDto
 */
export class ReceiptCustomerDTO {
  name: string = '';
  phone: string = '';
  address?: string;

  constructor(init?: Partial<ReceiptCustomerDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Thermal Receipt Printout DTO (K80 / 80mm format)
 * C# Equivalent: PosReceiptDto / ReceiptDataDto
 */
export class ReceiptDataDTO {
  storeName: string = '';
  storeAddress: string = '';
  storePhone: string = '';
  hotline: string = '';
  orderCode: string = '';
  createdAt: string = '';
  cashierName: string = '';
  posMachine: string = '';
  branchName: string = '';
  customer: ReceiptCustomerDTO | null = null;
  items: ReceiptItemDTO[] = [];
  totalItemAmount: number = 0;
  orderDiscountAmount: number = 0;
  pointsDiscountAmount: number = 0;
  vatAmount: number = 0;
  finalAmount: number = 0;
  finalAmountInWords: string = '';
  paymentMethodText: string = 'Tiền mặt';
  earnedPoints: number = 0;

  constructor(init?: Partial<ReceiptDataDTO>) {
    Object.assign(this, init);
  }
}

// ============================================================================
// Shift Management DTOs
// ============================================================================

/**
 * Active Shift Details DTO
 * C# Equivalent: PosShiftInfoDto / ShiftDto
 */
export class ShiftInfoDTO {
  shiftCode: string = '';
  shiftName: string = '';
  branchName: string = '';
  posMachine: string = '';
  cashierName: string = '';
  cashierCode: string = '';
  supervisorName: string = '';
  startTime: string = '';
  durationText: string = '';
  status: 'on_duty' | 'closed' = 'on_duty';

  constructor(init?: Partial<ShiftInfoDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Shift Summary KPI Metric DTO
 * C# Equivalent: ShiftKpiItemDto
 */
export class ShiftKpiItemDTO {
  id: string = '';
  title: string = '';
  value: number = 0;
  formattedValue: string = '';
  subtitle: string = '';
  colorType: 'primary' | 'success' | 'warning' | 'info' = 'primary';

  constructor(init?: Partial<ShiftKpiItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Revenue Breakdown by Payment Method DTO
 * C# Equivalent: PaymentMethodRevenueDto
 */
export class PaymentMethodRevenueDTO {
  id: string = '';
  methodName: string = '';
  methodDescription: string = '';
  orderCount: number = 0;
  amount: number = 0;
  percentage: number = 0;
  icon: string = '';

  constructor(init?: Partial<PaymentMethodRevenueDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Cash Drawer In/Out Transaction DTO (Thu / Chi tại két)
 * C# Equivalent: CashDrawerTransactionDto / CashInOutTransactionDto
 */
export class CashInOutTransactionDTO {
  id: string = '';
  code: string = '';
  time: string = '';
  type: 'in' | 'out' = 'in';
  typeLabel: string = '';
  reason: string = '';
  amount: number = 0;
  note?: string;

  constructor(init?: Partial<CashInOutTransactionDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Currency Denomination Tally Item DTO (Kiểm đếm tiền mặt theo mệnh giá)
 * C# Equivalent: CashDenominationDto / DenominationItemDto
 */
export class DenominationItemDTO {
  value: number = 0;
  label: string = '';
  count: number = 0;

  constructor(init?: Partial<DenominationItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Shift Handover / Cash Float Handover DTO
 * C# Equivalent: ShiftHandoverDto / ShiftHandoverDataDto
 */
export class ShiftHandoverDataDTO {
  receiverName: string = '';
  floatRetained: number = 0;
  cashHandedOver: number = 0;
  notes: string = '';

  constructor(init?: Partial<ShiftHandoverDataDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Historical Shift Record DTO
 * C# Equivalent: ShiftHistoryItemDto / ShiftSummaryRecordDto
 */
export class ShiftHistoryItemDTO {
  shiftCode: string = '';
  branchName: string = '';
  timeRange: string = '';
  cashierName: string = '';
  initialFloat: number = 0;
  totalRevenue: number = 0;
  actualCashCounted: number = 0;
  reconciliationDiff: number = 0;
  reconciliationStatus: 'match' | 'surplus' | 'deficit' = 'match';
  status: 'completed' | 'on_duty' = 'completed';

  constructor(init?: Partial<ShiftHistoryItemDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Shift History Query Filter DTO
 * C# Equivalent: ShiftHistoryFilterQueryDto
 */
export class ShiftHistoryFilterStateDTO {
  timePreset: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom' = 'today';
  customDate: string = '';
  cashierName: string = '';
  branchName: string = '';

  constructor(init?: Partial<ShiftHistoryFilterStateDTO>) {
    Object.assign(this, init);
  }
}

// ============================================================================
// API Request & Response DTOs (Direct transfer to C# backend controllers)
// ============================================================================

/**
 * Request payload for creating a new POS Order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderCreateRequest
 */
export class OrderCreateRequestDTO {
  storeId?: string;
  cashierId?: string;
  customerId?: string | null = null;
  items: OrderItemCreateDTO[] = [];
  paymentMethod: 'cash' | 'vietqr' = 'cash';
  cashTendered?: number;
  orderDiscountPercent?: number;
  couponCode?: string;
  couponDiscount?: number;
  usePoints?: boolean;
  note?: string;

  constructor(init?: Partial<OrderCreateRequestDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload line item for creating order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderItemCreateDto
 */
export class OrderItemCreateDTO {
  productId: string = '';
  productName: string = '';
  unit: string = '';
  quantity: number = 1;
  unitPrice: number = 0;
  discountPerItem?: number;
  actualPrice: number = 0;
  totalAmount: number = 0;

  constructor(init?: Partial<OrderItemCreateDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Response payload after creating order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderResponse
 */
export class OrderResponseDTO {
  id: string = '';
  orderCode: string = '';
  storeId: string = '';
  totalAmount: number = 0;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' = 'Paid';
  createdAt: string = '';
  items: OrderItemResponseDTO[] = [];

  constructor(init?: Partial<OrderResponseDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Response payload item
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderItemResponse
 */
export class OrderItemResponseDTO {
  id: string = '';
  productId: string = '';
  productName: string = '';
  unitPrice: number = 0;
  quantity: number = 1;
  totalLineAmount: number = 0;

  constructor(init?: Partial<OrderItemResponseDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload for Quick Add Product
 * C# Equivalent: QuickAddProductRequestDto
 */
export class QuickProductCreateRequestDTO {
  name: string = '';
  sku?: string;
  baseUnit: string = '';
  basePrice: number = 0;
  costPrice?: number;
  category: string = '';
  initialStock?: number;

  constructor(init?: Partial<QuickProductCreateRequestDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload for Quick Add Customer
 * C# Equivalent: QuickAddCustomerRequestDto
 */
export class CustomerCreateRequestDTO {
  name: string = '';
  phone: string = '';
  email?: string;
  address?: string;
  gender?: 'Nam' | 'Nữ';
  dob?: string;
  note?: string;

  constructor(init?: Partial<CustomerCreateRequestDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload for Cash In / Out (Thu / Chi)
 * C# Equivalent: CashInOutRequestDto
 */
export class CashInOutRequestDTO {
  shiftCode: string = '';
  type: 'in' | 'out' = 'in';
  reason: string = '';
  amount: number = 0;
  note?: string;

  constructor(init?: Partial<CashInOutRequestDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload for Opening Shift Float
 * C# Equivalent: ShiftOpenRequestDto
 */
export class ShiftOpenRequestDTO {
  cashierCode: string = '';
  posMachine: string = '';
  initialFloat: number = 0;
  note?: string;

  constructor(init?: Partial<ShiftOpenRequestDTO>) {
    Object.assign(this, init);
  }
}

/**
 * Request payload for Closing Shift
 * C# Equivalent: ShiftCloseRequestDto
 */
export class ShiftCloseRequestDTO {
  shiftCode: string = '';
  actualCashCounted: number = 0;
  floatRetained: number = 0;
  cashHandedOver: number = 0;
  receiverName: string = '';
  denominations: DenominationItemDTO[] = [];
  notes?: string;

  constructor(init?: Partial<ShiftCloseRequestDTO>) {
    Object.assign(this, init);
  }
}

// ============================================================================
// Backwards Compatibility Type Aliases
// (Allows existing frontend components to compile cleanly without breaking)
// ============================================================================
export type ProductDto = ProductDTO;
export type CartItemDto = CartItemDTO;
export type CustomerDto = CustomerDTO;
export type OrderTabDto = OrderTabDTO;
export type CategoryDto = CategoryDTO;
export type ReceiptItemDto = ReceiptItemDTO;
export type ReceiptCustomerDto = ReceiptCustomerDTO;
export type ReceiptDataDto = ReceiptDataDTO;
export type ShiftInfoDto = ShiftInfoDTO;
export type ShiftKpiItemDto = ShiftKpiItemDTO;
export type PaymentMethodRevenueDto = PaymentMethodRevenueDTO;
export type CashInOutTransactionDto = CashInOutTransactionDTO;
export type DenominationItemDto = DenominationItemDTO;
export type ShiftHandoverDataDto = ShiftHandoverDataDTO;
export type ShiftHistoryItemDto = ShiftHistoryItemDTO;
export type ShiftHistoryFilterStateDto = ShiftHistoryFilterStateDTO;
export type OrderCreateRequestDto = OrderCreateRequestDTO;
export type OrderItemCreateDto = OrderItemCreateDTO;
export type OrderResponseDto = OrderResponseDTO;
export type OrderItemResponseDto = OrderItemResponseDTO;
export type QuickProductCreateRequestDto = QuickProductCreateRequestDTO;
export type CustomerCreateRequestDto = CustomerCreateRequestDTO;
export type CashInOutRequestDto = CashInOutRequestDTO;
export type ShiftOpenRequestDto = ShiftOpenRequestDTO;
export type ShiftCloseRequestDto = ShiftCloseRequestDTO;

export type Product = ProductDTO;
export type CartItem = CartItemDTO;
export type Customer = CustomerDTO;
export type OrderTab = OrderTabDTO;
export type Category = CategoryDTO;
export type ReceiptData = ReceiptDataDTO;
export type ShiftInfo = ShiftInfoDTO;
export type ShiftKpiItem = ShiftKpiItemDTO;
export type PaymentMethodRevenue = PaymentMethodRevenueDTO;
export type CashInOutTransaction = CashInOutTransactionDTO;
export type DenominationItem = DenominationItemDTO;
export type ShiftHandoverData = ShiftHandoverDataDTO;
export type ShiftHistoryItem = ShiftHistoryItemDTO;
export type ShiftHistoryFilterState = ShiftHistoryFilterStateDTO;
