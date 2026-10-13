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
export interface ProductDto {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  imageUrl?: string;
  spec?: string;
  category: string;
  baseUnit: string;
  basePrice: number;
  costPrice: number;
  quantityOnHand: number;
  allocatedQty?: number;
  batchCode?: string;
  expiryDate?: string;
}

/**
 * Cart Line Item DTO
 * C# Equivalent: PosCartItemDto / OrderItemDto
 */
export interface CartItemDto {
  id: string;
  product: ProductDto;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPerItem: number;
  discountType: 'vnd' | 'percent';
  actualPrice: number;
  totalAmount: number;
  isBelowCostApproved?: boolean;
}

/**
 * Customer Profile DTO
 * C# Equivalent: PosCustomerDto / CustomerDto
 */
export interface CustomerDto {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  area?: string;
  ward?: string;
  dob?: string;
  gender?: 'Nam' | 'Nữ';
  group?: string;
  loyaltyPoints: number;
  membershipTier: 'Standard' | 'Silver' | 'Gold' | 'VIP';
  note?: string;
}

/**
 * Multi-Order Working Tab DTO
 * C# Equivalent: PosOrderTabDto / WorkingOrderDto
 */
export interface OrderTabDto {
  id: number;
  name: string;
  cart: CartItemDto[];
  customer: CustomerDto | null;
  orderDiscountPercent: number;
  couponCode: string;
  couponDiscount: number;
  usePoints: boolean;
  note: string;
  paymentMethod: 'cash' | 'vietqr';
  cashTendered: number;
  createdAt: string;
}

/**
 * Product Category DTO
 * C# Equivalent: PosCategoryDto / CategoryDto
 */
export interface CategoryDto {
  id: string;
  name: string;
  count: number;
}

/**
 * Receipt Item DTO (Line item on printed thermal receipt)
 * C# Equivalent: ReceiptItemDto / OrderReceiptItemDto
 */
export interface ReceiptItemDto {
  stt: number;
  name: string;
  unitPrice: number;
  batchCode?: string;
  quantity: number;
  totalAmount: number;
}

/**
 * Receipt Customer Info DTO
 * C# Equivalent: ReceiptCustomerDto
 */
export interface ReceiptCustomerDto {
  name: string;
  phone: string;
  address?: string;
}

/**
 * Thermal Receipt Printout DTO (K80 / 80mm format)
 * C# Equivalent: PosReceiptDto / ReceiptDataDto
 */
export interface ReceiptDataDto {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  hotline: string;
  orderCode: string;
  createdAt: string;
  cashierName: string;
  posMachine: string;
  branchName: string;
  customer: ReceiptCustomerDto | null;
  items: ReceiptItemDto[];
  totalItemAmount: number;
  orderDiscountAmount: number;
  pointsDiscountAmount: number;
  vatAmount: number;
  finalAmount: number;
  finalAmountInWords: string;
  paymentMethodText: string;
  earnedPoints: number;
}

// ============================================================================
// Shift Management DTOs
// ============================================================================

/**
 * Active Shift Details DTO
 * C# Equivalent: PosShiftInfoDto / ShiftDto
 */
export interface ShiftInfoDto {
  shiftCode: string;
  shiftName: string;
  branchName: string;
  posMachine: string;
  cashierName: string;
  cashierCode: string;
  supervisorName: string;
  startTime: string;
  durationText: string;
  status: 'on_duty' | 'closed';
}

/**
 * Shift Summary KPI Metric DTO
 * C# Equivalent: ShiftKpiItemDto
 */
export interface ShiftKpiItemDto {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  subtitle: string;
  colorType: 'primary' | 'success' | 'warning' | 'info';
}

/**
 * Revenue Breakdown by Payment Method DTO
 * C# Equivalent: PaymentMethodRevenueDto
 */
export interface PaymentMethodRevenueDto {
  id: string;
  methodName: string;
  methodDescription: string;
  orderCount: number;
  amount: number;
  percentage: number;
  icon: string;
}

/**
 * Cash Drawer In/Out Transaction DTO (Thu / Chi tại két)
 * C# Equivalent: CashDrawerTransactionDto / CashInOutTransactionDto
 */
export interface CashInOutTransactionDto {
  id: string;
  code: string;
  time: string;
  type: 'in' | 'out';
  typeLabel: string;
  reason: string;
  amount: number;
  note?: string;
}

/**
 * Currency Denomination Tally Item DTO (Kiểm đếm tiền mặt theo mệnh giá)
 * C# Equivalent: CashDenominationDto / DenominationItemDto
 */
export interface DenominationItemDto {
  value: number;
  label: string;
  count: number;
}

/**
 * Shift Handover / Cash Float Handover DTO
 * C# Equivalent: ShiftHandoverDto / ShiftHandoverDataDto
 */
export interface ShiftHandoverDataDto {
  receiverName: string;
  floatRetained: number;
  cashHandedOver: number;
  notes: string;
}

/**
 * Historical Shift Record DTO
 * C# Equivalent: ShiftHistoryItemDto / ShiftSummaryRecordDto
 */
export interface ShiftHistoryItemDto {
  shiftCode: string;
  branchName: string;
  timeRange: string;
  cashierName: string;
  initialFloat: number;
  totalRevenue: number;
  actualCashCounted: number;
  reconciliationDiff: number;
  reconciliationStatus: 'match' | 'surplus' | 'deficit';
  status: 'completed' | 'on_duty';
}

/**
 * Shift History Query Filter DTO
 * C# Equivalent: ShiftHistoryFilterQueryDto
 */
export interface ShiftHistoryFilterStateDto {
  timePreset: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom';
  customDate: string;
  cashierName: string;
  branchName: string;
}

// ============================================================================
// API Request & Response DTOs (Direct transfer to C# backend controllers)
// ============================================================================

/**
 * Request payload for creating a new POS Order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderCreateRequest
 */
export interface OrderCreateRequestDto {
  storeId?: string;
  cashierId?: string;
  customerId?: string | null;
  items: OrderItemCreateDto[];
  paymentMethod: 'cash' | 'vietqr';
  cashTendered?: number;
  orderDiscountPercent?: number;
  couponCode?: string;
  couponDiscount?: number;
  usePoints?: boolean;
  note?: string;
}

/**
 * Request payload line item for creating order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderItemCreateDto
 */
export interface OrderItemCreateDto {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPerItem?: number;
  actualPrice: number;
  totalAmount: number;
}

/**
 * Response payload after creating order
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderResponse
 */
export interface OrderResponseDto {
  id: string;
  orderCode: string;
  storeId: string;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Failed';
  createdAt: string;
  items: OrderItemResponseDto[];
}

/**
 * Response payload item
 * C# Equivalent: MT_GRMS.Application.PosOrders.Dtos.OrderItemResponse
 */
export interface OrderItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalLineAmount: number;
}

/**
 * Request payload for Quick Add Product
 * C# Equivalent: QuickAddProductRequestDto
 */
export interface QuickProductCreateRequestDto {
  name: string;
  sku?: string;
  baseUnit: string;
  basePrice: number;
  costPrice?: number;
  category: string;
  initialStock?: number;
}

/**
 * Request payload for Quick Add Customer
 * C# Equivalent: QuickAddCustomerRequestDto
 */
export interface CustomerCreateRequestDto {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gender?: 'Nam' | 'Nữ';
  dob?: string;
  note?: string;
}

/**
 * Request payload for Cash In / Out (Thu / Chi)
 * C# Equivalent: CashInOutRequestDto
 */
export interface CashInOutRequestDto {
  shiftCode: string;
  type: 'in' | 'out';
  reason: string;
  amount: number;
  note?: string;
}

/**
 * Request payload for Opening Shift Float
 * C# Equivalent: ShiftOpenRequestDto
 */
export interface ShiftOpenRequestDto {
  cashierCode: string;
  posMachine: string;
  initialFloat: number;
  note?: string;
}

/**
 * Request payload for Closing Shift
 * C# Equivalent: ShiftCloseRequestDto
 */
export interface ShiftCloseRequestDto {
  shiftCode: string;
  actualCashCounted: number;
  floatRetained: number;
  cashHandedOver: number;
  receiverName: string;
  denominations: DenominationItemDto[];
  notes?: string;
}

// ============================================================================
// Backwards Compatibility Type Aliases
// (Allows existing frontend components to compile cleanly without breaking)
// ============================================================================
export type Product = ProductDto;
export type CartItem = CartItemDto;
export type Customer = CustomerDto;
export type OrderTab = OrderTabDto;
export type Category = CategoryDto;
export type ReceiptData = ReceiptDataDto;
export type ShiftInfo = ShiftInfoDto;
export type ShiftKpiItem = ShiftKpiItemDto;
export type PaymentMethodRevenue = PaymentMethodRevenueDto;
export type CashInOutTransaction = CashInOutTransactionDto;
export type DenominationItem = DenominationItemDto;
export type ShiftHandoverData = ShiftHandoverDataDto;
export type ShiftHistoryItem = ShiftHistoryItemDto;
export type ShiftHistoryFilterState = ShiftHistoryFilterStateDto;
